import React from "react"
import { Field } from "@/components/common"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import type { ApplicationFormData, FormErrors } from "../useApplicationForm"

interface PersonalStepProps {
  formData: ApplicationFormData
  updateField: (field: keyof ApplicationFormData, value: any) => void
  handleBlur: (field: keyof ApplicationFormData) => void
  errors: FormErrors
  touched: Record<string, boolean>
  isEditable: (key: string) => boolean
  onNext: () => void
}

export function PersonalStep({
  formData,
  updateField,
  handleBlur,
  errors,
  touched,
  isEditable,
  onNext,
}: PersonalStepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext()
  }

  const isCommunityLocked = !isEditable("community")

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div className="text-xs text-muted-foreground border-b pb-2">
        Fields marked <span className="text-destructive font-bold">*</span> are mandatory.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="f-full_name" label="Full name" hint="From registered profile">
          <Input id="f-full_name" value={formData.full_name} disabled className="bg-muted" />
        </Field>

        <Field
          id="f-mobile"
          label="Mobile number *"
          hint="10-digit mobile number for SMS notifications"
          error={touched.mobile ? errors.mobile : undefined}
        >
          <Input
            id="f-mobile"
            type="tel"
            value={formData.mobile}
            onChange={(e) => updateField("mobile", e.target.value)}
            onBlur={() => handleBlur("mobile")}
            placeholder="9876543210"
            aria-required="true"
            aria-invalid={!!(touched.mobile && errors.mobile)}
          />
        </Field>

        <Field
          id="f-dob"
          label="Date of birth *"
          hint="DD/MM/YYYY format"
          error={touched.dob ? errors.dob : undefined}
        >
          <Input
            id="f-dob"
            type="date"
            value={formData.dob}
            onChange={(e) => updateField("dob", e.target.value)}
            onBlur={() => handleBlur("dob")}
            aria-required="true"
            aria-invalid={!!(touched.dob && errors.dob)}
          />
        </Field>

        <Field id="f-gender" label="Gender">
          <Select value={formData.gender} onValueChange={(val) => updateField("gender", val)} disabled>
            <SelectTrigger id="f-gender">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="F">Female</SelectItem>
              <SelectItem value="M">Male</SelectItem>
              <SelectItem value="O">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field id="f-st_community" label="ST community (Profile)" hint="Verified tribe status">
          <Input id="f-st_community" value={formData.st_community} disabled className="bg-muted" />
        </Field>

        <Field
          id="f-community"
          label="ST community override (if applicable)"
          hint={isCommunityLocked ? "Locked. Not part of deficiency memo." : "Leave blank to use profile community"}
          error={touched.community ? errors.community : undefined}
        >
          <Input
            id="f-community"
            value={formData.community}
            onChange={(e) => updateField("community", e.target.value)}
            onBlur={() => handleBlur("community")}
            disabled={isCommunityLocked}
            placeholder="e.g. Munda, Santhal, Bhil"
          />
        </Field>

        <Field id="f-district" label="District">
          <Input id="f-district" value={formData.district} disabled className="bg-muted" />
        </Field>

        <Field
          id="f-pin_code"
          label="PIN Code"
          hint="6-digit postal code"
          error={touched.pin_code ? errors.pin_code : undefined}
        >
          <Input
            id="f-pin_code"
            value={formData.pin_code}
            onChange={(e) => updateField("pin_code", e.target.value)}
            onBlur={() => handleBlur("pin_code")}
            placeholder="834001"
            aria-invalid={!!(touched.pin_code && errors.pin_code)}
          />
        </Field>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button type="submit">Next: Academic details</Button>
      </div>
    </form>
  )
}
