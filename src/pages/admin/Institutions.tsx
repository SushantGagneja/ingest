import { useState } from "react"

import { Empty, Field, PageHeader, Query, useAction, useInstitutions, useStates } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import type { Institution } from "@/lib/types"

const NONE = "__none"

export default function Institutions() {
  const q = useInstitutions()
  const [editing, setEditing] = useState<Institution | "new" | null>(null)
  const patch = useAction(
    ({ id, ...body }: Partial<Institution> & { id: string }) => api(`/institutions/${id}`, { method: "PATCH", body }),
    { invalidate: [["institutions"]] },
  )

  return (
    <>
      <PageHeader
        title="Institutions"
        description="AISHE-verified status feeds the institution eligibility rule; premier status drives NFST premier slots."
        actions={<Button onClick={() => setEditing("new")}>Add institution</Button>}
      />
      <Card>
        <CardContent>
          <Query q={q}>
            {(rows) =>
              rows.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>AISHE</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>City class</TableHead>
                      <TableHead>CGPA factor</TableHead>
                      <TableHead>Premier</TableHead>
                      <TableHead>Verified</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-mono text-xs">{i.aishe_code}</TableCell>
                        <TableCell>{i.name}</TableCell>
                        <TableCell>{i.state_code ?? "—"}</TableCell>
                        <TableCell>{i.city_class ?? "—"}</TableCell>
                        <TableCell>{i.cgpa_factor ?? "—"}</TableCell>
                        <TableCell>
                          <Switch
                            aria-label={`${i.name} is premier`}
                            checked={i.is_premier}
                            onCheckedChange={(v) => patch.mutate({ id: i.id, is_premier: v })}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            aria-label={`${i.name} is verified`}
                            checked={i.verified}
                            onCheckedChange={(v) => patch.mutate({ id: i.id, verified: v })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => setEditing(i)} aria-label={`Edit ${i.name}`}>
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Empty>No institutions yet.</Empty>
              )
            }
          </Query>
        </CardContent>
      </Card>
      {editing && <EditInstitution inst={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function EditInstitution({ inst, onClose }: { inst: Institution | null; onClose: () => void }) {
  const states = useStates().data ?? []
  const [f, setF] = useState({
    aishe_code: inst?.aishe_code ?? "",
    name: inst?.name ?? "",
    state_code: inst?.state_code ?? NONE,
    city_class: inst?.city_class ?? NONE,
    cgpa_factor: inst?.cgpa_factor?.toString() ?? "",
  })
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v })
  const body = {
    name: f.name.trim(),
    state_code: f.state_code === NONE ? null : f.state_code,
    city_class: f.city_class === NONE ? null : f.city_class,
    cgpa_factor: f.cgpa_factor ? Number(f.cgpa_factor) : null,
  }
  const save = useAction(
    () =>
      inst
        ? api(`/institutions/${inst.id}`, { method: "PATCH", body })
        : api("/institutions", { body: { ...body, aishe_code: f.aishe_code.trim() } }),
    { success: inst ? "Institution updated" : "Institution added", invalidate: [["institutions"]], onSuccess: onClose },
  )
  const valid = body.name && (inst || f.aishe_code.trim())

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{inst ? inst.name : "Add institution"}</DialogTitle>
        </DialogHeader>
        <form
          id="inst-form"
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (valid) save.mutate()
          }}
        >
          {!inst && (
            <Field id="inst-aishe" label="AISHE code">
              <Input id="inst-aishe" required value={f.aishe_code} onChange={(e) => set("aishe_code")(e.target.value)} />
            </Field>
          )}
          <Field id="inst-name" label="Name">
            <Input id="inst-name" required value={f.name} onChange={(e) => set("name")(e.target.value)} />
          </Field>
          <Field id="inst-state" label="State">
            <Select value={f.state_code} onValueChange={set("state_code")}>
              <SelectTrigger id="inst-state" className="w-full">
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
          <Field id="inst-city" label="City class" hint="HRA slab: X 24%, Y 16%, Z 8%.">
            <Select value={f.city_class} onValueChange={set("city_class")}>
              <SelectTrigger id="inst-city" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {["X", "Y", "Z"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="inst-cgpa" label="CGPA factor" hint="CGPA × factor = %. Leave blank if marks are already in %.">
            <Input
              id="inst-cgpa"
              type="number"
              step="0.01"
              min="0"
              value={f.cgpa_factor}
              onChange={(e) => set("cgpa_factor")(e.target.value)}
            />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="inst-form" disabled={!valid || save.isPending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
