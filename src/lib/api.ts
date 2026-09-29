import { createClient } from "@supabase/supabase-js"
import { QueryClient } from "@tanstack/react-query"
import { MOCK, mockApi } from "./mock"

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api"

export class ApiError extends Error {
  status: number
  detail: unknown
  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : ((detail as { message?: string })?.message ?? `HTTP ${status}`))
    this.status = status
    this.detail = detail
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(API + path, { ...init, headers: { ...(await authHeader()), ...init.headers } })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    // FastAPI: {detail: "..."} for HTTPException, {detail: [...]} for validation errors
    const detail = Array.isArray(body.detail) ? body.detail.map((d: { msg: string }) => d.msg).join("; ") : body.detail
    throw new ApiError(res.status, detail ?? res.statusText)
  }
  return res
}

/** JSON in, JSON out. `body` FormData is sent as multipart. */
export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  if (MOCK) return mockApi(path, opts)
  const isForm = opts.body instanceof FormData
  const res = await request(path, {
    method: opts.method ?? (opts.body === undefined ? "GET" : "POST"),
    headers: isForm || opts.body === undefined ? {} : { "Content-Type": "application/json" },
    body: isForm ? (opts.body as FormData) : opts.body === undefined ? undefined : JSON.stringify(opts.body),
  })
  return res.json()
}

/** Authenticated file download (CSV export): an <a href> can't carry the bearer token. */
export async function download(path: string, filename: string) {
  if (MOCK) return console.info("[mock] download skipped", path, filename)
  const blob = await (await request(path)).blob()
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: filename })
  a.click()
  URL.revokeObjectURL(a.href)
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: (n, e) => n < 2 && !(e instanceof ApiError && e.status < 500),
    },
  },
})