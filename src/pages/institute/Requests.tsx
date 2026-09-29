import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { Empty, PageHeader, Query, StatusBadge, useAction, useInstitutions } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/api"
import { fmtDate, humanize } from "@/lib/format"
import type { LifecycleRequest } from "@/lib/types"

const DATE_KEYS = new Set(["start_date", "end_date"])

export default function Requests() {
  const [status, setStatus] = useState("pending")
  const q = useQuery({ queryKey: ["requests", status], queryFn: () => api<LifecycleRequest[]>(`/requests?status=${status}&limit=200`) })
  const institutions = useInstitutions().data
  const [notes, setNotes] = useState<Record<string, string>>({})
  const decide = useAction(
    ({ id, status }: { id: string; status: "approved" | "rejected" }) => api(`/requests/${id}/decide`, { body: { status, note: notes[id] || null } }),
    { success: (r) => `Request ${r.status}`, invalidate: [["requests"], ["awards"]] },
  )

  const payload = (r: LifecycleRequest) =>
    Object.entries(r.payload).map(([k, v]) => {
      const shown =
        k === "institution_id" ? (institutions?.find((i) => i.id === v)?.name ?? v) : DATE_KEYS.has(k) ? fmtDate(v) : typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)
      return (
        <div key={k}>
          <span className="text-muted-foreground">{humanize(k.replace(/_id$/, ""))}:</span> {shown}
        </div>
      )
    })

  return (
    <>
      <PageHeader title="Scholar requests" description="Joining, leave, transfer, thesis and HRA changes waiting for a decision." />
      <Tabs value={status} onValueChange={setStatus} className="mb-4">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>
      <Card className="shadow-sm">
        <CardContent>
          <Query q={q}>
            {(rows) =>
              !rows.length ? (
                <Empty>No {status} requests.</Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scholar</TableHead>
                      <TableHead>Request</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Raised</TableHead>
                      <TableHead>{status === "pending" ? "Decision" : "Status"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id} className="align-top">
                        <TableCell>
                          {r.full_name}
                          <div className="font-mono text-xs text-muted-foreground">{r.award_no}</div>
                        </TableCell>
                        <TableCell>
                          {humanize(r.kind)}
                          {r.period && <div className="text-xs text-muted-foreground">{r.period}</div>}
                        </TableCell>
                        <TableCell className="text-xs whitespace-normal">{payload(r)}</TableCell>
                        <TableCell>{fmtDate(r.created_at)}</TableCell>
                        <TableCell>
                          {r.status === "pending" ? (
                            <div className="grid gap-2">
                              <Input
                                aria-label={`Note for ${r.full_name}'s ${r.kind} request`}
                                placeholder="Note (optional)"
                                value={notes[r.id] ?? ""}
                                onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                              />
                              <div className="flex gap-2">
                                <Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate({ id: r.id, status: "approved" })}>
                                  Approve
                                </Button>
                                <Button size="sm" variant="destructive" disabled={decide.isPending} onClick={() => decide.mutate({ id: r.id, status: "rejected" })}>
                                  Reject
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <StatusBadge status={r.status} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )
            }
          </Query>
        </CardContent>
      </Card>
    </>
  )
}
