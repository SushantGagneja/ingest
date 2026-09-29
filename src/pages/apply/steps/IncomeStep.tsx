import React from "react"
import { Field } from "@/components/common"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { ApplicationFormData, FormErrors } from "../useApplicationForm"

interface IncomeStepProps {
  formData: ApplicationFormData
  updateField: (field: keyof ApplicationFormData, value: any) => void
  handleBlur: (field: keyof ApplicationFormData) => void
  errors: FormErrors
  touched: Record<string, boolean>
  isEditable: (key: string) => boolean
  onNext: () => void
  onBack: () => void
}

export function IncomeStep({
  formData,
  updateField,
  handleBlur,
  errors,
  touched,
  isEditable,
  onNext,
  onBack,
}: IncomeStepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext()
  }

  const isIncomeLocked = !isEditable("family_income")

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div className="text-xs text-muted-foreground border-b pb-2">
        Fields marked <span className="text-destructive font-bold">*</span> are mandatory.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="f-family_income"
          label="Annual family income (₹) *"
          hint={isIncomeLocked ? "Locked." : "As stated in income certificate issued by Competent Revenue Authority"}
          error={touched.family_income ? errors.family_income : undefined}
        >
          <Input
            id="f-family_income"
            type="number"
            value={formData.family_income}
            onChange={(e) => updateField("family_income", e.target.value)}
            onBlur={() => handleBlur("family_income")}
            disabled={isIncomeLocked}
            placeholder="e.g. 250000"
            aria-required="true"
            aria-invalid={!!(touched.family_income && errors.family_income)}
          />
        </Field>

        <div className="sm:col-span-2 grid gap-3 rounded-lg border bg-card p-4 mt-2">
          <h4 className="text-sm font-semibold">Special Category & Fellowship Declarations</h4>

          <div className="flex items-center gap-3">
            <Checkbox
              id="f-father_deceased"
              checked={formData.father_deceased}
              onCheckedChange={(c) => updateField("father_deceased", c === true)}
              disabled={!isEditable("father_deceased")}
            />
            <Label htmlFor="f-father_deceased" className="text-sm font-normal cursor-pointer">
              My father is deceased (Single parent / orphan category consideration)
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="f-sibling_awarded"
              checked={formData.sibling_awarded}
              onCheckedChange={(c) => updateField("sibling_awarded", c === true)}
              disabled={!isEditable("sibling_awarded")}
            />
            <Label htmlFor="f-sibling_awarded" className="text-sm font-normal cursor-pointer">
              A sibling has already received this scholarship under current/previous cycle
            </Label>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              id="f-other_fellowship"
              checked={formData.other_fellowship}
              onCheckedChange={(c) => updateField("other_fellowship", c === true)}
              disabled={!isEditable("other_fellowship")}
            />
            <Label htmlFor="f-other_fellowship" className="text-sm font-normal cursor-pointer">
              I am currently receiving another financial assistance / scholarship / fellowship
            </Label>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit">Next: Bank Account</Button>
      </div>
    </form>
  )
}
