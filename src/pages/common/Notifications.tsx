import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"

import { Empty, PageHeader, Query, useAction } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { api } from "@/lib/api"
import { fmtDateTime } from "@/lib/format"
import type { Notification } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function Notifications() {
  // same key + url as the sidebar badge, so both stay in sync
  const q = useQuery({ queryKey: ["notifications"], queryFn: () => api<Notification[]>("/me/notifications?limit=50") })
  const read = useAction((id: string) => api(`/me/notifications/${id}/read`, { method: "POST" }), { invalidate: [["notifications"]] })

  return (
    <>
      <PageHeader title="Notifications" />
      <Query q={q}>
        {(list) =>
          list.length ? (
            <ul className="grid gap-3">
              {list.map((n) => (
                <li key={n.id}>
                  <Card size="sm" className={cn(!n.read_at && "ring-2 ring-primary")}>
                    <CardContent className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">
                          {!n.read_at && <span className="sr-only">Unread: </span>}
                          {n.title}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                        <div className="mt-1 text-xs text-muted-foreground">{fmtDateTime(n.created_at)}</div>
                      </div>
                      <div className="flex gap-2">
                        {n.link && (
                          <Button asChild size="sm" variant="outline">
                            <Link to={n.link}>Open</Link>
                          </Button>
                        )}
                        {!n.read_at && (
                          <Button size="sm" variant="secondary" onClick={() => read.mutate(n.id)} disabled={read.isPending}>
                            Mark read
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No notifications yet.</Empty>
          )
        }
      </Query>
    </>
  )
}
