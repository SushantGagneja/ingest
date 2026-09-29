# Adi Scholar UI Audit & Design Pass

## Orientation Summary

- **Repository Branch & History**: Branch `main`, HEAD commit `92d75754` ("blah blah"), following commits for UX4G tokens research & foundation vending.
- **Uncommitted Changes**: Modified `src/pages/apply/Application.tsx` (tab bar layout and form grid alignment tweaks).
- **Documentation Found**: `docs/design-tokens.md` (token specification), `docs/ux4g-notes.md` (UX4G 3.0 adoption & vended tokens). No `HANDOFF.md`, `CLAUDE.md`, or `DEMO.md` were pre-existing.
- **Tech Stack & Identity**: React 19 + Vite + Tailwind CSS v4 + Radix UI primitives + Lucide icons + TanStack Query. Vended Ministry Blue theme (`#24306e` primary, `#9b5710` accent, Noto Sans body, Source Serif headers).
- **Mock / Demo Mode**: Controlled via `VITE_MOCK=true` or `VITE_DEMO_MODE=true` using in-memory fixtures in `src/lib/mock.ts`.

---

## Route Inventory & Baseline Status

| Route | Role | File | Size | Status | Baseline Errors / Warnings / Failed Req | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `/` | Unauthenticated / Public | `src/pages/public/Landing.tsx` | 8.9 KB / 114 lines | OK | 0 / 0 / 0 | Public landing page |
| `/login` | Unauthenticated / Public | `src/pages/common/Login.tsx` | 1.1 KB / 27 lines | OK | 0 / 0 / 0 | Login screen |
| `/apply` | Applicant | `src/pages/apply/Home.tsx` | 4.3 KB / 104 lines | OK | 0 / 0 / 0 | Applicant dashboard / application list |
| `/applications/:id` (Applicant) | Applicant | `src/pages/apply/Application.tsx` | 22 KB / 506 lines | OK | 0 / 4 / 0 | Multi-step scholarship application wizard (Missing config fixture warning) |
| `/applications/:id` (Officer) | Officers | `src/pages/review/ReviewApplication.tsx` | 22 KB / 523 lines | OK | 0 / 4 / 0 | Official review screen (Missing risk-flags fixture warning) |
| `/apply/awards` | Applicant | `src/pages/apply/Awards.tsx` | 9.0 KB / 232 lines | OK | 0 / 0 / 0 | Award details and payment history |
| `/help` | Applicant | `src/pages/apply/Help.tsx` | 6.4 KB / 170 lines | OK | 0 / 0 / 0 | Help center and grievance form |
| `/queue` | Officers (Inst/State/Scrutiny) | `src/pages/review/Queue.tsx` | 4.8 KB / 113 lines | OK | 0 / 0 / 0 | Verification queue |
| `/risk` | Scrutiny Officer | `src/pages/review/RiskFlags.tsx` | 4.0 KB / 88 lines | OK | 0 / 4 / 0 | High risk applications review (Missing risk-flags fixture warning) |
| `/scholars` | Officers (Inst/Scrutiny/Mission) | `src/pages/institute/Scholars.tsx` | 5.2 KB / 112 lines | OK | 0 / 0 / 0 | Active scholars list |
| `/requests` | Officers (Inst/Scrutiny/Mission) | `src/pages/institute/Requests.tsx` | 5.0 KB / 110 lines | OK | 0 / 0 / 0 | Lifecycle requests (leave, extension) |
| `/merit` | Committee Member / Scrutiny | `src/pages/committee/Merit.tsx` | 8.3 KB / 188 lines | OK | 0 / 0 / 0 | Selection cycles & merit generation |
| `/merit/runs/:id` | Committee Member / Scrutiny | `src/pages/committee/Run.tsx` | 14 KB / 336 lines | OK | 0 / 8 / 0 | Ranking run details (Missing merit-run fixture warning) |
| `/finance` | Finance Officer | `src/pages/finance/Finance.tsx` | 10 KB / 248 lines | OK | 0 / 0 / 0 | Payment batch generation & disbursement |
| `/admin/users` | Scheme Admin | `src/pages/admin/Users.tsx` | 7.7 KB / 196 lines | OK | 0 / 4 / 0 | User account management (Missing users endpoint warning) |
| `/admin/institutions` | Scheme Admin | `src/pages/admin/Institutions.tsx` | 7.5 KB / 191 lines | OK | 0 / 0 / 0 | AISHE institution catalog management |
| `/admin/cycles` | Scheme Admin | `src/pages/admin/Cycles.tsx` | 9.4 KB / 239 lines | OK | 0 / 0 / 0 | Scholarship cycle management |
| `/admin/cycles/:id` | Scheme Admin | `src/pages/admin/Config.tsx` | 14 KB / 356 lines | OK | 0 / 4 / 0 | Cycle rules & score weighting (Missing config fixture warning) |
| `/dashboards` | Leadership / Admin / Scrutiny | `src/pages/dashboards/Dashboards.tsx` | 12 KB / 261 lines | OK | 0 / 0 / 0 | Visual analytics, equity & bottleneck charts |
| `/grievances` | All Officers | `src/pages/common/Grievances.tsx` | 4.8 KB / 113 lines | OK | 0 / 0 / 0 | Officer grievance resolution view |
| `/notifications` | All Authenticated Roles | `src/pages/common/Notifications.tsx` | 2.4 KB / 60 lines | OK | 0 / 0 / 0 | User notifications center |
| `/profile` | All Authenticated Roles | `src/pages/common/Profile.tsx` | 6.1 KB / 138 lines | OK | 0 / 0 / 0 | User profile details |

---

## Baseline Capture Summary

- **Total Routes Captured**: 22 routes across 4 viewports (1440, 1024, 768, 390 wide).
- **Total Screenshots Saved**: 88 baseline PNGs in `docs/audit/before/`.
- **Console Errors Total**: 0 errors.
- **Console Warnings Total**: 28 missing-fixture warnings (to be resolved in Step 5 Demo Mode).
- **Failed Requests Total**: 0 network request failures.

---

## Final Demo-readiness Pass

- All 22 routes were recaptured at 1440, 1024, 768 and 390px in demo mode (88 screenshots in `docs/audit/after/`). The final capture recorded **0 console errors, 0 warnings and 0 failed requests**.
- The application wizard now validates each step before navigation, focuses the first invalid field, preserves autosave feedback without console noise, and permits only deficiency-flagged documents to be updated.
- Merit-run details no longer emit React key warnings, all shared tables have accessible names, and the authenticated shell clips only accidental page-level overflow while retaining horizontal scrolling inside data tables.
- The public landing page no longer displays development placeholder copy. The finance data table was rechecked at 390px with no page-level horizontal overflow.
- `npx tsc --noEmit` and `npm run build` pass. `npm run lint` completes with pre-existing Fast Refresh / `use-mobile` advisory warnings only; no errors were reported.
