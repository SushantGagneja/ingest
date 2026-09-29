import { useState, type FormEvent } from "react"
import { Link } from "react-router"

import { CHECKER_DOCUMENTS, checkEligibility, ELIGIBILITY_STATES, type CheckerFacts } from "@/content/eligibility"
import { Button } from "@/components/ui/button"

const EMPTY: CheckerFacts = { state: "", community: "", dob: "", qualification: "", courseLevel: "", income: "" }
const unavailable = "To be announced"

function WarliDivider() {
  return (
    <svg viewBox="0 0 360 32" className="h-8 w-full text-accent" fill="none" aria-hidden>
      <path d="M2 16h92m172 0h92M120 6l10 10-10 10-10-10zm120 0 10 10-10 10-10-10zM151 4l9 12-9 12-9-12zm58 0 9 12-9 12-9-12z" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="180" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="m180 12-9 14m9-14 9 14m-9-10-9-2m9 2 9-2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export default function Landing() {
  const [facts, setFacts] = useState<CheckerFacts>(EMPTY)
  const [result, setResult] = useState<ReturnType<typeof checkEligibility> | null>(null)
  const set = (key: keyof CheckerFacts, value: string) => setFacts((current) => ({ ...current, [key]: value }))
  const submit = (event: FormEvent) => { event.preventDefault(); setResult(checkEligibility(facts)) }

  return (
    <main id="main" className="min-h-svh bg-background text-foreground">
      <div className="border-b border-foreground/25 bg-muted text-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 md:px-8">
          <a href="#eligibility" className="underline underline-offset-2">Skip to eligibility checker</a>
          <span>Ministry of Tribal Affairs · Government of India</span>
        </div>
      </div>

      <header className="border-b-2 border-primary">
        <div className="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 py-5 md:px-8">
          <div className="flex gap-3">
            <div className="grid size-10 place-items-center border-2 border-primary font-serif text-xl text-primary" aria-label="Adi Scholar">A</div>
            <div>
              <p className="font-serif text-2xl leading-none text-primary">Adi Scholar</p>
              <p className="mt-1 text-sm">जनजातीय कार्य मंत्रालय · Ministry of Tribal Affairs</p>
            </div>
          </div>
          <Link to="/login" className="text-sm font-semibold text-primary underline underline-offset-4">Sign in</Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.35fr_.65fr] md:px-8 md:py-18">
        <div className="border-l-4 border-accent pl-5 md:pl-7">
          <p className="mb-4 text-xs font-semibold tracking-[.18em] uppercase text-muted-foreground">NFST + NOS · scholarship services</p>
          <h1 className="max-w-3xl font-serif text-5xl leading-[.96] tracking-tight md:text-7xl">Start with the facts that matter.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">A quick, plain-language check for students considering the National Fellowship for Scheduled Tribes or National Overseas Scholarship.</p>
          <dl className="mt-10 grid max-w-xl grid-cols-2 border-y border-foreground/25 text-sm">
            <div className="border-r border-foreground/25 py-4 pr-4"><dt className="text-muted-foreground">Checker time</dt><dd className="mt-1 font-serif text-2xl">30 sec</dd></div>
            <div className="py-4 pl-4"><dt className="text-muted-foreground">Closing date</dt><dd className="mt-1 font-medium">{unavailable}</dd></div>
          </dl>
        </div>
        <aside className="self-end border-t-2 border-primary pt-4 text-sm leading-6">
          <p className="font-semibold">Before you begin</p>
          <p className="mt-2 text-muted-foreground">Have your date of birth, community details, education details, and income information ready. The result is a guide, not a decision.</p>
        </aside>
      </section>

      <WarliDivider />

      <section id="eligibility" className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr]">
          <div>
            <p className="text-xs font-semibold tracking-[.18em] uppercase text-accent">Eligibility check</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight">Tell us what you know.</h2>
            <p className="mt-4 max-w-sm text-muted-foreground">No account is needed. We do not save this information.</p>
          </div>
          <form onSubmit={submit} className="border-y border-foreground/30 py-1">
            <div className="grid sm:grid-cols-2">
              <label className="border-b border-r-0 border-foreground/20 p-4 sm:border-r">State
                <select value={facts.state} onChange={(e) => set("state", e.target.value)} className="mt-2 block w-full border-b border-foreground/40 bg-transparent py-2 outline-none focus:border-primary" required>
                  <option value="">Select state</option>{ELIGIBILITY_STATES.map((state) => <option key={state}>{state}</option>)}
                </select>
              </label>
              <label className="border-b border-foreground/20 p-4">ST community
                <input value={facts.community} onChange={(e) => set("community", e.target.value)} className="mt-2 block w-full border-b border-foreground/40 bg-transparent py-2 outline-none focus:border-primary" placeholder="Enter community" required />
              </label>
              <label className="border-b border-r-0 border-foreground/20 p-4 sm:border-r">Date of birth
                <input type="date" value={facts.dob} onChange={(e) => set("dob", e.target.value)} className="mt-2 block w-full border-b border-foreground/40 bg-transparent py-2 outline-none focus:border-primary" required />
              </label>
              <label className="border-b border-foreground/20 p-4">Highest qualification
                <select value={facts.qualification} onChange={(e) => set("qualification", e.target.value)} className="mt-2 block w-full border-b border-foreground/40 bg-transparent py-2 outline-none focus:border-primary" required><option value="">Select qualification</option><option>Undergraduate</option><option>Postgraduate</option><option>Doctoral</option></select>
              </label>
              <label className="border-b border-r-0 border-foreground/20 p-4 sm:border-r">Course level
                <select value={facts.courseLevel} onChange={(e) => set("courseLevel", e.target.value)} className="mt-2 block w-full border-b border-foreground/40 bg-transparent py-2 outline-none focus:border-primary" required><option value="">Select course level</option><option>Master's</option><option>M.Phil.</option><option>Ph.D.</option><option>Overseas postgraduate</option><option>Overseas doctoral</option></select>
              </label>
              <label className="border-b border-foreground/20 p-4">Annual family income
                <input inputMode="numeric" value={facts.income} onChange={(e) => set("income", e.target.value)} className="mt-2 block w-full border-b border-foreground/40 bg-transparent py-2 outline-none focus:border-primary" placeholder="Enter amount in ₹" required />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 p-4"><p className="max-w-md text-xs text-muted-foreground">This checker is preliminary. Please read the official notification before applying.</p><Button type="submit">Check eligibility</Button></div>
          </form>
        </div>

        {result && <section aria-live="polite" className="mt-10 grid gap-6 border-l-4 border-primary bg-muted p-6 md:grid-cols-[1fr_.8fr]">
          <div>
            <p className="text-xs font-semibold tracking-[.18em] uppercase text-muted-foreground">Preliminary result</p>
            <h2 className="mt-2 font-serif text-3xl">{result.title}</h2>
            <p className="mt-3 leading-7 text-muted-foreground">{result.reason}</p>
            {result.kind === "eligible" && <Button asChild className="mt-6"><Link to="/login">Start application</Link></Button>}
          </div>
          <div className="border-t border-foreground/25 pt-5 md:border-t-0 md:border-l md:pl-6 md:pt-0"><h3 className="font-semibold">Keep these documents ready</h3><ul className="mt-3 grid gap-2 text-sm text-muted-foreground">{CHECKER_DOCUMENTS.map((document) => <li key={document} className="border-b border-foreground/15 pb-2">{document}</li>)}</ul><p className="mt-4 text-xs text-muted-foreground">Closing date: {unavailable}</p></div>
        </section>}
      </section>

      <footer className="border-t-2 border-primary px-4 py-8 md:px-8"><div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 text-xs text-muted-foreground"><span>Content under review by Ministry of Tribal Affairs</span><span>Eligibility is subject to the official scheme notification.</span></div></footer>
    </main>
  )
}
