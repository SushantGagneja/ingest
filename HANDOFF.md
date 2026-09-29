# Handoff

## Completed: Step 1 — UX4G research

- Read the existing dirty-tree audit and previous guardrails.
- Added `docs/ux4g-notes.md`, based on official UX4G and GIGW sources.
- No files under `src/` were edited for this step.
- `docs/ux4g-notes.md` records package installation, verified token families, components, templates, logo constraints, widget embed, and decisions still needing Ministry/security input.

## Next: Step 2 — foundation

Step 2 is paused at a documented design conflict. `ux4g-web-components@3.0.0` is installed but not imported or committed. Its official default primary scale is purple: `--ux4g-color-primary-600: #4a2bc2`, with a lavender range. The brief prohibits a lavender accent while also requiring official UX4G tokens and says not to invent a style.

Resume only after a decision:

1. Use stock UX4G tokens (accept its official purple default), or
2. use UX4G component/layout/accessibility conventions with an authorised Ministry blue theme supplied by the Ministry/UX4G Theme Craft, or
3. remove the package and retain only the researched conventions.

After a choice, map tokens into `src/index.css`, update compatible UI primitives while keeping Radix behavior for dialog/select/sheet/dropdown/tooltip, add favicon, then run `npm run lint` and `npm run build`.

## Constraints and open questions

- The working tree includes pre-existing uncommitted `App.tsx`, API, `.env.example`, and mock-role work; do not stage or rewrite it accidentally.
- Do not use or recreate the State Emblem without an official authorised source asset.
- Review/pin the UX4G external accessibility-widget script before production.
- Backend work intentionally excluded: public cycles/dates endpoint, public application-status endpoint plus OTP, phone OTP/SMS provider, and public statistics endpoint.
