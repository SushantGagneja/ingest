import React from "react"
import { Field } from "@/components/common"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { ApplicationFormData, FormErrors } from "../useApplicationForm"

interface BankStepProps {
  formData: ApplicationFormData
  updateField: (field: keyof ApplicationFormData, value: any) => void
  handleBlur: (field: keyof ApplicationFormData) => void
  errors: FormErrors
  touched: Record<string, boolean>
  isEditable: (key: string) => boolean
  onNext: () => void
  onBack: () => void
}

export function BankStep({
  formData,
  updateField,
  handleBlur,
  errors,
  touched,
  isEditable,
  onNext,
  onBack,
}: BankStepProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext()
  }

  const isBankLocked = !isEditable("bank_account")

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div className="text-xs text-muted-foreground border-b pb-2">
        Fields marked <span className="text-destructive font-bold">*</span> are mandatory. Direct Benefit Transfer (DBT) fellowship disbursement will be credited to this bank account.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="f-bank_account"
          label="Bank account number *"
          hint={isBankLocked ? "Locked." : "9 to 18 digit savings bank account number"}
          error={touched.bank_account ? errors.bank_account : undefined}
        >
          <Input
            id="f-bank_account"
            type="password"
            value={formData.bank_account}
            onChange={(e) => updateField("bank_account", e.target.value)}
            onBlur={() => handleBlur("bank_account")}
            disabled={isBankLocked}
            placeholder="e.g. 987654321012"
            aria-required="true"
            aria-invalid={!!(touched.bank_account && errors.bank_account)}
          />
        </Field>

        <Field
          id="f-account_confirm"
          label="Re-enter bank account number *"
          hint="Must match account number exactly"
          error={touched.account_confirm ? errors.account_confirm : undefined}
        >
          <Input
            id="f-account_confirm"
            type="text"
            value={formData.account_confirm}
            onChange={(e) => updateField("account_confirm", e.target.value)}
            onBlur={() => handleBlur("account_confirm")}
            disabled={isBankLocked}
            placeholder="e.g. 987654321012"
            aria-required="true"
            aria-invalid={!!(touched.account_confirm && errors.account_confirm)}
          />
        </Field>

        <Field
          id="f-ifsc"
          label="Bank IFSC code *"
          hint="11-character code (e.g. SBIN0001234)"
          error={touched.ifsc ? errors.ifsc : undefined}
        >
          <Input
            id="f-ifsc"
            value={formData.ifsc}
            onChange={(e) => updateField("ifsc", (e.target.value || "").toUpperCase())}
            onBlur={() => handleBlur("ifsc")}
            disabled={isBankLocked}
            placeholder="SBIN0001234"
            aria-required="true"
            aria-invalid={!!(touched.ifsc && errors.ifsc)}
          />
        </Field>
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit">Next: Upload Documents</Button>
      </div>
    </form>
  )
}
