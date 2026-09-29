import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { Empty, Field, PageHeader, Query, StatusBadge, useAction } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/api"
import { currentPeriod, fmtDateTime, fmtMoney, humanize } from "@/lib/format"
import type { Payment } from "@/lib/types"

const STATUSES = ["generated", "sent", "credited", "failed"]

function Batches() {
  const [period, setPeriod] = useState(currentPeriod())
  const [status, setStatus] = useState("all")
  const qs = new URLSearchParams({ limit: "200", ...(period && { period }), ...(status !== "all" && { status }) })
  const payments = useQuery({ queryKey: ["payments", period, status], queryFn: () => api<Payment[]>(`/payments?${qs}`) })
  const inv = { invalidate: [["payments"]] }
  const generate = useAction(() => api(`/payments/batches`, { body: { period } }), { ...inv, success: (r) => `Generated ${r.generated} payments` })
  const send = useAction(() => api(`/payments/batches/${encodeURIComponent(period)}/send`, { body: {} }), { ...inv, success: (r) => `Sent ${r.sent} payments to PFMS` })
  const sync = useAction(() => api(`/payments/sync`, { body: {} }), { ...inv, success: (r) => `Synced ${r.synced} payments` })

  return (
    <Card className="shadow-sm">
      <CardHeader className="py-4 border-b bg-card/50">
        <CardTitle>Quarterly batches</CardTitle>
        <CardDescription>Generate covers active awards with an approved continuation for the quarter. The batch ID is the period.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <Field id="period" label="Period" hint="e.g. FY27-Q2 (Indian FY)">
            <Input id="period" value={period} onChange={(e) => setPeriod(e.target.value.trim())} className="w-36" aria-describedby="period-hint" />
          </Field>
          <Field id="status" label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {humanize(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Button onClick={() => generate.mutate()} disabled={!period || generate.isPending}>
            Generate
          </Button>
          <Button variant="outline" onClick={() => send.mutate()} disabled={!period || send.isPending}>
            Send to PFMS
          </Button>
          <Button variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending}>
            Sync PFMS status
          </Button>
        </div>
        <Query q={payments}>
          {(rows) => (rows.length ? <PaymentsTable rows={rows} /> : <Empty>No payments for this filter.</Empty>)}
        </Query>
      </CardContent>
    </Card>
  )
}

function PaymentsTable({ rows }: { rows: Payment[] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead>Kind</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>History</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{p.period}</TableCell>
              <TableCell>{humanize(p.kind)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmtMoney(p.amount)}</TableCell>
              <TableCell className="space-x-1">
                <StatusBadge status={p.status} />
                {p.failure_code && <span className="text-xs text-muted-foreground">{humanize(p.failure_code)}</span>}
              </TableCell>
              <TableCell>
                {p.timeline.length ? (
                  <details>
                    <summary className="cursor-pointer text-xs text-muted-foreground">{p.timeline.length} events</summary>
                    <ul className="mt-1 grid gap-0.5 text-xs">
                      {p.timeline.map((t, i) => (
                        <li key={i}>
                          {humanize(t.status)} · {fmtDateTime(t.at)}
                          {t.pfms_ref && ` · ${t.pfms_ref}`}
                          {t.failure_code && ` · ${t.failure_code}`}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function Arrears() {
  const [scheme, setScheme] = useState("NFST")
  const [from, setFrom] = useState("")
  const create = useAction(() => api(`/payments/arrears`, { body: { scheme, effective_from: from } }), {
    success: (r) => `Created ${r.created} arrear payments`,
    invalidate: [["payments"]],
  })
  const send = useAction(() => api(`/payments/batches/arrear-${from}/send`, { body: {} }), {
    success: (r) => `Sent ${r.sent} arrear payments to PFMS`,
    invalidate: [["payments"]],
  })
  return (
    <Card className="shadow-sm">
      <CardHeader className="py-4 border-b bg-card/50">
        <CardTitle>Arrears after a rate revision</CardTitle>
        <CardDescription>
          Add the new rate table first (Cycles & rules). This recomputes every paid quarter on or after the date and creates an arrear
          payment for any shortfall.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <Field id="scheme" label="Scheme">
          <Select value={scheme} onValueChange={setScheme}>
            <SelectTrigger id="scheme" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NFST">NFST</SelectItem>
              <SelectItem value="NOS">NOS</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field id="eff" label="Revision effective from">
          <Input id="eff" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Button onClick={() => create.mutate()} disabled={!from || create.isPending}>
          Compute arrears
        </Button>
        <Button variant="outline" onClick={() => send.mutate()} disabled={!from || send.isPending}>
          Send arrears batch
        </Button>
      </CardContent>
    </Card>
  )
}

type Forecast = { fy: string; fy_start: string; active_total: number; fresh_total: number; total: number }

function ForecastTab() {
  const [fy, setFy] = useState(currentPeriod().split("-")[0])
  const [slots, setSlots] = useState("0")
  const [months, setMonths] = useState("0")
  const [args, setArgs] = useState<string>()
  const fc = useQuery({ queryKey: ["forecast", args], queryFn: () => api<Forecast>(`/finance/forecast?${args}`), enabled: !!args })
  return (
    <Card className="shadow-sm">
      <CardHeader className="py-4 border-b bg-card/50">
        <CardTitle>Budget forecast</CardTitle>
        <CardDescription>Active awards for the rest of the FY at current rates, plus fresh intake at the month-1 stipend.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            setArgs(new URLSearchParams({ fy, fresh_slots: slots || "0", fresh_months: months || "0" }).toString())
          }}
        >
          <Field id="fy" label="Financial year" hint="e.g. FY27 = Apr 2026 to Mar 2027">
            <Input id="fy" value={fy} onChange={(e) => setFy(e.target.value.trim())} className="w-28" aria-describedby="fy-hint" />
          </Field>
          <Field id="slots" label="Fresh slots">
            <Input id="slots" type="number" min="0" value={slots} onChange={(e) => setSlots(e.target.value)} className="w-28" />
          </Field>
          <Field id="months" label="Months funded">
            <Input id="months" type="number" min="0" max="12" value={months} onChange={(e) => setMonths(e.target.value)} className="w-28" />
          </Field>
          <Button type="submit" disabled={!/^FY\d{2}$/.test(fy)}>
            Forecast
          </Button>
        </form>
        {args && (
          <Query q={fc}>
            {(f) => (
              <dl className="grid gap-4 sm:grid-cols-3">
                {(
                  [
                    ["Active awards", f.active_total],
                    ["Fresh intake", f.fresh_total],
                    [`Total ${f.fy}`, f.total],
                  ] as const
                ).map(([label, v]) => (
                  <div key={label} className="rounded-lg bg-muted p-4">
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="mt-1 text-2xl font-semibold tabular-nums">{fmtMoney(v)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </Query>
        )}
      </CardContent>
    </Card>
  )
}

export default function Finance() {
  return (
    <>
      <PageHeader title="Payments" description="Quarterly fellowship batches through PFMS, arrears and budget forecast." />
      <Tabs defaultValue="batches">
        <TabsList>
          <TabsTrigger value="batches">Batches</TabsTrigger>
          <TabsTrigger value="arrears">Arrears</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
        </TabsList>
        <TabsContent value="batches">
          <Batches />
        </TabsContent>
        <TabsContent value="arrears">
          <Arrears />
        </TabsContent>
        <TabsContent value="forecast">
          <ForecastTab />
        </TabsContent>
      </Tabs>
    </>
  )
}
