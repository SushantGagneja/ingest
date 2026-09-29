import { useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router"
import { AlertTriangle } from "lucide-react"
import { toast } from "sonner"

import { EligibilityMeter, HolderLine, RuleResults, Timeline } from "@/components/application-parts"
import { Empty, Facts, Field, PageHeader, Query, StatusBadge, useAction, useInstitutions, useMe } from "@/components/common"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api, ApiError, queryClient } from "@/lib/api"
import { docLabel, FACT_FIELD, fmtDate, humanize, SCHEME_NAME, shortId } from "@/lib/format"
import type { AppDetail, Condition, Eligibility, RuleConfig, RuleResult } from "@/lib/types"
import { ProfileForm } from "@/pages/common/Profile"

// ───────── config → form fields ─────────

// Which form key feeds each fact (backend/utils/facts.py). Profile-sourced facts (age, gender, …) aren't here.
type FieldDef = { label: string; type: "text" | "number" | "checkbox" | "select" | "institution"; options?: string[]; hint?: string }

const FIELD_DEF: Record<string, FieldDef> = {
  community: { label: "ST community (if different from profile)", type: "text", hint: "Leave blank to use the community in your profile." },
  marks_value: { label: "Marks (% or CGPA as printed)", type: "number", hint: "CGPA is converted using your institution's scale." },
  net_roll: { label: "NET roll number", type: "text" },
  course: { label: "Course", type: "select", options: ["PHD", "MPHIL_PHD", "MASTERS", "COURSEWORK"] },
  other_fellowship: { label: "I currently hold another fellowship", type: "checkbox" },
  sibling_awarded: { label: "A sibling has already received this scholarship", type: "checkbox" },
  father_deceased: { label: "My father is deceased", type: "checkbox" },
  family_income: { label: "Annual family income (₹)", type: "number" },
  offer_university: { label: "University you have an offer from", type: "text" },
  institution_id: { label: "Institution", type: "institution" },
  stream: { label: "Stream", type: "select" },
  bank_account: { label: "Bank account number", type: "text", hint: "Fellowship payments are credited here." },
}

function formKeys(config: RuleConfig["config"]): string[] {
  const facts = [
    ...(config.eligibility ?? []).map((r) => r.fact),
    ...(config.documents?.conditional ?? []).map((c: { when: Condition }) => c.when.fact),
  ]
  return [...new Set([...facts.map((f) => FACT_FIELD[f]).filter(Boolean), "stream", "bank_account"])]
}

const EDITABLE = ["draft", "deficient"]

// ───────── page ─────────

export default function Application() {
  const { id } = useParams()
  const detail = useQuery({ queryKey: ["application", id], queryFn: () => api<AppDetail>(`/applications/${id}`) })
  return (
    <Query q={detail}>
      {(app) => (
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
      )}
    </Query>
  )
}

function invalidateApp(id: string) {
  for (const k of ["application", "eligibility", "checklist"]) queryClient.invalidateQueries({ queryKey: [k, id] })
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

// ───────── draft / deficient ─────────

function Wizard({ app }: { app: AppDetail }) {
  const [step, setStep] = useState("about")
  const configs = useQuery({ queryKey: ["configs", app.cycle_id], queryFn: () => api<RuleConfig[]>(`/cycles/${app.cycle_id}/configs`) })
  const eligibility = useQuery({ queryKey: ["eligibility", app.id], queryFn: () => api<Eligibility>(`/applications/${app.id}/eligibility`) })
  // pinned version once submitted (deficient), else the latest published one — same rule as the backend
  const config = configs.data?.find((c) => (app.config_version ? c.version === app.config_version : c.published_at))?.config
  const editable = (key: string) => app.status === "draft" || app.unlocked_fields.includes(key)
  const next = (s: string) => () => setStep(s)

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        {app.deficiency && (
          <Alert className="mb-6 bg-review text-review-foreground">
            <AlertTriangle aria-hidden />
            <AlertTitle>Action needed by {fmtDate(app.deficiency.due_at)}</AlertTitle>
            <AlertDescription className="text-review-foreground">
              <p className="whitespace-pre-line">{app.deficiency.memo}</p>
              <ul className="mt-2 list-disc pl-5">
                {app.deficiency.items.map((it, i) => (
                  <li key={i}>
                    <strong>{it.doc_type ? docLabel(it.doc_type) : humanize(it.field ?? it.rule_id)}</strong>
                    {it.message && `: ${it.message}`}
                  </li>
                ))}
              </ul>
              <p className="mt-2">Only the items above can be changed. Fix them, then resubmit from the last step.</p>
            </AlertDescription>
          </Alert>
        )}
        <Tabs value={step} onValueChange={setStep}>
          <TabsList className="mb-4 w-full justify-start overflow-x-auto">
            <TabsTrigger value="about">1. About you</TabsTrigger>
            <TabsTrigger value="details">2. Details</TabsTrigger>
            <TabsTrigger value="docs">3. Documents</TabsTrigger>
            <TabsTrigger value="submit">4. Submit</TabsTrigger>
          </TabsList>
          <TabsContent value="about">
            <Step title="About you" description={app.status === "draft" ? "These details decide your eligibility." : "Locked after submission."} onNext={next("details")}>
              <ProfileForm disabled={app.status !== "draft"} onSaved={() => invalidateApp(app.id)} />
            </Step>
          </TabsContent>
          <TabsContent value="details">
            <Step title="Application details" onNext={next("docs")}>
              {config ? <DetailsForm app={app} keys={formKeys(config)} config={config} editable={editable} /> : <Query q={configs}>{() => <Empty>No published rules for this cycle yet.</Empty>}</Query>}
            </Step>
          </TabsContent>
          <TabsContent value="docs">
            <Step title="Documents" description="PDF, JPG or PNG, up to 5 MB each." onNext={next("submit")}>
              <Documents app={app} editable={editable} />
            </Step>
          </TabsContent>
          <TabsContent value="submit">
            <Step title={app.status === "deficient" ? "Resubmit" : "Review and submit"}>
              <Submit app={app} eligibility={eligibility.data} />
            </Step>
          </TabsContent>
        </Tabs>
      </div>
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Eligibility</CardTitle>
            <CardDescription>Updates as you fill in the form.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
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

function Step({ title, description, onNext, children }: { title: string; description?: string; onNext?: () => void; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-6">
        {children}
        {onNext && (
          <div className="flex justify-end">
            <Button variant="secondary" onClick={onNext}>Next step</Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DetailsForm({ app, keys, config, editable }: { app: AppDetail; keys: string[]; config: RuleConfig["config"]; editable: (k: string) => boolean }) {
  const institutions = useInstitutions().data ?? []
  const [v, setV] = useState<Record<string, any>>(() => ({ ...app.form, institution_id: app.institution_id }))
  const set = (k: string, val: unknown) => setV((p) => ({ ...p, [k]: val }))
  const streams = Object.keys(config.slots?.quota?.stream ?? { science: 0, humanities: 0 })

  const save = useAction(
    () => {
      const form: Record<string, unknown> = {}
      for (const k of keys) {
        if (k === "institution_id" || !editable(k)) continue
        const def = FIELD_DEF[k]
        const raw = v[k]
        form[k] = def.type === "number" ? (raw === "" || raw == null ? null : Number(raw)) : def.type === "checkbox" ? !!raw : raw || null
      }
      const body: Record<string, unknown> = { form }
      if (keys.includes("institution_id") && editable("institution_id")) body.institution_id = v.institution_id || null
      return api(`/applications/${app.id}`, { method: "PATCH", body })
    },
    { success: "Details saved", onSuccess: () => invalidateApp(app.id) },
  )

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
    >
      {keys.map((k) => {
        const def = FIELD_DEF[k]
        const id = `f-${k}`
        const locked = !editable(k)
        const hint = locked ? "Locked. Not part of the deficiency memo." : def.hint
        if (def.type === "checkbox")
          return (
            <div key={k} className="flex items-center gap-2 sm:col-span-2">
              <Checkbox id={id} checked={!!v[k]} onCheckedChange={(c) => set(k, c === true)} disabled={locked} />
              <Label htmlFor={id}>{def.label}</Label>
            </div>
          )
        const options =
          def.type === "institution"
            ? institutions.map((i) => [i.id, `${i.name}${i.verified ? "" : " (not AISHE-verified)"}`])
            : (k === "stream" ? streams : def.options ?? []).map((o) => [o, humanize(o)])
        return (
          <Field key={k} id={id} label={def.label} hint={hint}>
            {def.type === "select" || def.type === "institution" ? (
              <Select value={v[k] ?? ""} onValueChange={(val) => set(k, val)} disabled={locked}>
                <SelectTrigger id={id} className="w-full" aria-describedby={hint ? `${id}-hint` : undefined}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {options.map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={id}
                type={def.type}
                step="any"
                value={v[k] ?? ""}
                onChange={(e) => set(k, e.target.value)}
                disabled={locked}
                aria-describedby={hint ? `${id}-hint` : undefined}
              />
            )}
          </Field>
        )
      })}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save details"}</Button>
      </div>
    </form>
  )
}

type Checklist = { config_version: number; documents: { doc_type: string; status: string }[] }
const MAX_BYTES = 5 * 1024 * 1024

function Documents({ app, editable }: { app: AppDetail; editable: (k: string) => boolean }) {
  const checklist = useQuery({
    queryKey: ["checklist", app.id],
    queryFn: () => api<Checklist>(`/applications/${app.id}/checklist`),
    // Doc AI runs in the background after upload: poll until it settles
    refetchInterval: (q) => (q.state.data?.documents.some((d) => ["pending", "processing"].includes(d.status)) ? 3000 : false),
  })
  const onSettled = () => invalidateApp(app.id)
  const upload = useAction(
    ({ doc_type, file }: { doc_type: string; file: File }) => {
      const fd = new FormData()
      fd.append("doc_type", doc_type)
      fd.append("file", file)
      return api(`/applications/${app.id}/documents`, { body: fd })
    },
    { success: "Uploaded. Checking the document…", onSuccess: onSettled },
  )
  const digilocker = useAction((doc_type: string) => api(`/applications/${app.id}/documents/digilocker`, { body: { doc_type } }), {
    success: "Fetched from DigiLocker",
    onSuccess: onSettled,
  })

  return (
    <Query q={checklist}>
      {(c) => (
        <ul className="grid gap-3">
          {c.documents.map((d) => {
            const doc = app.documents.find((x) => x.doc_type === d.doc_type)
            const locked = !editable(`doc:${d.doc_type}`)
            const id = `doc-${d.doc_type}`
            return (
              <li key={d.doc_type} className="grid gap-2 rounded-lg bg-muted p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label htmlFor={id} className="font-medium">{docLabel(d.doc_type)}</Label>
                  <div className="flex items-center gap-2">
                    {doc?.source === "digilocker" && <span className="text-xs text-muted-foreground">via DigiLocker</span>}
                    <StatusBadge status={d.status} />
                  </div>
                </div>
                {doc?.review_note && <p className="text-sm text-muted-foreground">Officer note: {doc.review_note}</p>}
                {locked ? (
                  <p className="text-xs text-muted-foreground">Locked.</p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      id={id}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      className="max-w-xs"
                      disabled={upload.isPending}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        e.target.value = ""
                        if (!file) return
                        if (file.size > MAX_BYTES) return void toast.error("File is larger than 5 MB")
                        upload.mutate({ doc_type: d.doc_type, file })
                      }}
                    />
                    <Button type="button" size="sm" variant="outline" onClick={() => digilocker.mutate(d.doc_type)} disabled={digilocker.isPending}>
                      Fetch from DigiLocker
                    </Button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Query>
  )
}

function Submit({ app, eligibility }: { app: AppDetail; eligibility?: Eligibility }) {
  const action = app.status === "deficient" ? "resubmit" : "submit"
  const submit = useAction(() => api(`/applications/${app.id}/${action}`, { method: "POST" }), {
    success: action === "submit" ? "Application submitted" : "Application resubmitted",
    onSuccess: () => invalidateApp(app.id),
  })
  const blocked = submit.error instanceof ApiError && submit.error.status === 422 ? (submit.error.detail as { results?: RuleResult[] }).results : undefined

  return (
    <div className="grid gap-4">
      {eligibility && (
        <p className="text-sm">
          Current eligibility: <StatusBadge status={eligibility.summary} label={{ pass: "All criteria met", review: "Some criteria need review", fail: "Not eligible" }[eligibility.summary]} />
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        Criteria marked “needs review” don't stop you from submitting; an officer checks them. Criteria that are not met do.
      </p>
      {blocked && (
        <div>
          <p className="mb-2 text-sm font-medium text-destructive">Submission blocked:</p>
          <RuleResults results={blocked.filter((r) => r.outcome === "fail")} />
        </div>
      )}
      <div>
        <Button size="lg" onClick={() => submit.mutate()} disabled={submit.isPending}>
          {submit.isPending ? "Submitting…" : action === "submit" ? "Submit application" : "Resubmit application"}
        </Button>
      </div>
    </div>
  )
}

// ───────── submitted and later ─────────

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
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Where your application is</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-center gap-2">
            <StatusBadge status={app.status} />
            {app.submitted_at && <span className="text-sm text-muted-foreground">Submitted {fmtDate(app.submitted_at)}</span>}
          </div>
          <HolderLine app={app} />
          {app.status === "awarded" && <p className="text-sm">Congratulations, {me.full_name?.split(" ")[0]}. See “Award & payments” for joining and stipends.</p>}
        </CardContent>
      </Card>

      {rank.data && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Rank card</CardTitle>
            <CardDescription>{rank.data.approved ? "From the approved merit list." : "Provisional: the merit list is not approved yet."}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Facts items={[["Rank", rank.data.rank ?? "—"], ["Selected under", rank.data.category ? humanize(rank.data.category) : "—"]]} />
            <ul className="grid gap-2">
              {rank.data.trace.map((t, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
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

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <Timeline entries={app.timeline} />
        </CardContent>
      </Card>

      <div className="grid gap-6 content-start">
        <Card>
          <CardHeader>
            <CardTitle>Eligibility</CardTitle>
          </CardHeader>
          <CardContent>
            <RuleResults results={app.rule_results} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {app.documents.length ? (
              <ul className="grid gap-2">
                {app.documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 text-sm">
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
