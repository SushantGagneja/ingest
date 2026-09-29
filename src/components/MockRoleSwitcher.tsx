import { getMockRole, setMockRole, isSimulatedErrorEnabled, toggleSimulatedError, resetDemoData } from "@/lib/mock"
import { ROLE_LABEL, type Role } from "@/lib/format"
import { AlertCircle, RefreshCw, Sparkles } from "lucide-react"

export function MockRoleSwitcher() {
  const isErrorMode = isSimulatedErrorEnabled()

  return (
    <div className="fixed bottom-3 right-3 z-50 flex flex-wrap items-center gap-2 rounded-xl border bg-background/95 p-2 px-3 text-xs shadow-xl backdrop-blur-sm print:hidden">
      <div className="flex items-center gap-1.5 font-semibold text-primary">
        <Sparkles className="size-3.5 fill-primary/20" />
        <span>Demo mode</span>
      </div>

      <div className="h-4 w-px bg-border" />

      <label className="flex items-center gap-1.5 font-medium">
        Role:
        <select
          className="rounded border bg-background px-1.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
          value={getMockRole()}
          onChange={(e) => setMockRole(e.target.value as Role)}
        >
          {Object.keys(ROLE_LABEL).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r as Role]}
            </option>
          ))}
        </select>
      </label>

      <div className="h-4 w-px bg-border" />

      <button
        type="button"
        onClick={toggleSimulatedError}
        className={`flex items-center gap-1 rounded px-2 py-1 transition-colors ${
          isErrorMode ? "bg-destructive text-destructive-foreground font-semibold" : "bg-muted text-muted-foreground hover:text-foreground"
        }`}
        title="Toggle simulated network/API error for error state demo"
      >
        <AlertCircle className="size-3" />
        {isErrorMode ? "Error path ON" : "Simulate Error"}
      </button>

      <button
        type="button"
        onClick={resetDemoData}
        className="flex items-center gap-1 rounded bg-muted px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
        title="Reset mock session & fixtures"
      >
        <RefreshCw className="size-3" />
        Reset Demo
      </button>
    </div>
  )
}
