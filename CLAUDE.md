# Adi Scholar frontend guardrails

Scope: frontend only (`src/`, `index.html`, and `public/`). Do not change backend contracts, roles, or routing logic in `src/App.tsx` unless a scoped redesign phase explicitly requires it.

- Build a restrained, high-contrast public-service interface: deep blue primary (`#1c3f7a`), white surfaces, and saffron only for highlights.
- Use white bordered sections, not dark cards. Use 2–4px corners and no decorative shadows, gradients, glass effects, dark mode, or animated counters.
- Keep type plain and readable: 16px base size, 1.5 line-height, semibold headings. Use locally hosted Noto Sans and Noto Sans Devanagari subsets when supplied.
- Statuses require text, an icon, a light tint, and a 1px border; colour may not be the only signal.
- Buttons and inputs need a visible keyboard focus indicator. Controls are at least 40px high; text inputs are 44px high.
- Icons are reserved for meaning. Prefer sentence-case, plain-English copy.
- Respect `prefers-reduced-motion`. Preserve existing ARIA labels, roles, query keys, role guards, and lazy routes.
- Do not use State Emblem or Ashoka Chakra assets without Ministry authorisation. A neutral placeholder is permitted.
