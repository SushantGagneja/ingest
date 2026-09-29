import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router"
import { AlertTriangle, Check, RefreshCw } from "lucide-react"

import { EligibilityMeter, HolderLine, RuleResults, Timeline } from "@/components/application-parts"
import { Empty, Facts, PageHeader, Query, StatusBadge, useAction, useMe } from "@/components/common"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"

import { api, ApiError, queryClient } from "@/lib/api"
import { docLabel, fmtDate, humanize, SCHEME_NAME, shortId } from "@/lib/format"
import type { AppDetail, Eligibility } from "@/lib/types"

import { Stepper, APPLICATION_STEPS } from "./Stepper"
import { useApplicationForm } from "./useApplicationForm"
import { PersonalStep } from "./steps/PersonalStep"
import { AcademicStep } from "./steps/AcademicStep"
import { IncomeStep } from "./steps/IncomeStep"
import { BankStep } from "./steps/BankStep"
import { DocumentsStep } from "./steps/DocumentsStep"
import { DeclarationStep } from "./steps/DeclarationStep"
import { ReviewStep } from "./steps/ReviewStep"
import { ConfirmationStep } from "./steps/ConfirmationStep"

const EDITABLE = ["draft", "deficient"]

export default function Application() {
  const { id } = useParams<{ id: string }>()
  const detail = useQuery({
    queryKey: ["application", id],
    queryFn: () => api<AppDetail>(`/applications/${id}`),
    retry: 1,
  })

  if (detail.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-1/2" />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    )
  }

  if (detail.isError) {
    const err = detail.error
    const isNotFound = err instanceof ApiError && err.status === 404
    return (
      <Card className="mx-auto max-w-lg my-12 p-6 text-center">
        <CardHeader>
          <CardTitle>{isNotFound ? "Application Not Found" : "Unable to Load Application"}</CardTitle>
          <CardDescription>
            {isNotFound
              ? "The requested application could not be found or you may not have permission to view it."
              : err instanceof Error ? err.message : "A network failure occurred. Please check your connection and try again."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => detail.refetch()}>
            <RefreshCw className="size-4 mr-2" /> Retry Loading
          </Button>
        </CardContent>
      </Card>
    )
  }

  const app = detail.data!

  return (
    <>
      <PageHeader
        title={app.cycle ? `${app.cycle.scheme_code} ${app.cycle.cycle}` : "Application"}
        description={
          <>
            {app.cycle && SCHEME_NAME[app.cycle.scheme_code]} · #{shortId(app.id)}
          </>
        }
        actions={
          <>
            <StatusBadge status={app.status} />
            {["draft", "submitted", "deficient"].includes(app.status) && <Withdraw id={app.id} />}
          </>
        }
      />
      {EDITABLE.includes(app.status) ? <Wizard app={app} /> : <StatusView app={app} />}
    </>
  )
}

function invalidateApp(id: string) {
  for (const k of ["application", "eligibility", "checklist"]) {
    queryClient.invalidateQueries({ queryKey: [k, id] })
  }
  queryClient.invalidateQueries({ queryKey: ["applications"] })
}

function Withdraw({ id }: { id: string }) {
  const nav = useNavigate()
  const w = useAction(() => api(`/applications/${id}/withdraw`, { method: "POST" }), {
    success: "Application withdrawn",
    onSuccess: () => {
      invalidateApp(id)
      nav("/apply")
    },
  })
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Withdraw</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Withdraw this application?</DialogTitle>
          <DialogDescription>This cannot be undone. You will not be considered in this cycle.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={() => w.mutate()} disabled={w.isPending}>Withdraw</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Wizard({ app }: { app: AppDetail }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [isSubmitted, setIsSubmitted] = useState(false)

  const form = useApplicationForm(app)
  const eligibility = useQuery({
    queryKey: ["eligibility", app.id],
    queryFn: () => api<Eligibility>(`/applications/${app.id}/eligibility`),
  })

  if (isSubmitted) {
    return <ConfirmationStep app={app} />
  }

  const errorSteps: number[] = []
  Object.keys(form.errors).forEach((key) => {
    if (["mobile", "dob", "pin_code"].includes(key)) errorSteps.push(0)
    if (["course", "stream", "subject", "marks_value"].includes(key)) errorSteps.push(1)
    if (["family_income"].includes(key)) errorSteps.push(2)
    if (["bank_account", "account_confirm", "ifsc"].includes(key)) errorSteps.push(3)
  })

  const handleNext = () => {
    if (!form.validateStep(currentStepIndex)) return
    if (!completedSteps.includes(currentStepIndex)) {
      setCompletedSteps((prev) => [...prev, currentStepIndex])
    }
    setCurrentStepIndex((prev) => Math.min(prev + 1, APPLICATION_STEPS.length - 1))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleBack = () => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0))
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        {app.deficiency && (
          <Alert className="mb-6 bg-review text-review-foreground border-review-border">
            <AlertTriangle aria-hidden className="size-5" />
            <AlertTitle className="font-semibold">Action needed by {fmtDate(app.deficiency.due_at)}</AlertTitle>
            <AlertDescription className="text-review-foreground text-xs leading-relaxed mt-1">
              <p className="whitespace-pre-line font-medium">{app.deficiency.memo}</p>
              <ul className="mt-2 list-disc pl-5 space-y-0.5">
                {app.deficiency.items.map((it, i) => (
                  <li key={i}>
                    <strong>{it.doc_type ? docLabel(it.doc_type) : humanize(it.field ?? it.rule_id)}</strong>
                    {it.message && `: ${it.message}`}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-muted-foreground">Only the items listed above can be modified. Once corrected, resubmit from Step 7.</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Header & Autosave status bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <Stepper
            steps={APPLICATION_STEPS}
            currentStepIndex={currentStepIndex}
            completedStepIndices={completedSteps}
            errorStepIndices={errorSteps}
            onStepClick={(idx) => setCurrentStepIndex(idx)}
          />
        </div>

        {/* Save Status Indicator */}
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground mb-4">
          {form.saveStatus === "saving" && (
            <span className="flex items-center gap-1.5 text-primary">
              <RefreshCw className="size-3 animate-spin" /> Saving draft...
            </span>
          )}
          {form.saveStatus === "saved" && (
            <span className="flex items-center gap-1.5 text-pass-foreground">
              <Check className="size-3 stroke-[3]" /> Saved at {form.lastSavedAt}
            </span>
          )}
          {form.saveStatus === "error" && (
            <span className="flex items-center gap-1.5 text-destructive font-medium">
              Could not save draft. <button type="button" onClick={form.saveDraft} className="underline">Retry</button>
            </span>
          )}
        </div>

        {/* Step Contents */}
        <Card className="shadow-sm">
          <CardHeader className="border-b bg-card/50 py-4">
            <CardTitle className="text-base font-semibold">
              {APPLICATION_STEPS[currentStepIndex].label}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {currentStepIndex === 0 && (
              <PersonalStep
                formData={form.formData}
                updateField={form.updateField}
                handleBlur={form.handleBlur}
                errors={form.errors}
                touched={form.touched}
                isEditable={form.isEditable}
                onNext={handleNext}
              />
            )}
            {currentStepIndex === 1 && (
              <AcademicStep
                formData={form.formData}
                updateField={form.updateField}
                handleBlur={form.handleBlur}
                errors={form.errors}
                touched={form.touched}
                isEditable={form.isEditable}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {currentStepIndex === 2 && (
              <IncomeStep
                formData={form.formData}
                updateField={form.updateField}
                handleBlur={form.handleBlur}
                errors={form.errors}
                touched={form.touched}
                isEditable={form.isEditable}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {currentStepIndex === 3 && (
              <BankStep
                formData={form.formData}
                updateField={form.updateField}
                handleBlur={form.handleBlur}
                errors={form.errors}
                touched={form.touched}
                isEditable={form.isEditable}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {currentStepIndex === 4 && (
              <DocumentsStep
                app={app}
                isEditable={form.isEditable}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {currentStepIndex === 5 && (
              <DeclarationStep
                formData={form.formData}
                updateField={form.updateField}
                onNext={handleNext}
                onBack={handleBack}
              />
            )}
            {currentStepIndex === 6 && (
              <ReviewStep
                app={app}
                formData={form.formData}
                eligibility={eligibility.data}
                onGoToStep={(idx) => setCurrentStepIndex(idx)}
                onBack={handleBack}
                onSubmittedSuccess={() => setIsSubmitted(true)}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar: Real-time Eligibility Meter */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <Card className="shadow-sm">
          <CardHeader className="py-4 border-b bg-card/50">
            <CardTitle className="text-sm font-semibold">Eligibility Tracker</CardTitle>
            <CardDescription className="text-xs">Updates in real time as you fill the application.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-4">
            <Query q={eligibility}>
              {(e) => (
                <>
                  <EligibilityMeter results={e.results} />
                  <RuleResults results={e.results} />
                </>
              )}
            </Query>
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}

type RankCard = {
  approved: boolean
  rank: number | null
  category: string | null
  trace: { cat: string; outcome: string; cutoff: number | null }[]
  category_cutoffs: Record<string, number>
}
const RANKED = ["selected", "waitlisted", "not_selected", "awarded", "state_verification"]

function StatusView({ app }: { app: AppDetail }) {
  const me = useMe()
  const rank = useQuery({
    queryKey: ["rank-card", app.id],
    queryFn: () => api<RankCard>(`/applications/${app.id}/rank-card`),
    enabled: RANKED.includes(app.status),
    retry: false,
  })
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <Card className="lg:col-span-2 shadow-sm">
        <CardHeader className="py-4 border-b bg-card/50">
          <CardTitle className="text-base font-semibold">Where your application is</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-4">
          <div className="flex items-center gap-2">
            <StatusBadge status={app.status} />
            {app.submitted_at && <span className="text-xs text-muted-foreground">Submitted {fmtDate(app.submitted_at)}</span>}
          </div>
          <HolderLine app={app} />
          {app.status === "awarded" && <p className="text-xs font-medium text-pass-foreground">Congratulations, {me.full_name?.split(" ")[0]}. See “Award & payments” for joining and stipends.</p>}
        </CardContent>
      </Card>

      {rank.data && (
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="py-4 border-b bg-card/50">
            <CardTitle className="text-base font-semibold">Rank card</CardTitle>
            <CardDescription className="text-xs">{rank.data.approved ? "From the approved merit list." : "Provisional: the merit list is not approved yet."}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 p-4">
            <Facts items={[["Rank", rank.data.rank ?? "—"], ["Selected under", rank.data.category ? humanize(rank.data.category) : "—"]]} />
            <ul className="grid gap-2">
              {rank.data.trace.map((t, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-xs">
                  <span>{humanize(t.cat)}</span>
                  <span className="flex items-center gap-2">
                    {t.cutoff != null && <span className="text-muted-foreground">cut-off {t.cutoff}</span>}
                    <StatusBadge status={t.outcome === "selected" ? "pass" : "review"} label={humanize(t.outcome)} />
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm">
        <CardHeader className="py-4 border-b bg-card/50">
          <CardTitle className="text-base font-semibold">History</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Timeline entries={app.timeline} />
        </CardContent>
      </Card>

      <div className="grid content-start gap-6">
        <Card className="shadow-sm">
          <CardHeader className="py-4 border-b bg-card/50">
            <CardTitle className="text-base font-semibold">Eligibility</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <RuleResults results={app.rule_results} />
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="py-4 border-b bg-card/50">
            <CardTitle className="text-base font-semibold">Documents</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {app.documents.length ? (
              <ul className="grid gap-2 text-xs">
                {app.documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 py-1 border-b last:border-0">
                    <span>{docLabel(d.doc_type)}</span>
                    <StatusBadge status={d.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No documents.</Empty>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
