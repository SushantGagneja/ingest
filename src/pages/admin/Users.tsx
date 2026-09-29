import { useState } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"

import { Empty, Field, PageHeader, Query, useAction, useInstitutions, useStates } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import { ROLE_LABEL, ROLES, type Role } from "@/lib/format"
import type { Profile } from "@/lib/types"

const PAGE = 50
const NONE = "__none"

export default function Users() {
  const [role, setRole] = useState<Role | "all">("all")
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<Profile | null>(null)
  const institutions = useInstitutions().data ?? []
  const states = useStates().data ?? []

  const q = useInfiniteQuery({
    queryKey: ["admin-users", role],
    queryFn: ({ pageParam }) =>
      api<Profile[]>(`/admin/users?limit=${PAGE}&offset=${pageParam}${role === "all" ? "" : `&role=${role}`}`),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length === PAGE ? all.length * PAGE : undefined),
  })
  const s = search.trim().toLowerCase()
  const rows = (q.data?.pages.flat() ?? []).filter(
    (u) => !s || u.full_name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s),
  )
  const instName = (id: string | null) => institutions.find((i) => i.id === id)?.name

  return (
    <>
      <PageHeader title="Users & roles" description="Everyone signs in as an applicant; assign officials their role and scope here." />
      <div className="mb-4 flex flex-wrap gap-3">
        <Field id="role-filter" label="Role" className="w-56">
          <Select value={role} onValueChange={(v) => setRole(v as Role | "all")}>
            <SelectTrigger id="role-filter" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABEL[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="user-search" label="Search loaded users" className="w-64">
          <Input id="user-search" placeholder="Name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </Field>
      </div>
      <Card>
        <CardContent>
          <Query q={q}>
            {() =>
              rows.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>{u.full_name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>{ROLE_LABEL[u.role]}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {u.role === "institute_officer" ? instName(u.institution_id) ?? "No institution" : u.role === "state_officer" ? u.state_code ?? "No state" : ""}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => setEditing(u)} aria-label={`Edit ${u.full_name ?? u.email}`}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Empty>No users match.</Empty>
              )
            }
          </Query>
          {q.hasNextPage && (
            <Button variant="outline" className="mt-4" disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
              Load more
            </Button>
          )}
        </CardContent>
      </Card>
      {editing && <EditUser user={editing} states={states} institutions={institutions} onClose={() => setEditing(null)} />}
    </>
  )
}

function EditUser({
  user,
  states,
  institutions,
  onClose,
}: {
  user: Profile
  states: { code: string; name: string }[]
  institutions: { id: string; name: string }[]
  onClose: () => void
}) {
  const [role, setRole] = useState<Role>(user.role)
  const [institution, setInstitution] = useState(user.institution_id ?? NONE)
  const [state, setState] = useState(user.state_code ?? NONE)
  const save = useAction(
    () =>
      api(`/admin/users/${user.id}`, {
        method: "PATCH",
        body: { role, institution_id: institution === NONE ? null : institution, state_code: state === NONE ? null : state },
      }),
    { success: "User updated", invalidate: [["admin-users"]], onSuccess: onClose },
  )
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user.full_name ?? user.email}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Field id="edit-role" label="Role">
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger id="edit-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="edit-inst" label="Institution" hint="Scope for institute officers.">
            <Select value={institution} onValueChange={setInstitution}>
              <SelectTrigger id="edit-inst" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {institutions.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="edit-state" label="State" hint="Scope for state officers; domicile for applicants.">
            <Select value={state} onValueChange={setState}>
              <SelectTrigger id="edit-state" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {states.map((s) => (
                  <SelectItem key={s.code} value={s.code}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
