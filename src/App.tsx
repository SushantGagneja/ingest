import { lazy, Suspense, useEffect, useState, type ComponentType } from "react"
import { useQuery } from "@tanstack/react-query"
import type { Session } from "@supabase/supabase-js"
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useParams } from "react-router"
import {
  Award, Banknote, Bell, Building2, ClipboardList, FileSearch, Gauge, GraduationCap, Inbox, LifeBuoy,
  ListChecks, LogOut, Scale, Settings2, ShieldAlert, User, Users,
} from "lucide-react"

import { ErrorState, Loading, MeContext, useMe } from "@/components/common"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInset,
  SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { api, ApiError, supabase } from "@/lib/api"
import { MOCK } from "@/lib/mock"
import { MockRoleSwitcher } from "@/components/MockRoleSwitcher"
import { ROLE_LABEL, type Role } from "@/lib/format"
import type { Notification, Profile } from "@/lib/types"
import Login from "@/pages/common/Login"

const page = (load: () => Promise<{ default: ComponentType }>) => lazy(load)

const P = {
  applyHome: page(() => import("@/pages/apply/Home")),
  applyApp: page(() => import("@/pages/apply/Application")),
  applyAwards: page(() => import("@/pages/apply/Awards")),
  help: page(() => import("@/pages/apply/Help")),
  queue: page(() => import("@/pages/review/Queue")),
  reviewApp: page(() => import("@/pages/review/ReviewApplication")),
  risk: page(() => import("@/pages/review/RiskFlags")),
  scholars: page(() => import("@/pages/institute/Scholars")),
  requests: page(() => import("@/pages/institute/Requests")),
  merit: page(() => import("@/pages/committee/Merit")),
  run: page(() => import("@/pages/committee/Run")),
  finance: page(() => import("@/pages/finance/Finance")),
  users: page(() => import("@/pages/admin/Users")),
  institutions: page(() => import("@/pages/admin/Institutions")),
  cycles: page(() => import("@/pages/admin/Cycles")),
  config: page(() => import("@/pages/admin/Config")),
  dashboards: page(() => import("@/pages/dashboards/Dashboards")),
  grievances: page(() => import("@/pages/common/Grievances")),
  notifications: page(() => import("@/pages/common/Notifications")),
  profile: page(() => import("@/pages/common/Profile")),
  landing: page(() => import("@/pages/public/Landing")),
}

const OFFICERS: Role[] = ["institute_officer", "state_officer", "scrutiny_officer", "mission_officer", "finance_officer", "scheme_admin"]

// One entry per screen: sidebar item (when `icon`) + route + who may open it. Backend enforces the same roles.
const NAV: { path: string; label?: string; icon?: ComponentType; roles: Role[]; el: ComponentType }[] = [
  { path: "/apply", label: "My applications", icon: GraduationCap, roles: ["applicant"], el: P.applyHome },
  { path: "/apply/awards", label: "Award & payments", icon: Award, roles: ["applicant"], el: P.applyAwards },
  { path: "/help", label: "Help & grievances", icon: LifeBuoy, roles: ["applicant"], el: P.help },
  { path: "/queue", label: "Review queue", icon: Inbox, roles: ["institute_officer", "state_officer", "scrutiny_officer"], el: P.queue },
  { path: "/risk", label: "Risk flags", icon: ShieldAlert, roles: ["scrutiny_officer"], el: P.risk },
  { path: "/scholars", label: "Scholars", icon: GraduationCap, roles: ["institute_officer", "scrutiny_officer", "mission_officer"], el: P.scholars },
  { path: "/requests", label: "Scholar requests", icon: ListChecks, roles: ["institute_officer", "scrutiny_officer", "mission_officer"], el: P.requests },
  { path: "/merit", label: "Merit & selection", icon: Scale, roles: ["committee_member", "scrutiny_officer"], el: P.merit },
  { path: "/merit/runs/:id", roles: ["committee_member", "scrutiny_officer"], el: P.run },
  { path: "/finance", label: "Payments", icon: Banknote, roles: ["finance_officer"], el: P.finance },
  { path: "/admin/users", label: "Users & roles", icon: Users, roles: ["scheme_admin"], el: P.users },
  { path: "/admin/institutions", label: "Institutions", icon: Building2, roles: ["scheme_admin"], el: P.institutions },
  { path: "/admin/cycles", label: "Cycles & rules", icon: Settings2, roles: ["scheme_admin"], el: P.cycles },
  { path: "/admin/cycles/:id", roles: ["scheme_admin"], el: P.config },
  { path: "/dashboards", label: "Dashboards", icon: Gauge, roles: ["leadership", "scheme_admin", "scrutiny_officer"], el: P.dashboards },
  { path: "/grievances", label: "Grievances", icon: ClipboardList, roles: OFFICERS, el: P.grievances },
]

const HOME: Record<Role, string> = {
  applicant: "/apply",
  institute_officer: "/queue",
  state_officer: "/queue",
  scrutiny_officer: "/queue",
  mission_officer: "/scholars",
  committee_member: "/merit",
  finance_officer: "/finance",
  scheme_admin: "/admin/users",
  leadership: "/dashboards",
}

/** Same URL for everyone who can see an application: the applicant gets their form, officials the review screen. */
function ApplicationRoute() {
  const me = useMe()
  const { id } = useParams()
  return me.role === "applicant" ? <P.applyApp key={id} /> : <P.reviewApp key={id} />
}

function AppSidebar() {
  const me = useMe()
  const { pathname } = useLocation()
  const unread = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<Notification[]>("/me/notifications?limit=50"),
    refetchInterval: 60_000,
  }).data?.filter((n) => !n.read_at).length
  const items = NAV.filter((n) => n.icon && n.roles.includes(me.role))
  const item = (to: string, label: string, Icon: ComponentType, badge?: number) => (
    <SidebarMenuItem key={to}>
      <SidebarMenuButton asChild isActive={pathname === to || (to !== "/apply" && pathname.startsWith(to + "/"))}>
        <Link to={to}>
          <Icon />
          <span>{label}</span>
        </Link>
      </SidebarMenuButton>
      {!!badge && <SidebarMenuBadge aria-label={`${badge} unread`}>{badge}</SidebarMenuBadge>}
    </SidebarMenuItem>
  )
  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground" aria-hidden>
            <FileSearch className="size-4" />
          </span>
          Adi Scholar
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>{items.map((n) => item(n.path, n.label!, n.icon!))}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {item("/notifications", "Notifications", Bell, unread)}
              {item("/profile", "Profile", User)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="px-4 pb-4">
        <div className="text-sm">
          <div className="truncate font-medium">{me.full_name ?? me.email}</div>
          <div className="text-xs text-sidebar-primary">{ROLE_LABEL[me.role]}</div>
        </div>
        <Button variant="ghost" size="sm" className="justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground" onClick={() => supabase.auth.signOut()}>
          <LogOut /> Sign out
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}

function Shell() {
  const me = useMe()
  return (
    <SidebarProvider>
      {MOCK && <MockRoleSwitcher />}
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger aria-label="Open menu" />
          <span className="font-semibold">Adi Scholar</span>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
          <Suspense fallback={<Loading />}>
            <Routes>
              {NAV.filter((n) => n.roles.includes(me.role)).map((n) => (
                <Route key={n.path} path={n.path} element={<n.el />} />
              ))}
              <Route path="/applications/:id" element={<ApplicationRoute />} />
              <Route path="/notifications" element={<P.notifications />} />
              <Route path="/profile" element={<P.profile />} />
              <Route path="*" element={<Navigate to={HOME[me.role]} replace />} />
            </Routes>
          </Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function Authed({ session }: { session: Session }) {
  const me = useQuery({ queryKey: ["me", session.user.id], queryFn: () => api<Profile>("/me") })
  if (me.isPending) return <Loading label="Signing you in…" />
  if (me.error) {
    const noProfile = me.error instanceof ApiError && me.error.status === 403
    return (
      <div className="mx-auto max-w-md p-8">
        <ErrorState error={noProfile ? "Your account has no profile yet. Please contact the scheme administrator." : me.error} />
        <Button variant="outline" className="mt-4" onClick={() => supabase.auth.signOut()}>
          Sign out
        </Button>
      </div>
    )
  }
  return (
    <MeContext.Provider value={me.data}>
      <Shell />
    </MeContext.Provider>
  )
}

const MOCK_SESSION = { user: { id: "mock-user" } } as Session

function Unauthed() {
  return (
    <Routes>
      <Route path="/" element={<P.landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(MOCK ? MOCK_SESSION : undefined)
  useEffect(() => {
    if (MOCK) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return <BrowserRouter>{session === undefined ? <Loading /> : session ? <Authed session={session} /> : <Suspense fallback={<Loading />}><Unauthed /></Suspense>}</BrowserRouter>
}
