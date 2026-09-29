import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router"

import { Empty, Field, PageHeader, Query, StatusBadge, useAction, useCycles } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import { fmtDateTime, fmtNum, shortId } from "@/lib/format"

type RunSummary = {
  id: string
  config_version: number
  params: Record<string, unknown>
  output_hash: string
  created_at: string
  approved_at: string | null
  selected_count: number
}

const isOfficial = (r: RunSummary) => Object.keys(r.params ?? {}).length === 0

function WhatIfDialog({ cycleId }: { cycleId: string }) {
  const [open, setOpen] = useState(false)
  const [normalise, setNormalise] = useState("none")
  const [netW, setNetW] = useState("")
  const [pgW, setPgW] = useState("")
  const run = useAction(
    () => {
      const params: Record<string, unknown> = { normalise }
      if (netW || pgW) params.score = { net_pct: Number(netW || 0), pg_pct: Number(pgW || 0) }
      return api(`/cycles/${cycleId}/merit-runs`, { body: { params } })
    },
    { success: "Simulation run created", invalidate: [["merit-runs", cycleId]], onSuccess: () => setOpen(false) },
  )
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">What-if run</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What-if simulation</DialogTitle>
          <DialogDescription>Overrides the published merit settings for this run only. Nothing is published.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field id="normalise" label="NET score normalisation">
            <Select value={normalise} onValueChange={setNormalise}>
              <SelectTrigger id="normalise" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (raw NET %)</SelectItem>
                <SelectItem value="percentile_by_subject">Percentile within subject</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="w-net" label="NET weight" hint="Blank = keep config">
              <Input id="w-net" type="number" step="0.05" min="0" max="1" value={netW} onChange={(e) => setNetW(e.target.value)} aria-describedby="w-net-hint" />
            </Field>
            <Field id="w-pg" label="PG marks weight" hint="Blank = keep config">
              <Input id="w-pg" type="number" step="0.05" min="0" max="1" value={pgW} onChange={(e) => setPgW(e.target.value)} aria-describedby="w-pg-hint" />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => run.mutate()} disabled={run.isPending}>
            Run simulation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function Merit() {
  const cycles = useCycles()
  const [cycleId, setCycleId] = useState<string>()
  const [picked, setPicked] = useState<string[]>([])
  const navigate = useNavigate()
  const runs = useQuery({
    queryKey: ["merit-runs", cycleId],
    queryFn: () => api<RunSummary[]>(`/cycles/${cycleId}/merit-runs`),
    enabled: !!cycleId,
  })
  const official = useAction(() => api(`/cycles/${cycleId}/merit-runs`, { body: {} }), {
    success: "Official run created",
    invalidate: [["merit-runs", cycleId]],
  })
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-2)))

  return (
    <>
      <PageHeader title="Merit & selection" description="Rank the eligible pool, compare what-if runs, and approve one run per cycle." />
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-end gap-3">
          <Field id="cycle" label="Cycle" className="min-w-60">
            <Select value={cycleId} onValueChange={(v) => { setCycleId(v); setPicked([]) }}>
              <SelectTrigger id="cycle" className="w-full">
                <SelectValue placeholder={cycles.isPending ? "Loading…" : "Choose a cycle"} />
              </SelectTrigger>
              <SelectContent>
                {cycles.data?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.scheme_code} {c.cycle} ({c.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {cycleId && (
            <>
              <Button onClick={() => official.mutate()} disabled={official.isPending}>
                Official run
              </Button>
              <WhatIfDialog cycleId={cycleId} />
              <Button variant="outline" disabled={picked.length !== 2} onClick={() => navigate(`/merit/runs/${picked[0]}?diff=${picked[1]}`)}>
                Compare selected ({picked.length}/2)
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {cycleId && (
        <Card>
          <CardHeader>
            <CardTitle>Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <Query q={runs}>
              {(rows) =>
                rows.length ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10"><span className="sr-only">Compare</span></TableHead>
                          <TableHead>Run</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Config</TableHead>
                          <TableHead className="text-right">Selected</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Output hash</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((r) => (
                          <TableRow key={r.id}>
                            <TableCell>
                              <Checkbox checked={picked.includes(r.id)} onCheckedChange={() => toggle(r.id)} aria-label={`Compare run ${shortId(r.id)}`} />
                            </TableCell>
                            <TableCell>
                              <Link className="font-medium underline-offset-4 hover:underline" to={`/merit/runs/${r.id}`}>
                                {shortId(r.id)}
                              </Link>
                            </TableCell>
                            <TableCell className="space-x-1">
                              {isOfficial(r) ? <StatusBadge status="official" label="Official" tone="accent" /> : <StatusBadge status="simulation" label="Simulation" tone="neutral" />}
                              {r.approved_at && <StatusBadge status="approved" label="Approved" />}
                              {!isOfficial(r) && <span className="text-xs text-muted-foreground">{JSON.stringify(r.params)}</span>}
                            </TableCell>
                            <TableCell>v{r.config_version}</TableCell>
                            <TableCell className="text-right tabular-nums">{fmtNum(r.selected_count)}</TableCell>
                            <TableCell>{fmtDateTime(r.created_at)}</TableCell>
                            <TableCell className="font-mono text-xs">{r.output_hash.slice(0, 12)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <Empty>No runs yet for this cycle.</Empty>
                )
              }
            </Query>
          </CardContent>
        </Card>
      )}
    </>
  )
}
