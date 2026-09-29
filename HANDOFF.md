# Handoff

## Completed: Step 1 — UX4G research

- Read the existing dirty-tree audit and previous guardrails.
- Added `docs/ux4g-notes.md`, based on official UX4G and GIGW sources.
- No files under `src/` were edited for this step.
- `docs/ux4g-notes.md` records package installation, verified token families, components, templates, logo constraints, widget embed, and decisions still needing Ministry/security input.

## Completed: Step 2 — UX4G Ministry-blue foundation

- Vended verified UX4G 3.0 blue, neutral, semantic-status, typography, spacing, radius, and elevation tokens in `src/index.css`.
- Mapped Tailwind/shadcn aliases to the Ministry-blue token scale; no lavender or dark-card inversion remains.
- Kept Radix behavior and updated existing card, button, input, textarea, select, table, dialog, alert, badge, and status-badge primitives to use the foundation.
- Added a neutral non-emblem favicon and metadata link in `index.html`.
- Tested the UX4G package, then deliberately removed it: its full stylesheet built to 8.45 MB / 4.05 MB gzip due to embedded fonts and full-catalogue styles. The vended-token build is 80.96 KB / 14.06 KB gzip.

## Next: Step 3 — government shell

1. Add `components/layout/` with UtilityBar, neutral Emblem placeholder, GovHeader, MainNav, Breadcrumbs, and GovFooter.
2. Rework authenticated Shell only: retain NAV role guards/routes, add optional grouping and `#main` skip target.
3. Do not use the State Emblem unless an authorised source asset is supplied.
4. Run `npm run lint` and `npm run build`; capture 360px and 1280px screenshots if mock mode can be run.

## Constraints and open questions

- The working tree includes pre-existing uncommitted `App.tsx`, API, `.env.example`, and mock-role work; do not stage or rewrite it accidentally.
- Do not use or recreate the State Emblem without an official authorised source asset.
- Review/pin the UX4G external accessibility-widget script before production.
- Backend work intentionally excluded: public cycles/dates endpoint, public application-status endpoint plus OTP, phone OTP/SMS provider, and public statistics endpoint.
