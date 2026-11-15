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
