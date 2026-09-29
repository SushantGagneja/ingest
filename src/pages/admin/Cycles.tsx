import { useState } from "react"
import { Link } from "react-router"

import { Empty, Field, PageHeader, Query, useAction, useCycles } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { fmtDate, humanize, SCHEME_NAME } from "@/lib/format"
import type { Cycle } from "@/lib/types"

const STATUSES: Cycle["status"][] = ["draft", "open", "scrutiny", "selection", "published", "archived"]
const SCHEMES = Object.keys(SCHEME_NAME)

// NFST seed shape from backend/init.sql, as a starting point for a revision.
const RATES_TEMPLATE = JSON.stringify(
  {
    monthly: [
      { from_month: 1, to_month: 24, amount: 37000 },
      { from_month: 25, to_month: 60, amount: 42000 },
    ],
    contingency_annual: { humanities: 20500, science: 25000 },
    hra_pct: { X: 24, Y: 16, Z: 8 },
  },
  null,
  2,
)

function SchemeSelect({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SCHEMES.map((s) => (
          <SelectItem key={s} value={s}>
            {s} — {SCHEME_NAME[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export default function Cycles() {
  const q = useCycles()
  const [creating, setCreating] = useState(false)
  const patch = useAction(
    ({ id, status }: { id: string; status: string }) => api(`/cycles/${id}`, { method: "PATCH", body: { status } }),
    { success: "Cycle updated", invalidate: [["cycles"]] },
  )

  return (
    <>
      <PageHeader
        title="Cycles & rules"
        description="Submissions are accepted only while a cycle is open. Open a cycle to edit its versioned rule config."
        actions={<Button onClick={() => setCreating(true)}>New cycle</Button>}
      />
      <Card className="shadow-sm">
        <CardContent>
          <Query q={q}>
            {(rows) =>
              rows.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scheme</TableHead>
                      <TableHead>Cycle</TableHead>
                      <TableHead>Opens</TableHead>
                      <TableHead>Closes</TableHead>
                      <TableHead>Verification closes</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.scheme_code}</TableCell>
                        <TableCell>{c.cycle}</TableCell>
                        <TableCell>{fmtDate(c.opens_at)}</TableCell>
                        <TableCell>{fmtDate(c.closes_at)}</TableCell>
                        <TableCell>{fmtDate(c.verify_closes_at)}</TableCell>
                        <TableCell>
                          <Select value={c.status} onValueChange={(status) => patch.mutate({ id: c.id, status })}>
                            <SelectTrigger className="w-36" aria-label={`Status of ${c.scheme_code} ${c.cycle}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {humanize(s)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" asChild>
                            <Link to={`/admin/cycles/${c.id}`}>Rules</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Empty>No cycles yet.</Empty>
              )
            }
          </Query>
        </CardContent>
      </Card>
      <RateTable />
      {creating && <NewCycle onClose={() => setCreating(false)} />}
    </>
  )
}

function NewCycle({ onClose }: { onClose: () => void }) {
  const [f, setF] = useState({ scheme_code: "NFST", cycle: "", opens_at: "", closes_at: "", verify_closes_at: "" })
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v })
  const save = useAction(
    () => api("/cycles", { body: { ...f, verify_closes_at: f.verify_closes_at || null } }),
    { success: "Cycle created (draft)", invalidate: [["cycles"]], onSuccess: onClose },
  )
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New cycle</DialogTitle>
        </DialogHeader>
        <form
          id="cycle-form"
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            save.mutate()
          }}
        >
          <Field id="cy-scheme" label="Scheme">
            <SchemeSelect id="cy-scheme" value={f.scheme_code} onChange={set("scheme_code")} />
          </Field>
          <Field id="cy-cycle" label="Cycle" hint="e.g. 2026-27">
            <Input id="cy-cycle" required pattern="\d{4}-\d{2}" value={f.cycle} onChange={(e) => set("cycle")(e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="cy-open" label="Opens">
              <Input id="cy-open" type="date" required value={f.opens_at} onChange={(e) => set("opens_at")(e.target.value)} />
            </Field>
            <Field id="cy-close" label="Closes">
              <Input id="cy-close" type="date" required min={f.opens_at} value={f.closes_at} onChange={(e) => set("closes_at")(e.target.value)} />
            </Field>
          </div>
          <Field id="cy-verify" label="Verification closes (optional)">
            <Input id="cy-verify" type="date" value={f.verify_closes_at} onChange={(e) => set("verify_closes_at")(e.target.value)} />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="cycle-form" disabled={save.isPending}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RateTable() {
  const [f, setF] = useState({ scheme_code: "NFST", effective_from: "", circular_ref: "", rates: RATES_TEMPLATE })
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v })
  let rates: unknown = null
  let jsonError = ""
  try {
    rates = JSON.parse(f.rates)
  } catch (e) {
    jsonError = (e as Error).message
  }
  const save = useAction(
    () => api("/rate-tables", { body: { ...f, circular_ref: f.circular_ref || null, rates } }),
    { success: "Rate table added. Run arrears from Payments if it is backdated." },
  )
  return (
    <Card className="mt-6">
      <CardHeader className="py-4 border-b bg-card/50">
        <CardTitle>Rate tables</CardTitle>
        <CardDescription>
          Add a stipend/HRA/contingency revision. Payments use the latest table effective on or before each period.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!jsonError) save.mutate()
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="rt-scheme" label="Scheme">
              <SchemeSelect id="rt-scheme" value={f.scheme_code} onChange={set("scheme_code")} />
            </Field>
            <Field id="rt-from" label="Effective from">
              <Input id="rt-from" type="date" required value={f.effective_from} onChange={(e) => set("effective_from")(e.target.value)} />
            </Field>
            <Field id="rt-ref" label="Circular reference">
              <Input id="rt-ref" value={f.circular_ref} onChange={(e) => set("circular_ref")(e.target.value)} />
            </Field>
          </div>
          <Field id="rt-rates" label="Rates (JSON)" hint={jsonError ? `Invalid JSON: ${jsonError}` : "Monthly bands, annual contingency by stream, HRA % by city class."}>
            <Textarea
              id="rt-rates"
              rows={12}
              className="font-mono text-xs"
              aria-invalid={!!jsonError}
              aria-describedby="rt-rates-hint"
              value={f.rates}
              onChange={(e) => set("rates")(e.target.value)}
            />
          </Field>
          <div>
            <Button type="submit" disabled={!!jsonError || save.isPending}>
              Add rate table
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
