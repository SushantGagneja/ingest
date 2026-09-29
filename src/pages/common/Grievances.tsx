import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"

import { Empty, Field, PageHeader, Query, StatusBadge, useAction } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { daysFrom, fmtDateTime, humanize, shortId } from "@/lib/format"
import type { Grievance } from "@/lib/types"

const CATEGORIES = ["payment", "verification", "eligibility", "technical", "correction", "other"]
const STATUSES = ["open", "in_progress", "resolved", "closed"]

export default function Grievances() {
  const [status, setStatus] = useState("open")
  const q = useQuery({ queryKey: ["grievances", status], queryFn: () => api<Grievance[]>(`/grievances?status=${status}&limit=100`) })
  return (
    <>
      <PageHeader title="Grievances" description="Tickets routed to your role. Categories and draft replies are AI suggestions; you decide what is sent." />
      <Tabs value={status} onValueChange={setStatus} className="mb-4">
        <TabsList>
          {STATUSES.map((s) => (
            <TabsTrigger key={s} value={s}>
              {humanize(s)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Query q={q}>
        {(rows) => (!rows.length ? <Empty>No {humanize(status).toLowerCase()} grievances.</Empty> : <div className="grid gap-4">{rows.map((g) => <Ticket key={g.id} g={g} />)}</div>)}
      </Query>
    </>
  )
}

function Ticket({ g }: { g: Grievance }) {
  const [reply, setReply] = useState(g.resolution ?? g.suggested_reply ?? "")
  const patch = useAction((body: Record<string, unknown>) => api(`/grievances/${g.id}`, { method: "PATCH", body }), {
    success: "Grievance updated",
    invalidate: [["grievances"]],
  })
  const days = g.sla_due_at ? daysFrom(g.sla_due_at) : null
  const open = g.status === "open" || g.status === "in_progress"
  const aiDraft = !g.resolution && !!g.suggested_reply && reply === g.suggested_reply

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {g.subject}
          <StatusBadge status={g.status} />
          {open && days != null && days < 0 && <StatusBadge status="fail" label={`Overdue ${-days}d`} />}
        </CardTitle>
        <CardDescription>
          Raised {fmtDateTime(g.created_at)}
          {g.application_id && (
            <>
              {" · "}
              <Link to={`/applications/${g.application_id}`} className="underline underline-offset-4">
                Application {shortId(g.application_id)}
              </Link>
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="text-sm whitespace-pre-wrap">{g.body}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id={`cat-${g.id}`} label="Category">
            <Select value={g.category ?? ""} onValueChange={(category) => patch.mutate({ category })}>
              <SelectTrigger id={`cat-${g.id}`} className="w-full">
                <SelectValue placeholder="Not classified yet" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {humanize(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id={`st-${g.id}`} label="Status">
            <Select value={g.status} onValueChange={(status) => patch.mutate({ status })}>
              <SelectTrigger id={`st-${g.id}`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {humanize(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field id={`reply-${g.id}`} label="Reply" hint={aiDraft ? "AI suggestion, edit before sending." : undefined}>
          <Textarea id={`reply-${g.id}`} rows={4} value={reply} onChange={(e) => setReply(e.target.value)} aria-describedby={aiDraft ? `reply-${g.id}-hint` : undefined} />
        </Field>
        <div>
          <Button disabled={!reply.trim() || patch.isPending} onClick={() => patch.mutate({ reply, status: "resolved" })}>
            Send reply and resolve
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
