# Development Guide --- Persian Speech AI / Negar

Last updated: 2026-11-04

This file is the project handoff document. Update it when architecture,
implementation status, or important decisions change. Prefer concise,
verified facts over a transcript of development conversations.

## 1. Project overview

**Repository:** `https://github.com/ShayanZzzz/persian-speech-ai`\
**Local project path:** `~/persian-speech-ai`

Persian Speech AI (Negar) is a web application for audio/video
transcription and related speech workflows. The current stack is:

-   Backend: FastAPI
-   Frontend: React + Vite
-   Database: PostgreSQL + SQLAlchemy
-   Schema migrations: Alembic
-   Audio/video processing: FFmpeg / FFprobe
-   ASR: Whisper-based inference
-   TTS MVP: Pocket TTS

The product direction includes media upload, transcription, subtitle
editing/export, user accounts, usage quotas, and later custom voice
cloning. Keep implementation incremental. Avoid introducing unnecessary
infrastructure or paid APIs. Docker has deliberately been deferred.

## 2. Development environment

Known development environment:

-   Computer: MacBook Air, Apple M1, 8 GB RAM
-   macOS: Tahoe 26.0.1
-   Python: 3.13, managed with `uv`
-   Virtual environment: `.venv`
-   Separate Pocket TTS environment: `.venv-tts`
-   PostgreSQL: 17.11
-   FFmpeg: Homebrew installation; FFprobe is used for media validation
-   Backend development URL: `http://127.0.0.1:8000`
-   Frontend development URL: `http://127.0.0.1:5173`

Use `uv run python` rather than bare `python`.

Typical commands:

``` bash
cd ~/persian-speech-ai
uv run uvicorn main:app --reload
```

Run the frontend in a separate terminal using the project's package
scripts (inspect `package.json` if the exact script is uncertain).

The Vite development proxy currently targets `http://127.0.0.1:8000`.

## 3. Working conventions

-   Communicate in Persian by default.
-   Give one actionable step or terminal command at a time, then wait
    for the result.
-   Prefer short, copyable commands and focused edits over large
    heredocs.
-   Code, comments, terminal output, and developer-facing strings should
    be English unless they are part of the Persian UI.
-   Do not assume a command or test succeeded until its output is
    provided.
-   Do not provide Git commit commands while changes are still
    experimental. Provide exact commands when a feature is tested and
    ready to commit.
-   Avoid unrelated cleanup or refactoring during a focused feature.
-   Do not claim a capability works until its implementation and
    behavior have been tested.

## 4. Current application structure and functionality

### Backend

Main backend file: `main.py`

Important modules include:

-   `src/auth.py` and `api_auth.py` --- authentication-related logic
-   `src/models.py` --- SQLAlchemy models
-   `src/database.py` --- database setup and session handling
-   `src/media.py` --- media conversion, duration and audio validation
-   `src/inference.py` --- transcription inference
-   `src/vad.py` --- voice activity detection
-   `src/model_registry.py` --- model catalog/configuration

Existing functionality includes:

-   Health endpoint (`/health`)
-   Authentication and user-related endpoints
-   Audio/video transcription endpoint (`/transcribe`)
-   Media storage and authenticated media retrieval
-   Guest usage quota
-   Rate limiting for selected authentication and generation endpoints
-   Pocket TTS endpoints
-   Organization/API-key functionality

Verify exact routes and current implementation in the repository before
making changes; this document is a handoff, not a substitute for source
code.

### Frontend

The frontend is React-based. Known routes include:

-   `/` --- landing page
-   `/studio` --- media studio
-   `/studio/negar` --- Negar studio
-   `/studio/tts` --- TTS studio
-   `/login` --- authentication
-   `/dashboard` --- user dashboard

Known frontend components/files include `TTSStudio.tsx`, `Studio.tsx`,
`Dashboard`, and the cave-intro landing-page animation. Confirm current
paths in the repository before editing.

## 5. Completed and verified milestones

The following milestones were previously completed:

-   PostgreSQL connection and user model
-   Voice activity detection integration
-   Authentication rate limiting
-   Guest transcription quota and signup prompt
-   Landing-page cave intro animation
-   Pocket TTS MVP

### Pocket TTS MVP

Pocket TTS is a preset-voice TTS engine. It is **not** the custom
voice-cloning engine.

The MVP includes:

-   Six built-in English voices: `alba`, `anna`, `jean`, `cosette`,
    `marius`, and `javert`
-   `GET /tts/voices`
-   Authenticated `POST /tts/generate`
-   WAV output
-   CPU-based CLI invocation
-   Rate limit of 5 requests per minute
-   Generated output stored as a `MediaFile` and served through an
    authenticated media route

Generation and download were manually tested, and the user confirmed
that the generated audio played successfully.

Relevant Git commit: `ef18f0c Add Pocket TTS MVP` (pushed to
`origin/main`).

Do not modify Pocket TTS as part of the custom voice-profile management
work unless explicitly required.

## 6. Current task: Custom Voice Profiles

**Status:** Backend CRUD implementation and the main API behavior have been tested successfully. Frontend profile management is the next step.

### Agreed design

Custom voice profiles are a separate feature from preset Pocket TTS
voices.

-   A user can own multiple custom voice profiles.
-   Each profile belongs to one user.
-   Reference audio and future voice embeddings are stored privately.
-   Private voice files must not be exposed through the public `/media`
    mount or unauthenticated URLs.
-   Explicit speaker consent is required before accepting reference
    audio.
-   Profile management is authenticated and ownership-scoped.
-   The custom cloning engine has not been selected or proven on the
    development machine.
-   The current work stores reference audio only. It does not yet clone
    voices or generate speech from custom profiles.
-   Do not mark a profile `ready` until a real engine has created and
    validated its embedding.

### Database model

`VoiceProfile` has been added to `src/models.py` with these fields:

-   `id`
-   `user_id` --- foreign key to `users.id`, indexed, non-null
-   `name`
-   `status` --- currently defaults to `pending`
-   `reference_audio_path`
-   `voice_embedding_path` --- nullable until a cloning engine is
    integrated
-   `consent_at`
-   `created_at`

The `User` model has a `voice_profiles` relationship with
`cascade="all, delete-orphan"`.

Migrations applied successfully:

-   `011920fbce9a` --- create voice profiles
-   `008ecd093596` --- add profile status
-   `e99fc1bdb3fd` --- make voice embedding path nullable

The current database was upgraded to `e99fc1bdb3fd`.

### Storage and upload behavior

In `main.py`:

-   `VOICE_PROFILE_STORAGE_DIR` points to `private_voice_profiles` under
    the project directory.
-   This directory is intentionally not mounted as static/public media.
-   Upload extension allowlist: `.wav`, `.mp3`, `.m4a`, `.flac`, `.ogg`
-   Upload size limit: 25 MB
-   Stored filenames use UUIDs rather than user-provided filenames.
-   Files are intended to have restrictive permissions.
-   `validate_audio_file` in `src/media.py` uses FFprobe to confirm a
    readable audio stream and positive duration.

### Implemented endpoints

The following routes have been registered:

  --------------------------------------------------------------------------------
  Method                  Route                            Purpose
  ----------------------- -------------------------------- -----------------------
  `POST`                  `/voice-profiles`                Upload reference audio
                                                           and create a pending
                                                           profile

  `GET`                   `/voice-profiles`                List the current user's
                                                           profiles

  `PATCH`                 `/voice-profiles/{profile_id}`   Rename an owned profile

  `DELETE`                `/voice-profiles/{profile_id}`   Delete an owned profile
                                                           and its private files
  --------------------------------------------------------------------------------

All four routes depend on `require_current_user`. Queries filter by both
profile ID and current user ID for operations on a specific profile.

The create endpoint expects multipart form fields:

-   `name`
-   `consent` (must be true)
-   `file`

The list response includes profile metadata only; it does not expose
private file paths.

The delete endpoint was recently changed to commit the database deletion
before unlinking private files. File unlink errors are currently
suppressed, which avoids turning a successful database deletion into a
failed HTTP response, but may leave an orphaned private file if the
filesystem operation fails.

The rename endpoint trims the submitted name and rejects whitespace-only
values. Its Pydantic request model has a 1--100 character constraint
before trimming; the endpoint also checks the normalized value is not
empty.

### Verified API behavior

On 2026-11-05, the following API operations were manually tested:

- `POST /voice-profiles`: returned `201 Created`; a pending profile was created from a valid audio file.
- `GET /voice-profiles`: returned `200 OK`; profile metadata was returned without private storage paths.
- `PATCH /voice-profiles/1`: successfully renamed the profile.
- Whitespace-only rename: returned `400 Bad Request`.
- Rename of a nonexistent profile ID: returned `404 Not Found`.
- `DELETE /voice-profiles/1`: returned `204 No Content`.
- A subsequent list request returned `200 OK` with an empty `voice_profiles` array.

The test confirmed the main create, list, rename, validation, not-found, and delete flows. Cross-user ownership isolation and several negative upload cases have not yet been independently tested.

A missing `json` import in `src/media.py` was discovered during API testing and fixed.

### Latest verified command

On 2026-11-04, the following command completed successfully:

``` bash
cd ~/persian-speech-ai && uv run python -m py_compile main.py src/media.py src/models.py && uv run python -c "from main import app; print('Voice profile routes:', [(r.methods, r.path) for r in app.routes if 'voice-profiles' in r.path])"
```

Output confirmed all four routes:

``` text
[({'POST'}, '/voice-profiles'),
 ({'GET'}, '/voice-profiles'),
 ({'PATCH'}, '/voice-profiles/{profile_id}'),
 ({'DELETE'}, '/voice-profiles/{profile_id}')]
```

Syntax, route registration, and the API behaviors listed above have been verified. The remaining authorization and upload edge cases are listed below.

## 7. Next steps --- current priority

### Step 1 --- Frontend profile management

Implement the custom voice-profile management UI:

- A "Custom Voice" option in the voice picker
- A modal listing only the signed-in user's profiles
- Upload form with explicit speaker consent
- Rename and delete controls
- Clear `pending` status messaging
- Selection/activation of a profile in the UI

Do not imply that selecting a profile enables voice cloning. Until an engine is integrated, the UI must distinguish profile storage and management from actual speech generation.

### Step 2 --- Evaluate a cloning engine

After frontend management is stable, evaluate candidate engines against:

- Apple M1 compatibility
- 8 GB RAM constraints
- Installation and model-download size
- Inference speed and memory use
- Persian and English support requirements
- License and commercial-use terms
- Quality and reference-audio requirements

Run a small feasibility test before integrating any engine. Keep Pocket TTS unchanged.

### Remaining backend verification

The following cases still need dedicated tests:

- Unauthenticated requests
- Missing or false consent
- Unsupported extensions
- Empty and malformed audio
- Oversized uploads and temporary-file cleanup
- Cross-user profile access and ownership isolation
- File cleanup behavior when filesystem operations fail

## 8. Other known pending work

These items are separate from the current custom voice-profile task:

-   Dashboard bulk delete is not implemented.
-   Test actual downloaded TXT, JSON, SRT, and VTT exports in the
    browser; a successful frontend build is not sufficient.
-   Investigate the dashboard three-dot export menu's partial visibility
    / horizontal-scroll issue.
- Update this handoff document whenever verified implementation status or architecture decisions change.

## 9. Data and deployment decisions to preserve

-   PostgreSQL stores metadata and history.
-   During development, original audio/video files are stored separately
    on local server disk.
-   Later, evaluate S3-compatible object storage.
-   Inspect and extend the existing `MediaFile` model rather than
    creating a duplicate general media model.
-   Delete temporary converted WAV files after processing unless a
    retention policy is explicitly chosen.
-   Future organization support should distinguish the individual
    performer/uploader from the organization that owns the media or
    workflow.
-   Before production: reset development/test data as appropriate,
    rotate test secrets, review storage permissions, and review
    authentication/authorization.
-   When returning to database inspection, TablePlus or DBeaver may be
    useful.

## 10. Git workflow

Recent relevant commits include:

-   `2fce850` --- Add database connection and user model
-   `82002e5` --- VAD integration
-   `23bd76e` --- authentication rate limiting
-   `2ed0bdd` --- cave intro animation
-   `3940d8e` --- guest quota signup prompt
-   `1a9ed1a` --- retry for TTS voice loading
-   `ef18f0c` --- Pocket TTS MVP

Custom voice-profile model, migrations, and endpoints are not yet
recorded as a completed feature commit in this handoff. Check
`git status` and the current log before committing. Do not commit
`.env`, credentials, access tokens, uploaded audio, embeddings, or
private voice-profile data.

------------------------------------------------------------------------

## Handoff rule for a new chat

At the start of a new development chat:

1.  Read this file.
2.  Check `git status` and the latest commit.
3.  Inspect the relevant source files before editing.
4.  Ask for the latest command output only if the file and repository
    state do not establish it.
5.  Continue from **Section 7 --- Next steps**, updating this document
    when verified progress changes.
