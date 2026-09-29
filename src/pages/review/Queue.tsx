import { useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Link } from "react-router"

import { Empty, Field, PageHeader, Query, StatusBadge } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import { daysFrom, fmtDate, shortId } from "@/lib/format"
import type { Application } from "@/lib/types"

type Row = Application & { overdue: boolean; full_name: string | null; state_code: string | null; scheme_code: string; cycle: string }

const PAGE = 50

export default function Queue() {
  const [limit, setLimit] = useState(PAGE)
  const [scheme, setScheme] = useState("all")
  // ponytail: "load more" re-fetches with a bigger limit instead of appending pages; fine for a few hundred rows
  const q = useQuery({ queryKey: ["queue", limit], queryFn: () => api<Row[]>(`/queue?limit=${limit}`), placeholderData: keepPreviousData })
  const schemes = [...new Set(q.data?.map((r) => r.scheme_code))]

  return (
    <>
      <PageHeader
        title="Review queue"
        description="Applications waiting on you, most urgent SLA first."
        actions={
          <Field id="scheme" label="Scheme" className="w-40">
            <Select value={scheme} onValueChange={setScheme}>
              <SelectTrigger id="scheme" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All schemes</SelectItem>
                {schemes.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        }
      />
      <Card className="shadow-sm">
        <CardContent>
          <Query q={q}>
            {(rows) => {
              const shown = rows.filter((r) => scheme === "all" || r.scheme_code === scheme)
              if (!shown.length) return <Empty>Nothing waiting on you.</Empty>
              return (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Applicant</TableHead>
                        <TableHead>Scheme</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>SLA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shown.map((r) => {
                        const days = r.sla_due_at ? daysFrom(r.sla_due_at) : null
                        return (
                          <TableRow key={r.id}>
                            <TableCell>
                              <Link to={`/applications/${r.id}`} className="font-medium underline-offset-4 hover:underline">
                                {r.full_name ?? "Unnamed"}
                              </Link>
                              <div className="text-xs text-muted-foreground">{shortId(r.id)}</div>
                            </TableCell>
                            <TableCell>
                              {r.scheme_code} {r.cycle}
                            </TableCell>
                            <TableCell>{r.state_code ?? "—"}</TableCell>
                            <TableCell>
                              <StatusBadge status={r.status} />
                            </TableCell>
                            <TableCell>{fmtDate(r.submitted_at)}</TableCell>
                            <TableCell>
                              {days == null ? (
                                "—"
                              ) : r.overdue ? (
                                <StatusBadge status="fail" label={`Overdue ${-days}d`} />
                              ) : (
                                <span>{days}d left</span>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                  {rows.length === limit && (
                    <Button variant="outline" className="mt-4" onClick={() => setLimit(limit + PAGE)} disabled={q.isFetching}>
                      {q.isFetching ? "Loading…" : "Load more"}
                    </Button>
                  )}
                </>
              )
            }}
          </Query>
        </CardContent>
      </Card>
    </>
  )
}
