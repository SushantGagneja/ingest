# Handoff

## Completed: Step 1 — UX4G research

- Read the existing dirty-tree audit and previous guardrails.
- Added `docs/ux4g-notes.md`, based on official UX4G and GIGW sources.
- No files under `src/` were edited for this step.
- `docs/ux4g-notes.md` records package installation, verified token families, components, templates, logo constraints, widget embed, and decisions still needing Ministry/security input.

## Next: Step 2 — foundation

1. Install `ux4g-web-components` and inspect its installed stylesheet for exact CSS variables and component classes.
2. Map UX4G tokens into `src/index.css`; retain no dark-card inversion or lavender palette.
3. Update compatible UI primitives, keeping Radix behavior for dialog/select/sheet/dropdown/tooltip.
4. Add favicon and confirm `index.html` metadata.
5. Run `npm run lint` and `npm run build`.

## Constraints and open questions

- The working tree includes pre-existing uncommitted `App.tsx`, API, `.env.example`, and mock-role work; do not stage or rewrite it accidentally.
- Do not use or recreate the State Emblem without an official authorised source asset.
- Review/pin the UX4G external accessibility-widget script before production.
- Backend work intentionally excluded: public cycles/dates endpoint, public application-status endpoint plus OTP, phone OTP/SMS provider, and public statistics endpoint.
