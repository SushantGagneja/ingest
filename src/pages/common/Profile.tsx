import { useState } from "react"

import { Facts, Field, PageHeader, useAction, useInstitutions, useMe, useStates } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import { ROLE_LABEL } from "@/lib/format"
import type { Profile as ProfileT } from "@/lib/types"

const GENDERS = { F: "Female", M: "Male", T: "Transgender" }

type Draft = Pick<ProfileT, "full_name" | "phone" | "dob" | "gender" | "state_code" | "district" | "st_community" | "is_pvtg" | "is_divyang">

/** Own profile fields. Eligibility reads dob/gender/state/community/PVTG/Divyang from here. */
export function ProfileForm({ onSaved, disabled }: { onSaved?: () => void; disabled?: boolean }) {
  const me = useMe()
  const states = useStates().data ?? []
  const applicant = me.role === "applicant"
  const [d, setD] = useState<Draft>(() => ({
    full_name: me.full_name, phone: me.phone, dob: me.dob, gender: me.gender, state_code: me.state_code,
    district: me.district, st_community: me.st_community, is_pvtg: me.is_pvtg, is_divyang: me.is_divyang,
  }))
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }))
  const save = useAction(() => api("/me", { method: "PATCH", body: d }), { success: "Profile saved", invalidate: [["me"]], onSuccess: onSaved })

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
    >
      <fieldset disabled={disabled} className="contents">
        <Field id="p-name" label="Full name">
          <Input id="p-name" value={d.full_name ?? ""} onChange={(e) => set("full_name", e.target.value)} />
        </Field>
        <Field id="p-phone" label="Phone">
          <Input id="p-phone" type="tel" value={d.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        {applicant && (
          <>
            <Field id="p-dob" label="Date of birth">
              <Input id="p-dob" type="date" value={d.dob ?? ""} onChange={(e) => set("dob", e.target.value || null)} />
            </Field>
            <Field id="p-gender" label="Gender">
              <Select value={d.gender ?? ""} onValueChange={(v) => set("gender", v as Draft["gender"])} disabled={disabled}>
                <SelectTrigger id="p-gender" className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(GENDERS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="p-state" label="State of domicile">
              <Select value={d.state_code ?? ""} onValueChange={(v) => set("state_code", v)} disabled={disabled}>
                <SelectTrigger id="p-state" className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((s) => (
                    <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="p-district" label="District">
              <Input id="p-district" value={d.district ?? ""} onChange={(e) => set("district", e.target.value)} />
            </Field>
            <Field id="p-community" label="ST community" hint="As written on your ST certificate. Matched against your state's Gazette list." className="sm:col-span-2">
              <Input id="p-community" aria-describedby="p-community-hint" value={d.st_community ?? ""} onChange={(e) => set("st_community", e.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-6 sm:col-span-2">
              <div className="flex items-center gap-2">
                <Checkbox id="p-pvtg" checked={d.is_pvtg} onCheckedChange={(v) => set("is_pvtg", v === true)} disabled={disabled} />
                <Label htmlFor="p-pvtg">I belong to a PVTG</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="p-divyang" checked={d.is_divyang} onCheckedChange={(v) => set("is_divyang", v === true)} disabled={disabled} />
                <Label htmlFor="p-divyang">I am a person with disability (Divyang)</Label>
              </div>
            </div>
          </>
        )}
      </fieldset>
      {!disabled && (
        <div className="sm:col-span-2">
          <Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
        </div>
      )}
    </form>
  )
}

export default function Profile() {
  const me = useMe()
  const institutions = useInstitutions().data ?? []
  const states = useStates().data ?? []
  return (
    <>
      <PageHeader title="Profile" description={me.email} />
      <div className="grid gap-6">
        {me.role !== "applicant" && (
          <Card className="shadow-sm">
            <CardHeader className="py-4 border-b bg-card/50">
              <CardTitle>Access</CardTitle>
              <CardDescription>Set by the scheme administrator.</CardDescription>
            </CardHeader>
            <CardContent>
              <Facts
                items={[
                  ["Role", ROLE_LABEL[me.role]],
                  ["Institution", institutions.find((i) => i.id === me.institution_id)?.name],
                  ["State", states.find((s) => s.code === me.state_code)?.name],
                ]}
              />
            </CardContent>
          </Card>
        )}
        <Card className="shadow-sm">
          <CardHeader className="py-4 border-b bg-card/50">
            <CardTitle>Your details</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
