// src/lib/mock.ts
// Frontend-only demo mode: answers every api() call from in-memory fixtures. Enabled with VITE_DEMO_MODE=true or VITE_MOCK=true.
// All demo data is labeled with code comments. Stateful in-memory mutations allow full flow demo.

import type { AppDetail, Application, Award, Cycle, Grievance, Institution, LifecycleRequest, Notification, Payment, Profile, State } from "./types"
import type { Role } from "./format"

export const MOCK = import.meta.env.VITE_MOCK === "true" || import.meta.env.VITE_DEMO_MODE === "true"

const ROLE_KEY = "mock_role"
const ERROR_KEY = "mock_simulated_error"

export const getMockRole = (): Role => (localStorage.getItem(ROLE_KEY) as Role | null) ?? "applicant"
export const setMockRole = (r: Role) => {
  localStorage.setItem(ROLE_KEY, r)
  location.assign("/")
}

export const isSimulatedErrorEnabled = (): boolean => localStorage.getItem(ERROR_KEY) === "true"
export const toggleSimulatedError = () => {
  const current = isSimulatedErrorEnabled()
  localStorage.setItem(ERROR_KEY, String(!current))
  location.reload()
}

export const resetDemoData = () => {
  localStorage.removeItem(ROLE_KEY)
  localStorage.removeItem(ERROR_KEY)
  location.reload()
}

const day = 86_400_000
const ago = (d: number) => new Date(Date.now() - d * day).toISOString()
const ahead = (d: number) => new Date(Date.now() + d * day).toISOString()
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ───────── Demo Fixtures ─────────

const initialCycles: Cycle[] = [
  { id: "c-nfst-26", scheme_code: "NFST", cycle: "2026-27", opens_at: ago(30), closes_at: ahead(21), verify_closes_at: ahead(45), status: "open" },
  { id: "c-nos-26", scheme_code: "NOS", cycle: "2026-27", opens_at: ago(20), closes_at: ahead(40), verify_closes_at: null, status: "open" },
  { id: "c-nfst-25", scheme_code: "NFST", cycle: "2025-26", opens_at: ago(400), closes_at: ago(330), verify_closes_at: ago(300), status: "published" },
]

const initialStates: State[] = [
  { code: "MH", name: "Maharashtra", st_population: 10_510_213 },
  { code: "OD", name: "Odisha", st_population: 9_590_756 },
  { code: "JH", name: "Jharkhand", st_population: 8_645_042 },
  { code: "MP", name: "Madhya Pradesh", st_population: 15_316_784 },
  { code: "NL", name: "Nagaland", st_population: 1_710_973 },
]

const initialInstitutions: Institution[] = [
  { id: "inst-1", aishe_code: "U-0001", name: "Jawaharlal Nehru University", state_code: "MH", city_class: "X", is_premier: true, cgpa_factor: "1.1", verified: true },
  { id: "inst-2", aishe_code: "U-0002", name: "Utkal University", state_code: "OD", city_class: "Y", is_premier: false, cgpa_factor: null, verified: true },
  { id: "inst-3", aishe_code: "C-0417", name: "Ranchi Women's College", state_code: "JH", city_class: "Z", is_premier: false, cgpa_factor: null, verified: false },
]

const baseProfile: Profile = {
  id: "mock-user",
  email: "asha.munda@example.com",
  full_name: "Asha Munda",
  avatar_url: null,
  phone: "9876543210",
  role: "applicant",
  institution_id: null,
  state_code: "JH",
  dob: "1999-04-12",
  gender: "F",
  district: "Khunti",
  st_community: "Munda",
  is_pvtg: false,
  is_divyang: false,
}

const officerRoles: Role[] = ["institute_officer", "state_officer", "scrutiny_officer", "mission_officer", "finance_officer", "scheme_admin"]
const me = (): Profile => {
  const role = getMockRole()
  return { ...baseProfile, role, institution_id: officerRoles.includes(role) ? "inst-1" : null, full_name: role === "applicant" ? "Asha Munda" : "Rohan Verma" }
}

const mkApp = (id: string, cycle_id: string, status: string, extra: Partial<Application> = {}): Application => ({
  id,
  applicant_id: "mock-user",
  cycle_id,
  config_version: 1,
  status,
  form: { course: "PHD", subject: "Anthropology", cgpa: "8.2", marks_value: 8.2, institution: "Jawaharlal Nehru University", stream: "humanities" },
  institution_id: "inst-1",
  unlocked_fields: [],
  sla_due_at: ahead(5),
  score: null,
  rank: null,
  category: null,
  submitted_at: status === "draft" ? null : ago(12),
  created_at: ago(40),
  updated_at: ago(2),
  ...extra,
})

let apps: Application[] = [
  mkApp("a1b2c3d4-0001", "c-nfst-25", "awarded", { score: 84.5, rank: 12, category: "general", sla_due_at: null, submitted_at: ago(380) }),
  mkApp("a1b2c3d4-0002", "c-nfst-26", "deficient", { unlocked_fields: ["marks_value", "bank_account", "photo"] }),
]

const docs = (appId: string): AppDetail["documents"] => [
  { id: `${appId}-d1`, application_id: appId, doc_type: "st_certificate", source: "upload", storage_path: "x", extracted: { name: "Asha Munda" }, confidence: 0.94, status: "verified", review_note: null, created_at: ago(20) },
  { id: `${appId}-d2`, application_id: appId, doc_type: "pg_marksheet", source: "upload", storage_path: "x", extracted: { cgpa: 8.2 }, confidence: 0.61, status: "needs_review", review_note: "Low OCR confidence", created_at: ago(20) },
  { id: `${appId}-d3`, application_id: appId, doc_type: "photo", source: "digilocker", storage_path: null, extracted: {}, confidence: null, status: "missing", review_note: null, created_at: ago(20) },
]

const detail = (a: Application): AppDetail => ({
  ...a,
  documents: docs(a.id),
  rule_results: [
    { rule_id: "age", outcome: "pass", reason: "Age 27 is within the limit of 35" },
    { rule_id: "income", outcome: "review", reason: "Income certificate needs manual check" },
    { rule_id: "net", outcome: "pass", reason: "NET Roll No verified" },
  ],
  deficiency: a.status === "deficient"
    ? { id: "def-1", items: [{ doc_type: "photo", message: "Upload a recent photograph" }, { field: "marks_value", message: "CGPA does not match the marksheet" }], memo: "Please fix the flagged items below before resubmitting.", issued_at: ago(3), due_at: ahead(4) }
    : null,
  timeline: [
    { id: 1, actor_id: "mock-user", action: "submit", data: { from: "draft", to: "submitted" }, created_at: ago(12) },
    { id: 2, actor_id: "off-1", action: "auto", data: { from: "submitted", to: "institute_verification" }, created_at: ago(11) },
    { id: 3, actor_id: "off-1", action: "deficiency", data: { from: "institute_verification", to: "deficient", note: "Photo missing" }, created_at: ago(3) },
  ],
  holder: a.status === "deficient" ? "applicant" : "institute_officer",
  applicant: { email: baseProfile.email, full_name: baseProfile.full_name, phone: baseProfile.phone, state_code: "JH", dob: baseProfile.dob, gender: "F", district: "Khunti", st_community: "Munda", is_pvtg: false, is_divyang: false },
  cycle: initialCycles.find((c) => c.id === a.cycle_id) ? { scheme_code: initialCycles.find((c) => c.id === a.cycle_id)!.scheme_code, cycle: initialCycles.find((c) => c.id === a.cycle_id)!.cycle, status: initialCycles.find((c) => c.id === a.cycle_id)!.status } : null,
})

const awards: Award[] = [
  { id: "aw-1", application_id: apps[0].id, award_no: "NFST/2025/01234", start_date: ago(300), tenure_end: ahead(800), status: "active", hostel: false, stream: "humanities", scheme_code: "NFST", cycle: "2025-26", full_name: "Asha Munda", email: baseProfile.email!, institution_name: initialInstitutions[0].name, institution_id: "inst-1" },
]

const payments: Payment[] = ["2026-Q1", "2025-Q4", "2025-Q3", "2025-Q2"].map((period, i): Payment => ({
  id: `pay-${i}`,
  award_id: "aw-1",
  period,
  kind: "regular",
  components: { fellowship: "37000", contingency: "20000" },
  amount: "57000",
  batch_id: `b-${i}`,
  status: i === 0 ? "sent" : i === 2 ? "failed" : "credited",
  failure_code: i === 2 ? "ACC_CLOSED" : null,
  timeline: [{ status: "generated", at: ago(30 * (i + 1) + 5) }, { status: "sent", at: ago(30 * (i + 1) + 3), pfms_ref: `PFMS${i}99` }],
  created_at: ago(30 * (i + 1)),
}))

const requests: LifecycleRequest[] = [
  { id: "rq-1", award_id: "aw-1", kind: "leave", period: "2026-Q2", payload: { days: 30 }, status: "pending", created_at: ago(2), decided_at: null, award_no: awards[0].award_no, full_name: "Asha Munda", scheme_code: "NFST" },
]

const grievances: Grievance[] = [
  { id: "g-1", raised_by: "mock-user", application_id: apps[1].id, subject: "Photo upload keeps failing", body: "The upload stops at 90%.", category: "technical", assigned_role: "scrutiny_officer", suggested_reply: "Try a JPG under 200 KB.", status: "open", resolution: null, sla_due_at: ahead(2), created_at: ago(1), resolved_at: null },
  { id: "g-2", raised_by: "mock-user", application_id: null, subject: "Payment delayed", body: "Q3 stipend not received.", category: "payment", assigned_role: "finance_officer", suggested_reply: null, status: "resolved", resolution: "Re-sent via PFMS.", sla_due_at: null, created_at: ago(30), resolved_at: ago(20) },
]

const notifications: Notification[] = [
  { id: "n-1", title: "Deficiency raised", body: "Your NFST application needs a photograph.", link: `/applications/${apps[1].id}`, read_at: null, created_at: ago(3) },
  { id: "n-2", title: "Payment sent", body: "2026-Q1 stipend sent to your bank.", link: "/apply/awards", read_at: ago(1), created_at: ago(2) },
  { id: "n-3", title: "NOS is open", body: "Applications for NOS 2026-27 are open.", link: "/apply", read_at: ago(10), created_at: ago(15) },
]

const names = ["Meera Toppo", "Karan Bhil", "Lakshmi Oram", "Vikram Gond", "Sunita Kharia", "Ajay Santhal", "Pooja Naga", "Rahul Saora"]
const queueStatuses = ["institute_verification", "ministry_review", "auto_scrutiny", "deficient"]
const queue = names.map((full_name, i) => ({
  ...mkApp(`q-${1000 + i}-aaaa`, i % 3 ? "c-nfst-26" : "c-nos-26", queueStatuses[i % 4], { sla_due_at: i % 3 === 0 ? ago(i + 1) : ahead(i + 2), submitted_at: ago(5 + i) }),
  overdue: i % 3 === 0,
  full_name,
  state_code: initialStates[i % initialStates.length].code,
  scheme_code: i % 3 ? "NFST" : "NOS",
  cycle: "2026-27",
}))

const riskFlags = [
  { id: "rf-1", application_id: "q-1000-aaaa", applicant_name: "Meera Toppo", flag_type: "income_discrepancy", severity: "high", details: "Income certificate declared ₹1.5L, ITR indicates ₹8.2L", status: "open", created_at: ago(2) },
  { id: "rf-2", application_id: "q-1002-aaaa", applicant_name: "Lakshmi Oram", flag_type: "duplicate_aadhaar", severity: "critical", details: "Same Aadhaar hash matched with active award NFST/2024/0912", status: "open", created_at: ago(1) },
]

const users = [
  { id: "u-1", email: "asha.munda@example.com", full_name: "Asha Munda", role: "applicant", created_at: ago(100) },
  { id: "u-2", email: "rohan.verma@inst.edu.in", full_name: "Rohan Verma", role: "institute_officer", institution_id: "inst-1", created_at: ago(200) },
  { id: "u-3", email: "officer.jh@gov.in", full_name: "Sanjay Kumar", role: "state_officer", state_code: "JH", created_at: ago(300) },
  { id: "u-4", email: "admin@tribal.gov.in", full_name: "Admin User", role: "scheme_admin", created_at: ago(400) },
]

const meritRuns = [
  {
    id: "run-1",
    cycle_id: "c-nfst-26",
    config_version: 1,
    params: {},
    input_hash: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    output_hash: "sha256:ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
    created_at: ago(5),
    approved_at: ago(3),
    selected_count: 2,
    result: {
      selected: [
        { app_id: "q-1000-aaaa", category: "general", rank: 1 },
        { app_id: "q-1001-aaaa", category: "pvtg", rank: 2 },
      ],
      fill: {
        general: { seats: 80, filled: 60, vacant_to: "pvtg" },
        pvtg: { seats: 40, filled: 40, vacant_to: null },
      },
      waitlist: {},
      trace: {
        "q-1000-aaaa": [
          { cat: "general", considered: true, outcome: "selected", cutoff: 75.0 },
          { cat: "pvtg", considered: false, outcome: "not_considered", cutoff: null },
        ],
        "q-1001-aaaa": [
          { cat: "general", considered: true, outcome: "waitlisted", cutoff: 75.0 },
          { cat: "pvtg", considered: true, outcome: "selected", cutoff: 70.0 },
        ],
      },
    },
  },
]

const dashboards: Record<string, Record<string, unknown>[]> = {
  funnel: ["draft", "submitted", "institute_verification", "ministry_review", "deficient", "eligible", "selected", "awarded", "rejected"].map((status, i) => ({ cycle_id: "c-nfst-26", status, n: 900 - i * 90 })),
  pending: initialInstitutions.flatMap((inst, i) => [{ cycle_id: "c-nfst-26", institution_id: inst.id, status: "institute_verification", n: 40 - i * 9, overdue: 12 - i * 5 }]),
  equity: initialStates.map((s, i) => ({ cycle_id: "c-nfst-26", state_code: s.code, name: s.name, st_population: s.st_population, applicants: 300 - i * 50, selected: 40 - i * 6 })),
  selection: ["general", "pvtg", "divyang", "female"].map((category, i) => ({ cycle_id: "c-nfst-26", category, selected: 60 - i * 12 })),
  finance: ["2026-Q1", "2025-Q4"].flatMap((period) => ["credited", "sent", "failed"].map((status, i) => ({ cycle_id: "c-nfst-25", period, status, n: 200 - i * 80, total: (200 - i * 80) * 57000 }))),
  grievances: ["technical", "payment", "eligibility"].flatMap((category, i) => ["open", "resolved"].map((status, j) => ({ category, status, n: 8 - i * 2 + j, overdue: status === "open" ? i : 0 }))),
}

const configs: Record<string, any[]> = {
  "c-nfst-26": [
    {
      id: "cfg-1",
      cycle_id: "c-nfst-26",
      version: 1,
      published_at: ago(25),
      effective_from: ago(25),
      circular_ref: "F.No.14011/06/2026-SCD-V",
      config: {
        eligibility: [
          { id: "age_limit", label: "Maximum age 35", fact: "age", op: "<=", val: 35, on_fail: "fail" },
          { id: "family_income_limit", label: "Family income cap", fact: "family_income", op: "<=", val: 600000, on_fail: "review" },
        ],
        documents: {
          required: ["st_certificate", "pg_marksheet", "photo"],
          conditional: [],
        },
        slots: { quota: { stream: { humanities: 50, science: 50 } } },
      },
    },
  ],
}

// ───────── Router & Handler ─────────

type Opts = { method?: string; body?: unknown }

export async function mockApi(path: string, opts: Opts = {}): Promise<any> {
  // Simulated network latency (150ms to 350ms)
  await wait(150 + Math.random() * 200)

  const url = new URL(path, "http://mock")
  const p = url.pathname
  const method = opts.method ?? (opts.body === undefined ? "GET" : "POST")
  let x: RegExpMatchArray | null
  const m = (re: RegExp) => p.match(re)

  // Keep the shell session available when demonstrating a failed data request.
  // Otherwise the persistent error toggle prevents the role/reset controls from rendering.
  if (isSimulatedErrorEnabled() && p !== "/me") {
    throw new Error("Simulated failure path enabled for demo error testing.")
  }

  if (p === "/me") return me()
  if (p === "/me/notifications") return notifications
  if (p === "/cycles") return initialCycles
  if (p === "/states") return initialStates
  if (p === "/institutions") return initialInstitutions

  if ((x = m(/^\/cycles\/([^/]+)\/configs$/))) {
    return configs[x[1]] ?? []
  }

  if (p === "/applications" && method === "POST") {
    const a = mkApp(`new-${Date.now()}`, (opts.body as { cycle_id: string }).cycle_id, "draft", { submitted_at: null, sla_due_at: null })
    apps.push(a)
    return a
  }
  if (p === "/applications") return apps

  if ((x = m(/^\/applications\/([^/]+)$/))) {
    const appId = x[1]
    if (method === "PATCH") {
      const target = apps.find((a) => a.id === appId) ?? queue.find((a) => a.id === appId)
      if (target && opts.body) {
        const body = opts.body as { form?: Record<string, any>; institution_id?: string }
        if (body.form) target.form = { ...target.form, ...body.form }
        if (body.institution_id !== undefined) target.institution_id = body.institution_id
        target.updated_at = new Date().toISOString()
      }
      return detail(target ?? apps[1])
    }
    return detail(apps.find((a) => a.id === appId) ?? queue.find((a) => a.id === appId) ?? apps[1])
  }

  if ((x = m(/^\/applications\/([^/]+)\/(submit|resubmit)$/))) {
    const appId = x[1]
    const target = apps.find((a) => a.id === appId) ?? queue.find((a) => a.id === appId)
    if (target) {
      target.status = "institute_verification"
      target.submitted_at = new Date().toISOString()
    }
    return { status: "submitted" }
  }

  if (m(/^\/applications\/[^/]+\/checklist$/)) return { config_version: 1, documents: [{ doc_type: "st_certificate", status: "verified" }, { doc_type: "pg_marksheet", status: "needs_review" }, { doc_type: "photo", status: "missing" }] }
  if (m(/^\/applications\/[^/]+\/eligibility$/)) return { config_version: 1, summary: "review", facts: { age: 27 }, results: detail(apps[1]).rule_results }
  if (m(/^\/applications\/[^/]+\/rank-card$/)) return { rank: 12, category: "general" }
  if (m(/^\/applications\/[^/]+\/deficiency\/draft$/)) return { memo: "Draft memo: please upload a recent photograph and correct the marks value." }
  if (m(/^\/documents\/[^/]+\/url$/)) return { url: null }

  if (p === "/awards") return awards
  if (p === "/payments") return payments
  if (p === "/requests") return requests
  if (p === "/grievances") return grievances
  if (p === "/queue") return queue
  if (p === "/risk-flags") return riskFlags
  if ((x = m(/^\/merit-runs\/([^/]+)$/))) return meritRuns.find((r) => r.id === x![1]) ?? meritRuns[0]
  if (p === "/merit-runs") return meritRuns
  if (p === "/admin/users") return users
  if ((x = m(/^\/cycles\/([^/]+)\/merit-runs$/))) return meritRuns.filter((r) => r.cycle_id === x![1]).map((r) => ({ id: r.id, config_version: r.config_version, params: r.params, output_hash: r.output_hash, created_at: r.created_at, approved_at: r.approved_at, selected_count: r.result.selected.length }))
  if ((x = m(/^\/dashboards\/(\w+)$/))) return dashboards[x[1]] ?? []
  if (p === "/help/ask") return { answer: "Mock answer: you can edit your application until the cycle closes." }

  if (method !== "GET") return { success: true }

  console.warn(`[mock] no fixture for ${method} ${path}, returning []. Add one in src/lib/mock.ts`)
  return []
}
