# Phase 9: Multi-Artifact UI - Context

**Gathered:** 2026-04-10
**Status:** Ready for planning

<domain>
## Phase Boundary

**In scope:** `useCustomerArtifacts` hook, `CustomerArtifactsPanel` (2x2 grid), `AudioBriefingPlayer` (inline branded), `ReportViewer` (branded markdown + PDF download), artifact chip modals on Decks page (D-DECKS-02), "Generate All Artifacts" trigger with artifact-type checkboxes across all four customer surfaces (customer card, profile modal, InfographicGeneratorModal success state, Decks page).

**Out of scope:** Backend changes (Phase 8 complete), push notification UI (Phase 10), E2E tests (Phase 11), video artifacts (out of scope per PROJECT.md).

</domain>

<decisions>
## Implementation Decisions

### Artifacts Panel Layout
- **D-01:** 2x2 responsive grid for `CustomerArtifactsPanel`. Deck + infographic on top row, audio + report on bottom row. On mobile (< md breakpoint), collapse to single column. Matches ROADMAP SC#2.
- **D-02:** Each artifact card shows status badge + type icon only (FileText for deck, Image for infographic, Headphones for audio, BookOpen for report). No preview thumbnails or action buttons at the card level — tap to open the D-DECKS-02 modal.
- **D-03:** Failed artifact cards show red "Failed" badge plus a small inline "Retry" button that re-triggers just that single artifact type via `POST /api/ai/generate-customer-artifacts` with a single-element `artifacts` array.
- **D-04:** Skipped artifacts (`status: 'skipped'`) are hidden from the grid — only show cards for artifacts in `requestedArtifacts`. If only 1-2 artifacts were requested, the grid collapses to 1x1 or 1x2 naturally.

### Audio Player Design
- **D-05:** Custom branded `AudioBriefingPlayer` component. Navy/Gold/Teal themed. HTML5 `<audio>` element with custom UI overlay (play/pause button, seek bar, time display). Sized for mobile thumb use per ROADMAP SC#3.
- **D-06:** Audio player renders inline inside the audio artifact card in the 2x2 grid. No bottom sheet or modal — controls appear directly when the audio artifact is in `ready` state.
- **D-07:** Share button on the audio player opens the existing `ShareSheet` component with the audio URL. Reuses `src/features/infographic-generator/components/ShareSheet.tsx` pattern.

### Report Viewer
- **D-08:** `ReportViewer` renders markdown using `react-markdown` (already installed) with branded prose styling: Geist typography, Navy (`#1E3A5F`) headings, Teal (`#4A90A4`) links, comfortable line spacing. Scrolls smoothly inside the D-DECKS-02 modal body.
- **D-09:** Report viewer offers ShareSheet button (SMS/Email/Link via existing ShareSheet) plus a "Download PDF" button using `jsPDF` + `html2canvas` (both already in dependencies). Report is inline markdown from `reportMarkdown` DB column (no Supabase URL per Phase 8 D-17).

### Generate-All Trigger UX
- **D-10:** Rep selects artifact types via checkboxes (deck, infographic, audio briefing, written report). All four checked by default. Rep can uncheck any they don't want. Artifact type labels match the user-facing names from the status endpoint.
- **D-11:** "Generate Artifacts" button appears on all four customer surfaces: customer intel card, customer profile modal, InfographicGeneratorModal success state, and Decks page. Per NLMA-11 + D-DECKS-03.
- **D-12:** When artifacts already exist for a customer, show the `CustomerArtifactsPanel` (2x2 grid) with current artifact state. A "Regenerate" button at the bottom allows re-running. Prevents accidental overwrites.

### Phase 8 Carry-Forward Decisions (Locked)
- **D-13:** No per-artifact progress bars. UI renders indeterminate spinner + contextual status message (e.g., "Generating audio briefing...") based on the per-artifact status string. Per Phase 8 D-05.
- **D-14:** UI polls `GET /api/decks/status/[customerId]` and reads `response.artifacts.{deck|infographic|audio|report}` for per-artifact state. Per Phase 8 D-14/D-15.
- **D-15:** Reports have no Supabase URL — read `artifacts.report.markdown` for inline content and `artifacts.report.url` is always `null`. Per Phase 8 D-17.
- **D-16:** Clicking an artifact chip on the Decks page opens a large in-page modal (NOT a new tab). Modal renders type-appropriately: PDF viewer for deck, image viewer (with pinch-to-zoom) for infographic, `AudioBriefingPlayer` for audio, `ReportViewer` for report. Per Phase 8 D-DECKS-02.
- **D-17:** Decks page is a first-class mount surface for artifact display alongside customer profile modal, InfographicGeneratorModal success state, and customer card. Per Phase 8 D-DECKS-03.

### Claude's Discretion
- Loading skeleton design for the 2x2 grid while polling
- Animation patterns (Framer Motion transitions for card state changes)
- Exact checkbox component choice (Radix UI Checkbox or custom)
- PDF viewer implementation approach for deck modal (iframe vs embedded viewer)
- Image viewer pinch-to-zoom implementation (existing Phase 5 INFOG-022 pattern or new)
- `useCustomerArtifacts` hook internals (wraps existing `useDeckStatus` or new hook)
- Mobile breakpoint behavior details (exact breakpoint values, transition animations)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 8 Backend (consumed by this phase)
- `.planning/phases/08-multi-artifact-backend/08-CONTEXT.md` — Phase 8 decisions (D-05, D-14, D-15, D-17, D-DECKS-02, D-DECKS-03)
- `src/app/api/decks/status/[customerId]/route.ts` — Status endpoint response shape with `artifacts` block
- `src/app/api/ai/generate-customer-artifacts/route.ts` — POST route for triggering multi-artifact generation
- `src/lib/services/notebooklm/types.ts` — `ArtifactType` and `ArtifactStatus` union types

### Existing UI Patterns (reuse these)
- `src/features/deck-generator/components/DeckGeneratorModal.tsx` — Modal pattern with Framer Motion spring animations
- `src/features/infographic-generator/components/ShareSheet.tsx` — Bottom-sheet share component (SMS/Email/Link)
- `src/features/infographic-generator/components/InfographicGeneratorModal.tsx` — Mobile bottom-sheet pattern
- `src/lib/hooks/use-deck-generation.ts` — `useDeckStatus` hook with polling and terminal-state detection
- `src/components/customer-intel-card.tsx` — Customer card with action buttons (integration point)
- `src/components/modals/customer-profile-modal.tsx` — Tab-based profile modal (integration point)
- `src/components/ui/card.tsx` — Card primitives (glass-panel)
- `src/components/ui/badge.tsx` — Status badge primitives
- `src/app/globals.css` — CSS variables, theme system, brand colors

### ROADMAP Success Criteria
- `.planning/ROADMAP.md` §"Phase 9: Multi-Artifact UI" — SC#1 through SC#5

</canonical_refs>

<specifics>
## Specific Ideas

- **Artifact type icons:** FileText (deck), Image (infographic), Headphones (audio), BookOpen (report) from lucide-react (already in dependencies).
- **Status badge colors:** pending = muted/gray, processing = Teal with pulse animation, ready = Gold, failed = red (accent-danger). Matches existing badge patterns.
- **Retry single artifact:** POST to `/api/ai/generate-customer-artifacts` with `{ customerId, artifacts: ['audio'] }` (single-element array). Backend already supports partial artifact lists.
- **Audio player seek bar:** Navy track with Gold fill/thumb. Same height as Radix Progress component for consistency.
- **Report PDF export:** Use `jsPDF` + `html2canvas` targeting the `.report-viewer` container. Export as "Customer-Name-Report.pdf". Reuses the pattern from existing deck PDF export.
- **Checkbox defaults:** All four artifact types checked by default. Persist last selection in localStorage per-rep so returning reps keep their preference.

</specifics>

<deferred>
## Deferred Ideas

- Video artifacts — user mentioned during Phase 8, explicitly out of scope in PROJECT.md
- Cross-customer artifact reuse (neighborhood briefing cache) — architecturally interesting, not v1.1
- Artifact comparison view (side-by-side two versions) — future enhancement
- Drag-to-reorder artifact grid — unnecessary for 4 fixed types
- Google Stitch for UI prototyping — user mentioned for audio player; note for future design workflow

</deferred>

---

*Phase: 09-multi-artifact-ui*
*Context gathered: 2026-04-10 via discuss-phase*
