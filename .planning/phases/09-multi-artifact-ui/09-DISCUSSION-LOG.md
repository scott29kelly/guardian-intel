# Phase 9: Multi-Artifact UI - Discussion Log

**Date:** 2026-04-10
**Mode:** Interactive discuss-phase

## Areas Discussed

### 1. Artifacts Panel Layout

**Q: How should the four artifact cards be arranged?**
Options: 2x2 grid (Recommended) | Vertical stack | Tabbed per-artifact
**Selected:** 2x2 grid (Recommended)

**Q: What should each artifact card show at-a-glance?**
Options: Status badge + icon only (Recommended) | Status + thumbnail preview | Status + action button
**Selected:** Status badge + icon only (Recommended)

**Q: How should a failed artifact appear in the grid?**
Options: Red badge + error message on tap | Red badge + inline retry | You decide
**Selected:** Red badge + inline retry

### 2. Audio Player Design

**Q: What style of audio player?**
Options: Custom branded player (Recommended) | Native browser audio | Minimal inline bar
**Selected:** Other — User mentioned Google Stitch (Google Labs experiment) for UI component generation. After research, determined Stitch is a browser-based tool requiring manual use. Proceeded with custom branded player approach.

**Q: Should the audio player live inline or expand to bottom sheet?**
Options: Inline in card (Recommended) | Expand to bottom sheet | Both — mini + expanded
**Selected:** Inline in card (Recommended)

**Q: Should the audio player include a share action?**
Options: Yes — share button on player | No — playback only
**Selected:** Yes — share button on player

### 3. Report Viewer Behavior

**Q: How should the markdown report render inside the D-DECKS-02 modal?**
Options: Branded prose (Recommended) | Minimal plain text | You decide
**Selected:** Branded prose (Recommended)

**Q: What share/download actions should the report viewer offer?**
Options: Share + Copy (Recommended) | Share + PDF download | Share only
**Selected:** Share + PDF download

### 4. Generate-All Trigger UX

**Q: Should reps always generate all 4 artifacts, or pick which ones?**
Options: Always all four (Recommended) | Checkboxes to pick | Smart default + override
**Selected:** Checkboxes to pick

**Q: Where should the 'Generate Artifacts' button appear?**
Options: All four surfaces (Recommended) | Profile modal + Decks page only | You decide
**Selected:** All four surfaces (Recommended)

**Q: When artifacts already exist, what should the button show?**
Options: Show artifacts panel + regenerate option | Always show generate button | You decide
**Selected:** Show artifacts panel + regenerate option

## Prior Decisions Applied

- Phase 8 D-05: No per-artifact progress bars
- Phase 8 D-14/D-15: Poll status endpoint with artifacts block
- Phase 8 D-17: Reports inline in reportMarkdown, no Supabase URL
- Phase 8 D-DECKS-02: Artifact chips open in-page modal, not new tab
- Phase 8 D-DECKS-03: Decks page is first-class mount surface

## Deferred Ideas

- Video artifacts (out of scope per PROJECT.md)
- Google Stitch for UI prototyping (future design workflow)
