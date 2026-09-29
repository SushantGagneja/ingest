import React from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { ApplicationFormData } from "../useApplicationForm"

interface DeclarationStepProps {
  formData: ApplicationFormData
  updateField: (field: keyof ApplicationFormData, value: any) => void
  onNext: () => void
  onBack: () => void
}

export function DeclarationStep({ formData, updateField, onNext, onBack }: DeclarationStepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.declaration_accepted) return
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h4 className="font-semibold text-base border-b pb-2">Applicant Declaration & Undertaking</h4>

        <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
          <p>
            1. I hereby declare that all statements made in this application are true, complete, and correct to the best of my knowledge and belief.
          </p>
          <p>
            2. I agree that in the event of any information being found false, incorrect, or ineligible at any stage, my scholarship/fellowship award shall be canceled immediately and legal action may be initiated against me.
          </p>
          <p>
            3. I confirm that I am not currently receiving any other fellowship, stipend, or financial assistance for the same course of study from any other government or private organization, unless explicitly declared.
          </p>
          <p>
            4. I authorize the Ministry of Tribal Affairs and its designated verification agencies to verify my certificates, caste validity, income records, and bank account details through DigiLocker or authorized APIs.
          </p>
        </div>

        <div className="pt-4 border-t flex items-start gap-3">
          <Checkbox
            id="f-declaration_accepted"
            checked={formData.declaration_accepted}
            onCheckedChange={(c) => updateField("declaration_accepted", c === true)}
            required
            className="mt-0.5"
          />
          <Label htmlFor="f-declaration_accepted" className="text-sm font-medium leading-snug cursor-pointer">
            I have read, understood, and accept all the terms, conditions, and declaration statements above. <span className="text-destructive font-bold">*</span>
          </Label>
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" disabled={!formData.declaration_accepted}>
          Next: Review Application
        </Button>
      </div>
    </form>
  )
}
