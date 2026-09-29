import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { Empty, Facts, Field, PageHeader, Query, StatusBadge, useAction, useInstitutions } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { fmtDate, fmtDateTime, fmtMoney, humanize } from "@/lib/format"
import type { Award, LifecycleRequest, Payment } from "@/lib/types"

export default function Awards() {
  const awards = useQuery({ queryKey: ["awards"], queryFn: () => api<Award[]>("/awards") })
  return (
    <>
      <PageHeader title="Award & payments" description="Joining, leave, transfers and your stipend payments." />
      <Query q={awards}>
        {(list) =>
          list.length ? (
            <div className="grid gap-8">
              {list.map((a) => (
                <AwardSection key={a.id} award={a} />
              ))}
            </div>
          ) : (
            <Empty>You have no award yet. It appears here once you are selected.</Empty>
          )
        }
      </Query>
    </>
  )
}

function AwardSection({ award }: { award: Award }) {
  const requests = useQuery({ queryKey: ["requests", award.id], queryFn: () => api<LifecycleRequest[]>(`/requests?award_id=${award.id}`) })
  const payments = useQuery({ queryKey: ["payments", award.id], queryFn: () => api<Payment[]>(`/payments?award_id=${award.id}`) })
  return (
    <section className="grid gap-6 lg:grid-cols-2" aria-label={`Award ${award.award_no}`}>
      <Card className="shadow-sm">
        <CardHeader className="py-4 border-b bg-card/50">
          <CardTitle>{award.award_no}</CardTitle>
          <CardDescription>
            {award.scheme_code} {award.cycle}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Facts
            items={[
              ["Status", <StatusBadge key="s" status={award.status} />],
              ["Institution", award.institution_name],
              ["Started", fmtDate(award.start_date)],
              ["Tenure ends", fmtDate(award.tenure_end)],
              ["Hostel", award.hostel ? "Yes (no HRA)" : "No"],
              ["Stream", humanize(award.stream)],
            ]}
          />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="py-4 border-b bg-card/50">
          <CardTitle>New request</CardTitle>
        </CardHeader>
        <CardContent>
          <RequestForm award={award} />
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="py-4 border-b bg-card/50">
          <CardTitle>Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Query q={requests}>
            {(list) =>
              list.length ? (
                <ul className="grid gap-2">
                  {list.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                      <span>
                        {humanize(r.kind)}
                        {r.period && ` · ${r.period}`}
                        <span className="block text-xs text-muted-foreground">{fmtDate(r.created_at)}</span>
                      </span>
                      <StatusBadge status={r.status} />
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No requests yet.</Empty>
              )
            }
          </Query>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="py-4 border-b bg-card/50">
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <Query q={payments}>
            {(list) =>
              list.length ? (
                <ul className="grid gap-3">
                  {list.map((p) => (
                    <li key={p.id} className="rounded-lg bg-muted p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          {p.period}
                          {p.kind === "arrear" && " · arrear"}
                        </span>
                        <span className="flex items-center gap-2">
                          <strong>{fmtMoney(p.amount)}</strong>
                          <StatusBadge status={p.status} />
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {Object.entries(p.components).map(([k, v]) => `${humanize(k)} ${fmtMoney(v)}`).join(" · ")}
                      </div>
                      {p.failure_code && <p className="mt-1 text-destructive">Failed: {humanize(p.failure_code)}. It will be retried.</p>}
                      {p.timeline.length > 0 && (
                        <ol className="mt-2 grid gap-0.5 text-xs text-muted-foreground">
                          {p.timeline.map((t, i) => (
                            <li key={i}>
                              {humanize(t.status)} · {fmtDateTime(t.at)}
                              {t.pfms_ref && ` · ${t.pfms_ref}`}
                            </li>
                          ))}
                        </ol>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No payments yet.</Empty>
              )
            }
          </Query>
        </CardContent>
      </Card>
    </section>
  )
}

const KINDS = ["joining", "leave", "transfer", "thesis", "hra_change"] as const

function RequestForm({ award }: { award: Award }) {
  const institutions = useInstitutions().data ?? []
  const [kind, setKind] = useState<(typeof KINDS)[number]>(award.status === "offered" ? "joining" : "leave")
  const [p, setP] = useState<Record<string, any>>({})
  const set = (k: string, v: unknown) => setP((x) => ({ ...x, [k]: v }))
  const send = useAction(() => api(`/awards/${award.id}/requests`, { body: { kind, payload: kind === "hra_change" ? { hostel: !!p.hostel } : p } }), {
    success: "Request sent",
    invalidate: [["requests", award.id]],
    onSuccess: () => setP({}),
  })
  const pid = (k: string) => `${award.id}-${k}`

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        send.mutate()
      }}
    >
      <Field id={pid("kind")} label="Request type">
        <Select
          value={kind}
          onValueChange={(v) => {
            setKind(v as typeof kind)
            setP({})
          }}
        >
          <SelectTrigger id={pid("kind")} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KINDS.map((k) => (
              <SelectItem key={k} value={k}>{k === "hra_change" ? "Hostel / HRA change" : humanize(k)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {(kind === "joining" || kind === "leave") && (
        <Field id={pid("start")} label={kind === "joining" ? "Joining date" : "Leave from"}>
          <Input id={pid("start")} type="date" required value={p.start_date ?? ""} onChange={(e) => set("start_date", e.target.value)} />
        </Field>
      )}
      {kind === "leave" && (
        <>
          <Field id={pid("end")} label="Leave until">
            <Input id={pid("end")} type="date" required value={p.end_date ?? ""} onChange={(e) => set("end_date", e.target.value)} />
          </Field>
          <Field id={pid("reason")} label="Reason">
            <Textarea id={pid("reason")} value={p.reason ?? ""} onChange={(e) => set("reason", e.target.value)} />
          </Field>
        </>
      )}
      {kind === "transfer" && (
        <Field id={pid("inst")} label="Transfer to">
          <Select value={p.institution_id ?? ""} onValueChange={(v) => set("institution_id", v)}>
            <SelectTrigger id={pid("inst")} className="w-full">
              <SelectValue placeholder="Select institution" />
            </SelectTrigger>
            <SelectContent>
              {institutions.map((i) => (
                <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
      {kind === "thesis" && <p className="text-sm text-muted-foreground">Tells your institute your thesis is submitted. The final quarter is paid only after it is approved.</p>}
      {kind === "hra_change" && (
        <div className="flex items-center gap-2">
          <Checkbox id={pid("hostel")} checked={!!p.hostel} onCheckedChange={(v) => set("hostel", v === true)} />
          <Label htmlFor={pid("hostel")}>I now live in a hostel (HRA stops)</Label>
        </div>
      )}
      <div>
        <Button type="submit" disabled={send.isPending || (kind === "transfer" && !p.institution_id)}>Send request</Button>
      </div>
    </form>
  )
}
