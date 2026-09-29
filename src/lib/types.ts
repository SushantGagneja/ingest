// Row shapes returned by the API (backend/init.sql). Only what more than one page reads.
import type { Role } from "./format"

export type Profile = {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  role: Role
  institution_id: string | null
  state_code: string | null
  dob: string | null
  gender: "F" | "M" | "T" | null
  district: string | null
  st_community: string | null
  is_pvtg: boolean
  is_divyang: boolean
}

export type Cycle = {
  id: string
  scheme_code: string
  cycle: string
  opens_at: string
  closes_at: string
  verify_closes_at: string | null
  status: "draft" | "open" | "scrutiny" | "selection" | "published" | "archived"
}

export type Condition = { fact: string; op: string; value: unknown }
export type EligibilityRule = Condition & { id: string; label: string; on_fail?: "review" }

export type RuleConfig = {
  cycle_id: string
  version: number
  circular_ref: string | null
  effective_from: string
  published_at: string | null
  created_at: string
  config: {
    eligibility?: EligibilityRule[]
    documents?: { required?: string[]; conditional?: { when: Condition; docs: string[] }[] }
    slots?: { total?: number; quota?: { category: Record<string, number>; stream: Record<string, number> } } & Record<string, unknown>
    [k: string]: unknown
  }
}

export type Institution = {
  id: string
  aishe_code: string
  name: string
  state_code: string | null
  city_class: "X" | "Y" | "Z" | null
  is_premier: boolean
  cgpa_factor: string | number | null
  verified: boolean
}

export type State = { code: string; name: string; st_population: number | null }

export type Application = {
  id: string
  applicant_id: string
  cycle_id: string
  config_version: number | null
  status: string
  form: Record<string, any>
  institution_id: string | null
  unlocked_fields: string[]
  sla_due_at: string | null
  score: number | null
  rank: number | null
  category: string | null
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export type Doc = {
  id: string
  application_id: string
  doc_type: string
  source: "upload" | "digilocker"
  storage_path: string | null
  extracted: Record<string, unknown>
  confidence: number | null
  status: string
  review_note: string | null
  created_at: string
}

export type RuleResult = {
  application_id?: string
  rule_id: string
  outcome: "pass" | "fail" | "review"
  reason: string
  overridden_by?: string | null
  override_reason?: string | null
}

export type Deficiency = {
  id: string
  items: { field?: string; doc_type?: string; rule_id?: string; message?: string }[]
  memo: string
  issued_at: string
  due_at: string
}

export type AuditEntry = {
  id: number
  actor_id: string | null
  action: string
  data: { from?: string; to?: string; action?: string; note?: string | null; reason_code?: string | null }
  created_at: string
}

export type AppDetail = Application & {
  documents: Doc[]
  rule_results: RuleResult[]
  deficiency: Deficiency | null
  timeline: AuditEntry[]
  holder: Role | null
  applicant: Omit<Profile, "id" | "role" | "institution_id" | "avatar_url"> | null
  cycle: Pick<Cycle, "scheme_code" | "cycle" | "status"> | null
}

export type Eligibility = {
  config_version: number
  results: RuleResult[]
  summary: "pass" | "fail" | "review"
  facts: Record<string, unknown>
}

export type Award = {
  id: string
  application_id: string
  award_no: string
  start_date: string | null
  tenure_end: string | null
  status: string
  hostel: boolean
  stream: string | null
  scheme_code: string
  cycle: string
  full_name: string
  email: string
  institution_name: string | null
  institution_id: string | null
}

export type LifecycleRequest = {
  id: string
  award_id: string
  kind: "joining" | "continuation" | "leave" | "transfer" | "thesis" | "discontinuation" | "hra_change"
  period: string | null
  payload: Record<string, any>
  status: "pending" | "approved" | "rejected"
  created_at: string
  decided_at: string | null
  award_no: string
  full_name: string
  scheme_code: string
}

export type Payment = {
  id: string
  award_id: string
  period: string
  kind: "regular" | "arrear"
  components: Record<string, string>
  amount: string
  batch_id: string | null
  status: "generated" | "sent" | "credited" | "failed"
  failure_code: string | null
  timeline: { status: string; at: string; pfms_ref?: string; failure_code?: string | null }[]
  created_at: string
}

export type Grievance = {
  id: string
  raised_by: string
  application_id: string | null
  subject: string
  body: string
  category: string | null
  assigned_role: Role | null
  suggested_reply: string | null
  status: "open" | "in_progress" | "resolved" | "closed"
  resolution: string | null
  sla_due_at: string | null
  created_at: string
  resolved_at: string | null
}

export type Notification = {
  id: string
  title: string
  body: string
  link: string | null
  read_at: string | null
  created_at: string
}
