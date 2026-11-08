# Negar — Initial Audit

Audit date: 2026-11-08  
Repository: `persian-speech-ai`  
Inspected branch / HEAD: `main` / `edf542f` (`Add custom voice profile management UI`)

## 1. Scope and evidence standard

This is a source inspection of the local checkout, not a runtime certification. The inspection covered backend modules, frontend pages and shared components, configuration, migration scripts, dependency manifests, documentation, and comparisons with local source backups.

No application code was changed. No tests, builds, migrations, servers, model inference, media processing, or database queries were run. Secrets, uploaded/private media, database dumps, installed dependencies, and model contents were not inspected. Existing untracked backup and WAV files were left untouched.

Evidence labels used throughout:

- **Confirmed — source:** directly observable implementation or configuration. This establishes what the code does or attempts to do, not successful execution.
- **Historical — documented:** prior verification reported in `DEVELOPMENT.md`; not independently repeated in this audit.
- **Needs testing:** runtime behavior, suspected failure impact, performance, or an environment fact not established by source inspection.

Paths below are relative to the repository root. Risk priorities are planning judgments, not measured incident severity: **High** means investigate before wider use; **Medium** means address during hardening or workflow completion.

## 2. Verified architecture

| Layer | Confirmed — source | Evidence |
| --- | --- | --- |
| Frontend | React + TypeScript, Vite, React Router, component-specific CSS, Vazirmatn font, shared header and audio-player context. | `frontend/package.json`, `frontend/src/main.tsx`, `frontend/src/StudioHeader.tsx`, `frontend/src/AudioPlayer.tsx` |
| Backend | One FastAPI application with most request orchestration in `main.py`; helpers in `src/`. SlowAPI limits selected endpoints by remote address. | `main.py` |
| Persistence | SQLAlchemy models and request-scoped sessions; database URL supplied through environment configuration. PostgreSQL is the documented development database; the live database was not inspected. | `src/database.py`, `src/models.py`, `DEVELOPMENT.md` |
| Schema management | Alembic migration chain: baseline → media/history link → storage path → voice profiles → profile status → nullable embedding path. Latest checked-in revision: `e99fc1bdb3fd`. Applied database revision is not verified here. | `migrations/env.py`, `migrations/versions/` |
| Authentication | Password hashing through `pwdlib`; HS256 JWT access tokens with a 30-minute expiry. React stores the token in local storage and sends Bearer authorization. Organization keys are generated randomly and stored as SHA-256 hashes, with revocation and active-organization checks. | `src/auth.py`, `src/api_keys.py`, `src/api_auth.py`, `frontend/src/Login.tsx` |
| Speech recognition | JSON catalog selects Whisper `base`, `small`, `medium`, or `large-v3`; models load lazily and are cached, up to four entries. Uploaded media is converted to mono 16 kHz PCM WAV before inference. | `config/`, `src/model_registry.py`, `src/inference.py`, `src/media.py` |
| Speech generation | Pocket TTS executable in a separate `.venv-tts` environment; invoked on CPU with a 180-second subprocess timeout. | `main.py`, `DEVELOPMENT.md` |
| Media storage | Authenticated transcription originals and generated speech are stored under `media_uploads/`. Reference voices are stored under `private_voice_profiles/`, which is not mounted publicly. Temporary conversion/export files have cleanup paths. | `main.py` |
| Video output | FFprobe reads dimensions; FFmpeg burns ASS subtitles into an MP4. Output cleanup is attached to the file response; failures also attempt cleanup. | `main.py` (`export_video`) |

### Frontend routes

`frontend/src/main.tsx` registers `/`, `/studio`, `/studio/stt`, `/studio/tts`, `/studio/video`, `/login`, `/dashboard`, and `/dashboard/files/:id`. `/studio/negar` redirects to `/studio/stt`.

`/studio/video` uses `ProtectedRoute`. Dashboard and file-detail pages perform their own authentication checks. Backend dependencies, rather than frontend navigation, enforce access to protected data.

### Two web entry points

The FastAPI root serves `static/index.html` with its own JavaScript/CSS interface. The Vite frontend serves the newer React application. These are distinct interfaces, with different token-storage keys (`psai_token` versus `access_token`). Source inspection does not establish a production routing arrangement joining them.

### Main data flows

1. **Transcription:** upload → extension/size validation → temporary input → FFmpeg normalization → Whisper → history and original-media storage for signed-in users, or guest-usage increment → temporary-file cleanup.
2. **Preset TTS:** authenticated text/voice request → Pocket TTS CLI → WAV in media storage → `MediaFile` record → authenticated audio fetch.
3. **Voice profile:** authenticated name, explicit consent, and reference upload → private UUID filename → FFprobe validation → `pending` profile record. No embedding or cloned speech is generated.
4. **Video subtitles:** browser-local video and manually edited subtitle state → optional SRT/VTT/JSON download or multipart video-export request → FFmpeg MP4 response.

## 3. Implemented features

All entries in this section are **Confirmed — source**; end-to-end success is not implied.

| Area | Implemented behavior | Evidence |
| --- | --- | --- |
| Accounts | Register, login, current-user lookup, password hashing, token expiry, frontend logout. Register/login are limited to five requests per minute per remote address. | `main.py`, `src/auth.py`, `src/schemas.py`, `frontend/src/Login.tsx` |
| Transcription | Audio/video upload, 25 MiB application-level file limit, model selection, automatic/Persian/English language selection, text and timestamped segments. | `main.py` (`transcribe`), `frontend/src/Studio.tsx` |
| Guest usage | Three successful files per guest token, hashed token storage, HTTP-only cookie, configurable Secure flag, signup prompt. | `main.py`, `src/models.py`, `frontend/src/Studio.tsx` |
| History | Up to 50 latest transcription records for the current user; metadata, text, segments, and related media ID. File-detail and transcript endpoints use authenticated ownership filters. | `main.py`, `frontend/src/Dashboard.tsx`, `frontend/src/FileDetail.tsx` |
| Exports | Dashboard TXT/JSON/SRT/VTT downloads and combined exports for selected records; subtitle formats require saved segments. | `frontend/src/Dashboard.tsx` |
| Audio playback | Local-file playback and authenticated saved-media fetch, seeking and playback-speed controls. Backend resolves stored paths and checks containment within media storage. | `frontend/src/AudioPlayer.tsx`, `main.py` (`get_media_audio`) |
| Preset TTS | Six English voices: Alba, Anna, Jean, Cosette, Marius, Javert. Authenticated WAV generation, maximum 2,000 input characters, five requests per minute. Frontend playback/download. | `main.py`, `frontend/src/TTSStudio.tsx` |
| Custom profiles | Authenticated upload/list/rename/delete; explicit consent; five allowed audio extensions; 25 MiB limit; nonempty audio/duration validation; ownership filters. Metadata responses omit private paths. | `main.py`, `src/models.py`, `src/media.py`, `frontend/src/TTSStudio.tsx` |
| Video editor | Local preview, manual subtitle text/timing, draggable/resizable timeline clips, appearance settings, SRT/VTT/JSON download and MP4 burn-in request. | `frontend/src/VideoEditor.tsx`, `main.py` (`export_video`) |
| Organizations | Owner-scoped organization and API-key management, key revocation, organization-key authenticated `/api/v1/transcribe`. | `main.py`, `src/api_keys.py`, `src/api_auth.py` |
| UI shell | Persian/English presentation switches, theme persistence, landing-page cave animation, media-tool directory. | `frontend/src/` |

## 4. Confirmed limitations and gaps

- **Custom voice generation is absent.** Profiles remain `pending`; embedding paths are nullable. Preset TTS accepts a built-in voice ID, with no connection to custom profile IDs. (`main.py`, `src/models.py`, `frontend/src/TTSStudio.tsx`)
- **Current TTS supports English and WAV only.** The media-directory card advertises Persian/English speech, but backend validation rejects non-English generation. (`main.py`, `frontend/src/MediaStudio.tsx`)
- **Negar Assistant is a placeholder.** Submitting a question displays a not-connected notice; no assistant request is made. Audio Lab and journal previews are also unfinished product surfaces. (`frontend/src/MediaStudio.tsx`)
- **Bulk deletion is disabled.** Dashboard selection/export exists, but the delete control is disabled. (`frontend/src/Dashboard.tsx`)
- **Password recovery and social login are not implemented in the inspected interface.** Recovery displays a notice; Google/Apple buttons are disabled. No refresh-token or server-side logout/revocation flow for user JWTs was found. (`frontend/src/Login.tsx`, `src/auth.py`, `main.py`)
- **History has no pagination.** The API returns only the latest 50 records. File details search that same list by history ID, so an older record can become unreachable through this page even if retained in the database. (`main.py`, `frontend/src/FileDetail.tsx`)
- **The video editor has no automatic transcription integration.** It starts with an empty subtitle list and does not call `/transcribe`. Project JSON is downloadable, but no matching import/persistent editor-project flow was found. (`frontend/src/VideoEditor.tsx`)
- **VAD and chunking helpers are not wired into the active transcription request paths.** They exist in `src/vad.py` and `src/chunking.py`; `main.py` dispatches through `transcribe_with_model`, which transcribes the complete WAV. The handoff's historical “VAD integration” milestone does not prove current request-path use.
- **Organization transcription stores less than user transcription.** The API path does not save original media storage paths, duration, mode, or timestamp segments into history. Saved audio playback and timed exports cannot be assumed for these records. (`main.py`, `api_transcribe`)
- **Generated TTS media is not transcription history.** TTS creates a `MediaFile` without a `TranscriptionHistory` entry; `/history` will not list it. (`main.py`)
- **No dedicated automated test suite or CI workflow was found in the inspected project file inventory.** `src/database.py` contains a connection helper, not evidence of a regression suite. No tests or builds were run.

## 5. Technical risks

### R1 — Development audio routing mismatch — High

**Confirmed — source:** saved-audio clients fetch `/media/{public_id}/audio` using relative URLs. `frontend/vite.config.ts` proxies `/tts`, `/history`, and other API paths, but has no `/media` proxy. It also omits `/transcript` and `/organizations`; the current React pages do not call those latter routes.

**Needs testing:** from a standard Vite-origin session, inspect actual audio responses for TTS and saved-file playback. The configuration mismatch suggests requests may reach the frontend server rather than FastAPI. A separate reverse proxy could change the outcome; none was verified.

### R2 — Blocking processing and unbounded resource cost — High

**Confirmed — source:** async transcription/export handlers invoke synchronous database operations, FFmpeg subprocesses, and/or Whisper directly. There is no application job queue or explicit concurrency admission control. `convert_to_wav` has no subprocess timeout; Whisper requests have no application-level inference timeout. Compressed upload size is bounded, but media duration and decoded size are not. Up to four Whisper models can remain cached.

**Needs testing:** event-loop responsiveness, concurrent requests, long compressed audio, cancellation, peak memory, and model eviction on the documented M1/8 GB development machine. Browser abort in `Studio.tsx` cancels its fetch; it does not establish cancellation of server inference. No out-of-memory event or throughput result was observed in this audit.

### R3 — Incomplete abuse controls — High

**Confirmed — source:** `/export-video` is rate-limited but has no authentication dependency, despite its frontend route being protected. `/transcribe` and `/api/v1/transcribe` have no endpoint-specific rate-limit decorators. Guest accounting is cookie-based and performs a read/check followed by a later increment, with no explicit locking/atomic quota reservation.

**Needs testing:** unauthenticated export access, quota behavior under parallel requests or cookie reset, reverse-proxy address handling, and effective limits across workers. Cookie quota is a convenience limit, not a durable identity boundary.

### R4 — Private storage and database/filesystem consistency — High

**Confirmed — source:** profile upload creates the directory with mode `0700` when new, then opens a file and applies `0600` after writing. Existing directory permissions are not corrected by `mkdir(exist_ok=True)`. Delete commits the database removal before unlinking private files and suppresses unlink errors. Creation flows commit then refresh inside error-handling regions that can remove files on subsequent failure.

**Needs testing:** effective filesystem permissions during/after upload, cleanup under disk/permission errors, commit-success/refresh-failure scenarios, and failed unlink reconciliation. These branches can leave orphaned private files or records referencing removed media; no such incident was verified. No storage reconciliation or retention job was found.

### R5 — Large IDs serialized inconsistently — Medium

**Confirmed — source:** media public IDs can be roughly 9×10^18, exceeding JavaScript's exact integer range. Transcription/history responses stringify IDs, while `/tts/generate` returns `public_id` as a JSON number. Its `audio_url` is built server-side as a string, and the current TTS page uses that URL.

**Needs testing:** clients that consume the numeric TTS ID directly. Current TTS audio routing should be evaluated separately from numeric precision; the string URL avoids this particular rounding path.

### R6 — Export correctness and UI behavior — Medium

**Confirmed — source:** combined SRT/VTT export concatenates segments from separate files without offsetting their independent timestamps. Dashboard CSS contains repeated layout rules, and menus are positioned inside table-related containers. Editor state is browser-memory state; replacing a video does not reset the subtitle list.

**Needs testing:** ordering/overlap in combined subtitle output, downloaded file compatibility, menu visibility at different widths, subtitle timing validation, replacing videos, and parity between preview and burned-in MP4 (Persian shaping, font, scale, placement, background and wrapping).

### R7 — Session and deployment assumptions — Medium

**Confirmed — source:** React tokens live in local storage. Cookie Secure defaults to false unless configured. FFmpeg video export includes Homebrew-specific executable fallback paths and looks for subtitle fonts inside frontend dependencies. `/health` only returns a static status and does not check the database, models, FFmpeg or Pocket TTS.

**Needs testing:** deployment routing, TLS/cookie configuration, browser script-injection resistance, token expiry UX, runtime executable/font availability, and readiness behavior. Secret values and production settings were deliberately not inspected.

### R8 — Reproducibility, documentation and maintenance — Medium

**Confirmed — source:** the frontend has a package lock. Python has an unpinned research requirements file and a largely pinned server requirements file, with some unpinned entries; no inspected manifest defines the separate TTS environment reproducibly. The main backend remains concentrated in one large module, while CSS contains accumulated overrides and many local backup variants.

`README.md` describes an earlier experimental stage. `DEVELOPMENT.md` says profile work is not yet recorded as completed commits, while the current log contains `416b762` (profile API) and `edf542f` (profile UI).

**Needs testing:** clean-machine setup, exact TTS dependency/model reproduction, migration upgrade/rollback on disposable data, and dependency health. No dependency vulnerability scan or package-availability check was performed. Backup files were compared but not removed.

## 6. Prior verification reported by the project

The following is **Historical — documented**, based on `DEVELOPMENT.md`, not newly demonstrated:

- Pocket TTS generation/download and successful audio playback were manually confirmed.
- Voice-profile upload, listing, rename, delete, whitespace-only rename rejection and missing-profile behavior were manually exercised.
- Profile ownership isolation was checked with two users using direct endpoint-function calls and an in-memory SQLite database. These were not HTTP/ASGI authentication tests.
- Profile-management frontend operations were manually confirmed.
- Syntax compilation and voice-profile route registration were previously checked.
- The handoff reports the development database upgraded to `e99fc1bdb3fd`.

These reports do not replace current HTTP-level regression tests, browser verification, or checking the live migration state.

## 7. Proposed verification backlog — not executed

| Priority | Verification item | Evidence of success to collect |
| --- | --- | --- |
| High | Audio fetch through the normal frontend origin | Authenticated TTS and saved audio return playable audio bytes from `/media/...`, including expired-session behavior. |
| High | HTTP authentication and ownership | Missing/expired tokens and cross-user IDs fail appropriately for history, media and profile CRUD; owner data/files remain intact. |
| High | Voice upload rejection/cleanup | Missing/false consent, unsupported extension, zero-byte, malformed and oversized uploads leave no unintended file or row; expected errors are returned. |
| High | Failure-path consistency | Controlled DB refresh/commit and filesystem failures establish which rows/files remain and how cleanup/reconciliation works. |
| High | Workload and limits | Concurrent, long and cancelled processing requests establish latency, memory, timeout and quota behavior without assuming success from file-size checks. |
| Medium | Browser export/editor checks | Open actual TXT/JSON/SRT/VTT downloads; compare rendered MP4 with preview; inspect menus, mobile widths and video replacement. |
| Medium | Organization workflow parity | Revoked/inactive keys are rejected; API-produced records have explicitly documented playback/export behavior. |
| Medium | Setup and database lifecycle | Reproduce both Python environments and frontend installation, inspect actual schema revision, then verify migrations on disposable data. |

## 8. Audit outcome

Negar contains a substantial implemented web-application workflow: accounts, Whisper transcription, media/history, subtitle editing/export, English preset TTS, private reference-voice management, and organization APIs. Custom voice cloning and the assistant remain unfinished.

The immediate audit concerns are development audio routing, synchronous heavy processing, abuse/quota controls, and file/database consistency. Their source evidence is recorded above; operational impact remains untested. This report authorizes no fixes or test execution.
