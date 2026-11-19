# Negar project conventions

- Communicate in Persian and keep edits focused. Read `DEVELOPMENT.md` for project context.
- The phrases "new palette", "new visual identity", «پالت جدید» and «هویت بصری جدید»
  mean **Warm Amber**, the approved third concept (superseding Deep Teal). See `docs/brand/IDENTITY.md`.
- Palette source and activation settings: `frontend/src/config/brand.ts`.
  Preserve `classic-purple` and `deep-teal` as earlier palettes. Do not silently activate
  a new palette while working on unrelated features.
- For a request to migrate one page, set its page override in `paletteSettings`.
  For a request to migrate all Negar pages, change the default there and remove
  obsolete overrides. Reuse shared `--brand-*` roles instead of new literal colors.
- Light/dark mode and visual palette are separate. Preserve semantic status colors,
  user-selected subtitle colors, third-party logos, and the separate Shayan Workshop brand.

- Main Negar URL (user-confirmed 2026-11-17): `http://localhost:5174`; subtitle
  studio: `/studio/video`. Edit this repository for main-app requests and verify
  the served source on port 5174. The separate workshop preview on port 5175
  and `negar-history-work` snapshot do not update the main running application.

- Reuse `frontend/src/components/StudioSelect.tsx` for Negar model/language
  dropdowns. Its CSS and inline SVG filled triangle are the single source for appearance and
  the arrow. Keep page-specific layout in the page stylesheet; do not duplicate
  selector internals or force a fixed trigger width. STT and Video both use it.
