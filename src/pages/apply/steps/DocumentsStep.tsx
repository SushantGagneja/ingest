import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { FileText, AlertCircle, Trash2, Eye } from "lucide-react"
import { toast } from "sonner"
import { Query, StatusBadge } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { api, queryClient } from "@/lib/api"
import { docLabel } from "@/lib/format"
import type { AppDetail } from "@/lib/types"

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ACCEPTED_TYPES = [".pdf", ".jpg", ".jpeg", ".png", "application/pdf", "image/jpeg", "image/png"]

type Checklist = { config_version: number; documents: { doc_type: string; status: string }[] }

interface DocumentsStepProps {
  app: AppDetail
  isEditable: (key: string) => boolean
  onNext: () => void
  onBack: () => void
}

export function DocumentsStep({ app, isEditable, onNext, onBack }: DocumentsStepProps) {
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [uploadError, setUploadError] = useState<{ docType: string; message: string } | null>(null)

  const checklist = useQuery({
    queryKey: ["checklist", app.id],
    queryFn: () => api<Checklist>(`/applications/${app.id}/checklist`),
    refetchInterval: (q) =>
      q.state.data?.documents.some((d) => ["pending", "processing"].includes(d.status)) ? 3000 : false,
  })

  const invalidateApp = () => {
    queryClient.invalidateQueries({ queryKey: ["checklist", app.id] })
    queryClient.invalidateQueries({ queryKey: ["application", app.id] })
  }

  const handleUpload = async (docType: string, file: File) => {
    setUploadError(null)

    // Client-side checks
    if (file.size > MAX_BYTES) {
      toast.error("File exceeds maximum allowed size of 5 MB.")
      setUploadError({ docType, message: "File exceeds maximum size of 5 MB." })
      return
    }

    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."))
    if (![".pdf", ".jpg", ".jpeg", ".png"].includes(ext)) {
      toast.error("Invalid file format. Please upload PDF, JPG, or PNG.")
      setUploadError({ docType, message: "Invalid file format. Only PDF, JPG, or PNG allowed." })
      return
    }

    setUploadingDoc(docType)
    setUploadProgress(20)

    try {
      const fd = new FormData()
      fd.append("doc_type", docType)
      fd.append("file", file)

      setUploadProgress(60)
      await api(`/applications/${app.id}/documents`, { body: fd })
      setUploadProgress(100)

      toast.success(`${docLabel(docType)} uploaded successfully!`)
      invalidateApp()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload document. Please retry."
      toast.error(msg)
      setUploadError({ docType, message: msg })
    } finally {
      setTimeout(() => {
        setUploadingDoc(null)
        setUploadProgress(0)
      }, 500)
    }
  }

  const handleDigiLocker = async (docType: string) => {
    setUploadingDoc(docType)
    try {
      await api(`/applications/${app.id}/documents/digilocker`, { body: { doc_type: docType } })
      toast.success(`Fetched ${docLabel(docType)} from DigiLocker`)
      invalidateApp()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "DigiLocker fetch failed")
    } finally {
      setUploadingDoc(null)
    }
  }

  const handleRemove = async (docType: string) => {
    try {
      await api(`/applications/${app.id}/documents/${docType}`, { method: "DELETE" })
      toast.success(`${docLabel(docType)} removed`)
      invalidateApp()
    } catch {
      // If delete endpoint isn't supported, refresh checklist
      invalidateApp()
    }
  }

  return (
    <div className="grid gap-6">
      <div className="rounded-lg border bg-blue-50/50 p-4 text-sm text-foreground">
        <h4 className="font-semibold text-primary mb-1">Document Upload Instructions</h4>
        <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
          <li>Accepted formats: <strong>PDF, JPG, PNG</strong> only.</li>
          <li>Maximum file size: <strong>5 MB per document</strong>.</li>
          <li>Ensure document scans are clear, legible, and non-password protected.</li>
        </ul>
      </div>

      <Query q={checklist}>
        {(c) => (
          <div className="grid gap-4">
            {c.documents.map((d) => {
              const doc = app.documents.find((x) => x.doc_type === d.doc_type)
              const locked = !isEditable(`doc:${d.doc_type}`)
              const id = `doc-${d.doc_type}`
              const isUploadingThis = uploadingDoc === d.doc_type
              const hasErr = uploadError?.docType === d.doc_type

              return (
                <div
                  key={d.doc_type}
                  className="rounded-lg border bg-card p-4 transition-all min-h-[120px] flex flex-col justify-between"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-primary" />
                      <Label htmlFor={id} className="font-semibold text-sm">
                        {docLabel(d.doc_type)} <span className="text-destructive">*</span>
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc?.source === "digilocker" && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                          DigiLocker Verified
                        </span>
                      )}
                      <StatusBadge status={d.status} />
                    </div>
                  </div>

                  {/* Note / Feedback */}
                  {doc?.review_note && (
                    <div className="my-2 flex items-center gap-2 rounded bg-review/30 px-3 py-2 text-xs text-review-foreground border border-review-border">
                      <AlertCircle className="size-4 shrink-0" />
                      <span><strong>Officer Note:</strong> {doc.review_note}</span>
                    </div>
                  )}

                  {/* Progress / Status indicator */}
                  {isUploadingThis && (
                    <div className="my-3 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Uploading {docLabel(d.doc_type)}...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-1.5" />
                    </div>
                  )}

                  {hasErr && (
                    <div className="my-2 flex items-center justify-between rounded bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      <span>{uploadError.message}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs hover:bg-destructive/20"
                        onClick={() => setUploadError(null)}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}

                  {/* Controls */}
                  {locked ? (
                    <p className="text-xs text-muted-foreground mt-2">Document status locked.</p>
                  ) : (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          id={id}
                          type="file"
                          accept={ACCEPTED_TYPES.join(",")}
                          className="max-w-xs text-xs"
                          disabled={isUploadingThis}
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            e.target.value = ""
                            if (file) handleUpload(d.doc_type, file)
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDigiLocker(d.doc_type)}
                          disabled={isUploadingThis}
                        >
                          Fetch via DigiLocker
                        </Button>
                      </div>

                      {doc && (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => toast.info(`Previewing ${docLabel(d.doc_type)}`)}
                          >
                            <Eye className="size-3.5 mr-1" /> Preview
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemove(d.doc_type)}
                          >
                            <Trash2 className="size-3.5 mr-1" /> Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Query>

      <div className="flex justify-between pt-4 border-t">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={onNext}>
          Next: Declaration
        </Button>
      </div>
    </div>
  )
}
