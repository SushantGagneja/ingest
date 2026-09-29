import { createContext, useContext, type ReactNode } from "react"
import { useMutation, useQuery, type QueryKey } from "@tanstack/react-query"
import { AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { api, queryClient } from "@/lib/api"
import { humanize, toneOf, type Tone } from "@/lib/format"
import type { Cycle, Institution, Profile, State } from "@/lib/types"
import { cn } from "@/lib/utils"

// ───────── current user ─────────

export const MeContext = createContext<Profile | null>(null)
export function useMe(): Profile {
  const me = useContext(MeContext)
  if (!me) throw new Error("useMe outside MeContext")
  return me
}

// ───────── shared reference queries ─────────

export const useCycles = () => useQuery({ queryKey: ["cycles"], queryFn: () => api<Cycle[]>("/cycles") })
export const useInstitutions = () =>
  useQuery({ queryKey: ["institutions"], queryFn: () => api<Institution[]>("/institutions"), staleTime: 300_000 })
export const useStates = () => useQuery({ queryKey: ["states"], queryFn: () => api<State[]>("/states"), staleTime: Infinity })

/** A POST/PATCH with a success toast, an error toast, and cache invalidation. */
export function useAction<V = void, R = any>(
  fn: (v: V) => Promise<R>,
  opts: { success?: string | ((r: R) => string); invalidate?: QueryKey[]; onSuccess?: (r: R) => void } = {},
) {
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      if (opts.success) toast.success(typeof opts.success === "function" ? opts.success(r) : opts.success)
      opts.invalidate?.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }))
      opts.onSuccess?.(r)
    },
    onError: (e) => toast.error(e.message),
  })
}

// ───────── layout bits ─────────

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

const TONE_CLASS: Record<Tone, string> = {
  pass: "bg-pass text-pass-foreground",
  review: "bg-review text-review-foreground",
  fail: "bg-fail text-fail-foreground",
  neutral: "bg-neutral text-neutral-foreground",
  accent: "bg-primary text-primary-foreground",
}

export function StatusBadge({ status, label, tone }: { status: string; label?: string; tone?: Tone }) {
  return (
    <Badge className={cn("border-transparent font-medium", TONE_CLASS[tone ?? toneOf(status)])}>{label ?? humanize(status)}</Badge>
  )
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden /> {label}
    </div>
  )
}

export function ErrorState({ error }: { error: unknown }) {
  return (
    <Alert variant="destructive" className="bg-background">
      <AlertCircle aria-hidden />
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>{error instanceof Error ? error.message : String(error)}</AlertDescription>
    </Alert>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>
}

/** Renders loading / error / content for a query. */
export function Query<T>({ q, children }: { q: { data?: T; error: unknown; isPending: boolean }; children: (d: T) => ReactNode }) {
  if (q.isPending) return <Loading />
  if (q.error) return <ErrorState error={q.error} />
  return <>{children(q.data as T)}</>
}

/** Label + control, with an optional hint wired up via aria-describedby. */
export function Field({ id, label, hint, children, className }: { id: string; label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  )
}

/** Term/definition grid for read-only record details. */
export function Facts({ items }: { items: [ReactNode, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 text-sm">
      {items.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="min-w-0 break-words">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  )
}
