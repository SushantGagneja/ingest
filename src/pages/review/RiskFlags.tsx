import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"

import { Empty, PageHeader, Query, StatusBadge, useAction } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/api"
import { fmtDate, humanize, shortId } from "@/lib/format"
import { FlagDetails } from "@/pages/review/ReviewApplication"

type Flag = { id: string; application_id: string; signal: string; details: Record<string, any>; status: string; created_at: string }

export default function RiskFlags() {
  const [status, setStatus] = useState("open")
  const q = useQuery({ queryKey: ["risk-flags", status], queryFn: () => api<Flag[]>(`/risk-flags?status=${status}&limit=200`) })
  const patch = useAction(({ id, status }: { id: string; status: string }) => api(`/risk-flags/${id}`, { method: "PATCH", body: { status } }), {
    success: "Flag updated",
    invalidate: [["risk-flags"]],
  })
  return (
    <>
      <PageHeader title="Risk flags" description="Duplicate documents, shared bank accounts and submission spikes. Flags never reject anyone; they only block the fast path." />
      <Tabs value={status} onValueChange={setStatus} className="mb-4">
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="cleared">Cleared</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
        </TabsList>
      </Tabs>
      <Card>
        <CardContent>
          <Query q={q}>
            {(flags) =>
              !flags.length ? (
                <Empty>No {status} flags.</Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Application</TableHead>
                      <TableHead>Signal</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Raised</TableHead>
                      <TableHead>{status === "open" ? "Action" : "Status"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {flags.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell>
                          <Link to={`/applications/${f.application_id}`} className="underline underline-offset-4">
                            {shortId(f.application_id)}
                          </Link>
                        </TableCell>
                        <TableCell>{humanize(f.signal)}</TableCell>
                        <TableCell className="max-w-sm whitespace-normal">
                          <FlagDetails details={f.details} />
                        </TableCell>
                        <TableCell>{fmtDate(f.created_at)}</TableCell>
                        <TableCell>
                          {f.status === "open" ? (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" disabled={patch.isPending} onClick={() => patch.mutate({ id: f.id, status: "cleared" })}>
                                Clear
                              </Button>
                              <Button size="sm" variant="destructive" disabled={patch.isPending} onClick={() => patch.mutate({ id: f.id, status: "confirmed" })}>
                                Confirm
                              </Button>
                            </div>
                          ) : (
                            <StatusBadge status={f.status} />
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
