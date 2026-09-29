# Adi Scholar design tokens

`src/index.css` is the implementation source for these values.

| Token | Value | Use |
| --- | --- | --- |
| Page | `#ffffff` | Primary canvas |
| Secondary surface | `#f5f7fa` | Table headers and quiet sections |
| Text | `#1a1a1a` | Primary readable text |
| Muted text | `#4b5563` | Supporting text |
| Primary | `#1c3f7a` | Actions, links, focus, active navigation |
| Accent | `#d9730d` | Small highlights only; not buttons |
| Radius | `4px` | Controls and bordered sections |
| Border | `#d1d5db` | Surface and layout separation |

## Status tokens

| Status | Fill | Text | Border |
| --- | --- | --- | --- |
| Success | `#e9f7ee` | `#14532d` | `#4f9b68` |
| Review | `#fff6df` | `#713f12` | `#c47a13` |
| Error | `#fdf0ef` | `#8a1c16` | `#bf5b55` |
| Neutral | `#f3f4f6` | `#374151` | `#9ca3af` |

Every status also has a text label and glyph. Noto Sans and Noto Sans Devanagari must be self-hosted under `public/fonts/` before production release; never fetch fonts from a third-party CDN.
