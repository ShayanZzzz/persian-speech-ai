# Negar visual identity

Current selection: **Warm Amber**, concept 3, approved 2026-11-13.
This supersedes the earlier selection of Deep Teal, which remains available.

## Meaning of "new palette"

«پالت جدید»، «کالر پلت جدیدمون»، «هویت بصری جدید» and "new palette" now mean
**Warm Amber** unless the user explicitly names another saved palette.

| Visual role | Share | Approved base color |
| --- | --- | --- |
| Background and primary surfaces | 70% | Warm cream `#FAF7F0` |
| Secondary emphasis and main typography | 20% | Warm charcoal `#2D302B` |
| Actions, selected states, small highlights | 10% | Amber `#C97B24` |

Ratios describe visual hierarchy, not exact pixel quotas. Light-mode small action
text and solid action buttons use the darker amber `#9D5A17` for contrast.
Dark mode uses charcoal surfaces and brighter amber with the same visual identity.

## Saved palettes

- `warm-amber`: current identity. Cream / warm charcoal / amber.
- `deep-teal`: previous concept 2, preserved unchanged: `#F3F7F6` / `#17323B` / `#0D9488`.
- `classic-purple`: original identity, preserved as exact page-specific CSS fallbacks.

## Source of truth and activation

`frontend/src/config/brand.ts` owns base colors, tonal roles, and activation.
`BrandPalette.tsx` applies the selected palette to Negar routes and the shared player.
`BrandPalette.css` bridges common light/dark roles for any registered non-classic palette.

The default remains `classic-purple`. **Only `dashboard` is set to `warm-amber`**.
The dashboard header, tooltips, and playback inherit amber. Other pages, including
file details, keep their previous palette.

- One page: set e.g. `dashboard: 'warm-amber'` in `paletteSettings.pages`.
- All Negar pages: set `paletteSettings.defaultPalette` to the chosen palette and
  remove conflicting overrides. No manual page recoloring is needed.
- Restore earlier appearances: use `classic-purple` or `deep-teal`.
- Update a palette later: modify its roles in the central configuration.

Page keys: `studio`, `stt`, `tts`, `video`, `login`, `dashboard`, `file-detail`.
Palette selection and existing light/dark toggles are independent.

## Implementation rules

Use shared `--brand-bg`, `--brand-surface`, `--brand-raised`, `--brand-ink`,
`--brand-muted`, `--brand-line`, and `--brand-accent*` roles. Translucent accents
use their `-rgb` counterparts. Legacy literals are backwards-compatible fallbacks;
new components should not copy hex codes from individual pages.

Preserve semantic success/error/warning colors, user-selected subtitle colors,
third-party logos, and the separate Shayan Workshop landing page at `/`.
