import { Link } from "react-router"
import { CheckCircle2, Printer, ArrowRight, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Facts } from "@/components/common"
import { fmtDate, SCHEME_NAME, shortId } from "@/lib/format"
import type { AppDetail } from "@/lib/types"

interface ConfirmationStepProps {
  app: AppDetail
}

export function ConfirmationStep({ app }: ConfirmationStepProps) {
  const handlePrint = () => {
    window.print()
  }

  const submittedAtText = app.submitted_at ? fmtDate(app.submitted_at) : fmtDate(new Date().toISOString())

  return (
    <div className="grid gap-6 max-w-3xl mx-auto print:max-w-full">
      {/* Screen view action banner (hidden when printing) */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-pass p-4 text-pass-foreground print:hidden">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="size-6 shrink-0 text-pass-foreground" />
          <div>
            <h3 className="font-semibold text-base">Application Submitted Successfully</h3>
            <p className="text-xs opacity-90">Your application reference code is #{shortId(app.id)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handlePrint} className="bg-background text-foreground">
            <Printer className="size-4 mr-1.5" /> Print Acknowledgment
          </Button>
          <Button asChild size="sm">
            <Link to="/apply">
              Go to My Applications <ArrowRight className="size-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Printable Acknowledgment Document */}
      <Card className="print:shadow-none print:border-none">
        <CardContent className="p-8 space-y-6">
          {/* Header for print / official receipt */}
          <div className="border-b pb-6 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-primary font-bold text-lg">
              <ShieldCheck className="size-6" />
              <span>Ministry of Tribal Affairs — Government of India</span>
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {app.cycle ? `${app.cycle.scheme_code} ${app.cycle.cycle}` : "Scholarship Application Acknowledgment"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {app.cycle && SCHEME_NAME[app.cycle.scheme_code]}
            </p>
          </div>

          <div className="grid gap-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Application Details</h4>
            <Facts
              items={[
                ["Application Reference No.", `#${shortId(app.id)}`],
                ["Full Application ID", app.id],
                ["Submission Date & Time", submittedAtText],
                ["Current Status", app.status.toUpperCase()],
                ["Scheme Name", app.cycle ? `${app.cycle.scheme_code} (${app.cycle.cycle})` : "NFST"],
              ]}
            />
          </div>

          <div className="grid gap-4 pt-4 border-t">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Next Steps in Process</h4>
            <ol className="list-decimal pl-5 text-xs space-y-2 text-muted-foreground">
              <li>
                <strong>Institute Verification:</strong> Your registered institute will verify your academic records and AISHE enrollment.
              </li>
              <li>
                <strong>Scrutiny & Merit List:</strong> Verified applications will be evaluated by the National Merit Committee.
              </li>
              <li>
                <strong>Award & Direct Benefit Transfer:</strong> Selected candidates will receive digital Award Letters and Direct Benefit Transfer into their verified bank account.
              </li>
            </ol>
          </div>

          <div className="pt-8 border-t flex justify-between items-end text-xs text-muted-foreground print:flex">
            <div>
              <p>Generated via Adi Scholar Portal</p>
              <p>Digital Reference Stamp: {app.id.slice(0, 16)}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-foreground">Ministry of Tribal Affairs</p>
              <p>Government of India</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Embedded print styles */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          header, sidebar, nav, footer, .print\\:hidden {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
        }
      `}</style>
    </div>
  )
}
