import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { Empty, Field, PageHeader, Query, StatusBadge, useAction, useCycles } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { fmtDate, humanize, shortId } from "@/lib/format"
import type { Application, Grievance } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function Help() {
  return (
    <>
      <PageHeader title="Help & grievances" description="Ask a question, or raise a grievance if something is wrong." />
      <div className="grid gap-6 lg:grid-cols-2">
        <HelpBot />
        <NewGrievance />
        <div className="lg:col-span-2">
          <MyGrievances />
        </div>
      </div>
    </>
  )
}

function HelpBot() {
  const [msgs, setMsgs] = useState<{ from: "me" | "bot"; text: string }[]>([])
  const [q, setQ] = useState("")
  const ask = useAction((question: string) => api<{ answer: string }>("/help/ask", { body: { question } }), {
    onSuccess: (r) => setMsgs((m) => [...m, { from: "bot", text: r.answer }]),
  })
  return (
    <Card className="shadow-sm">
      <CardHeader className="py-4 border-b bg-card/50">
        <CardTitle>Ask a question</CardTitle>
        <CardDescription>Answers use the scheme FAQ and your own application and payment status.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <ol className="grid max-h-80 gap-2 overflow-y-auto" aria-live="polite">
          {msgs.map((m, i) => (
            <li
              key={i}
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-line",
                m.from === "me" ? "justify-self-end bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              <span className="sr-only">{m.from === "me" ? "You: " : "Assistant: "}</span>
              {m.text}
            </li>
          ))}
          {ask.isPending && <li className="text-sm text-muted-foreground">Thinking…</li>}
        </ol>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!q.trim()) return
            setMsgs((m) => [...m, { from: "me", text: q }])
            ask.mutate(q)
            setQ("")
          }}
        >
          <Input aria-label="Your question" placeholder="Where is my payment?" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button type="submit" disabled={ask.isPending}>Ask</Button>
        </form>
      </CardContent>
    </Card>
  )
}

function NewGrievance() {
  const cycles = useCycles().data ?? []
  const apps = useQuery({ queryKey: ["applications"], queryFn: () => api<Application[]>("/applications") }).data ?? []
  const [g, setG] = useState({ subject: "", body: "", application_id: "" })
  const send = useAction(() => api("/grievances", { body: { ...g, application_id: g.application_id || null } }), {
    success: "Grievance raised. You'll be notified when there is a reply.",
    invalidate: [["grievances"]],
    onSuccess: () => setG({ subject: "", body: "", application_id: "" }),
  })
  const appLabel = (a: Application) => {
    const c = cycles.find((c) => c.id === a.cycle_id)
    return `${c ? `${c.scheme_code} ${c.cycle}` : "Application"} #${shortId(a.id)}`
  }
  return (
    <Card className="shadow-sm">
      <CardHeader className="py-4 border-b bg-card/50">
        <CardTitle>Raise a grievance</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            send.mutate()
          }}
        >
          <Field id="g-subject" label="Subject">
            <Input id="g-subject" required value={g.subject} onChange={(e) => setG({ ...g, subject: e.target.value })} />
          </Field>
          <Field id="g-body" label="What happened?">
            <Textarea id="g-body" required rows={4} value={g.body} onChange={(e) => setG({ ...g, body: e.target.value })} />
          </Field>
          {apps.length > 0 && (
            <Field id="g-app" label="Related application (optional)">
              <Select value={g.application_id} onValueChange={(v) => setG({ ...g, application_id: v })}>
                <SelectTrigger id="g-app" className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {apps.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{appLabel(a)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <div>
            <Button type="submit" disabled={send.isPending}>Submit grievance</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function MyGrievances() {
  const q = useQuery({ queryKey: ["grievances"], queryFn: () => api<Grievance[]>("/grievances") })
  return (
    <Card className="shadow-sm">
      <CardHeader className="py-4 border-b bg-card/50">
        <CardTitle>My grievances</CardTitle>
      </CardHeader>
      <CardContent>
        <Query q={q}>
          {(list) =>
            list.length ? (
              <ul className="grid gap-3">
                {list.map((g) => (
                  <li key={g.id} className="rounded-lg bg-muted p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{g.subject}</span>
                      <span className="flex items-center gap-2">
                        {g.category && <span className="text-xs text-muted-foreground">{humanize(g.category)}</span>}
                        <StatusBadge status={g.status} />
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{g.body}</p>
                    {g.resolution && (
                      <p className="mt-2">
                        <strong>Reply:</strong> {g.resolution}
                      </p>
                    )}
                    <div className="mt-1 text-xs text-muted-foreground">Raised {fmtDate(g.created_at)}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No grievances raised.</Empty>
            )
          }
        </Query>
      </CardContent>
    </Card>
  )
}
