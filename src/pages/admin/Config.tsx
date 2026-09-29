import { useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams } from "react-router"

import { Empty, Facts, Field, PageHeader, Query, StatusBadge, useAction, useCycles } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { docLabel, fmtDate, fmtDateTime, shortId } from "@/lib/format"
import type { Condition, RuleConfig } from "@/lib/types"
import { cn } from "@/lib/utils"

const OP: Record<string, string> = { eq: "=", ne: "≠", lt: "<", lte: "≤", gt: ">", gte: "≥", in: "in", not_in: "not in" }
const cond = (c: Condition) => `${c.fact} ${OP[c.op] ?? c.op} ${JSON.stringify(c.value)}`

type Impact = {
  applications_considered: number
  changed: { app_id: string; before: string; after: string; rule_changes: { rule_id: string; before: string | null; after: string }[] }[]
  counts: { before?: Record<string, number>; after?: Record<string, number>; changed?: number }
}

export default function Config() {
  const { id } = useParams()
  const cycle = useCycles().data?.find((c) => c.id === id)
  const q = useQuery({ queryKey: ["configs", id], queryFn: () => api<RuleConfig[]>(`/cycles/${id}/configs`) })
  const [picked, setPicked] = useState<number | null>(null)

  return (
    <>
      <PageHeader
        title={cycle ? `${cycle.scheme_code} ${cycle.cycle} rules` : "Rules"}
        description="Applications pin the latest published version at submit. Published versions are immutable; change rules with a new draft."
        actions={
          <Button variant="outline" asChild>
            <Link to="/admin/cycles">All cycles</Link>
          </Button>
        }
      />
      <Query q={q}>
        {(versions) => {
          const current = versions.find((v) => v.version === picked) ?? versions[0]
          return (
            <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
              <Card className="self-start shadow-sm">
                <CardHeader className="py-4 border-b bg-card/50">
                  <CardTitle>Versions</CardTitle>
                </CardHeader>
                <CardContent>
                  {versions.length ? (
                    <ul className="grid gap-1">
                      {versions.map((v) => (
                        <li key={v.version}>
                          <button
                            type="button"
                            onClick={() => setPicked(v.version)}
                            aria-current={v.version === current?.version}
                            className={cn(
                              "w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted",
                              v.version === current?.version && "bg-muted ring-1 ring-primary",
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">v{v.version}</span>
                              <StatusBadge status={v.published_at ? "pass" : "draft"} label={v.published_at ? "Published" : "Draft"} />
                            </div>
                            <div className="mt-0.5 truncate text-xs text-muted-foreground">{v.circular_ref ?? "No circular"}</div>
                            <div className="text-xs text-muted-foreground">w.e.f. {fmtDate(v.effective_from)}</div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Empty>No versions yet.</Empty>
                  )}
                </CardContent>
              </Card>
              {current ? <Version key={current.version} cycleId={id!} v={current} onCreated={setPicked} /> : <NewDraft cycleId={id!} onCreated={setPicked} />}
            </div>
          )
        }}
      </Query>
    </>
  )
}

function Version({ cycleId, v, onCreated }: { cycleId: string; v: RuleConfig; onCreated: (version: number) => void }) {
  const [json, setJson] = useState(() => JSON.stringify(v.config, null, 2))
  const [confirming, setConfirming] = useState(false)
  let parsed: RuleConfig["config"] | null = null
  let jsonError = ""
  try {
    parsed = JSON.parse(json)
  } catch (e) {
    jsonError = (e as Error).message
  }
  const c = parsed ?? v.config
  const publish = useAction(() => api(`/cycles/${cycleId}/configs/${v.version}/publish`, { method: "POST" }), {
    success: `v${v.version} published`,
    invalidate: [["configs", cycleId]],
    onSuccess: () => setConfirming(false),
  })
  const impact = useAction(() => api<Impact>(`/cycles/${cycleId}/configs/${v.version}/impact`, { method: "POST" }))
  const edited = json !== JSON.stringify(v.config, null, 2)

  return (
    <div className="grid min-w-0 gap-6">
      <Card className="shadow-sm">
        <CardHeader className="py-4 border-b bg-card/50">
          <CardTitle>
            Version {v.version} {v.published_at ? "(published)" : "(draft)"}
          </CardTitle>
          <CardDescription>
            {v.circular_ref ?? "No circular"} · effective {fmtDate(v.effective_from)}
            {v.published_at && ` · published ${fmtDateTime(v.published_at)}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <section>
            <h3 className="mb-2 font-medium">Eligibility rules</h3>
            {c.eligibility?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>If not met</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {c.eligibility.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.id}</TableCell>
                      <TableCell>{r.label}</TableCell>
                      <TableCell className="font-mono text-xs">{cond(r)}</TableCell>
                      <TableCell>{r.on_fail === "review" ? "Review" : "Fail"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Empty>No eligibility rules.</Empty>
            )}
          </section>
          <section>
            <h3 className="mb-2 font-medium">Documents</h3>
            <Facts
              items={[
                ["Always", c.documents?.required?.map(docLabel).join(", ")],
                ...(c.documents?.conditional ?? []).map(
                  (d, i) => [<span key={i} className="font-mono text-xs">{cond(d.when)}</span>, d.docs.map(docLabel).join(", ")] as [ReactNode, ReactNode],
                ),
              ]}
            />
          </section>
          <section>
            <h3 className="mb-2 font-medium">Slots</h3>
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(c.slots ?? {}, null, 2)}</pre>
          </section>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="py-4 border-b bg-card/50">
          <CardTitle>{v.published_at ? "Config JSON (read-only)" : "Edit draft"}</CardTitle>
          <CardDescription>
            {v.published_at
              ? "Edit here and save as a new draft to change the rules."
              : "Drafts can't be edited in place: saving creates the next version from this JSON."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field id="cfg-json" label="Config JSON" hint={jsonError ? `Invalid JSON: ${jsonError}` : undefined}>
            <Textarea
              id="cfg-json"
              rows={20}
              className="font-mono text-xs"
              aria-invalid={!!jsonError}
              value={json}
              onChange={(e) => setJson(e.target.value)}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <NewDraft cycleId={v.cycle_id} config={edited ? parsed : null} disabled={!!jsonError} onCreated={onCreated} />
            <Button variant="outline" disabled={impact.isPending} onClick={() => impact.mutate()}>
              {impact.isPending ? "Checking impact…" : `Preview impact of v${v.version}`}
            </Button>
            {!v.published_at && <Button onClick={() => setConfirming(true)}>Publish v{v.version}</Button>}
          </div>
        </CardContent>
      </Card>

      {impact.data && <ImpactCard r={impact.data} version={v.version} />}

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish version {v.version}?</DialogTitle>
            <DialogDescription>
              New submissions will pin this version. A published version can't be edited or unpublished.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button disabled={publish.isPending} onClick={() => publish.mutate()}>
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Creates the next version: from `config` if given, else a clone of the latest. */
function NewDraft({
  cycleId,
  config = null,
  disabled,
  onCreated,
}: {
  cycleId: string
  config?: RuleConfig["config"] | null
  disabled?: boolean
  onCreated: (version: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [ref, setRef] = useState("")
  const [from, setFrom] = useState("")
  const save = useAction(
    () =>
      api<RuleConfig>(`/cycles/${cycleId}/configs`, {
        body: { ...(config ? { config } : {}), circular_ref: ref || null, effective_from: from || null },
      }),
    {
      success: (r) => `Draft v${r.version} created`,
      invalidate: [["configs", cycleId]],
      onSuccess: (r) => {
        setOpen(false)
        onCreated(r.version)
      },
    },
  )
  return (
    <>
      <Button variant="outline" disabled={disabled} onClick={() => setOpen(true)}>
        {config ? "Save as new draft" : "New draft (clone latest)"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New draft version</DialogTitle>
            <DialogDescription>{config ? "From the edited JSON." : "A copy of the latest version."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <Field id="nd-ref" label="Circular reference">
              <Input id="nd-ref" value={ref} onChange={(e) => setRef(e.target.value)} />
            </Field>
            <Field id="nd-from" label="Effective from" hint="Blank keeps the previous version's date.">
              <Input id="nd-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={save.isPending} onClick={() => save.mutate()}>
              Create draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ImpactCard({ r, version }: { r: Impact; version: number }) {
  const outcomes = ["pass", "review", "fail"] as const
  return (
    <Card className="shadow-sm">
      <CardHeader className="py-4 border-b bg-card/50">
        <CardTitle>Impact of v{version}</CardTitle>
        <CardDescription>
          {r.applications_considered} submitted applications re-evaluated against their pinned version. Nothing is written.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {r.counts.before && r.counts.after && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Overall outcome</TableHead>
                <TableHead className="text-right">Before</TableHead>
                <TableHead className="text-right">After</TableHead>
                <TableHead className="text-right">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outcomes.map((o) => {
                const d = r.counts.after![o] - r.counts.before![o]
                return (
                  <TableRow key={o}>
                    <TableCell>
                      <StatusBadge status={o} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.counts.before![o]}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.counts.after![o]}</TableCell>
                    <TableCell className="text-right tabular-nums">{d > 0 ? `+${d}` : d}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
        <p className="text-sm">
          <strong>{r.changed.length}</strong> applications change on at least one rule
          {r.changed.length > 50 && " (first 50 shown)"}.
        </p>
        {r.changed.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Application</TableHead>
                <TableHead>Overall</TableHead>
                <TableHead>Rules that changed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {r.changed.slice(0, 50).map((c) => (
                <TableRow key={c.app_id}>
                  <TableCell>
                    <Link className="font-mono text-xs text-primary underline-offset-4 hover:underline" to={`/applications/${c.app_id}`}>
                      {shortId(c.app_id)}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <StatusBadge status={c.before} /> → <StatusBadge status={c.after} />
                  </TableCell>
                  <TableCell className="text-xs">
                    {c.rule_changes.map((rc) => `${rc.rule_id}: ${rc.before ?? "—"} → ${rc.after}`).join("; ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
