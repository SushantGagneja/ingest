import { Check, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface StepItem {
  id: string
  label: string
  shortLabel: string
}

export const APPLICATION_STEPS: StepItem[] = [
  { id: "personal", label: "1. Personal", shortLabel: "Personal" },
  { id: "academic", label: "2. Academic", shortLabel: "Academic" },
  { id: "income", label: "3. Income", shortLabel: "Income" },
  { id: "bank", label: "4. Bank", shortLabel: "Bank" },
  { id: "docs", label: "5. Documents", shortLabel: "Docs" },
  { id: "declaration", label: "6. Declaration", shortLabel: "Decl." },
  { id: "review", label: "7. Review & Submit", shortLabel: "Review" },
]

interface StepperProps {
  steps: StepItem[]
  currentStepIndex: number
  completedStepIndices: number[]
  errorStepIndices: number[]
  onStepClick: (index: number) => void
}

export function Stepper({ steps, currentStepIndex, completedStepIndices, errorStepIndices, onStepClick }: StepperProps) {
  return (
    <nav aria-label="Application progress" className="w-full">
      {/* Desktop Stepper (>640px) */}
      <ol className="hidden sm:flex w-full items-center justify-between gap-1 border-b pb-4">
        {steps.map((step, idx) => {
          const isCurrent = idx === currentStepIndex
          const isCompleted = completedStepIndices.includes(idx)
          const hasError = errorStepIndices.includes(idx)

          return (
            <li key={step.id} className="flex-1 flex flex-col items-center min-w-0">
              <button
                type="button"
                onClick={() => onStepClick(idx)}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "group flex flex-col items-center w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md p-1 transition-colors",
                  isCurrent ? "text-primary font-semibold" : isCompleted ? "text-pass-foreground" : hasError ? "text-destructive" : "text-muted-foreground"
                )}
              >
                <div className="flex items-center w-full">
                  {idx > 0 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1 transition-colors",
                        completedStepIndices.includes(idx - 1) ? "bg-pass-border" : "bg-border"
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full text-xs transition-colors border",
                      isCurrent
                        ? "border-primary bg-primary text-primary-foreground font-bold shadow-sm"
                        : isCompleted
                        ? "border-pass-border bg-pass text-pass-foreground font-bold"
                        : hasError
                        ? "border-destructive bg-destructive/10 text-destructive font-bold"
                        : "border-border bg-background text-muted-foreground"
                    )}
                  >
                    {isCompleted ? <Check className="size-3.5 stroke-[3]" /> : hasError ? <AlertCircle className="size-3.5" /> : idx + 1}
                  </span>
                  {idx < steps.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1 transition-colors",
                        isCompleted ? "bg-pass-border" : "bg-border"
                      )}
                    />
                  )}
                </div>
                <span className="mt-1.5 text-xs truncate max-w-full text-center px-0.5">
                  {step.shortLabel}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      {/* Mobile Compact Stepper (<=640px) */}
      <div className="sm:hidden flex flex-col gap-2 rounded-lg border bg-card p-3 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-primary">
            Step {currentStepIndex + 1} of {steps.length}: {steps[currentStepIndex].label}
          </span>
          <span className="text-muted-foreground font-medium">
            {Math.round(((currentStepIndex + 1) / steps.length) * 100)}%
          </span>
        </div>
        <div className="grid grid-cols-7 gap-1 w-full h-2 bg-muted rounded-full overflow-hidden">
          {steps.map((step, idx) => {
            const isCurrent = idx === currentStepIndex
            const isCompleted = completedStepIndices.includes(idx)
            const hasError = errorStepIndices.includes(idx)

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onStepClick(idx)}
                title={step.label}
                className={cn(
                  "h-full transition-all rounded-none",
                  isCurrent
                    ? "bg-primary"
                    : isCompleted
                    ? "bg-pass-border"
                    : hasError
                    ? "bg-destructive"
                    : "bg-border"
                )}
              />
            )
          })}
        </div>
      </div>
    </nav>
  )
}
