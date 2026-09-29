// Display labels and formatters. Enum values mirror backend/enums.py.

export type Role =
  | "applicant"
  | "institute_officer"
  | "state_officer"
  | "mission_officer"
  | "scrutiny_officer"
  | "committee_member"
  | "finance_officer"
  | "scheme_admin"
  | "leadership"

export const ROLE_LABEL: Record<Role, string> = {
  applicant: "Applicant",
  institute_officer: "Institute officer",
  state_officer: "State officer",
  mission_officer: "Mission officer",
  scrutiny_officer: "Scrutiny officer",
  committee_member: "Committee member",
  finance_officer: "Finance officer",
  scheme_admin: "Scheme admin",
  leadership: "Leadership",
}
export const ROLES = Object.keys(ROLE_LABEL) as Role[]

export const SCHEME_NAME: Record<string, string> = {
  NFST: "National Fellowship for Scheduled Tribes",
  NOS: "National Overseas Scholarship",
}

export const DOC_LABEL: Record<string, string> = {
  photo: "Photograph",
  st_certificate: "ST certificate",
  dob_proof: "Date of birth proof",
  pg_marksheet: "PG marksheet",
  qualifying_marksheet: "Qualifying exam marksheet",
  admission_letter: "M.Phil/PhD admission letter",
  offer_letter: "University offer letter",
  net_scorecard: "NET scorecard",
  disability_certificate: "Disability certificate",
  pvtg_certificate: "PVTG certificate",
  premier_offer_letter: "Premier institute offer letter",
  income_certificate: "Income certificate",
  death_certificate: "Father's death certificate",
}

/** Anything the backend returns as a snake_case code → "Snake case code". */
export function humanize(s: string | null | undefined): string {
  if (!s) return ""
  const t = s.replace(/_/g, " ")
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export const docLabel = (t: string) => DOC_LABEL[t] ?? humanize(t)

export type Tone = "pass" | "review" | "fail" | "neutral" | "accent"

// One tone per status value across every enum (app, doc, rule, award, payment, grievance, flag, request).
const TONE: Record<string, Tone> = {
  pass: "pass", eligible: "pass", selected: "pass", awarded: "pass", verified: "pass", auto_cleared: "pass",
  active: "pass", credited: "pass", approved: "pass", resolved: "pass", cleared: "pass", completed: "pass",
  review: "review", needs_review: "review", deficient: "review", waitlisted: "review", pending: "review",
  processing: "review", on_leave: "review", sent: "review", generated: "neutral", in_progress: "review",
  open: "review", offered: "accent", missing: "fail",
  fail: "fail", rejected: "fail", not_selected: "fail", failed: "fail", discontinued: "fail",
  cancelled: "fail", confirmed: "fail", withdrawn: "neutral",
  institute_verification: "accent", ministry_review: "accent", state_verification: "accent",
  submitted: "accent", auto_scrutiny: "accent", draft: "neutral", closed: "neutral",
}
export const toneOf = (status: string): Tone => TONE[status] ?? "neutral"

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" })
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
export const fmtDate = (d?: string | null) => (d ? dateFmt.format(new Date(d)) : "—")
export const fmtDateTime = (d?: string | null) => (d ? dateTimeFmt.format(new Date(d)) : "—")

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
export const fmtMoney = (n?: string | number | null) => (n == null ? "—" : inr.format(Number(n)))
export const fmtNum = (n?: string | number | null) => (n == null ? "—" : Number(n).toLocaleString("en-IN"))

export const shortId = (id: string) => id.slice(0, 8).toUpperCase()

/** Days until (positive) / since (negative) a timestamp. */
export const daysFrom = (d: string) => Math.round((new Date(d).getTime() - Date.now()) / 86_400_000)

/** Current Indian FY quarter as the backend's period string, e.g. "FY27-Q2". */
export function currentPeriod(now = new Date()): string {
  const m = now.getMonth() // 0 = Jan
  const fyEnd = m >= 3 ? now.getFullYear() + 1 : now.getFullYear()
  const q = m >= 3 ? Math.floor((m - 3) / 3) + 1 : 4
  return `FY${String(fyEnd).slice(2)}-Q${q}`
}

/** Eligibility fact → the form key it's read from (backend/utils/facts.py). Also the key a deficiency unlocks. */
export const FACT_FIELD: Record<string, string> = {
  st_match: "community",
  pg_pct: "marks_value",
  qual_pct: "marks_value",
  net_status: "net_roll",
  net_pct: "net_roll",
  course: "course",
  other_fellowship: "other_fellowship",
  sibling_awarded: "sibling_awarded",
  father_deceased: "father_deceased",
  family_income: "family_income",
  stream: "stream",
  qs_rank: "offer_university",
  institution_verified: "institution_id",
  institution_premier: "institution_id",
}
