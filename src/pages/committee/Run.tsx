import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useParams, useSearchParams } from "react-router"
import { Download } from "lucide-react"

import { Empty, Facts, Field, PageHeader, Query, StatusBadge, useAction, useMe } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api, download } from "@/lib/api"
import { fmtDateTime, fmtNum, humanize, shortId } from "@/lib/format"

type TraceStep = { cat: string; considered: boolean; outcome: string; cutoff: number | null }
type Run = {
  id: string
  cycle_id: string
  config_version: number
  params: Record<string, unknown>
  input_hash: string
  output_hash: string
  created_at: string
  approved_at: string | null
  result: {
    selected: { app_id: string; category: string; rank: number }[]
    waitlist: Record<string, string[]>
    fill: Record<string, { seats: number; filled: number; vacant_to: string | null }>
    trace: Record<string, TraceStep[]>
  }
}
type Breakdown = Record<"by_state" | "by_gender" | "by_category", Record<string, number>>
type Diff = {
  moved_in: { app_id: string; category: string }[]
  moved_out: { app_id: string; category: string }[]
  moved_in_breakdown: Breakdown
  moved_out_breakdown: Breakdown
}

const PAGE = 50

function FillTable({ fill }: { fill: Run["result"]["fill"] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Filled / seats</TableHead>
            <TableHead className="w-2/5">Fill</TableHead>
            <TableHead>Vacancies go to</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(fill).map(([cat, f]) => {
            const pct = f.seats ? Math.min(100, (f.filled / f.seats) * 100) : 0
            return (
              <TableRow key={cat}>
                <TableCell className="font-medium">{humanize(cat)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {fmtNum(f.filled)} / {fmtNum(f.seats)}
                </TableCell>
                <TableCell>
                  <div className="h-2 rounded-full bg-muted" role="img" aria-label={`${Math.round(pct)}% filled`}>
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{f.vacant_to ? humanize(f.vacant_to) : "—"}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function SelectedTable({ selected }: { selected: Run["result"]["selected"] }) {
  const [cat, setCat] = useState("all")
  const [page, setPage] = useState(0)
  const cats = useMemo(() => [...new Set(selected.map((s) => s.category))], [selected])
  const rows = useMemo(() => selected.filter((s) => cat === "all" || s.category === cat).sort((a, b) => a.rank - b.rank), [selected, cat])
  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  return (
    <>
      <Field id="sel-cat" label="Category" className="mb-3 max-w-60">
        <Select value={cat} onValueChange={(v) => { setCat(v); setPage(0) }}>
          <SelectTrigger id="sel-cat" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({selected.length})</SelectItem>
            {cats.map((c) => (
              <SelectItem key={c} value={c}>
                {humanize(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">Rank</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Application</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(page * PAGE, (page + 1) * PAGE).map((s) => (
              <TableRow key={s.app_id}>
                <TableCell className="text-right tabular-nums">{s.rank}</TableCell>
                <TableCell>{humanize(s.category)}</TableCell>
                <TableCell>
                  <Link className="font-mono underline-offset-4 hover:underline" to={`/applications/${s.app_id}`}>
                    {shortId(s.app_id)}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 text-sm">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
          Previous
        </Button>
        <span aria-live="polite">
          Page {page + 1} of {pages}
        </span>
        <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>
          Next
        </Button>
      </div>
    </>
  )
}

function TraceLookup({ trace }: { trace: Run["result"]["trace"] }) {
  const [id, setId] = useState("")
  const key = id.trim()
  const steps = key ? trace[key] : undefined
  return (
    <>
      <Field id="trace-id" label="Application ID" hint="Full application ID, as shown on the application page.">
        <Input id="trace-id" value={id} onChange={(e) => setId(e.target.value)} aria-describedby="trace-id-hint" className="font-mono" />
      </Field>
      {key && !steps && <Empty>Not in this run's merit pool.</Empty>}
      {steps && (
        <ol className="mt-3 grid gap-2">
          {steps.map((s, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
              <span className="font-medium">{humanize(s.cat)}</span>
              <StatusBadge status={s.outcome === "selected" ? "selected" : "waitlisted"} label={humanize(s.outcome)} />
              <span className="text-muted-foreground">cut-off {s.cutoff ?? "—"}</span>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}

function CountTable({ title, data }: { title: string; data: Record<string, number> }) {
  return (
    <div>
      <h4 className="mb-1 text-xs font-medium text-muted-foreground">{title}</h4>
      <Table>
        <TableBody>
          {Object.entries(data).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
            <TableRow key={k}>
              <TableCell>{k === "null" ? "Unknown" : humanize(k)}</TableCell>
              <TableCell className="text-right tabular-nums">{n}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function DiffCard({ a, b }: { a: string; b: string }) {
  const diff = useQuery({ queryKey: ["merit-diff", a, b], queryFn: () => api<Diff>(`/merit-runs/${a}/diff/${b}`) })
  return (
    <Card className="mb-6 shadow-sm">
      <CardHeader className="py-4 border-b bg-card/50">
        <CardTitle>
          Compared with run <Link className="underline underline-offset-4" to={`/merit/runs/${b}`}>{shortId(b)}</Link>
        </CardTitle>
        <CardDescription>"Moved in" are selected in {shortId(b)} but not in {shortId(a)}.</CardDescription>
      </CardHeader>
      <CardContent>
        <Query q={diff}>
          {(d) => (
            <div className="grid gap-6 md:grid-cols-2">
              {(["in", "out"] as const).map((dir) => {
                const bd = d[`moved_${dir}_breakdown`]
                return (
                  <div key={dir}>
                    <p className="mb-3 text-sm">
                      <span className="text-3xl font-semibold tabular-nums">{d[`moved_${dir}`].length}</span>{" "}
                      <span className="text-muted-foreground">moved {dir}</span>
                    </p>
                    <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
                      <CountTable title="By state" data={bd.by_state} />
                      <CountTable title="By gender" data={bd.by_gender} />
                      <CountTable title="By category" data={bd.by_category} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Query>
      </CardContent>
    </Card>
  )
}

export default function Run() {
  const { id } = useParams() as { id: string }
  const [params] = useSearchParams()
  const diffWith = params.get("diff")
  const me = useMe()
  const run = useQuery({ queryKey: ["merit-run", id], queryFn: () => api<Run>(`/merit-runs/${id}`) })
  const approve = useAction(() => api(`/merit-runs/${id}/approve`, { body: {} }), {
    success: "Merit list approved and published",
    invalidate: [["merit-run", id], ["merit-runs"]],
  })

  return (
    <Query q={run}>
      {(r) => {
        const official = Object.keys(r.params ?? {}).length === 0
        return (
          <>
            <PageHeader
              title={`Merit run ${shortId(r.id)}`}
              description={`Config v${r.config_version} · ${fmtDateTime(r.created_at)}`}
              actions={
                <>
                  <Button variant="outline" onClick={() => download(`/merit-runs/${id}/export.csv`, `merit-run-${shortId(id)}.csv`)}>
                    <Download /> Export CSV
                  </Button>
                  {me.role === "committee_member" && official && !r.approved_at && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>Approve & publish</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Approve this merit run?</DialogTitle>
                          <DialogDescription>
                            This publishes results to every applicant in the pool: {fmtNum(r.result.selected.length)} selected, the rest
                            waitlisted or not selected. Only one run can be approved per cycle, and it cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogClose>
                          <Button onClick={() => approve.mutate()} disabled={approve.isPending}>
                            Approve
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </>
              }
            />
            <div className="mb-6 flex flex-wrap gap-2">
              {official ? <StatusBadge status="official" label="Official" tone="accent" /> : <StatusBadge status="simulation" label="Simulation" tone="neutral" />}
              {r.approved_at && <StatusBadge status="approved" label={`Approved ${fmtDateTime(r.approved_at)}`} />}
            </div>

            {diffWith && <DiffCard a={id} b={diffWith} />}

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="shadow-sm">
                <CardHeader className="py-4 border-b bg-card/50">
                  <CardTitle className="text-base font-semibold">Seat fill</CardTitle>
                </CardHeader>
                <CardContent>
                  <FillTable fill={r.result.fill} />
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader className="py-4 border-b bg-card/50">
                  <CardTitle className="text-base font-semibold">Reproducibility</CardTitle>
                  <CardDescription>Same inputs and settings always give the same hashes.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <Facts
                    items={[
                      ["Input hash", <span key="input-hash" className="font-mono text-xs">{r.input_hash}</span>],
                      ["Output hash", <span key="output-hash" className="font-mono text-xs">{r.output_hash}</span>],
                      ["Settings", official ? "Published config" : <span key="settings" className="font-mono text-xs">{JSON.stringify(r.params)}</span>],
                    ]}
                  />
                  <div>
                    <h3 className="mb-1 text-sm font-medium">Waitlist</h3>
                    {Object.keys(r.result.waitlist).length ? (
                      <Facts items={Object.entries(r.result.waitlist).map(([c, ids]) => [humanize(c), fmtNum(ids.length)])} />
                    ) : (
                      <Empty>No one waitlisted.</Empty>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader className="py-4 border-b bg-card/50">
                  <CardTitle className="text-base font-semibold">Selected ({fmtNum(r.result.selected.length)})</CardTitle>
                </CardHeader>
                <CardContent>
                  <SelectedTable selected={r.result.selected} />
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader className="py-4 border-b bg-card/50">
                  <CardTitle className="text-base font-semibold">Trace an applicant</CardTitle>
                  <CardDescription>Every category the applicant was considered for, and the cut-off there.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TraceLookup trace={r.result.trace} />
                </CardContent>
              </Card>
            </div>
          </>
        )
      }}
    </Query>
  )
}
