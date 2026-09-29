import React from "react"
import { Field, useInstitutions } from "@/components/common"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import type { ApplicationFormData, FormErrors } from "../useApplicationForm"

interface AcademicStepProps {
  formData: ApplicationFormData
  updateField: (field: keyof ApplicationFormData, value: any) => void
  handleBlur: (field: keyof ApplicationFormData) => void
  errors: FormErrors
  touched: Record<string, boolean>
  isEditable: (key: string) => boolean
  onNext: () => void
  onBack: () => void
}

export function AcademicStep({
  formData,
  updateField,
  handleBlur,
  errors,
  touched,
  isEditable,
  onNext,
  onBack,
}: AcademicStepProps) {
  const institutions = useInstitutions().data ?? []

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onNext()
  }

  const isInstLocked = !isEditable("institution_id")
  const isMarksLocked = !isEditable("marks_value")

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <div className="text-xs text-muted-foreground border-b pb-2">
        Fields marked <span className="text-destructive font-bold">*</span> are mandatory.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="f-course" label="Course *">
          <Select
            value={formData.course}
            onValueChange={(val) => updateField("course", val)}
            disabled={!isEditable("course")}
          >
            <SelectTrigger id="f-course">
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PHD">Ph.D.</SelectItem>
              <SelectItem value="MPHIL_PHD">M.Phil. + Ph.D. Integrated</SelectItem>
              <SelectItem value="MASTERS">Master's Degree</SelectItem>
              <SelectItem value="COURSEWORK">Coursework</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field id="f-stream" label="Stream *">
          <Select
            value={formData.stream}
            onValueChange={(val) => updateField("stream", val)}
            disabled={!isEditable("stream")}
          >
            <SelectTrigger id="f-stream">
              <SelectValue placeholder="Select stream" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="humanities">Humanities & Social Sciences</SelectItem>
              <SelectItem value="science">Sciences & Engineering</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field id="f-subject" label="Subject / Discipline *" hint="Primary area of research or study">
          <Input
            id="f-subject"
            value={formData.subject}
            onChange={(e) => updateField("subject", e.target.value)}
            onBlur={() => handleBlur("subject")}
            disabled={!isEditable("subject")}
            placeholder="e.g. Anthropology, Bio-technology"
            required
          />
        </Field>

        <Field
          id="f-institution_id"
          label="Institution *"
          hint={isInstLocked ? "Locked. Not part of deficiency memo." : "Select your AISHE-registered institution"}
        >
          <Select
            value={formData.institution_id}
            onValueChange={(val) => updateField("institution_id", val)}
            disabled={isInstLocked}
          >
            <SelectTrigger id="f-institution_id">
              <SelectValue placeholder="Select institution" />
            </SelectTrigger>
            <SelectContent>
              {institutions.map((inst) => (
                <SelectItem key={inst.id} value={inst.id}>
                  {inst.name} {inst.verified ? "(AISHE Verified)" : "(Pending AISHE Verification)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          id="f-marks_value"
          label="Marks (% or CGPA) *"
          hint={isMarksLocked ? "Locked." : "CGPA out of 10 or percentage marks out of 100"}
          error={touched.marks_value ? errors.marks_value : undefined}
        >
          <Input
            id="f-marks_value"
            type="number"
            step="0.01"
            value={formData.marks_value}
            onChange={(e) => updateField("marks_value", e.target.value)}
            onBlur={() => handleBlur("marks_value")}
            disabled={isMarksLocked}
            placeholder="e.g. 8.2 or 78.5"
            aria-required="true"
            aria-invalid={!!(touched.marks_value && errors.marks_value)}
          />
        </Field>

        <Field id="f-net_roll" label="UGC-NET / CSIR-NET Roll No." hint="Optional eligibility parameter">
          <Input
            id="f-net_roll"
            value={formData.net_roll}
            onChange={(e) => updateField("net_roll", e.target.value)}
            onBlur={() => handleBlur("net_roll")}
            disabled={!isEditable("net_roll")}
            placeholder="e.g. NTA2026100987"
          />
        </Field>
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit">Next: Family & Income</Button>
      </div>
    </form>
  )
}
