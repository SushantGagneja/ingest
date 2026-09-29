# UX4G 3.0 research notes

Research date: 29 September 2026. These notes are limited to information published by UX4G and GIGW sources; they are the implementation reference for the next frontend step.

## Adoption decision

UX4G 3.0 supplies a framework-neutral web-components package that works with React 17+ by importing its stylesheet and runtime once, then applying `ux4g-*` classes to native JSX. It is therefore compatible with this React 19 / Tailwind application without replacing Radix behavior. The next step should retain Radix for dialogs, selects, sheets, dropdowns, and tooltips, and use UX4G styles/components only where the interaction model is like-for-like. [UX4G developer guide](https://www.ux4g.gov.in/get-started/for-developers)

## Installation

```sh
npm install ux4g-web-components
```

In the application entry point, the official React example imports:

```ts
import "ux4g-web-components/styles.css"
import "ux4g-web-components/design-system"
```

Then use native JSX with UX4G classes, for example `ux4g-btn ux4g-btn-primary ux4g-btn-md`. The package is a single core web package, not separate React component imports. Do not load the legacy UX4G 2.0 CDN alongside it. [UX4G developer guide](https://www.ux4g.gov.in/get-started/for-developers)

## Foundations and tokens

UX4G 3.0 publishes its tokens as CSS custom properties in `styles.css`; that package stylesheet is the authoritative full value table. The public documentation verifies these token families and examples:

| Foundation | Verified tokens / rule | Implementation note |
| --- | --- | --- |
| Colour | `--ux4g-color-primary-600`; brand, semantic, and neutral palettes | Map semantic app aliases from installed UX4G values rather than inventing a palette. Verify contrast in context. |
| Typography | `--ux4g-font-display-lg`; family, sizes, weights, line-heights | UX4G uses a 16px browser-default base and a native/system stack; its handbook recommends Noto for Indic-script support. |
| Spacing | `--ux4g-space-4`; base-4 scale | Legacy public spacing guidance also documents a 1rem spacer with 0, .25, .5, 1, 1.5, and 3 multiples. |
| Radius | `--ux4g-radius-lg`; sharp 0px through fully rounded | Use the supplied component radius, not a new local radius scale. |
| Elevation | `--ux4g-shadow-md`; levels from subtle card shadow to modal overlay | Use only the supplied elevation where component guidance calls for it. |

The UX4G foundations page lists colour, typography, spacing/layout, elevation, iconography, tokens, accessibility, and content design as the core system areas. [Foundations](https://www.ux4g.gov.in/foundations?lang=en), [Typography](https://doc.ux4g.gov.in/content/typography.php), [Spacing](https://doc.ux4g.gov.in/utilities/spacing.php)

## Components and patterns

UX4G’s component catalogue groups 18 form elements, 13 feedback components, 17 data-display components, 9 navigation components, and 2 identity/accessibility components. Components confirmed in the public catalogue and Storybook include:

- Accessibility Bar, accordion, alert, avatar, badge, breadcrumb, button, card, carousel, checkbox, chip group, chips, combobox, date picker, divider, draft status, drawer, dropdown, empty state, feedback, file upload, footer.
- Button group, close button, collapse, list group, modal, navbar, nav/tabs, offcanvas, pagination, popover, progress, scrollspy, spinner, toast, tooltip, and table-style data-display patterns.
- Government-service patterns: identity, OTP cells, status pipelines, empty states, escalation flows, and accessibility controls.

The precise source and API of each component should be checked in the installed package/Storybook before use. [Components](https://www.ux4g.gov.in/components), [web component index](https://doc.ux4g.gov.in/category/components.php), [Footer Storybook entry](https://doc.ux4g.gov.in/web/?path=%2Fstory%2Fux4g-components-footer--introduction)

## Templates and government structure

UX4G publishes webpage templates, a Figma Design Kit, logo resources, and an accessibility widget through its Resources area. The public design guidance places the National Emblem at the top left, department logos to its right, and scheme logos in content rather than the header. The desired portal shell should use those resources together with the GIGW/DBIM-required ownership and policy content in the footer. [UX4G resources](https://www.ux4g.gov.in/aboutus/accessibility/tools.php), [GIGW communications](https://guidelines.india.gov.in/govt-communications/)

## Logos, assets, and legal constraints

Use official assets downloaded from UX4G’s government-logo library only. Preserve aspect ratio, use correct language variants, keep at least 50% logo-height clear space, and do not recolour, redraw, distort, shadow, or use unofficial/outdated marks. The library recommends 32–48px header logo height and at least 24px digitally. UX4G itself is open-source, provided as-is; use does not establish government endorsement or authorise use of government symbols. For this repository, retain a neutral emblem placeholder unless a legally authorised official asset is supplied. [Government Logos](https://www.ux4g.gov.in/resources/logos), [UX4G disclaimer](https://www.ux4g.gov.in/disclaimer)

## Accessibility Widget

UX4G documents the widget as available for React, TypeScript, JavaScript, and other web stacks. Its current documented embed is placed before `</body>`:

```html
<script src="https://cdn.ux4g.gov.in/accessibility-beta-v1.15/accessibility-widget.js" defer></script>
```

The documentation also presents `https://cdn.ux4g.gov.in/tools/accessibility-widget.js` as an async embed. Before production, select and pin one approved version with the Ministry’s security/CSP review; do not load both. The widget offers controls such as text size, spacing, line-height, links, screen reader, cursor size, pause animation, contrast/saturation/inversion, dyslexia support, image hiding, focus mode, dictionary, reading guides, text magnification, and voice support. The UX4G baseline is WCAG 2.1 AA; visible keyboard focus must not be suppressed. [Widget documentation](https://doc.ux4g.gov.in/ux4g-accessibility/accessibility-widgets.php), [Widget feature list](https://www.ux4g.gov.in/resources/accessibility-widget), [Developer accessibility baseline](https://www.ux4g.gov.in/get-started/for-developers)

## Open points before Step 2

1. The installed package stylesheet must be inspected to copy exact token values and actual `ux4g-*` component class names; public marketing pages intentionally expose examples, not the complete token table.
2. The Ministry must provide written authorisation and official source files before the National Emblem or any Ministry/Digital India mark is added.
3. The external accessibility-widget script needs CSP/security approval and a pinned-version policy before it is enabled in production.
