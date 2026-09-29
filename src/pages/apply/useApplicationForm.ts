import { useState, useEffect, useCallback, useRef } from "react"
import { api, queryClient } from "@/lib/api"
import type { AppDetail } from "@/lib/types"

export type FormErrors = Record<string, string>
type FormValue = string | boolean

export interface ApplicationFormData {
  // Personal
  full_name: string
  dob: string
  gender: string
  st_community: string
  community: string
  district: string
  pin_code: string
  mobile: string
  // Academic
  course: string
  subject: string
  stream: string
  marks_value: string
  net_roll: string
  institution_id: string
  offer_university: string
  // Income
  family_income: string
  father_deceased: boolean
  sibling_awarded: boolean
  other_fellowship: boolean
  // Bank
  bank_account: string
  account_confirm: string
  ifsc: string
  // Declaration
  declaration_accepted: boolean
}

const STEP_FIELDS: Array<(keyof ApplicationFormData)[]> = [
  ["mobile", "dob"],
  ["course", "stream", "subject", "institution_id", "marks_value"],
  ["family_income"],
  ["bank_account", "account_confirm", "ifsc"],
  [],
  ["declaration_accepted"],
  [],
]

const REQUIRED_FIELDS = new Set<keyof ApplicationFormData>([
  "mobile", "dob", "course", "stream", "subject", "institution_id", "marks_value",
  "family_income", "bank_account", "account_confirm", "ifsc", "declaration_accepted",
])

export function validateField(name: keyof ApplicationFormData, value: FormValue, formData?: ApplicationFormData): string | null {
  if (REQUIRED_FIELDS.has(name) && (value === "" || value === false)) return "This field is required"
  if (name === "mobile") {
    if (!value) return "Mobile number is required"
    if (!/^[6-9]\d{9}$/.test(String(value).trim())) return "Enter a valid 10-digit Indian mobile number starting with 6-9"
  }
  if (name === "pin_code") {
    if (value && !/^[1-9]\d{5}$/.test(String(value).trim())) return "Enter a valid 6-digit PIN code"
  }
  if (name === "ifsc") {
    if (value && !/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(String(value).trim())) return "Enter a valid 11-character IFSC code (e.g. SBIN0001234)"
  }
  if (name === "bank_account") {
    if (value && !/^\d{9,18}$/.test(String(value).trim())) return "Enter a valid bank account number (9 to 18 digits)"
  }
  if (name === "account_confirm") {
    if (formData?.bank_account && value !== formData.bank_account) return "Account numbers do not match"
  }
  if (name === "marks_value") {
    if (value !== "" && value !== null && value !== undefined) {
      const num = Number(value)
      if (isNaN(num) || num < 0 || num > 100) return "Marks/percentage must be between 0 and 100 (or CGPA out of 10)"
    }
  }
  if (name === "dob") {
    if (!value) return "Date of birth is required"
    const birthYear = new Date(String(value)).getFullYear()
    const currentYear = new Date().getFullYear()
    const age = currentYear - birthYear
    if (isNaN(age) || age < 15 || age > 70) return "Please enter a valid date of birth (age between 15 and 70)"
  }
  return null
}

export function useApplicationForm(app: AppDetail) {
  const [formData, setFormData] = useState<ApplicationFormData>(() => {
    const f = app.form || {}
    return {
      full_name: app.applicant?.full_name || "",
      dob: app.applicant?.dob || "",
      gender: app.applicant?.gender || "",
      st_community: app.applicant?.st_community || "",
      community: f.community || "",
      district: app.applicant?.district || "",
      pin_code: f.pin_code || "",
      mobile: app.applicant?.phone || "",
      course: f.course || "PHD",
      subject: f.subject || "Anthropology",
      stream: f.stream || "humanities",
      marks_value: f.marks_value != null ? String(f.marks_value) : "8.2",
      net_roll: f.net_roll || "",
      institution_id: app.institution_id || "inst-1",
      offer_university: f.offer_university || "",
      family_income: f.family_income != null ? String(f.family_income) : "250000",
      father_deceased: !!f.father_deceased,
      sibling_awarded: !!f.sibling_awarded,
      other_fellowship: !!f.other_fellowship,
      bank_account: f.bank_account || "987654321012",
      account_confirm: f.bank_account || "987654321012",
      ifsc: f.ifsc || "SBIN0001234",
      declaration_accepted: false,
    }
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  const isEditable = useCallback((key: string) => {
    if (app.status === "draft") return true
    if (app.status === "deficient") return app.unlocked_fields.includes(key)
    return false
  }, [app.status, app.unlocked_fields])

  // Debounced auto-save logic
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveDraft = useCallback(async (data: ApplicationFormData) => {
    if (app.status !== "draft" && app.status !== "deficient") return
    setSaveStatus("saving")
    try {
      const formPayload: Record<string, string | number | boolean | null> = {
        course: data.course,
        subject: data.subject,
        stream: data.stream,
        marks_value: data.marks_value ? Number(data.marks_value) : null,
        net_roll: data.net_roll || null,
        community: data.community || null,
        other_fellowship: data.other_fellowship,
        sibling_awarded: data.sibling_awarded,
        father_deceased: data.father_deceased,
        family_income: data.family_income ? Number(data.family_income) : null,
        offer_university: data.offer_university || null,
        bank_account: data.bank_account || null,
        ifsc: data.ifsc || null,
        pin_code: data.pin_code || null,
      }

      await api(`/applications/${app.id}`, {
        method: "PATCH",
        body: {
          form: formPayload,
          institution_id: data.institution_id || null,
        },
      })

      const now = new Date()
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      setLastSavedAt(timeStr)
      setSaveStatus("saved")
      setIsDirty(false)
      queryClient.invalidateQueries({ queryKey: ["application", app.id] })
    } catch {
      setSaveStatus("error")
    }
  }, [app.id, app.status])

  const updateField = (field: keyof ApplicationFormData, value: FormValue) => {
    const next = { ...formData, [field]: value } as ApplicationFormData
    setFormData(next)
    setIsDirty(true)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => saveDraft(next), 1500)

    // Inline validation on touch/change
    const err = validateField(field, value, next)
    setErrors((prev) => {
      const newErrs = { ...prev }
      if (err) newErrs[field] = err
      else delete newErrs[field]
      return newErrs
    })
  }

  const handleBlur = (field: keyof ApplicationFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const err = validateField(field, formData[field], formData)
    setErrors((prev) => {
      const newErrs = { ...prev }
      if (err) newErrs[field] = err
      else delete newErrs[field]
      return newErrs
    })
  }

  // Warn on leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ""
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  useEffect(() => () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
  }, [])

  const validateStep = (step: number) => {
    const fields = STEP_FIELDS[step] ?? []
    const nextErrors: FormErrors = { ...errors }
    let firstInvalid: string | undefined
    for (const field of fields) {
      const error = validateField(field, formData[field], formData)
      if (error) {
        nextErrors[field] = error
        firstInvalid ??= `f-${field}`
      } else {
        delete nextErrors[field]
      }
    }
    setTouched((previous) => ({ ...previous, ...Object.fromEntries(fields.map((field) => [field, true])) }))
    setErrors(nextErrors)
    if (firstInvalid) window.requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus())
    return !firstInvalid
  }

  return {
    formData,
    updateField,
    handleBlur,
    errors,
    setErrors,
    touched,
    saveStatus,
    lastSavedAt,
    saveDraft: () => saveDraft(formData),
    isEditable,
    isDirty,
    validateStep,
  }
}
