import { Edit2, AlertCircle } from "lucide-react"
import { RuleResults } from "@/components/application-parts"
import { StatusBadge, Facts, useAction } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api, ApiError, queryClient } from "@/lib/api"
import { docLabel, humanize, fmtMoney } from "@/lib/format"
import type { AppDetail, Eligibility, RuleResult } from "@/lib/types"
import type { ApplicationFormData } from "../useApplicationForm"

interface ReviewStepProps {
  app: AppDetail
  formData: ApplicationFormData
  eligibility?: Eligibility
  onGoToStep: (stepIndex: number) => void
  onBack: () => void
  onSubmittedSuccess: () => void
}

export function ReviewStep({
  app,
  formData,
  eligibility,
  onGoToStep,
  onBack,
  onSubmittedSuccess,
}: ReviewStepProps) {
  const isDeficient = app.status === "deficient"
  const actionPath = isDeficient ? "resubmit" : "submit"

  const submitAction = useAction(
    () => api(`/applications/${app.id}/${actionPath}`, { method: "POST" }),
    {
      success: isDeficient ? "Application resubmitted successfully!" : "Application submitted successfully!",
      onSuccess: () => {
        for (const k of ["application", "eligibility", "checklist", "applications"]) {
          queryClient.invalidateQueries({ queryKey: [k] })
        }
        onSubmittedSuccess()
      },
    }
  )

  const blocked =
    submitAction.error instanceof ApiError && submitAction.error.status === 422
      ? (submitAction.error.detail as { results?: RuleResult[] }).results
      : undefined

  const isValidToSubmit = formData.declaration_accepted && !submitAction.isPending

  return (
    <div className="grid gap-6">
      <div className="rounded-lg border bg-blue-50/50 p-4 text-sm">
        <h4 className="font-semibold text-primary mb-1">Final Application Review</h4>
        <p className="text-xs text-muted-foreground">
          Please review all entered information carefully before submitting. You can click "Edit" on any section to go back and modify details.
        </p>
      </div>

      {/* Summary Sections */}
      <div className="grid gap-4">
        {/* Step 1: Personal */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4 bg-muted/40">
            <CardTitle className="text-sm font-semibold">1. Personal Information</CardTitle>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => onGoToStep(0)}>
              <Edit2 className="size-3 mr-1" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-3">
            <Facts
              items={[
                ["Full name", formData.full_name || "—"],
                ["Mobile number", formData.mobile || "—"],
                ["Date of birth", formData.dob || "—"],
                ["Gender", formData.gender === "F" ? "Female" : formData.gender === "M" ? "Male" : "Other"],
                ["ST community", formData.community || formData.st_community || "—"],
                ["District & PIN", `${formData.district || "—"} (${formData.pin_code || "—"})`],
              ]}
            />
          </CardContent>
        </Card>

        {/* Step 2: Academic */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4 bg-muted/40">
            <CardTitle className="text-sm font-semibold">2. Academic Details</CardTitle>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => onGoToStep(1)}>
              <Edit2 className="size-3 mr-1" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-3">
            <Facts
              items={[
                ["Course", humanize(formData.course) || "—"],
                ["Stream", humanize(formData.stream) || "—"],
                ["Subject", formData.subject || "—"],
                ["Marks / CGPA", formData.marks_value || "—"],
                ["NET Roll No.", formData.net_roll || "N/A"],
              ]}
            />
          </CardContent>
        </Card>

        {/* Step 3: Income */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4 bg-muted/40">
            <CardTitle className="text-sm font-semibold">3. Family & Income Details</CardTitle>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => onGoToStep(2)}>
              <Edit2 className="size-3 mr-1" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-3">
            <Facts
              items={[
                ["Annual family income", formData.family_income ? fmtMoney(Number(formData.family_income)) : "—"],
                ["Father deceased", formData.father_deceased ? "Yes" : "No"],
                ["Sibling awarded", formData.sibling_awarded ? "Yes" : "No"],
                ["Other fellowship", formData.other_fellowship ? "Yes" : "No"],
              ]}
            />
          </CardContent>
        </Card>

        {/* Step 4: Bank */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4 bg-muted/40">
            <CardTitle className="text-sm font-semibold">4. Bank Account Details</CardTitle>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => onGoToStep(3)}>
              <Edit2 className="size-3 mr-1" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-3">
            <Facts
              items={[
                ["Bank Account No.", formData.bank_account ? `•••• •••• ${formData.bank_account.slice(-4)}` : "—"],
                ["IFSC Code", formData.ifsc || "—"],
              ]}
            />
          </CardContent>
        </Card>

        {/* Step 5: Documents */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between py-3 px-4 bg-muted/40">
            <CardTitle className="text-sm font-semibold">5. Uploaded Documents</CardTitle>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => onGoToStep(4)}>
              <Edit2 className="size-3 mr-1" /> Edit
            </Button>
          </CardHeader>
          <CardContent className="p-4 pt-3">
            <ul className="grid gap-2 text-xs">
              {app.documents.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-1 border-b last:border-0">
                  <span className="font-medium">{docLabel(d.doc_type)}</span>
                  <StatusBadge status={d.status} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Submission Status & Warnings */}
      {eligibility && (
        <div className="rounded-lg border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Rule Evaluation Summary:</span>
            <StatusBadge
              status={eligibility.summary}
              label={
                {
                  pass: "All criteria met",
                  review: "Needs officer review",
                  fail: "Ineligible criteria detected",
                }[eligibility.summary]
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Criteria marked "needs review" will be evaluated by your institute/scrutiny officer. Criteria marked "fail" will prevent selection.
          </p>
        </div>
      )}

      {blocked && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <div className="flex items-center gap-2 text-destructive font-semibold text-sm mb-2">
            <AlertCircle className="size-4" />
            <span>Submission Blocked:</span>
          </div>
          <RuleResults results={blocked.filter((r) => r.outcome === "fail")} />
        </div>
      )}

      <div className="flex justify-between pt-4 border-t">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={() => submitAction.mutate()}
          disabled={!isValidToSubmit}
          className="min-w-[200px]"
        >
          {submitAction.isPending ? "Submitting Application..." : isDeficient ? "Resubmit Application" : "Submit Application"}
        </Button>
      </div>
    </div>
  )
}
