import { useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Empty, ErrorState, Field, Loading, PageHeader, useCycles, useInstitutions } from "@/components/common"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import { fmtMoney, fmtNum, humanize } from "@/lib/format"

// Pipeline order for the funnel (backend/enums.py AppStatus).
const PIPELINE = [
  "draft", "submitted", "auto_scrutiny", "institute_verification", "ministry_review", "deficient", "eligible",
  "selected", "waitlisted", "state_verification", "awarded", "not_selected", "rejected", "withdrawn",
]
const SELECTED = ["selected", "state_verification", "awarded"]

type Row = Record<string, any>
const NAMES = ["funnel", "pending", "equity", "selection", "finance", "grievances"] as const

function useDashboard(name: (typeof NAMES)[number], cycle: string) {
  return useQuery({
    queryKey: ["dashboard", name, cycle],
    queryFn: () => api<Row[]>(`/dashboards/${name}${cycle === "all" ? "" : `?cycle_id=${cycle}`}`),
  })
}

/** Sum `fields` of rows grouped by `key` (collapses cycles when "All cycles" is picked). */
function sumBy(rows: Row[], key: (r: Row) => string, fields: string[]) {
  const out = new Map<string, Row>()
  for (const r of rows) {
    const k = key(r)
    const acc = out.get(k) ?? { ...r }
    if (out.has(k)) for (const f of fields) acc[f] = Number(acc[f] ?? 0) + Number(r[f] ?? 0)
    else for (const f of fields) acc[f] = Number(r[f] ?? 0)
    out.set(k, acc)
  }
  return [...out.values()]
}

const chartConfig = { value: { label: "Count", color: "var(--chart-1)" } } satisfies ChartConfig

/** Single-series horizontal bar chart: one hue, no legend (the card title names the series). */
function HBar({ data, label, valueLabel }: { data: { name: string; value: number }[]; label: string; valueLabel: string }) {
  if (!data.length) return <Empty>No data.</Empty>
  return (
    <ChartContainer
      config={{ value: { ...chartConfig.value, label: valueLabel } }}
      className="aspect-auto w-full"
      style={{ height: Math.max(160, data.length * 28 + 40) }}
      role="img"
      aria-label={label}
    >
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }} barCategoryGap={2}>
        <CartesianGrid horizontal={false} strokeOpacity={0.4} />
        <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => fmtNum(v)} />
        <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} interval={0} />
        <ChartTooltip cursor={{ fillOpacity: 0.3 }} content={<ChartTooltipContent hideIndicator />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} maxBarSize={20} />
      </BarChart>
    </ChartContainer>
  )
}

function Section({ title, description, children, q }: { title: string; description?: string; children: ReactNode; q: { isPending: boolean; error: unknown } }) {
  return (
    <Card className="min-w-0">
      <CardHeader className="py-4 border-b bg-card/50">
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{q.isPending ? <Loading /> : q.error ? <ErrorState error={q.error} /> : children}</CardContent>
    </Card>
  )
}

function Tile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card size="sm">
      <CardContent>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )
}

export default function Dashboards() {
  const [cycle, setCycle] = useState("all")
  const cycles = useCycles().data ?? []
  const institutions = useInstitutions().data ?? []
  const funnel = useDashboard("funnel", cycle)
  const pending = useDashboard("pending", cycle)
  const equity = useDashboard("equity", cycle)
  const selection = useDashboard("selection", cycle)
  const finance = useDashboard("finance", cycle)
  const grievances = useDashboard("grievances", cycle)

  const funnelRows = sumBy(funnel.data ?? [], (r) => r.status, ["n"]).sort((a, b) => PIPELINE.indexOf(a.status) - PIPELINE.indexOf(b.status))
  const pendingRows = sumBy(pending.data ?? [], (r) => `${r.institution_id}|${r.status}`, ["n", "overdue"]).sort((a, b) => b.overdue - a.overdue || b.n - a.n)
  const equityRows = sumBy(equity.data ?? [], (r) => r.state_code, ["applicants", "selected"])
    .map((r): Row => ({ ...r, per_lakh: r.st_population ? (r.selected * 100000) / r.st_population : 0 }))
    .sort((a, b) => b.per_lakh - a.per_lakh)
  const fillRows = sumBy(selection.data ?? [], (r) => r.category ?? "—", ["selected"])
  const financeRows = sumBy(finance.data ?? [], (r) => `${r.period}|${r.status}`, ["n", "total"])
  const grievanceRows = sumBy(grievances.data ?? [], (r) => `${r.category}|${r.status}`, ["n", "overdue"])

  const sum = (rows: Row[], f: string) => rows.reduce((s, r) => s + Number(r[f] ?? 0), 0)
  const instName = (id: string | null) => institutions.find((i) => i.id === id)?.name ?? "No institution"

  return (
    <>
      <PageHeader title="Dashboards" description="Live aggregates across the pipeline." />
      <Field id="dash-cycle" label="Cycle" className="mb-6 w-64">
        <Select value={cycle} onValueChange={setCycle}>
          <SelectTrigger id="dash-cycle" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cycles</SelectItem>
            {cycles.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.scheme_code} {c.cycle}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Applications" value={fmtNum(sum(funnelRows, "n"))} />
        <Tile label="Pending with officers" value={fmtNum(sum(pendingRows, "n"))} />
        <Tile label="Past SLA" value={fmtNum(sum(pendingRows, "overdue"))} />
        <Tile label="Selected" value={fmtNum(sum(funnelRows.filter((r) => SELECTED.includes(r.status)), "n"))} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Application funnel" description="Applications by current status, in pipeline order." q={funnel}>
          <HBar label="Applications by status" valueLabel="Applications" data={funnelRows.map((r) => ({ name: humanize(r.status), value: r.n }))} />
        </Section>

        <Section title="Seats filled by category" description="Selected, under state verification, or awarded." q={selection}>
          <HBar label="Selected by category" valueLabel="Selected" data={fillRows.map((r) => ({ name: humanize(r.category), value: r.selected }))} />
        </Section>

        <Section title="Equity by state" description="Selected per lakh ST population (Census 2011)." q={equity}>
          <HBar
            label="Selected per lakh ST population by state"
            valueLabel="Per lakh ST"
            data={equityRows.map((r) => ({ name: r.name, value: Math.round(r.per_lakh * 100) / 100 }))}
          />
          <Table className="mt-4">
            <TableHeader>
              <TableRow>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Applicants</TableHead>
                <TableHead className="text-right">Selected</TableHead>
                <TableHead className="text-right">Per lakh ST</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equityRows.map((r) => (
                <TableRow key={r.state_code}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtNum(r.applicants)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtNum(r.selected)}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.per_lakh.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        <Section title="Pending and SLA" description="Files waiting with officers, by institution. Most overdue first." q={pending}>
          {pendingRows.length ? (
            <div className="max-h-[32rem] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Institution</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Overdue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRows.map((r) => (
                    <TableRow key={`${r.institution_id}|${r.status}`}>
                      <TableCell>{instName(r.institution_id)}</TableCell>
                      <TableCell>{humanize(r.status)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNum(r.n)}</TableCell>
                      <TableCell className={`text-right tabular-nums ${r.overdue ? "font-semibold text-destructive" : ""}`}>{fmtNum(r.overdue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Empty>Nothing pending.</Empty>
          )}
        </Section>

        <Section title="Payments" description="By quarter and PFMS status." q={finance}>
          {financeRows.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Payments</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {financeRows.map((r) => (
                  <TableRow key={`${r.period}|${r.status}`}>
                    <TableCell>{r.period}</TableCell>
                    <TableCell>{humanize(r.status)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNum(r.n)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(r.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Empty>No payments yet.</Empty>
          )}
        </Section>

        <Section title="Grievances" description="By category and status; overdue = past the 3-day SLA." q={grievances}>
          {grievanceRows.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                  <TableHead className="text-right">Overdue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grievanceRows.map((r) => (
                  <TableRow key={`${r.category}|${r.status}`}>
                    <TableCell>{r.category ? humanize(r.category) : "Not triaged"}</TableCell>
                    <TableCell>{humanize(r.status)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNum(r.n)}</TableCell>
                    <TableCell className={`text-right tabular-nums ${r.overdue ? "font-semibold text-destructive" : ""}`}>{fmtNum(r.overdue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Empty>No grievances.</Empty>
          )}
        </Section>
      </div>
    </>
  )
}
