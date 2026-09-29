import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router"

import { Empty, PageHeader, Query, StatusBadge, useAction, useCycles, useMe } from "@/components/common"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { fmtDate, SCHEME_NAME, shortId } from "@/lib/format"
import type { Application } from "@/lib/types"

export default function Home() {
  const me = useMe()
  const nav = useNavigate()
  const cycles = useCycles()
  const apps = useQuery({ queryKey: ["applications"], queryFn: () => api<Application[]>("/applications") })
  const start = useAction((cycle_id: string) => api<Application>("/applications", { body: { cycle_id } }), {
    invalidate: [["applications"]],
    onSuccess: (a) => nav(`/applications/${a.id}`),
  })

  const missing = !me.dob || !me.gender || !me.state_code || !me.st_community
  const cycleOf = (id: string) => cycles.data?.find((c) => c.id === id)
  const appliedTo = new Set(apps.data?.map((a) => a.cycle_id))
  const open = cycles.data?.filter((c) => c.status === "open" && !appliedTo.has(c.id)) ?? []

  return (
    <>
      <PageHeader title={`Welcome${me.full_name ? `, ${me.full_name.split(" ")[0]}` : ""}`} />
      {missing && (
        <Alert className="mb-6 bg-review text-review-foreground">
          <AlertTitle>Complete your profile</AlertTitle>
          <AlertDescription className="text-review-foreground">
            Date of birth, gender, state and ST community decide your eligibility.{" "}
            <Link to="/profile" className="font-medium underline">Update profile</Link>
          </AlertDescription>
        </Alert>
      )}

      <h2 className="mb-3 text-lg font-semibold">My applications</h2>
      <Query q={apps}>
        {(list) =>
          list.length ? (
            <ul className="mb-8 grid gap-3 sm:grid-cols-2">
              {list.map((a) => {
                const c = cycleOf(a.cycle_id)
                return (
                  <li key={a.id}>
                    <Card className="shadow-sm">
                      <CardHeader className="py-4 border-b bg-card/50">
                        <CardTitle>{c ? `${c.scheme_code} ${c.cycle}` : "Application"}</CardTitle>
                        <CardDescription>{c && SCHEME_NAME[c.scheme_code]} · #{shortId(a.id)}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-wrap items-center gap-2 text-sm">
                        <StatusBadge status={a.status} />
                        {a.submitted_at && <span className="text-muted-foreground">Submitted {fmtDate(a.submitted_at)}</span>}
                      </CardContent>
                      <CardFooter>
                        <Button asChild size="sm">
                          <Link to={`/applications/${a.id}`}>{["draft", "deficient"].includes(a.status) ? "Continue" : "View"}</Link>
                        </Button>
                      </CardFooter>
                    </Card>
                  </li>
                )
              })}
            </ul>
          ) : (
            <Empty>You have not started an application yet.</Empty>
          )
        }
      </Query>

      <h2 className="mb-3 text-lg font-semibold">Open for applications</h2>
      <Query q={cycles}>
        {() =>
          open.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {open.map((c) => (
                <li key={c.id}>
                  <Card className="shadow-sm">
                    <CardHeader className="py-4 border-b bg-card/50">
                      <CardTitle>{SCHEME_NAME[c.scheme_code] ?? c.scheme_code}</CardTitle>
                      <CardDescription>
                        {c.scheme_code} {c.cycle} · closes {fmtDate(c.closes_at)}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button size="sm" onClick={() => start.mutate(c.id)} disabled={start.isPending}>
                        Start application
                      </Button>
                    </CardFooter>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No other schemes are open right now.</Empty>
          )
        }
      </Query>
    </>
  )
}
