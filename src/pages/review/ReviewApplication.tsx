import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router"

import { HolderLine, RuleResults, Timeline } from "@/components/application-parts"
import { Empty, Facts, Field, PageHeader, Query, StatusBadge, useAction, useInstitutions, useMe } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { docLabel, FACT_FIELD, fmtDate, humanize, shortId } from "@/lib/format"
import type { AppDetail, Deficiency, Doc, RuleConfig, RuleResult } from "@/lib/types"
import { cn } from "@/lib/utils"

// Facts that come from a form key under a different name (backend/utils/facts.py). Profile-sourced facts
// (age, gender, is_pvtg…) have no form key: the applicant can't edit them via a deficiency.
const REJECT_CODES = ["NOT_ST", "AGE", "MARKS", "NET", "COURSE", "INSTITUTION", "OTHER_FELLOWSHIP", "INCOME", "DUPLICATE", "OTHER"]

type Flag = { id: string; application_id: string; signal: string; details: Record<string, any>; status: string }

export default function ReviewApplication() {
  const { id } = useParams()
  const q = useQuery({ queryKey: ["application", id], queryFn: () => api<AppDetail>(`/applications/${id}`) })
  return <Query q={q}>{(app) => <Review app={app} />}</Query>
}

function Review({ app }: { app: AppDetail }) {
  const me = useMe()
  const key = ["application", app.id]
  const canAct = me.role === app.holder
  const a = app.applicant

  return (
    <>
      <PageHeader
        title={a?.full_name ?? "Unnamed applicant"}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {app.cycle?.scheme_code} {app.cycle?.cycle} · {shortId(app.id)} <StatusBadge status={app.status} />
          </span>
        }
        actions={canAct && <Decisions app={app} />}
      />
      <div className="mb-6">
        <HolderLine app={app} />
      </div>

      <DocVerify app={app} canAct={canAct} />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Eligibility</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <RuleResults results={app.rule_results} />
            {canAct && app.rule_results.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {app.rule_results.map((r) => (
                  <OverrideDialog key={r.rule_id} appId={app.id} rule={r} invalidate={key} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <RiskFlags appId={app.id} canAct={canAct} />
        <Card>
          <CardHeader>
            <CardTitle>Applicant</CardTitle>
          </CardHeader>
          <CardContent>
            <Facts
              items={[
                ["Email", a?.email],
                ["Date of birth", fmtDate(a?.dob)],
                ["Gender", a?.gender],
                ["State / district", [a?.state_code, a?.district].filter(Boolean).join(" / ")],
                ["Community", a?.st_community],
                ["PVTG", a?.is_pvtg ? "Yes" : "No"],
                ["Divyang", a?.is_divyang ? "Yes" : "No"],
                ...Object.entries(app.form).map(([k, v]) => [humanize(k), String(v)] as [string, string]),
              ]}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {app.deficiency && (
              <p className="mb-4 text-sm">
                <StatusBadge status="deficient" label="Open deficiency" /> due {fmtDate(app.deficiency.due_at)}
              </p>
            )}
            <Timeline entries={app.timeline} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}

// ───────── documents: list + viewer side by side ─────────

function DocVerify({ app, canAct }: { app: AppDetail; canAct: boolean }) {
  const [sel, setSel] = useState<string | undefined>(app.documents[0]?.id)
  const doc = app.documents.find((d) => d.id === sel)
  const institutions = useInstitutions().data
  const a = app.applicant
  // What the applicant declared, to sit next to what Doc AI extracted.
  const declared: Record<string, unknown> = {
    name: a?.full_name, dob: a?.dob, community: app.form.community ?? a?.st_community, is_divyang: a?.is_divyang,
    is_pvtg: a?.is_pvtg, institution_name: institutions?.find((i) => i.id === app.institution_id)?.name, ...app.form,
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent>
        {!app.documents.length ? (
          <Empty>No documents uploaded.</Empty>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <ul className="grid content-start gap-2">
              {app.documents.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => setSel(d.id)}
                    aria-pressed={d.id === sel}
                    className={cn("flex w-full items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-left text-sm ring-primary", d.id === sel && "ring-2")}
                  >
                    <span>
                      {docLabel(d.doc_type)}
                      <span className="block text-xs text-muted-foreground">
                        {d.source === "digilocker" ? "DigiLocker" : "Upload"}
                        {d.confidence != null && ` · ${Math.round(d.confidence * 100)}% confidence`}
                      </span>
                    </span>
                    <StatusBadge status={d.status} />
                  </button>
                </li>
              ))}
            </ul>
            {doc && <DocPanel key={doc.id} doc={doc} declared={declared} canAct={canAct} invalidate={["application", app.id]} />}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DocPanel({ doc, declared, canAct, invalidate }: { doc: Doc; declared: Record<string, unknown>; canAct: boolean; invalidate: string[] }) {
  const [note, setNote] = useState(doc.review_note ?? "")
  const url = useQuery({
    queryKey: ["doc-url", doc.id],
    queryFn: () => api<{ url: string | null }>(`/documents/${doc.id}/url`),
    enabled: !!doc.storage_path,
    staleTime: 240_000, // signed URLs live 5 minutes
  })
  const decide = useAction((status: "verified" | "rejected") => api(`/documents/${doc.id}`, { method: "PATCH", body: { status, note: note || null } }), {
    success: (r) => `Document ${r.status}`,
    invalidate: [invalidate],
  })
  const fields = Object.entries(doc.extracted ?? {})
  const isPdf = doc.storage_path?.toLowerCase().endsWith(".pdf")

  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-lg bg-muted">
        {!doc.storage_path ? (
          <p className="p-4 text-sm text-muted-foreground">Fetched from DigiLocker: no file, fields below are issuer-verified.</p>
        ) : url.isPending ? (
          <p className="p-4 text-sm text-muted-foreground">Loading file…</p>
        ) : !url.data?.url ? (
          <p className="p-4 text-sm text-muted-foreground">File preview unavailable (document storage is not configured).</p>
        ) : isPdf ? (
          <iframe src={url.data.url} title={docLabel(doc.doc_type)} className="h-[28rem] w-full bg-white" />
        ) : (
          <img src={url.data.url} alt={docLabel(doc.doc_type)} className="max-h-[28rem] w-full object-contain" />
        )}
      </div>
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="py-1 font-normal">Field</th>
            <th className="py-1 font-normal">Extracted</th>
            <th className="py-1 font-normal">Declared</th>
          </tr>
        </thead>
        <tbody>
          {fields.map(([k, v]) => {
            const d = declared[k]
            const mismatch = v != null && d != null && String(v).toLowerCase() !== String(d).toLowerCase()
            return (
              <tr key={k} className={cn(mismatch && "text-review")}>
                <td className="py-1">{humanize(k)}</td>
                <td className="py-1">{v == null ? "—" : String(v)}</td>
                <td className="py-1">
                  {d == null ? "—" : String(d)}
                  {mismatch && <span className="sr-only"> (does not match)</span>}
                </td>
              </tr>
            )
          })}
          {!fields.length && (
            <tr>
              <td colSpan={3} className="py-2 text-muted-foreground">
                Nothing extracted yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {canAct && (
        <div className="grid gap-2">
          <Field id="doc-note" label="Note (shown to the applicant on rejection)">
            <Input id="doc-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="flex gap-2">
            <Button onClick={() => decide.mutate("verified")} disabled={decide.isPending}>
              Verify document
            </Button>
            <Button variant="destructive" onClick={() => decide.mutate("rejected")} disabled={decide.isPending}>
              Reject document
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ───────── decisions: verify / approve / reject / deficiency ─────────

function Decisions({ app }: { app: AppDetail }) {
  const me = useMe()
  const invalidate = [["application", app.id], ["queue"]]
  const decide = useAction((body: { action: string; note?: string; reason_code?: string }) => api(`/applications/${app.id}/decision`, { body }), {
    success: (r) => `Moved to ${humanize(r.status)}`,
    invalidate,
  })
  const atMinistry = me.role === "scrutiny_officer" && app.status === "ministry_review"
  return (
    <>
      {atMinistry ? (
        <>
          <Button onClick={() => decide.mutate({ action: "approve" })} disabled={decide.isPending}>
            Approve as eligible
          </Button>
          <RejectDialog onReject={(reason_code, note) => decide.mutate({ action: "reject", reason_code, note })} pending={decide.isPending} />
        </>
      ) : (
        <Button onClick={() => decide.mutate({ action: "verify" })} disabled={decide.isPending}>
          Verify and forward
        </Button>
      )}
      <DeficiencyDialog app={app} invalidate={invalidate} />
    </>
  )
}

function RejectDialog({ onReject, pending }: { onReject: (code: string, note: string) => void; pending: boolean }) {
  const [code, setCode] = useState("")
  const [note, setNote] = useState("")
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive">Reject</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject application</DialogTitle>
        </DialogHeader>
        <Field id="reject-code" label="Reason">
          <Select value={code} onValueChange={setCode}>
            <SelectTrigger id="reject-code" className="w-full">
              <SelectValue placeholder="Choose a reason" />
            </SelectTrigger>
            <SelectContent>
              {REJECT_CODES.map((c) => (
                <SelectItem key={c} value={c}>
                  {humanize(c.toLowerCase())}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="reject-note" label="Note to the applicant">
          <Textarea id="reject-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="destructive" disabled={!code || pending} onClick={() => onReject(code, note)}>
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type Item = { key: string; label: string; checked: boolean; item: Deficiency["items"][number] }

function DeficiencyDialog({ app, invalidate }: { app: AppDetail; invalidate: unknown[][] }) {
  const [open, setOpen] = useState(false)
  const configs = useQuery({ queryKey: ["configs", app.cycle_id], queryFn: () => api<RuleConfig[]>(`/cycles/${app.cycle_id}/configs`), enabled: open })
  const [items, setItems] = useState<Item[] | null>(null)
  const [memo, setMemo] = useState("")

  // Build the candidate list once the pinned config (rule → fact) is known.
  const rules = configs.data?.find((c) => c.version === app.config_version)?.config.eligibility
  const list: Item[] | null =
    items ??
    (configs.data
      ? [
          ...app.rule_results
            .filter((r) => r.outcome !== "pass")
            .map((r) => {
              const field = FACT_FIELD[rules?.find((x) => x.id === r.rule_id)?.fact ?? ""]
              return { key: `rule:${r.rule_id}`, label: r.reason, checked: r.outcome === "fail", item: { rule_id: r.rule_id, field, message: r.reason } }
            }),
          ...app.documents
            .filter((d) => d.status === "needs_review" || d.status === "rejected")
            .map((d) => ({
              key: `doc:${d.doc_type}`,
              label: `${docLabel(d.doc_type)} (${humanize(d.status)})`,
              checked: d.status === "rejected",
              item: { doc_type: d.doc_type, message: `Please upload a clear, valid ${docLabel(d.doc_type)}.${d.review_note ? ` ${d.review_note}` : ""}` },
            })),
        ]
      : null)
  const update = (key: string, patch: Partial<Item> | ((i: Item) => Partial<Item>)) =>
    setItems((list ?? []).map((i) => (i.key === key ? { ...i, ...(typeof patch === "function" ? patch(i) : patch) } : i)))
  const chosen = (list ?? []).filter((i) => i.checked).map((i) => i.item)

  const draft = useAction(() => api<{ memo: string }>(`/applications/${app.id}/deficiency/draft`, { body: { items: chosen } }), {
    onSuccess: (r) => setMemo(r.memo),
  })
  const issue = useAction(() => api(`/applications/${app.id}/deficiency`, { body: { items: chosen, memo: memo || null } }), {
    success: "Deficiency memo issued",
    invalidate,
    onSuccess: () => setOpen(false),
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Raise deficiency</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Deficiency memo</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">One memo per round. Only the ticked items become editable for the applicant.</p>
        {!list ? (
          <p className="text-sm">Loading…</p>
        ) : !list.length ? (
          <Empty>No failing rules or flagged documents to raise.</Empty>
        ) : (
          <ul className="grid gap-3">
            {list.map((i) => (
              <li key={i.key} className="grid gap-1.5">
                <div className="flex items-center gap-2">
                  <Checkbox id={i.key} checked={i.checked} onCheckedChange={(c) => update(i.key, { checked: c === true })} />
                  <label htmlFor={i.key} className="text-sm">
                    {i.label}
                    {i.item.rule_id && !i.item.field && !i.item.doc_type && <span className="text-muted-foreground"> (profile field, not unlockable)</span>}
                  </label>
                </div>
                {i.checked && (
                  <Input
                    aria-label={`Message for ${i.label}`}
                    value={i.item.message ?? ""}
                    onChange={(e) => update(i.key, (x) => ({ item: { ...x.item, message: e.target.value } }))}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        <Field id="memo" label="Memo" hint="Leave blank to have it drafted automatically on issue.">
          <Textarea id="memo" rows={8} value={memo} onChange={(e) => setMemo(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="outline" disabled={!chosen.length || draft.isPending} onClick={() => draft.mutate()}>
            {draft.isPending ? "Drafting…" : "Draft with AI"}
          </Button>
          <Button disabled={!chosen.length || issue.isPending} onClick={() => issue.mutate()}>
            Issue memo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function OverrideDialog({ appId, rule, invalidate }: { appId: string; rule: RuleResult; invalidate: string[] }) {
  const [open, setOpen] = useState(false)
  const [outcome, setOutcome] = useState<string>(rule.outcome)
  const [reason, setReason] = useState("")
  const save = useAction(() => api(`/rule-results/${appId}/${rule.rule_id}/override`, { body: { outcome, reason } }), {
    success: "Rule overridden",
    invalidate: [invalidate],
    onSuccess: () => setOpen(false),
  })
  const id = `ov-${rule.rule_id}`
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Override {humanize(rule.rule_id)}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Override: {humanize(rule.rule_id)}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{rule.reason}</p>
        <Field id={`${id}-o`} label="Outcome">
          <Select value={outcome} onValueChange={setOutcome}>
            <SelectTrigger id={`${id}-o`} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pass">Met</SelectItem>
              <SelectItem value="review">Needs review</SelectItem>
              <SelectItem value="fail">Not met</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field id={`${id}-r`} label="Reason (recorded in the audit log)">
          <Textarea id={`${id}-r`} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button disabled={!reason.trim() || save.isPending} onClick={() => save.mutate()}>
            Save override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ───────── risk flags ─────────

function RiskFlags({ appId, canAct }: { appId: string; canAct: boolean }) {
  const q = useQuery({ queryKey: ["risk-flags", appId], queryFn: () => api<Flag[]>(`/risk-flags?application_id=${appId}`) })
  const patch = useAction(({ id, status }: { id: string; status: string }) => api(`/risk-flags/${id}`, { method: "PATCH", body: { status } }), {
    success: "Flag updated",
    invalidate: [["risk-flags"], ["application", appId]],
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk flags</CardTitle>
      </CardHeader>
      <CardContent>
        <Query q={q}>
          {(all) => {
            const flags = all.filter((f) => f.application_id === appId)
            if (!flags.length) return <Empty>No risk signals.</Empty>
            return (
              <ul className="grid gap-2">
                {flags.map((f) => (
                  <li key={f.id} className="grid gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{humanize(f.signal)}</span>
                      <StatusBadge status={f.status} />
                    </div>
                    <FlagDetails details={f.details} />
                    {canAct && f.status === "open" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => patch.mutate({ id: f.id, status: "cleared" })}>
                          Clear
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => patch.mutate({ id: f.id, status: "confirmed" })}>
                          Confirm
                        </Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )
          }}
        </Query>
      </CardContent>
    </Card>
  )
}

/** Summarises risk.py's details shapes; other application ids become links. */
export function FlagDetails({ details }: { details: Record<string, any> }) {
  const others: string[] = [...(details.other_applications ?? []), ...(details.docs ?? []).flatMap((d: any) => d.other_applications ?? [])]
  return (
    <div className="text-xs text-muted-foreground">
      {details.bank_account && <div>Bank account {details.bank_account} is used on other applications.</div>}
      {details.docs && <div>Identical file ({details.docs.map((d: any) => docLabel(d.doc_type)).join(", ")}) submitted by other applicants.</div>}
      {details.today != null && (
        <div>
          Institution submitted {details.today} today vs a median of {details.median}/day.
        </div>
      )}
      {others.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-2">
          Also on:
          {[...new Set(others)].map((o) => (
            <Link key={o} to={`/applications/${o}`} className="underline underline-offset-4">
              {shortId(o)}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
