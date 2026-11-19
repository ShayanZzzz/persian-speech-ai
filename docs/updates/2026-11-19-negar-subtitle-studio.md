# Negar subtitle studio — 2026-11-19

Status: implemented in the main frontend, committed and pushed to `main` in
[e5e8546](https://github.com/ShayanZzzz/persian-speech-ai/commit/e5e8546).
This is a local development update; no production deployment was performed.

## Delivered

- The video editor loads the speech-to-text model catalog from `/models` and
  sends the selected model, language and media file to `/transcribe`.
- Timed segments populate the timeline. The user can edit segment text and
  timing, and the transcript workspace and subtitle preview use the same state.
- Existing segments are preserved when generating again unless replacement is
  selected. Errors and cancellation preserve the user's edits.
- Model and language dropdowns in speech-to-text and Video use the shared
  content-sized `StudioSelect` component. Its current indicator is a small,
  soft-cornered filled triangle; shared styling is in `StudioSelect.css`.
- Video filter, brightness and contrast controls affect the preview only.
  MP4 export does not yet render those adjustments.

## Word-level review: partly prepared, backend support pending

- Transcript text can currently be edited by segment in the larger editor.
- The frontend accepts optional `words[].probability` data, marks supplied
  probabilities below `0.6` in red, and can filter segments that need review.
  Editing segment text clears old word confidence so highlights cannot become
  stale.
- Current inference does not request word timestamps or return per-word
  probabilities. Therefore normal `/transcribe` results do not yet show the
  red word hints. Segment-level scores must not be treated as word confidence.

### Planned follow-up

Add aligned word timing and confidence to the transcription response, verify
the model's confidence semantics, then highlight uncertain words in red and let
the user replace them directly in the editor. Keep edits synchronized with
segment text, timing, preview and subtitle exports. This is planned, not
implemented or scheduled.

## Related documentation

- [Development guide](../../DEVELOPMENT.md)
- [Negar project](https://app.notion.com/p/412cdb6adfbe810fbc75c39f45eba2b6)
- [Future video and speech ideas](https://app.notion.com/p/41bcdb6adfbe81f3a24cc1fe108de7bf)
