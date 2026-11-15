# Negar dashboard delivery record

Recorded: 2026-11-16. Scope: work delivered in the dashboard/history conversation,
not the separate Shayan Workshop or Blender work.

## Delivered and pushed

| Commit | Date | Delivered scope |
| --- | --- | --- |
| [b559a05](https://github.com/ShayanZzzz/persian-speech-ai/commit/b559a05) | 2026-11-12 | Unified STT/TTS/video history, server pagination/filtering/sorting, direct record details, account controls, related tests |
| [f35fdaf](https://github.com/ShayanZzzz/persian-speech-ai/commit/f35fdaf) | 2026-11-16 | Service tabs, first/last pagination controls, central palette system, Warm Amber dashboard, Safari selection fix, further regression tests |

Push to `origin/main` was confirmed for both commits. This records source delivery;
no production deployment was performed.

## Conversion history and data

- The dashboard can page through all available owner-scoped history, rather than
  only the latest 50 records. `/history?page=...&page_size=...` returns items and
  counts; omitting `page` retains the legacy 50-item array response.
- `/history/{record_id}` loads a record directly, including older records and
  synthetic `tts-<media_id>` IDs for legacy generated speech files.
- New TTS conversions save input text and voice mode in existing history tables.
  Old TTS media are included without duplicates. Their missing input text and
  unrecorded voice metadata are not fabricated.
- Video transcription is distinguished from subtitle-video export. Authenticated
  successful exports save subtitle text/timing and history; guest export still works.
- No schema migration or destructive backfill was added. Public media IDs remain
  strings in the history payload to avoid JavaScript precision loss.

## Dashboard behavior and accepted UI decisions

- Tabs in final order: All / Speech to text / Video / Text to speech. Search,
  sorting, rows per page, and counts apply to the selected service.
- Switching tabs resets the page and bulk selection; search/sort/page size remain.
  Resetting controls preserves the active tab. Selections survive paging within
  the same service for existing bulk exports.
- TTS shows saved voice metadata and plays authenticated audio through the shared
  player. STT shows duration/model; Video identifies transcription/subtitle export.
- Small icon controls reuse the application's shared tooltips. Pagination shows
  the current page and total, with previous/next and double-chevron first/last.
- Filename search remains visible. Date and language filters were removed from
  the toolbar at the user's request; their API support remains available.
- Success status is localized. New-conversion links follow the active service.
- Shared theme and language controls are fixed at 38 by 38 pixels. Theme uses
  sun/moon icons; language preserves En / فا in Vazirmatn with optical alignment.
- The new-conversion action uses an audio waveform icon.

## Visual identity decision

The user first selected Deep Teal (concept 2), then replaced it with **Warm Amber
(concept 3)**. Current identity: 70% cream `#FAF7F0`, 20% charcoal `#2D302B`,
10% amber `#C97B24`, with tonal derivatives for light/dark mode and contrast.

`frontend/src/config/brand.ts` is the single palette source and activation point.
Only the dashboard activates `warm-amber`; all other Negar pages retain the
`classic-purple` default. Both Classic Purple and Deep Teal remain available.
The Shayan Workshop landing page, semantic status colors, third-party logos, and
user-selected subtitle/media colors are intentionally outside brand recoloring.

See [the identity reference](../brand/IDENTITY.md) and root `AGENTS.md` for how
future agents should interpret "new palette" and enable it centrally.

## Safari defect and verification

The dropdowns were wired to `/history`, but Safari could blur a disclosure with
no next focus target before a clicked option's handler ran. The menu then closed
without applying the choice. The fix ignores unknown blur destinations while
preserving outside-click, known-focus, Escape, and selection dismissal.
History fetches now specify `cache: 'no-store'`, including refresh requests.

Observed in the actual local Safari dashboard after the fix:

- Oldest sorting changed the record order from recent to older dates.
- Selecting 25 rows changed the displayed row count and page count.
- Clicking refresh produced a new `/history` fetch and received a server response,
  verified in Safari's Network panel without reading authentication headers.

Latest completed checks before push:

- 12 backend unittest regressions: authentication, ownership, legacy TTS,
  full-history pagination, filters, all sort orders, page sizes, fresh reads,
  new TTS recording, and video success/failure behavior.
- 6 frontend palette regressions: saved palettes, route activation, shared CSS
  coverage, and core contrast checks in both modes.
- TypeScript, targeted ESLint, Vite production build, and `git diff --check` passed.

Reproducible checks:

```sh
# Repository root, with the project's Python environment selected:
uv run python -m unittest discover -s tests -v
```

```sh
# frontend directory:
node --test tests/brand.test.ts
npm run build
```

The palette tests use Node's native TypeScript support (verified locally on Node 26).
Backend tests use disposable SQLite and ASGI requests; inference and FFmpeg are mocked.
They do not run real models or modify the user's PostgreSQL records.

## Limits and remaining work

- Old TTS input text and previously temporary video outputs cannot be recovered.
- Rendered MP4 downloads remain temporary; history is not permanent video storage.
- No status filter was added: the history has no recorded processing/failure status.
- No full mobile/browser matrix, dark-mode visual acceptance, dedicated PostgreSQL
  integration suite, model throughput testing, or production deployment was completed.
- The pre-existing VideoEditor set-state-in-effect lint finding remains outside
  this focused work. A claim that all frontend issues are fixed would be incorrect.
- Broader authorization, abuse/quota, resource-limit, session, export correctness,
  and storage-consistency audit work is still pending its own evidence.
- Blender files, workshop images, unrelated media, and backup files were not edited,
  added to commits, or pushed as part of this delivery.

## Workspace records

- [Negar project](https://app.notion.com/p/412cdb6adfbe810fbc75c39f45eba2b6)
- [Shared Sprint 1](https://app.notion.com/p/412cdb6adfbe8170abc6c5a8a62d6946)
- [AI Activity Log](https://app.notion.com/p/412cdb6adfbe81298709e49575523e07)

Git is the technical source of truth. Notion stores the corresponding delivery
summary and project/task decisions; neither replaces verification of live behavior.
