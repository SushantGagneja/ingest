// src/lib/mock.ts
// Frontend-only mode: answers every api() call from in-memory fixtures. Enabled with VITE_MOCK=true.
// Data lives in memory, so a page refresh resets it. The current role is kept in localStorage.
import type { AppDetail, Application, Award, Cycle, Grievance, Institution, LifecycleRequest, Notification, Payment, Profile, State } from "./types"
import type { Role } from "./format"

export const MOCK = import.meta.env.VITE_MOCK === "true"

const ROLE_KEY = "mock_role"
export const getMockRole = (): Role => (localStorage.getItem(ROLE_KEY) as Role | null) ?? "applicant"
export const setMockRole = (r: Role) => {
    localStorage.setItem(ROLE_KEY, r)
    location.assign("/")
}

const day = 86_400_000
const ago = (d: number) => new Date(Date.now() - d * day).toISOString()
const ahead = (d: number) => new Date(Date.now() + d * day).toISOString()
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ───────── fixtures ─────────

const cycles: Cycle[] = [
    { id: "c-nfst-26", scheme_code: "NFST", cycle: "2026-27", opens_at: ago(30), closes_at: ahead(21), verify_closes_at: ahead(45), status: "open" },
    { id: "c-nos-26", scheme_code: "NOS", cycle: "2026-27", opens_at: ago(20), closes_at: ahead(40), verify_closes_at: null, status: "open" },
    { id: "c-nfst-25", scheme_code: "NFST", cycle: "2025-26", opens_at: ago(400), closes_at: ago(330), verify_closes_at: ago(300), status: "published" },
]

const states: State[] = [
    { code: "MH", name: "Maharashtra", st_population: 10_510_213 },
    { code: "OD", name: "Odisha", st_population: 9_590_756 },
    { code: "JH", name: "Jharkhand", st_population: 8_645_042 },
    { code: "MP", name: "Madhya Pradesh", st_population: 15_316_784 },
    { code: "NL", name: "Nagaland", st_population: 1_710_973 },
]

const institutions: Institution[] = [
    { id: "inst-1", aishe_code: "U-0001", name: "Jawaharlal Nehru University", state_code: "MH", city_class: "X", is_premier: true, cgpa_factor: "1.1", verified: true },
    { id: "inst-2", aishe_code: "U-0002", name: "Utkal University", state_code: "OD", city_class: "Y", is_premier: false, cgpa_factor: null, verified: true },
    { id: "inst-3", aishe_code: "C-0417", name: "Ranchi Women's College", state_code: "JH", city_class: "Z", is_premier: false, cgpa_factor: null, verified: false },
]

const baseProfile: Profile = {
    id: "mock-user", email: "asha.munda@example.com", full_name: "Asha Munda", avatar_url: null, phone: "9876543210", role: "applicant",
    institution_id: null, state_code: "JH", dob: "1999-04-12", gender: "F", district: "Khunti", st_community: "Munda", is_pvtg: false, is_divyang: false,
}
const officerRoles: Role[] = ["institute_officer", "state_officer", "scrutiny_officer", "mission_officer", "finance_officer", "scheme_admin"]
const me = (): Profile => {
    const role = getMockRole()
    return { ...baseProfile, role, institution_id: officerRoles.includes(role) ? "inst-1" : null, full_name: role === "applicant" ? "Asha Munda" : "Rohan Verma" }
}

const mkApp = (id: string, cycle_id: string, status: string, extra: Partial<Application> = {}): Application => ({
    id, applicant_id: "mock-user", cycle_id, config_version: 1, status,
    form: { course: "PhD", subject: "Anthropology", cgpa: "8.2", institution: "Jawaharlal Nehru University" },
    institution_id: "inst-1", unlocked_fields: [], sla_due_at: ahead(5), score: null, rank: null, category: null,
    submitted_at: status === "draft" ? null : ago(12), created_at: ago(40), updated_at: ago(2), ...extra,
})

const apps: Application[] = [
    mkApp("a1b2c3d4-0001", "c-nfst-25", "awarded", { score: 84.5, rank: 12, category: "general", sla_due_at: null, submitted_at: ago(380) }),
    mkApp("a1b2c3d4-0002", "c-nfst-26", "deficient", { unlocked_fields: ["cgpa"] }),
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
        { rule_id: "net", outcome: "fail", reason: "NET scorecard not provided" },
    ],
    deficiency: a.status === "deficient"
        ? { id: "def-1", items: [{ doc_type: "photo", message: "Upload a recent photograph" }, { field: "cgpa", message: "CGPA does not match the marksheet" }], memo: "Please fix the items below within the due date.", issued_at: ago(3), due_at: ahead(4) }
        : null,
    timeline: [
        { id: 1, actor_id: "mock-user", action: "submit", data: { from: "draft", to: "submitted" }, created_at: ago(12) },
        { id: 2, actor_id: "off-1", action: "auto", data: { from: "submitted", to: "institute_verification" }, created_at: ago(11) },
        { id: 3, actor_id: "off-1", action: "deficiency", data: { from: "institute_verification", to: "deficient", note: "Photo missing" }, created_at: ago(3) },
    ],
    holder: a.status === "deficient" ? "applicant" : "institute_officer",
    applicant: { email: baseProfile.email, full_name: baseProfile.full_name, phone: baseProfile.phone, state_code: "JH", dob: baseProfile.dob, gender: "F", district: "Khunti", st_community: "Munda", is_pvtg: false, is_divyang: false },
    cycle: cycles.find((c) => c.id === a.cycle_id) ? { scheme_code: cycles.find((c) => c.id === a.cycle_id)!.scheme_code, cycle: cycles.find((c) => c.id === a.cycle_id)!.cycle, status: cycles.find((c) => c.id === a.cycle_id)!.status } : null,
})

const awards: Award[] = [
    { id: "aw-1", application_id: apps[0].id, award_no: "NFST/2025/01234", start_date: ago(300), tenure_end: ahead(800), status: "active", hostel: false, stream: "humanities", scheme_code: "NFST", cycle: "2025-26", full_name: "Asha Munda", email: baseProfile.email!, institution_name: institutions[0].name, institution_id: "inst-1" },
]

const payments: Payment[] = ["2026-Q1", "2025-Q4", "2025-Q3", "2025-Q2"].map((period, i): Payment => ({
    id: `pay-${i}`, award_id: "aw-1", period, kind: "regular", components: { fellowship: "37000", contingency: "20000" },
    amount: "57000", batch_id: `b-${i}`, status: i === 0 ? "sent" : i === 2 ? "failed" : "credited", failure_code: i === 2 ? "ACC_CLOSED" : null,
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
    overdue: i % 3 === 0, full_name, state_code: states[i % states.length].code, scheme_code: i % 3 ? "NFST" : "NOS", cycle: "2026-27",
}))

const dashboards: Record<string, Record<string, unknown>[]> = {
    funnel: ["draft", "submitted", "institute_verification", "ministry_review", "deficient", "eligible", "selected", "awarded", "rejected"].map((status, i) => ({ cycle_id: "c-nfst-26", status, n: 900 - i * 90 })),
    pending: institutions.flatMap((inst, i) => [{ cycle_id: "c-nfst-26", institution_id: inst.id, status: "institute_verification", n: 40 - i * 9, overdue: 12 - i * 5 }]),
    equity: states.map((s, i) => ({ cycle_id: "c-nfst-26", state_code: s.code, name: s.name, st_population: s.st_population, applicants: 300 - i * 50, selected: 40 - i * 6 })),
    selection: ["general", "pvtg", "divyang", "female"].map((category, i) => ({ cycle_id: "c-nfst-26", category, selected: 60 - i * 12 })),
    finance: ["2026-Q1", "2025-Q4"].flatMap((period) => ["credited", "sent", "failed"].map((status, i) => ({ cycle_id: "c-nfst-25", period, status, n: 200 - i * 80, total: (200 - i * 80) * 57000 }))),
    grievances: ["technical", "payment", "eligibility"].flatMap((category, i) => ["open", "resolved"].map((status, j) => ({ category, status, n: 8 - i * 2 + j, overdue: status === "open" ? i : 0 }))),
}

// ───────── router ─────────

type Opts = { method?: string; body?: unknown }

export async function mockApi(path: string, opts: Opts = {}): Promise<any> {
    await wait(250) // long enough to see loading states
    const url = new URL(path, "http://mock")
    const p = url.pathname
    const method = opts.method ?? (opts.body === undefined ? "GET" : "POST")
    const m = (re: RegExp) => p.match(re)

    if (method !== "GET" && !(p === "/applications" && method === "POST")) return {} // every write succeeds silently

    if (p === "/me") return me()
    if (p === "/me/notifications") return notifications
    if (p === "/cycles") return cycles
    if (p === "/states") return states
    if (p === "/institutions") return institutions

    if (p === "/applications" && method === "POST") {
        const a = mkApp(`new-${Date.now()}`, (opts.body as { cycle_id: string }).cycle_id, "draft", { submitted_at: null, sla_due_at: null })
        apps.push(a)
        return a
    }
    if (p === "/applications") return apps
    let x: RegExpMatchArray | null
    if ((x = m(/^\/applications\/([^/]+)$/))) return detail(apps.find((a) => a.id === x![1]) ?? queue.find((a) => a.id === x![1]) ?? apps[1])
    if (m(/^\/applications\/[^/]+\/checklist$/)) return { config_version: 1, documents: [{ doc_type: "st_certificate", status: "verified" }, { doc_type: "pg_marksheet", status: "needs_review" }, { doc_type: "photo", status: "missing" }] }
    if (m(/^\/applications\/[^/]+\/eligibility$/)) return { config_version: 1, summary: "review", facts: { age: 27 }, results: detail(apps[1]).rule_results }
    if (m(/^\/applications\/[^/]+\/rank-card$/)) return { rank: 12, category: "general" }
    if (m(/^\/applications\/[^/]+\/deficiency\/draft$/)) return { memo: "Draft memo: please upload a recent photograph and correct the CGPA." }
    if (m(/^\/documents\/[^/]+\/url$/)) return { url: null }

    if (p === "/awards") return awards
    if (p === "/payments") return payments
    if (p === "/requests") return requests
    if (p === "/grievances") return grievances
    if (p === "/queue") return queue
    if ((x = m(/^\/dashboards\/(\w+)$/))) return dashboards[x[1]] ?? []
    if (p === "/help/ask") return { answer: "Mock answer: you can edit your application until the cycle closes." }

    console.warn(`[mock] no fixture for ${method} ${path}, returning []. Add one in src/lib/mock.ts`)
    return []
}