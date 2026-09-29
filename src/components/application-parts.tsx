// Widgets both the applicant view and the officer review view render.
import { Clock } from "lucide-react"

import { Empty, StatusBadge } from "@/components/common"
import { daysFrom, fmtDate, fmtDateTime, humanize, ROLE_LABEL } from "@/lib/format"
import type { AppDetail, AuditEntry, RuleResult } from "@/lib/types"

const OUTCOME_LABEL = { pass: "Met", review: "Needs review", fail: "Not met" } as const

export function RuleResults({ results }: { results: RuleResult[] }) {
  if (!results.length) return <Empty>No eligibility results yet.</Empty>
  return (
    <ul className="grid gap-2">
      {results.map((r) => (
        <li key={r.rule_id} className="flex items-start justify-between gap-3 rounded-lg bg-muted px-3 py-2 text-sm">
          <div className="min-w-0">
            <div className="break-words">{r.reason}</div>
            {r.override_reason && <div className="mt-0.5 text-xs text-muted-foreground">Overridden: {r.override_reason}</div>}
          </div>
          <StatusBadge status={r.outcome} label={OUTCOME_LABEL[r.outcome]} />
        </li>
      ))}
    </ul>
  )
}

/** "Pass 5 · Review 1 · Fail 1" meter: segment widths by count. */
export function EligibilityMeter({ results }: { results: RuleResult[] }) {
  const n = { pass: 0, review: 0, fail: 0 }
  results.forEach((r) => n[r.outcome]++)
  const total = results.length || 1
  return (
    <div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${n.pass} met, ${n.review} need review, ${n.fail} not met`}>
        <div className="bg-pass-foreground/80" style={{ width: `${(n.pass / total) * 100}%` }} />
        <div className="bg-review" style={{ width: `${(n.review / total) * 100}%` }} />
        <div className="bg-fail-foreground/80" style={{ width: `${(n.fail / total) * 100}%` }} />
      </div>
      <div className="mt-1.5 flex gap-3 text-xs text-muted-foreground">
        <span>{n.pass} met</span>
        <span>{n.review} need review</span>
        <span>{n.fail} not met</span>
      </div>
    </div>
  )
}

export function Timeline({ entries }: { entries: AuditEntry[] }) {
  if (!entries.length) return <Empty>No activity yet.</Empty>
  return (
    <ol className="relative grid gap-4 border-l border-border pl-5">
      {entries.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full bg-primary" aria-hidden />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {e.data.to ? <StatusBadge status={e.data.to} /> : <span className="font-medium">{humanize(e.action)}</span>}
            <span className="text-xs text-muted-foreground">{fmtDateTime(e.created_at)}</span>
            {!e.actor_id && <span className="text-xs text-muted-foreground">(automatic)</span>}
          </div>
          {(e.data.note || e.data.reason_code) && (
            <p className="mt-1 text-sm text-muted-foreground">
              {e.data.reason_code && <span className="font-medium">{e.data.reason_code}: </span>}
              {e.data.note}
            </p>
          )}
        </li>
      ))}
    </ol>
  )
}

/** Who has the file, since when, and the SLA. */
export function HolderLine({ app }: { app: Pick<AppDetail, "holder" | "sla_due_at" | "timeline" | "status"> }) {
  if (!app.holder) return null
  const since = [...app.timeline].reverse().find((e) => e.data.to === app.status)?.created_at
  const days = app.sla_due_at ? daysFrom(app.sla_due_at) : null
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-sm">
      <Clock className="size-4 text-muted-foreground" aria-hidden />
      With <strong>{app.holder === "applicant" ? "you" : ROLE_LABEL[app.holder]}</strong>
      {since && <span className="text-muted-foreground">since {fmtDate(since)}</span>}
      {days != null && (
        <StatusBadge
          status={days < 0 ? "fail" : "review"}
          label={days < 0 ? `Overdue by ${-days} day${days === -1 ? "" : "s"}` : `Due in ${days} day${days === 1 ? "" : "s"}`}
        />
      )}
    </p>
  )
}
