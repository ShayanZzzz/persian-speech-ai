# Negar — Focused UI/UX Follow-up Audit

**Audit date:** 2026-11-20 (Asia/Tehran)
**Product:** Negar, within Shayan Ecosystem
**Repository inspected:** `/Users/a1/persian-speech-ai`, branch `main`
**Source baseline:** `830904ca65078a5165238fc2353515cc2b9026d0` — `feat: polish TTS studio voice controls`
**Deliverable:** portable planning report; no product implementation

## 1. Assessment and boundaries

Negar already has useful foundations for an incremental redesign: a shared studio header, a shared audio player, central palette roles, reusable STT/video selectors, and paginated history. Account Center should build on these foundations while separating account settings from conversion history. The strongest near-term opportunities are consistent session/preferences handling, honest feature availability, complete bilingual presentation, accessible dialogs/forms, and controlled CSS consolidation.

The main repository was accessible and its **current frontend source was inspected**. This is not a review based only on the previous audit or the `negar-history-work` snapshot. Read-only inspection covered routing, every routed React page, shared components, relevant styles/configuration, frontend test inventory, project guidance, the initial audit, and selected Sprint 1 records. Large page/style files were reviewed selectively around the requested concerns; this was not a line-by-line audit of every rule or a backend/security re-audit.

No product code, existing documentation, backups, media, or Notion records were changed. No deletion, commit, push, build, test suite, migration, inference, or authenticated workflow was performed. Only this new report was created in the Shayan Ecosystem workspace. Existing untracked files were observed and left untouched; tracked repository changes were absent at inspection.

**Runtime boundary:** port 5174 had a listening Node process (PID 24384), whose working directory was `/Users/a1/persian-speech-ai/frontend`. This establishes the active process/source-directory mapping. An HTTP request from the tool environment failed to connect; no rendered page, served-module equality, browser interaction, mobile layout, contrast over actual backgrounds, or assistive-technology behavior was verified. Port 5175 and the workspace snapshot were not treated as the main app.

### Evidence and priority notation

- **Source / High confidence:** directly supported by inspected code/configuration. Runtime impact can still require testing.
- **Documented / Medium confidence:** project or Notion reports of earlier decisions/delivery, not tests repeated here.
- **Inference / Medium confidence:** plausible user impact inferred from source; explicitly needs verification.
- **Proposal:** a design or implementation recommendation, not shipped behavior.
- **P1:** address in the first focused improvement tranche; **P2:** incremental consistency/hardening; **P3:** later simplification. Priorities are planning judgments, not incident severity.

Repository paths below are relative to `persian-speech-ai/`; line numbers refer to the baseline above. For transfer to another account, pair this report with that checkout or the [baseline commit](https://github.com/ShayanZzzz/persian-speech-ai/tree/830904ca65078a5165238fc2353515cc2b9026d0).

## 2. Inputs and reconciliation

Read first: `AGENTS.md`, `DEVELOPMENT.md` (updated 2026-11-19), and `docs/sprint-1/NEGAR_INITIAL_AUDIT.md` (2026-11-08, baseline `edf542f`). The workspace contains another copy of that initial report; the current repository copy was also consulted. `docs/brand/IDENTITY.md` and current palette configuration were used to resolve branding claims.

Accessible Notion sources, fetched read-only:

1. [Negar — Persian Speech AI](https://app.notion.com/p/412cdb6adfbe810fbc75c39f45eba2b6): project foundation, dashboard/subtitle delivery, constraints and remaining risks.
2. [Sprint 1 — Foundation, Audit & Planning](https://app.notion.com/p/412cdb6adfbe8170abc6c5a8a62d6946): evidence-based scope, proposed completion criteria and delivery update.
3. [Deliver unified Negar dashboard history and service controls](https://app.notion.com/p/419cdb6adfbe8131b85be6aee33d5a6d): task status **Done**, with delivery scope/validation notes.
4. [Register central brand palettes and apply Warm Amber to dashboard](https://app.notion.com/p/419cdb6adfbe81e28e76ed5b48618208): task status **Done**, page-level activation and preserved palettes.

These were selected relevant records, not an exhaustive database review. Notion marks these pages unverified; their reported checks remain historical evidence. The linked ChatGPT conversation “طراحی صفحه پروفایل” was read for design context; its advice is not implementation evidence. Reference-image attachments were not available in the retrieved conversation, so no image-level matching is claimed.

### What has changed since the initial audit

| Initial finding | Current evidence | Follow-up conclusion |
| --- | --- | --- |
| History limited to 50 records and detail lookup through that list | `Dashboard.tsx:123–155` requests paginated history; `FileDetail.tsx:58–98` fetches `/history/{id}` directly | Do not repeat the old limit as a current frontend defect. Server behavior was not retested. |
| TTS not represented in account history | `Dashboard.tsx:10–20,349–364` contains STT/TTS/video types and service tabs; Notion records unified history delivery | Current frontend supports the unified presentation; historical data completeness remains a separate concern. |
| Video editor has no automatic transcription | `VideoEditor.tsx:175–207,448–480` calls `/transcribe` and consumes timed segments | Superseded in current source. Word-confidence support remains conditional on supplied data. |
| Replacing video retains subtitle list | `VideoEditor.tsx:136–152` clears subtitles in `chooseFile` | That specific source defect is fixed. Replacement now risks losing edits without a confirmation step. |
| Vite lacks `/media` proxy | `frontend/vite.config.ts:11–32` includes `/media` | Old configuration mismatch is fixed in source; playback was not revalidated. |
| No dedicated tests found | `frontend/tests/brand.test.ts` and `subtitleSegments.test.ts` now exist | Do not claim there are no tests. These are not evidence of complete UI/accessibility coverage. |

Historical Safari/build/test results in `DEVELOPMENT.md`, delivery notes and Notion are useful context, but no new passing result is asserted here.

## 3. Current page and route map

**Source / High:** `frontend/src/main.tsx:19–44` is the route authority. The development guide's earlier short route list is incomplete.

| Route | Current responsibility / access handling | Proposed disposition |
| --- | --- | --- |
| `/` | `App.tsx`: separate English Shayan Workshop entry, lamp/room navigation, links into Negar; outside `BrandPalette` | Keep as ecosystem entry; preserve its independent brand. Current root is not the old cave intro described in parts of the handoff. |
| `/studio` | `MediaStudio.tsx`: tool directory, assistant preview, feature cards and guide previews; public | Keep as Negar tool entry. Reduce unsupported promises. |
| `/studio/stt` | `Studio.tsx`: upload, models/language, guest transcription, result editing, video handoff | Keep task-focused. |
| `/studio/negar` | Redirects to `/studio/stt` with replacement | Compatibility alias, not a duplicate page implementation. |
| `/studio/tts` | `TTSStudio.tsx`: English preset generation and embedded custom reference-profile CRUD; auth checked within actions | Keep generation here; later share profile management with Account Center. |
| `/studio/video` | `VideoEditor.tsx`: generation, preview/timeline/transcript, subtitle/project/MP4 exports; wrapped in `ProtectedRoute` | Keep as a dedicated complex tool. |
| `/login` | `Login.tsx`: login/registration; fixed Persian/RTL page, independent header | Retain route and complete presentation/recovery states incrementally. |
| `/dashboard` | `Dashboard.tsx`: conversion history, filtering, selection/export; own `/me` and history auth handling | Keep as history/workspace, not a substitute for account settings. |
| `/dashboard/files/:id` | `FileDetail.tsx`: saved record, transcript/copy and playback; own auth handling | Keep detail route; adapt labels to service type and language. |
| Unmatched path | Redirects to `/` | Consider a small localized not-found state with Studio/History links; redirect currently hides a broken destination. |

There is **no registered Account Center/profile/security/billing/API-key page** in the current route map. No two active routed pages were established as redundant enough to delete. History, detail, directory and tools have different responsibilities. Consolidation should target repeated presentation/logic before deleting routes.

### Shared foundations and extraction candidates

| Existing unit | Evidence / useful behavior | Recommendation |
| --- | --- | --- |
| `BrandPalette` | `BrandPalette.tsx:7–15`: route-based palette wrapper and `AudioPlayerProvider` | Extend existing palette mechanism for the pilot; preserve Workshop isolation. |
| `StudioHeader` | `StudioHeader.tsx:21–223`: common services, auth display, theme/language controls | Retain; move session/preferences ownership above pages and improve menu dismissal. |
| `AudioPlayerProvider` / `useAudioPlayer` | `AudioPlayer.tsx`, consumed by STT/TTS/history/detail | Reuse playback; make locale/theme explicit shared inputs. |
| `StudioSelect` | `components/StudioSelect.tsx:37–114`: listbox naming, selection, keyboard movement, Escape, focus return, outside dismissal and bidirectional labels | Preserve as the model/language selector authority. Do not duplicate its internals. |
| `HistoryControls` | `HistoryControls.tsx:61–119`: labelled search/actions, disclosure choices, Escape/focus return, RTL pagination | Retain as history-specific UI. Extract generic disclosure mechanics only if another real use appears. |
| Shared tooltip styles | `SharedTooltip.css:1–73`: hover/focus tooltips and floating alternative | Reuse with accessible control names; CSS-generated text alone should not carry essential instructions. |
| Repeated page logic | `negar-theme`, per-page `lang`, `/me` calls, local message/button/form styling | Candidate shared session/preferences provider, form field, feedback state, button and dialog. Avoid an oversized design-system rewrite. |

## 4. Prioritized findings

### F01 — Account identity currently points to history — P1

**Source / High:** `StudioHeader.tsx:102–114` labels `/dashboard` as “Account”; `Dashboard.tsx:367–435` presents conversion history. `/me` is fetched separately by header and dashboard (`StudioHeader.tsx:41–94`; `Dashboard.tsx:71–120`), with another implementation in `ProtectedRoute.tsx:17–48`.

**Implication / Inference, Medium:** users looking for profile/security/preferences arrive at a file workspace. Multiple session owners also create opportunities for inconsistent expired/offline states. This is not evidence of broken server authorization.

**Proposal:** create a small `/account` home; name History explicitly. Share session state and distinguish unauthenticated, checking, network failure and signed-in states. `ProtectedRoute.tsx:51–57` currently renders nothing while checking and treats fetch failure as unauthenticated. Add a visible localized pending/retry state; preserve useful navigation context.

### F02 — Language selection is local and incomplete — P1

**Source / High:** pages initialize `lang` to `fa` independently (`Studio.tsx:49`, `MediaStudio.tsx:37`, `TTSStudio.tsx:36`, `Dashboard.tsx:337`, `FileDetail.tsx:43`, plus VideoEditor). `FileDetail.tsx:19–27,128–245` retains Persian dates, body text and labels despite the English header switch. `AudioPlayer.tsx:177–205,231–330` fixes `dir="rtl"` and Persian control text. Login fixes RTL/Persian (`Login.tsx:81`). `frontend/index.html:2,9–11` retains English document language and a Workshop title/description; no page-level document-language/title update was found in the routed source.

**Implication / Inference, Medium:** route transitions can reset the chosen language; an English view can contain Persian controls or be announced with the wrong language.

**Proposal:** one persistent locale source, translated messages/metadata, route document titles and `lang`/`dir`. Keep numeric timing, email and identifiers LTR with appropriate isolation; preserve automatic content direction where useful (`StudioSelect` already uses `bdi`, transcript inputs can use `dir="auto"`). Validate mixed Persian/Latin filenames rather than mirroring all content indiscriminately.

### F03 — Theme persistence exists, but defaults/coverage differ — P2

**Source / High:** all main tools use `negar-theme`, but Studio/Video/TTS/detail default to dark while dashboard/directory default to light. See `Studio.tsx:50–52`, `VideoEditor.tsx:56–58`, `TTSStudio.tsx:38–40`, `FileDetail.tsx:44–46`, `Dashboard.tsx:338–340`, `MediaStudio.tsx:38–40`. Login has no theme state/control. `BrandPalette.css:33–59` explicitly assigns dark palette roles to `.global-audio-player`, independent of the page toggle.

**Implication / Inference, Medium:** a first visit without a saved preference can change modes between routes. An intentionally dark floating player may be acceptable, but it is not proof of uniform light-mode coverage.

**Proposal:** shared preference state with a documented default; optionally support system mode. Define player treatment intentionally and test login plus all overlays in both modes. Keep palette choice independent from light/dark mode.

### F04 — Known unavailable features still invite unsupported tasks — P1

**Source / High:** the TTS directory card promises Persian or English generation (`MediaStudio.tsx:438–462`); TTS exposes a selectable Persian button (`TTSStudio.tsx:465–484`), then rejects that selection before generation (`TTSStudio.tsx:328–345`). The TTS hero does disclose English-only support. The assistant accepts a prompt and only then reports no connected backend (`MediaStudio.tsx:114–123,186–225`). Login recovery shows an unavailable notice and social buttons are disabled (`Login.tsx:166–179,208–243`); dashboard bulk delete is disabled (`Dashboard.tsx:449–465`).

**Proposal:** align directory and tool copy, mark unavailable choices before interaction, and give previews an explicit nonfunctional label without implying completion. Preserve voice-profile consent and CRUD, but explain `pending` as reference storage, not voice cloning (`TTSStudio.tsx:580–705`). Do not introduce working-looking wallet, donation, billing, security or API-key controls without validated implementation contracts.

### F05 — Dialog and menu interaction support is uneven — P1

**Source / High:** bulk export declares a modal dialog (`Dashboard.tsx:664–705`) but the inspected component contains no opening-focus placement, focus containment, Escape handler for that dialog, or trigger-focus restoration. The header services menu toggles and has a dismiss backdrop (`StudioHeader.tsx:122–160`) but no Escape or focus-management handler. Row export menus have outside-click dismissal (`Dashboard.tsx:47–67`), unlike the more complete Escape handling in `HistoryControls.tsx:84–90`. Player settings declare `role="dialog"` without equivalent focus/Escape behavior (`AudioPlayer.tsx:289–335`).

**Implication / Inference, Medium:** keyboard users may lose position or continue through content behind a declared modal. Actual focus order/screen-reader output needs browser verification.

**Proposal:** reuse one tested modal primitive for true modals; use disclosure semantics for nonmodal settings/navigation. Specify open/close focus, Escape, outside interaction and selected/current states. Existing keyboard support in `StudioSelect` and history tabs is a positive foundation, not a reason to rebuild every dropdown.

### F06 — Some form labels and tab relationships are incomplete — P1

**Source / High:** custom voice profile name/file labels are siblings without `htmlFor` or wrapping association, and inputs have no matching IDs/accessibility names (`TTSStudio.tsx:582–604`). Consent correctly wraps its checkbox (`606–618`). Login fields have proper labels/autocomplete (`Login.tsx:154–191`), while its `role="tab"` mode buttons lack the keyboard/roving-tabindex and panel relationships implemented by dashboard service tabs (`Login.tsx:123–152`; `Dashboard.tsx:398–418,440`).

**Proposal:** shared field naming/help/error patterns; either complete the login tab interaction model or use ordinary mode buttons. Include keyboard and assistive-technology checks; do not infer accessibility conformance merely from ARIA attributes.

### F07 — Editor work is transient; file replacement discards it — P1

**Source / High:** subtitles live in component state; choosing another video clears them (`VideoEditor.tsx:60–62,136–152`). Project JSON can be exported (`336–347`), but no corresponding import or route-leave/reload warning was found. STT hands a `File` through route state (`Studio.tsx:63–69`); `ProtectedRoute` records the location for login, but `Login.tsx:68–70` resumes only its pathname.

**Implication / Inference, Medium:** changing video or leaving the editor can lose work; a guest video handoff through login may lose the selected file and need reselection. This specific handoff was not reproduced.

**Proposal:** confirm destructive replacement when there are edits, clearly explain session-only state, then consider local drafts/project import. Preserve intended return path and design the post-login file-reselection state explicitly. Do not promise autosave before a persistence mechanism exists.

### F08 — Timeline resizing is pointer-oriented, with a useful form alternative — P2

**Source / High:** timeline clips/resize spans use `onPointerDown` and spans are not focusable keyboard resize controls (`VideoEditor.tsx:650–684`). The selected-segment form provides editable start/end times (`VideoEditor.tsx:720–744`), so timing is not exclusively dependent on dragging. Some editor copy, including delete-segment text, remains Persian in English mode (`749–757`).

**Proposal:** retain timing fields as a clearly discoverable keyboard alternative; verify selecting a clip and editing its times without a pointer. Add direct keyboard adjustments only if they improve the workflow. Test narrow touch targets, zoom and the selected-state announcement.

### F09 — CSS contains real override layers; repetition alone does not prove dead code — P2

**Source / High:** `MediaStudio.css` is 2,140 lines: the base `.media-studio` begins at line 1, a later violet redesign at 1543, and a more-specific “Final studio hero layout” at 1900. Earlier `.ms-hero` layout at 1581 is superseded in part by `.media-studio .ms-hero` at 1901. `Login.css` has base styles at 1 and an appended visual-system block at 337. `StudioHeader.css` repeats responsive blocks at 152/160, 287/321, 387/394 and later control styles. Dashboard has 1,147 lines including appended history controls at 890 onward.

There are numerous untracked `.bak-*` variants. No `.bak` imports were found in current TSX. `PowerIntro.tsx` imports `App.css`, but no import of `PowerIntro` was found in the current TSX entry graph; current `App.tsx` uses `Workshop.css`. These are cleanup candidates, not authorized deletions or proof that nothing else depends on them.

**Proposal:** inventory selectors/imports, consolidate one component at a time, preserve breakpoint/theme/RTL distinctions, then compare computed styles and screenshots. Avoid counting breakpoint repetitions, keyframes or theme variants as defects. Migrate new account styles through existing `--brand-*` roles and scoped component classes; avoid another appended “final” override layer.

### F10 — Responsive handling exists; overlay clipping and coverage remain open — P2

**Source / High:** dashboard becomes a card-like table presentation below 640px (`Dashboard.css:711–850`); VideoEditor reorganizes at 1000/760/420px (`VideoEditor.css:577–665`) with further responsive additions. Shared header and tools also contain narrow-width rules. This is evidence of responsive intent, not verified usability.

The desktop history wrapper uses `overflow-x:auto` (`Dashboard.css:360–370`), while row export menus are absolutely positioned inside it (`496–509`); the mobile wrapper changes to visible overflow (`758–764`). The development guide records a menu visibility concern. The fixed player is up to 760px wide and sits above content (`AudioPlayer.css:1–25`); Dashboard content reserves only 64px at the bottom (`Dashboard.css:99–103`).

**Inference / Medium:** desktop row menus may be clipped/require scrolling; an open player may obscure bottom controls, especially under zoom. Neither effect was reproduced here.

**Proposal:** prioritize last-row/menu-edge/player-open tests; use a suitable overlay layer or viewport-aware placement if reproduced. Allocate player-aware space if needed. Test content reflow, not only whether a media query exists.

## 5. Theme, typography and accessibility assessment

The central palette foundation is already usable: `config/brand.ts:1–24,92–108` registers Classic Purple, Deep Teal and Warm Amber, defaults to Classic Purple, and activates Warm Amber only for dashboard. `BrandPalette.css` bridges light/dark semantic roles; classic palettes intentionally retain local fallbacks. Consequently, history-to-detail navigation currently crosses palette boundaries. This is source-confirmed, but its perceived severity is a design judgment.

Typography is partly standardized around Vazirmatn, while global `index.css:1–41` uses Manrope and imports remote Manrope/DM Mono. STT/TTS have English font variants; `FileDetail.css:17` inherits its font, so it lacks an explicit Persian page-font guarantee. Global focus/selection colors use a Workshop lime literal (`index.css:43–51`); some pages override focus locally. **Proposal:** define shared Negar text/control typography and a brand-aware focus role. Check font fallback with remote fonts unavailable and Persian shaping in body text, form fields and filenames.

Positive source evidence includes named icon controls, many focus-visible rules, native form elements, reduced-motion rules in several page styles, a properly labelled transcript textarea, history tab keyboard navigation, and the shared selector's focus return. Coverage is uneven: these features do not establish full contrast, keyboard, motion or screen-reader acceptance. Tooltips animate in shared CSS, and directory placeholder typing uses recurring JavaScript timeouts (`MediaStudio.tsx:46–103`); no reduced-motion branch was found in that typing effect. Review it alongside the existing CSS motion reductions.

No contrast verdict is made for current rendered pages: gradients, translucency, disabled states and fallback colors need measurement in their actual contexts. No accessibility compliance certification is claimed.

## 6. Account Center proposal and Muted Purple + Champagne

### Decision boundary

**Current documented identity:** Warm Amber, approved in `docs/brand/IDENTITY.md` and reiterated in both retrieved brand records. **Requested design exploration:** Muted Purple + Champagne. Treat the latter as a proposed Account Center pilot, not an already registered palette or authorization to recolor the whole product. No palette was activated or changed during this audit. Later implementation should record whether this is a local experiment or a replacement brand decision; preserve existing saved palettes and the independent Workshop identity.

### Proposed information architecture

| Proposed destination | First useful scope | Dependency / availability boundary |
| --- | --- | --- |
| `/account` | Read-only identity overview, current account state, links to History and tools | Reuse validated `/me` data; do not fabricate avatar/name/plan fields. |
| `/account/preferences` | Language and theme | First unify existing client preferences; clearly state local-device persistence unless server persistence is implemented. |
| `/account/voices` | Reference-profile list/upload/rename/delete | Extract shared profile UI from TTS after parity checks; retain consent, ownership errors and truthful pending status. Keep a contextual link from TTS. |
| `/account/security` | Initially only supported session/logout information | Password change/recovery, session revocation and social providers require separate contracts and implementation. Do not present them as functioning controls. |
| Developer/organization settings | Later API-key and organization management | Backend capability is documented, but no current frontend page was found; endpoint/permission review is required before UI promises. |
| Usage/billing/donations | Research backlog only | No working frontend contract was established in this audit. Omit invented credits, balances and payment actions. |

These paths are proposals; none is currently registered. Keep `/dashboard` and `/dashboard/files/:id` as History and record details. Account navigation should offer a clear History link, not embed the entire table into every account section. Use navigation links with current-page semantics for route changes rather than tab roles.

### Proposed visual direction, not a finished specification

Use warm quiet surfaces, muted purple for action/selection, and Champagne for small decorative emphasis. Preserve Vazirmatn and limit gradients/glows in the account task area. Champagne should not be small text on a pale surface or the sole indicator of selection/error.

| Semantic role | Light candidate | Dark candidate |
| --- | --- | --- |
| Background | `#F7F3ED` | `#1D1923` |
| Surface | `#FFFCF7` | `#27212F` |
| Raised surface | `#EEE6F0` | `#332B3B` |
| Main text | `#302A38` | `#F5EFF7` |
| Secondary text | `#6F6478` | `#C0B2C8` |
| Action / focus candidate | `#735D86` | `#C5ADD7` |
| Text on action | `#FFFCF7` | `#281F30` |
| Champagne decoration | `#E7D6BA` | `#D8C09B` |

**Calculated, solid-color samples only:** using linearized sRGB relative luminance and `(Llighter + 0.05)/(Ldarker + 0.05)`, light main text/background = **12.55:1**, secondary text/surface = **5.44:1**, action/surface and action-button text = **5.64:1**. Dark main text/surface = **13.81:1**, secondary/surface = **7.77:1**, accent/surface = **7.68:1**, text/action = **7.78:1**. Champagne on the light surface is only **1.39:1**, supporting its decorative-only role. These are local arithmetic checks, not measurements of actual UI or approval of every state. Borders, focus against adjacent backgrounds, hover, disabled, translucent and semantic states still need tokens and validation.

Reuse existing `--brand-bg/surface/raised/ink/muted/line/accent/on-accent` roles where meanings match. Define spacing, typography, corner radius, elevation, motion and control-state tokens alongside colors. A practical pilot can use a small spacing scale (4/8/12/16/24/32), restrained card radius, consistent control heights, and a visible focus treatment. These are starting proposals, not measurements inferred from unavailable reference images.

## 7. Incremental delivery plan

| Phase | Bounded output | Exit evidence before expanding |
| --- | --- | --- |
| 0 — Confirm UX scope | Separate account settings from History; agree first supported sections and pilot palette status | A small route map and capability matrix distinguishing existing, proposed and backend-dependent features. |
| 1 — Flows and wireframes | Desktop/mobile Persian and English account overview/preferences; guest, checking, offline, expired and error states | Walk through entry from a tool, return to History, theme/language changes and logout. Validate terminology with users; current research is a hypothesis, not interview evidence. |
| 2 — Tokens and interaction prototype | Muted Purple + Champagne in both modes; shared fields/buttons/feedback/navigation/dialog behavior | Contrast checks for all actionable states, keyboard walkthrough, RTL/LTR review and narrow-screen reflow. |
| 3 — Read-only pilot | Add `/account` plus functional local preferences, retaining old history links/routes | `/me` loading/error/expiry states work; locale/theme survive navigation; no unsupported controls imply completion. Verify the main app on 5174. |
| 4 — Profile management reuse | Share reference-profile UI between TTS and Account Center | Upload/list/rename/delete parity, consent, pending-state explanations and ownership/error handling; preset TTS generation remains intact. |
| 5 — Gradual adoption | Migrate header/preferences and one page/style cluster at a time | Compare screenshots/interaction states, preserve old URLs and exports, keep rollback through configuration. Remove obsolete rules/files only after dependency review, successful checks and separate authorization where required. |

Defer security/billing/API-key pages until their contracts are understood. Avoid recreating history APIs, media playback or model selectors for the account pilot. Fix F02/F05/F06 while introducing shared primitives so the redesign improves behavior as well as appearance.

## 8. Focused verification backlog — not executed

1. **Core navigation/session:** signed out, valid/expired session and offline `/me`; direct video/detail URLs; login return; guest STT video handoff; invalid route. Distinguish network retry from login requirements.
2. **Language/theme matrix:** Persian/English × light/dark for Account pilot, header, login, history/detail, both selectors and player; verify language persists, document metadata changes, Persian text shapes correctly and mixed filenames/timing remain readable.
3. **Keyboard/accessibility:** all menus, login mode control, bulk-export modal, player settings, profile fields and timeline/form alternative. Check focus placement/return, Escape, no unintended focus escape from modals, visible focus, accessible names and status/error announcements with a screen reader.
4. **Responsive:** 320, 390, 768, 1024 and 1440 CSS-pixel widths; enlarged text/zoom, portrait/landscape and touch. Open last-row export menu, longest labels, player and keyboard together; verify controls remain reachable without content loss. These are proposed test points, not observed device results.
5. **Truthful task flows:** TTS English-only discovery before input; assistant preview disclosure; reference-profile pending state; preview-only video adjustments versus MP4; edits lost/recovered on replacement/navigation/reload.
6. **Regression appropriate to later changes:** retain existing palette and subtitle-segment tests; add meaningful behavior checks for shared locale/session/dialog functionality when implemented. Run TypeScript/lint/build for product changes, plus actual browser export/playback checks. A build alone does not verify UI behavior or media correctness.

For this report, verification was limited to source/configuration inspection, selected documentation retrieval, local palette arithmetic, route/import searches and a final check that no tracked product diff was introduced. All browser, assistive-technology and workflow results above remain outstanding.

## 9. Portable evidence index

- **Routing and access:** `frontend/src/main.tsx:19–44`; `ProtectedRoute.tsx:17–59`; `Login.tsx:20–81`; `Dashboard.tsx:71–155`; `FileDetail.tsx:58–98`.
- **Shared shell/palette:** `StudioHeader.tsx:41–160`; `BrandPalette.tsx:7–15`; `config/brand.ts:1–24,92–108`; `BrandPalette.css:1–59`; `docs/brand/IDENTITY.md`.
- **Controls/accessibility:** `components/StudioSelect.tsx:37–114`; `HistoryControls.tsx:26–119`; `Dashboard.tsx:398–418,664–705`; `TTSStudio.tsx:582–618`; `AudioPlayer.tsx:177–335`.
- **Workflow truthfulness/state:** `MediaStudio.tsx:114–123,438–462`; `TTSStudio.tsx:328–359,465–484,580–705`; `Studio.tsx:59–69`; `VideoEditor.tsx:136–207,336–347,650–684,720–757,796–801`.
- **CSS/reflow:** `MediaStudio.css:1543–1585,1900–1945`; `Login.css:1–18,337–345`; `Dashboard.css:360–370,496–509,711–850,890–1147`; `StudioHeader.css`; `VideoEditor.css:577–665`; `AudioPlayer.css:1–25`; `index.css:1–62`.
- **History and prior verification:** `docs/sprint-1/NEGAR_INITIAL_AUDIT.md`; `DEVELOPMENT.md`; `docs/updates/2026-11-16-negar-dashboard.md`; `docs/updates/2026-11-19-negar-subtitle-studio.md`; selected Notion links in section 2. Historical test counts are not new audit results.

This report recommends a focused Account Center pilot and shared-behavior improvements. It does not authorize implementation, deletion, migration, deployment, commits or pushes.
