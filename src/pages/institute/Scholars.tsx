import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { Empty, Field, PageHeader, Query, StatusBadge, useAction, useMe } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import { currentPeriod, fmtDate } from "@/lib/format"
import type { Award } from "@/lib/types"

export default function Scholars() {
  const me = useMe()
  const bulk = me.role === "institute_officer"
  const [period, setPeriod] = useState(currentPeriod())
  const [exclude, setExclude] = useState<Set<string>>(new Set())
  const q = useQuery({ queryKey: ["awards"], queryFn: () => api<Award[]>("/awards?limit=500") })
  const run = useAction(() => api<{ approved: number }>("/institute/continuations", { body: { period, exclude: [...exclude] } }), {
    success: (r) => `${r.approved} continuation${r.approved === 1 ? "" : "s"} approved for ${period}`,
    invalidate: [["requests"]],
  })
  const toggle = (id: string, on: boolean) => {
    const next = new Set(exclude)
    if (on) next.add(id)
    else next.delete(id)
    setExclude(next)
  }

  return (
    <>
      <PageHeader title="Scholars" description="Awardees in your scope and their tenure." />
      <Query q={q}>
        {(awards) => {
          const active = awards.filter((a) => a.status === "active")
          return (
            <div className="grid gap-6">
              {bulk && (
                <Card>
                  <CardHeader>
                    <CardTitle>Quarterly continuation</CardTitle>
                    <CardDescription>
                      Approves continuation for every active scholar in one step. Tick the ones to leave out (on leave, not attending, thesis due).
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-end gap-3">
                    <Field id="period" label="Period" hint="Indian FY quarter, e.g. FY26-Q1 = Apr–Jun 2025">
                      <Input id="period" value={period} onChange={(e) => setPeriod(e.target.value.toUpperCase())} pattern="FY\d{2}-Q[1-4]" className="w-36" />
                    </Field>
                    <Button disabled={!/^FY\d{2}-Q[1-4]$/.test(period) || !active.length || run.isPending} onClick={() => run.mutate()}>
                      Approve {active.length - [...exclude].filter((id) => active.some((a) => a.id === id)).length} of {active.length}
                    </Button>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardContent>
                  {!awards.length ? (
                    <Empty>No scholars yet.</Empty>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {bulk && <TableHead>Exclude</TableHead>}
                          <TableHead>Award no.</TableHead>
                          <TableHead>Scholar</TableHead>
                          <TableHead>Scheme</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Tenure ends</TableHead>
                          <TableHead>Hostel</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {awards.map((a) => (
                          <TableRow key={a.id}>
                            {bulk && (
                              <TableCell>
                                {a.status === "active" && (
                                  <Checkbox aria-label={`Exclude ${a.full_name}`} checked={exclude.has(a.id)} onCheckedChange={(c) => toggle(a.id, c === true)} />
                                )}
                              </TableCell>
                            )}
                            <TableCell className="font-mono text-xs">{a.award_no}</TableCell>
                            <TableCell>
                              {a.full_name}
                              {a.institution_name && <div className="text-xs text-muted-foreground">{a.institution_name}</div>}
                            </TableCell>
                            <TableCell>
                              {a.scheme_code} {a.cycle}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={a.status} />
                            </TableCell>
                            <TableCell>{fmtDate(a.start_date)}</TableCell>
                            <TableCell>{fmtDate(a.tenure_end)}</TableCell>
                            <TableCell>{a.hostel ? "Yes" : "No"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )
        }}
      </Query>
    </>
  )
}
