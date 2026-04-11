# Phase 9: Multi-Artifact UI - Research

**Researched:** 2026-04-10
**Domain:** React component development, TanStack Query polling, HTML5 Audio API, react-markdown styling, jsPDF export, mobile-first responsive grid
**Confidence:** HIGH

## Summary

Phase 9 is a pure frontend phase building five deliverables: a `useCustomerArtifacts` polling hook, a `CustomerArtifactsPanel` 2x2 grid component, an `AudioBriefingPlayer` with branded controls, a `ReportViewer` with markdown rendering and PDF export, and integration mounts across four existing customer surfaces (customer card, profile modal, InfographicGeneratorModal success state, Decks page).

The backend is already complete. The status endpoint (`GET /api/decks/status/[customerId]`) returns a per-artifact `artifacts` block with `{ deck, infographic, audio, report }` each containing `{ status, url, error, completedAt }` and report includes an additional `markdown` field. The generate endpoint (`POST /api/ai/generate-customer-artifacts`) accepts `{ customerId, artifacts: ArtifactType[] }` and returns 202 with a jobId. All UI work consumes these existing APIs -- no backend changes needed.

All required dependencies are already installed: `react-markdown@10.1.0`, `jspdf@4.0.0`, `html2canvas@1.4.1`, `file-saver@2.0.5`, `framer-motion@11.15`, `lucide-react@0.468`, `@radix-ui/react-progress@1.1.1`. No new npm installs required. The project does NOT have `@tailwindcss/typography` installed, so `prose` classes are no-ops -- all markdown styling must use custom react-markdown component overrides with explicit Tailwind classes matching the brand palette.

**Primary recommendation:** Build components as a new `src/features/multi-artifact/` feature directory (consistent with `deck-generator` and `infographic-generator`), reuse the existing `useDeckStatus` polling pattern for `useCustomerArtifacts`, and apply custom react-markdown components for brand-styled report rendering since `@tailwindcss/typography` is not available.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 2x2 responsive grid for `CustomerArtifactsPanel`. Deck + infographic on top row, audio + report on bottom row. On mobile (< md breakpoint), collapse to single column. Matches ROADMAP SC#2.
- **D-02:** Each artifact card shows status badge + type icon only (FileText for deck, Image for infographic, Headphones for audio, BookOpen for report). No preview thumbnails or action buttons at the card level -- tap to open the D-DECKS-02 modal.
- **D-03:** Failed artifact cards show red "Failed" badge plus a small inline "Retry" button that re-triggers just that single artifact type via `POST /api/ai/generate-customer-artifacts` with a single-element `artifacts` array.
- **D-04:** Skipped artifacts (`status: 'skipped'`) are hidden from the grid -- only show cards for artifacts in `requestedArtifacts`. If only 1-2 artifacts were requested, the grid collapses to 1x1 or 1x2 naturally.
- **D-05:** Custom branded `AudioBriefingPlayer` component. Navy/Gold/Teal themed. HTML5 `<audio>` element with custom UI overlay (play/pause button, seek bar, time display). Sized for mobile thumb use per ROADMAP SC#3.
- **D-06:** Audio player renders inline inside the audio artifact card in the 2x2 grid. No bottom sheet or modal -- controls appear directly when the audio artifact is in `ready` state.
- **D-07:** Share button on the audio player opens the existing `ShareSheet` component with the audio URL. Reuses `src/features/infographic-generator/components/ShareSheet.tsx` pattern.
- **D-08:** `ReportViewer` renders markdown using `react-markdown` (already installed) with branded prose styling: Geist typography, Navy (`#1E3A5F`) headings, Teal (`#4A90A4`) links, comfortable line spacing. Scrolls smoothly inside the D-DECKS-02 modal body.
- **D-09:** Report viewer offers ShareSheet button (SMS/Email/Link via existing ShareSheet) plus a "Download PDF" button using `jsPDF` + `html2canvas` (both already in dependencies). Report is inline markdown from `reportMarkdown` DB column (no Supabase URL per Phase 8 D-17).
- **D-10:** Rep selects artifact types via checkboxes (deck, infographic, audio briefing, written report). All four checked by default. Rep can uncheck any they don't want. Artifact type labels match the user-facing names from the status endpoint.
- **D-11:** "Generate Artifacts" button appears on all four customer surfaces: customer intel card, customer profile modal, InfographicGeneratorModal success state, and Decks page. Per NLMA-11 + D-DECKS-03.
- **D-12:** When artifacts already exist for a customer, show the `CustomerArtifactsPanel` (2x2 grid) with current artifact state. A "Regenerate" button at the bottom allows re-running. Prevents accidental overwrites.
- **D-13:** No per-artifact progress bars. UI renders indeterminate spinner + contextual status message (e.g., "Generating audio briefing...") based on the per-artifact status string. Per Phase 8 D-05.
- **D-14:** UI polls `GET /api/decks/status/[customerId]` and reads `response.artifacts.{deck|infographic|audio|report}` for per-artifact state. Per Phase 8 D-14/D-15.
- **D-15:** Reports have no Supabase URL -- read `artifacts.report.markdown` for inline content and `artifacts.report.url` is always `null`. Per Phase 8 D-17.
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

### Deferred Ideas (OUT OF SCOPE)
- Video artifacts -- user mentioned during Phase 8, explicitly out of scope in PROJECT.md
- Cross-customer artifact reuse (neighborhood briefing cache) -- architecturally interesting, not v1.1
- Artifact comparison view (side-by-side two versions) -- future enhancement
- Drag-to-reorder artifact grid -- unnecessary for 4 fixed types
- Google Stitch for UI prototyping -- user mentioned for audio player; note for future design workflow
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NLMA-07 | `useCustomerArtifacts(customerId)` hook -- polls per-artifact status endpoint, returns unified state with TanStack Query key factory, stops polling when all artifacts terminal | Existing `useDeckStatus` hook pattern verified at `src/lib/hooks/use-deck-generation.ts`. Status endpoint response shape with `artifacts` block verified at `src/app/api/decks/status/[customerId]/route.ts`. Terminal state detection via `refetchInterval` callback pattern already established. |
| NLMA-08 | `CustomerArtifactsPanel` component -- 2x2 responsive grid with four artifact cards, each showing status, tap-to-open action | CSS Grid `grid-cols-2` with `grid-cols-1` on mobile. Existing Card/Badge primitives at `src/components/ui/card.tsx` and `src/components/ui/badge.tsx`. Framer Motion `AnimatePresence` patterns from `DeckGeneratorModal`. |
| NLMA-09 | `AudioBriefingPlayer` component -- branded wrapper around `<audio>` with Navy/Gold/Teal palette, mobile controls, share action | HTML5 Audio API with `useRef` + `useState` for custom controls. `ShareSheet` component reusable from `src/features/infographic-generator/components/ShareSheet.tsx`. |
| NLMA-10 | `ReportViewer` component -- `react-markdown` render with brand typography, mobile scroll, share/download actions | `react-markdown@10.1.0` already installed. Custom component overrides pattern verified in `chat-panel.tsx` and `DeckPreview.tsx`. `jsPDF@4.0.0` + `html2canvas@1.4.1` for PDF export. No `@tailwindcss/typography` -- must use explicit styling. |
| NLMA-11 | Mount `CustomerArtifactsPanel` in customer profile modal, InfographicGeneratorModal success state, customer card, and Decks page | Integration points verified: `customer-intel-card.tsx` (action buttons area lines 453-472), `customer-profile-modal.tsx` (infographics tab line 138), `InfographicGeneratorModal.tsx` (result state line 272), `decks/page.tsx` (DeckCard component line 67). |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack**: Next.js 15, React 19, TypeScript, Prisma, Tailwind, Radix UI, Framer Motion
- **Branding**: Navy (`#1E3A5F`), Gold (`#D4A656`), Teal (`#4A90A4`) palette
- **Import alias**: Always `@/` -- never `../`
- **Named exports only** (no default exports except Next.js pages/layouts)
- **"use client"** directive required on all components with state/handlers
- **Hooks barrel export**: Must add new hook to `src/lib/hooks/index.ts`
- **JSDoc block** at top of every file
- **Double quotes**, 2-space indent, trailing commas
- **React Query key factories**: camelCase objects with methods
- **cva + cn()** for component variants
- **No Prettier** -- formatting relies on developer discipline
- **Error handling**: Surface errors via React Query `error` state in hooks

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-markdown | 10.1.0 | Markdown rendering for ReportViewer | Already in deps, used in chat-panel.tsx and DeckPreview.tsx [VERIFIED: package.json] |
| jspdf | 4.0.0 | PDF generation for report download | Already in deps, used for deck PDF export [VERIFIED: package.json] |
| html2canvas | 1.4.1 | DOM-to-canvas for PDF capture | Already in deps, pairs with jsPDF [VERIFIED: package.json] |
| file-saver | 2.0.5 | Browser file downloads | Already in deps, used for deck ZIP/PDF export [VERIFIED: package.json] |
| framer-motion | 11.15 | Animations (card transitions, modal springs) | Already in deps, project standard [VERIFIED: package.json] |
| lucide-react | 0.468 | Icons (FileText, Image, Headphones, BookOpen, Play, Pause, etc.) | Already in deps, project standard [VERIFIED: package.json] |
| @radix-ui/react-progress | 1.1.1 | Progress bar primitive (seek bar base) | Already in deps, wrapping component at `src/components/ui/progress.tsx` [VERIFIED: package.json] |
| @tanstack/react-query | 5.62 | Server state management, polling | Already in deps, project standard [VERIFIED: package.json] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom HTML5 audio player | react-player / react-h5-audio-player | Custom is correct here: branded Navy/Gold/Teal controls require full UI ownership. Third-party players add bloat and styling friction for a simple play/pause/seek interface. |
| Custom checkboxes | @radix-ui/react-checkbox | Radix Checkbox is NOT installed. Existing codebase uses native HTML `<input type="checkbox">` with custom styling (see `TopicPicker.tsx`). No need to add a new dependency for 4 checkboxes. |
| @tailwindcss/typography (prose) | Custom react-markdown components | Typography plugin is NOT installed and NOT in Tailwind config. Adding it is unnecessary -- custom component overrides give full control over brand styling. Matches chat-panel.tsx pattern. |
| iframe PDF viewer | Object/embed tag | For deck PDF viewing in modal: `<iframe src={pdfUrl}>` is the simplest cross-browser approach. `<object>` has inconsistent mobile support. Both are adequate for this use case. |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/features/multi-artifact/
  components/
    CustomerArtifactsPanel.tsx     # 2x2 grid with artifact cards
    ArtifactCard.tsx               # Individual artifact card (status + icon + tap)
    ArtifactViewerModal.tsx        # D-DECKS-02 large modal with type-appropriate content
    AudioBriefingPlayer.tsx        # Branded HTML5 audio player
    ReportViewer.tsx               # Markdown viewer with brand styling
    GenerateArtifactsButton.tsx    # Checkbox selector + generate trigger
    index.ts                       # Barrel exports
  hooks/
    useCustomerArtifacts.ts        # Polling hook wrapping status endpoint
  types/
    artifact-ui.types.ts           # UI-specific types (reuse ArtifactType/ArtifactStatus from notebooklm/types.ts)
  index.ts                         # Feature barrel export

src/lib/hooks/
  use-customer-artifacts.ts        # OR place hook here per project convention
```

**Recommendation (Claude's discretion):** Place the hook at `src/lib/hooks/use-customer-artifacts.ts` and add it to the barrel export at `src/lib/hooks/index.ts`. This matches the existing pattern where `use-deck-generation.ts` lives in `src/lib/hooks/` rather than inside a feature directory. Components live in `src/features/multi-artifact/components/` following the `deck-generator` and `infographic-generator` feature directory pattern. [VERIFIED: codebase grep of hooks and features directories]

### Pattern 1: TanStack Query Polling with Terminal-State Detection

**What:** `useCustomerArtifacts` hook polls the status endpoint and auto-stops when all requested artifacts reach a terminal state (`ready`, `failed`, or `skipped`).

**When to use:** For the `CustomerArtifactsPanel` to show live status updates during generation.

**Example:**
```typescript
// Source: Adapted from src/lib/hooks/use-deck-generation.ts (verified pattern)
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ArtifactType, ArtifactStatus } from "@/lib/services/notebooklm/types";

interface ArtifactState {
  status: ArtifactStatus | null;
  url: string | null;
  error: string | null;
  completedAt: string | null;
  markdown?: string | null; // report only
}

interface ArtifactsResponse {
  hasDeck: boolean;
  artifacts: {
    deck: ArtifactState;
    infographic: ArtifactState;
    audio: ArtifactState;
    report: ArtifactState & { markdown: string | null };
  };
  // Legacy fields preserved
  isPending: boolean;
  isProcessing: boolean;
  isCompleted: boolean;
  isFailed: boolean;
}

const TERMINAL_STATES: ArtifactStatus[] = ["ready", "failed", "skipped"];

const artifactKeys = {
  all: ["artifacts"] as const,
  customer: (customerId: string) => ["artifacts", "customer", customerId] as const,
};

function isAllTerminal(artifacts: ArtifactsResponse["artifacts"]): boolean {
  return Object.values(artifacts).every(
    (a) => a.status === null || TERMINAL_STATES.includes(a.status as ArtifactStatus)
  );
}

export function useCustomerArtifacts(customerId: string | undefined) {
  const queryClient = useQueryClient();

  const statusQuery = useQuery({
    queryKey: artifactKeys.customer(customerId!),
    queryFn: async (): Promise<ArtifactsResponse> => {
      const response = await fetch(`/api/decks/status/${customerId}`);
      if (!response.ok) throw new Error("Failed to fetch artifact status");
      return response.json();
    },
    enabled: !!customerId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data?.hasDeck) return false;
      if (data.artifacts && isAllTerminal(data.artifacts)) return false;
      return 3000; // Poll every 3s during generation
    },
    staleTime: 2000,
  });

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: async (payload: { customerId: string; artifacts: ArtifactType[] }) => {
      const response = await fetch("/api/ai/generate-customer-artifacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate artifacts");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactKeys.customer(customerId!) });
    },
  });

  return {
    artifacts: statusQuery.data?.artifacts ?? null,
    hasDeck: statusQuery.data?.hasDeck ?? false,
    isLoading: statusQuery.isLoading,
    isError: statusQuery.isError,
    error: statusQuery.error,
    refetch: statusQuery.refetch,

    // Convenience
    isAllTerminal: statusQuery.data?.artifacts
      ? isAllTerminal(statusQuery.data.artifacts)
      : false,

    // Actions
    generate: generateMutation.mutateAsync,
    isGenerating: generateMutation.isPending,
    generateError: generateMutation.error,
  };
}
```

### Pattern 2: Custom HTML5 Audio Player with Brand Styling

**What:** A custom audio player wrapping the native `<audio>` element with branded Navy/Gold/Teal controls.

**When to use:** For the `AudioBriefingPlayer` component inside the artifacts panel.

**Example:**
```typescript
// Source: HTML5 Audio API [CITED: developer.mozilla.org/en-US/docs/Web/API/HTMLAudioElement]
// Brand colors from CLAUDE.md: Navy #1E3A5F, Gold #D4A656, Teal #4A90A4

const audioRef = useRef<HTMLAudioElement>(null);
const [isPlaying, setIsPlaying] = useState(false);
const [currentTime, setCurrentTime] = useState(0);
const [duration, setDuration] = useState(0);

// Key event handlers on the <audio> element:
// onLoadedMetadata -> setDuration(audioRef.current.duration)
// onTimeUpdate    -> setCurrentTime(audioRef.current.currentTime)
// onEnded         -> setIsPlaying(false)

// Seek bar: use an <input type="range"> or the Radix Progress component
// with an onClick handler that calculates seek position from click coordinates.
// Progress component is at src/components/ui/progress.tsx wrapping @radix-ui/react-progress.

// CRITICAL: Hidden <audio> element with NO native controls attribute
// <audio ref={audioRef} src={audioUrl} preload="metadata" />
// All UI is custom JSX on top
```

### Pattern 3: react-markdown with Custom Brand Components

**What:** `react-markdown` component override pattern for branded report rendering without `@tailwindcss/typography`.

**When to use:** For the `ReportViewer` component.

**Example:**
```typescript
// Source: Adapted from src/components/ai/chat-panel.tsx lines 1000-1012 (verified)
// and src/features/deck-generator/components/DeckPreview.tsx line 233

import ReactMarkdown from "react-markdown";

// Brand colors: Navy #1E3A5F, Gold #D4A656, Teal #4A90A4
const BRAND_COMPONENTS = {
  h1: ({ children }: any) => (
    <h1 className="text-2xl font-display font-bold mt-6 mb-3" style={{ color: "#1E3A5F" }}>
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-xl font-display font-semibold mt-5 mb-2" style={{ color: "#1E3A5F" }}>
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-lg font-display font-medium mt-4 mb-1.5" style={{ color: "#1E3A5F" }}>
      {children}
    </h3>
  ),
  p: ({ children }: any) => (
    <p className="my-3 text-text-primary leading-relaxed font-sans">{children}</p>
  ),
  a: ({ href, children }: any) => (
    <a href={href} className="underline" style={{ color: "#4A90A4" }} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  ul: ({ children }: any) => <ul className="my-2 ml-6 list-disc space-y-1">{children}</ul>,
  ol: ({ children }: any) => <ol className="my-2 ml-6 list-decimal space-y-1">{children}</ol>,
  li: ({ children }: any) => <li className="text-text-primary leading-relaxed">{children}</li>,
  strong: ({ children }: any) => (
    <strong className="font-semibold" style={{ color: "#D4A656" }}>{children}</strong>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 pl-4 my-4 italic text-text-secondary" style={{ borderColor: "#4A90A4" }}>
      {children}
    </blockquote>
  ),
  code: ({ children }: any) => (
    <code className="px-1.5 py-0.5 bg-surface-secondary rounded text-sm font-mono">{children}</code>
  ),
};

// Usage:
// <ReactMarkdown components={BRAND_COMPONENTS}>{markdownContent}</ReactMarkdown>
```

### Pattern 4: Report PDF Export via jsPDF + html2canvas

**What:** Capture the rendered markdown container as a PDF using `html2canvas` for DOM-to-canvas conversion and `jsPDF` for PDF assembly.

**When to use:** For the "Download PDF" button in `ReportViewer`.

**Example:**
```typescript
// Source: Existing pattern in DeckGeneratorModal.tsx lines 240-303 (verified)
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

async function exportReportAsPdf(containerRef: HTMLDivElement, customerName: string) {
  const canvas = await html2canvas(containerRef, {
    scale: 2, // 2x resolution for crisp text
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff", // Force white background for PDF
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 20; // 10mm margins
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Handle multi-page if content is taller than one page
  let yOffset = 10;
  let remainingHeight = imgHeight;

  while (remainingHeight > 0) {
    if (yOffset > 10) pdf.addPage();
    pdf.addImage(imgData, "PNG", 10, yOffset - (imgHeight - remainingHeight), imgWidth, imgHeight);
    remainingHeight -= (pageHeight - 20);
    yOffset = 10;
  }

  const { saveAs } = await import("file-saver");
  const blob = pdf.output("blob");
  saveAs(blob, `${customerName.replace(/\s+/g, "-")}-Report.pdf`);
}
```

### Pattern 5: Artifact Viewer Modal (D-DECKS-02)

**What:** A large in-page modal that renders artifact content type-appropriately when a user taps an artifact card or chip.

**When to use:** From both `CustomerArtifactsPanel` (tapping a card) and the Decks page (tapping a chip).

**Example approach:**
```typescript
// Type-appropriate rendering inside the modal body:
switch (artifactType) {
  case "deck":
    // iframe pointing to pdfUrl (Supabase public URL)
    return <iframe src={pdfUrl} className="w-full h-full rounded-lg" />;
  case "infographic":
    // Reuse InfographicPreview pinch-to-zoom pattern from INFOG-022
    // OR reuse SlideLightbox from deck-generator
    return <InfographicPreview imageUrl={url} />;
  case "audio":
    return <AudioBriefingPlayer audioUrl={url} customerName={name} />;
  case "report":
    return <ReportViewer markdown={markdown} customerName={name} />;
}
```

### Anti-Patterns to Avoid

- **Opening artifacts in new tabs:** D-DECKS-02 explicitly requires in-page modals. Never use `window.open()` or `target="_blank"` for artifact viewing from the Decks page or artifacts panel.
- **Per-artifact progress bars:** D-13 (Phase 8 D-05) prohibits them. Use indeterminate spinners with contextual status messages.
- **Uploading reports to Supabase:** D-15 (Phase 8 D-17) says reports stay inline in `reportMarkdown`. Never construct a Supabase URL for reports.
- **Using `prose` classes without the plugin:** `@tailwindcss/typography` is not installed. The `prose prose-invert prose-sm` classes in DeckPreview.tsx are effectively no-ops. Always use explicit custom components with react-markdown.
- **Default exports:** Project convention requires named exports on all non-page files.
- **Barrel-exporting UI components:** Per CLAUDE.md conventions, UI components are NOT barrel-exported -- import directly from file. Only hooks use barrel exports.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio playback controls | Custom audio decoder/streaming | HTML5 `<audio>` element with custom UI overlay | Native `<audio>` handles codec detection, buffering, mobile power management. Only the UI needs to be custom. |
| Markdown parsing | Custom markdown-to-JSX parser | `react-markdown@10.1.0` (already installed) | react-markdown handles the full CommonMark spec. Custom component overrides handle brand styling. |
| PDF generation | Canvas-based custom PDF builder | `jsPDF@4.0.0` + `html2canvas@1.4.1` (already installed) | Proven pairing used elsewhere in the codebase (deck export). Handles font embedding, page breaks. |
| Pinch-to-zoom | Custom gesture library | Reuse `InfographicPreview.tsx` touch handler pattern | The raw touch event pattern with distance calculation is already proven at `src/features/infographic-generator/components/InfographicPreview.tsx` lines 48-87. Zero new dependencies. |
| Bottom-sheet share UI | Custom share modal | Reuse `ShareSheet.tsx` from infographic-generator | Already handles SMS, email, link copy, native Web Share API. Pass the artifact URL as `imageUrl`/`imageData`. |
| Status polling | Custom setInterval | TanStack Query `refetchInterval` callback | The callback pattern with conditional polling is the established project pattern (see `useDeckStatus`, `useDecks`). |

**Key insight:** Every complex UI problem in this phase has an existing codebase solution or installed library. The work is composition and styling, not invention.

## Common Pitfalls

### Pitfall 1: Polling Loop Never Stops
**What goes wrong:** `useCustomerArtifacts` keeps polling after all artifacts are terminal, wasting bandwidth and battery on mobile.
**Why it happens:** The `refetchInterval` callback doesn't correctly detect terminal state, or the `artifacts` block is `null`/`undefined` on the first response before generation starts.
**How to avoid:** Check that `artifacts` exists AND is non-null before checking terminal states. When `hasDeck` is `false`, return `false` from `refetchInterval` immediately. Terminal states are `ready`, `failed`, and `skipped`. A `null` status means the artifact field doesn't exist on this row (legacy deck-only job).
**Warning signs:** Network tab shows repeated requests to the status endpoint after generation completes.

### Pitfall 2: Audio Player Mobile Autoplay Restrictions
**What goes wrong:** Calling `audioRef.current.play()` throws a DOMException on mobile browsers because autoplay is blocked without user gesture.
**Why it happens:** iOS Safari and Android Chrome require a user interaction (tap) to initiate audio playback. Programmatic `play()` from a `useEffect` or state change callback is blocked.
**How to avoid:** Only call `play()` inside a direct click/tap handler (`onClick`). Never autoplay. The play button's `onClick` should be the sole entry point for `audioRef.current.play()`.
**Warning signs:** Console shows "play() failed because the user didn't interact with the document first" on mobile.

### Pitfall 3: html2canvas Missing Styles in PDF Export
**What goes wrong:** The exported PDF has missing fonts, wrong colors, or broken layout because `html2canvas` can't capture all CSS styles.
**Why it happens:** `html2canvas` re-renders DOM into canvas and doesn't support all CSS features (e.g., CSS variables, custom fonts, backdrop-filter). Tailwind's CSS variable-based colors (`hsl(var(--text-primary))`) may not render.
**How to avoid:** For the report PDF export container, use a separate "print-ready" wrapper with hardcoded inline styles (not CSS variables) and a white background. Set `backgroundColor: "#ffffff"` in `html2canvas` options. Use `scale: 2` for crisp text. Test with the actual brand colors.
**Warning signs:** PDF has black text on black background, or all text appears as the same color.

### Pitfall 4: ShareSheet Props Mismatch for Audio/Report
**What goes wrong:** `ShareSheet` expects `imageData: string` (base64) as a required prop, but audio/report sharing passes a URL string instead.
**Why it happens:** `ShareSheet` was designed for infographic PNG sharing. Audio sharing needs a URL, report sharing needs either a URL or text content.
**How to avoid:** Either (a) make `imageData` optional in `ShareSheet` and use `imageUrl` for non-image artifacts, or (b) create a wrapper that adapts the share payload. The existing `ShareSheet` already accepts optional `imageUrl` and uses it for SMS/email body links -- pass an empty string for `imageData` and the artifact URL as `imageUrl`.
**Warning signs:** TypeScript errors on `ShareSheet` instantiation, or share actions send empty content.

### Pitfall 5: Stale Query Data After Generate Mutation
**What goes wrong:** After the rep triggers "Generate Artifacts", the artifacts panel still shows the old state because the query cache hasn't been invalidated.
**Why it happens:** The `useMutation`'s `onSuccess` doesn't invalidate the right query key, or the invalidation happens before the backend has updated the row.
**How to avoid:** In `onSuccess`, invalidate `artifactKeys.customer(customerId)`. The `refetchInterval` callback will then kick in on the next poll cycle and start showing `pending` states. Add a small optimistic update or loading state between mutation fire and first poll response.
**Warning signs:** Clicking "Generate" shows no change in the UI until the user manually refreshes.

### Pitfall 6: CSS Grid Single-Column Collapse with Dynamic Card Count
**What goes wrong:** When only 1-2 artifacts are requested (D-04), the grid doesn't collapse gracefully -- it shows gaps or misaligned cards.
**Why it happens:** A fixed `grid-cols-2` with 1 or 3 visible cards creates empty cells.
**How to avoid:** Filter out `skipped` artifacts before rendering. If 1 card, use `grid-cols-1`. If 2-4, use `grid-cols-2 md:grid-cols-2`. The grid naturally handles 2 and 4. For 3 cards, the last card spans full width or the grid just leaves one cell empty (acceptable). Use `grid-cols-1 md:grid-cols-2` as the base and let CSS Grid auto-fill.
**Warning signs:** Visual inspection shows unbalanced card layout when fewer than 4 artifacts are requested.

## Code Examples

### Verified: Status Endpoint Response Shape (Phase 8)
```typescript
// Source: src/app/api/decks/status/[customerId]/route.ts lines 158-202 [VERIFIED: codebase]
// The response includes both legacy top-level fields AND the new artifacts block:
{
  hasDeck: true,
  deck: { /* full ScheduledDeck row with all fields */ },
  artifacts: {
    deck: { status: "ready", url: "https://...", error: null, completedAt: "..." },
    infographic: { status: "processing", url: null, error: null, completedAt: null },
    audio: { status: "pending", url: null, error: null, completedAt: null },
    report: { status: "skipped", url: null, error: null, completedAt: null, markdown: null },
  },
  // Legacy convenience flags (still present, unchanged)
  isPending: false,
  isProcessing: true,
  isCompleted: false,
  isFailed: false,
  isReady: false,
  pdfUrl: "https://...",
}
```

### Verified: Generate Endpoint Request/Response
```typescript
// Source: src/app/api/ai/generate-customer-artifacts/route.ts [VERIFIED: codebase]
// POST /api/ai/generate-customer-artifacts
// Request:
{ customerId: "abc123", artifacts: ["deck", "infographic", "audio", "report"] }
// Response (202):
{ success: true, jobId: "xyz789", status: "processing", customerId: "abc123", requestedArtifacts: ["deck", "infographic", "audio", "report"] }
```

### Verified: Existing Polling Pattern in useDeckStatus
```typescript
// Source: src/lib/hooks/use-deck-generation.ts lines 81-112 [VERIFIED: codebase]
// The refetchInterval callback pattern:
refetchInterval: options?.refetchInterval ?? ((query) => {
  const data = query.state.data;
  if (data?.isPending || data?.isProcessing) {
    return 10000; // Poll every 10s while in progress
  }
  return false; // Don't poll when done
}),
```

### Verified: ShareSheet Interface
```typescript
// Source: src/features/infographic-generator/components/ShareSheet.tsx lines 18-22 [VERIFIED: codebase]
interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  imageData: string;      // Base64 or empty string
  imageUrl?: string;       // URL for share link
  customerName?: string;   // Used in subject line
}
```

### Verified: Existing Checkbox Pattern (TopicPicker)
```typescript
// Source: src/features/infographic-generator/components/TopicPicker.tsx [VERIFIED: codebase]
// Uses custom styled div with absolute-positioned indicator, NOT Radix UI Checkbox:
{/* Checkbox indicator */}
<div
  className={`absolute top-2 right-2 w-4 h-4 rounded flex items-center justify-center text-[10px] transition-colors ${
    isSelected
      ? "bg-accent-primary text-white"
      : "bg-surface-secondary border border-border"
  }`}
>
  {isSelected && <Check className="w-3 h-3" />}
</div>
```

### Verified: Brand Color Application (CSS Variables vs Hardcoded)
```typescript
// Source: src/app/globals.css [VERIFIED: codebase]
// The project uses CSS variable-based colors (hsl notation):
// --accent-primary: 24 80% 50% (light) / 24 75% 55% (dark)
// --accent-secondary: 175 70% 35% (light) / 175 55% 45% (dark)
//
// BUT the brand palette (Navy #1E3A5F, Gold #D4A656, Teal #4A90A4) is NOT mapped to CSS variables.
// These are hardcoded hex values from PROJECT.md constraints.
//
// For the audio player and report viewer brand styling, use inline style props
// with the hex values directly, since they don't map to existing CSS variables:
// Navy: style={{ color: "#1E3A5F" }}
// Gold: style={{ color: "#D4A656" }}
// Teal: style={{ color: "#4A90A4" }}
```

### Verified: Modal Pattern (DeckGeneratorModal)
```typescript
// Source: src/features/deck-generator/components/DeckGeneratorModal.tsx lines 328-342 [VERIFIED: codebase]
// Spring animation modal with backdrop:
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
  className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6"
  onClick={handleClose}
>
  <motion.div
    initial={{ scale: 0.95, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    exit={{ scale: 0.95, opacity: 0 }}
    transition={{ type: "spring", damping: 25, stiffness: 300 }}
    className="relative w-full max-w-4xl max-h-[calc(100vh-2rem)] bg-surface-primary rounded-xl shadow-2xl border border-border flex flex-col overflow-hidden"
    onClick={e => e.stopPropagation()}
  >
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `prose` classes with @tailwindcss/typography | Custom react-markdown component overrides | Always (plugin never installed in this project) | Must use explicit component overrides -- prose classes are no-ops |
| Single-deck status polling | Per-artifact status in `artifacts` block | Phase 8 (2026-04-10) | `useCustomerArtifacts` reads `artifacts.{type}.status` not top-level `status` |
| `window.open()` for artifact viewing | In-page modal viewer | Phase 9 D-DECKS-02 decision | Decks page artifact chips must open modals, not new tabs |
| Deck-only generation trigger | Multi-artifact generation with checkbox selection | Phase 9 D-10 decision | All four customer surfaces get "Generate Artifacts" with type selection |

## Assumptions Log

> List all claims tagged `[ASSUMED]` in this research.

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | html2canvas `scale: 2` produces adequate PDF quality for report text | Code Examples (PDF Export) | Low -- can adjust scale parameter. Existing deck export uses this approach successfully. |
| A2 | Audio seek bar can be built with click-position calculation on a div overlaying Radix Progress | Architecture Patterns (Audio Player) | Low -- fallback is `<input type="range">` styled with brand colors. |
| A3 | `iframe` is adequate for in-modal PDF viewing on mobile | Alternatives Considered | Medium -- iOS Safari may not render iframes with PDF content reliably. Fallback: link to open PDF URL directly. Should test on iOS. |

**If this table is empty:** N/A -- three assumptions noted above.

## Open Questions

1. **iOS Safari iframe PDF rendering**
   - What we know: Desktop browsers render PDFs in iframes natively. Android Chrome generally works.
   - What's unclear: iOS Safari may download the PDF instead of rendering inline, or show a blank iframe.
   - Recommendation: Implement iframe as primary, add a fallback "Open PDF" link button visible on iOS. Can detect iOS via `navigator.userAgent` check.

2. **Audio file format compatibility**
   - What we know: Phase 8 stores audio as `.mp3` in Supabase with `audio/mpeg` content-type.
   - What's unclear: Whether NotebookLM's audio output is always MP3 or could be WAV/OGG.
   - Recommendation: The `<audio>` element handles format detection automatically. Set `type="audio/mpeg"` on a `<source>` child but also let the browser try without type hint as fallback.

3. **Checkbox preference persistence in localStorage**
   - What we know: D-10 says persist last checkbox selection per-rep in localStorage.
   - What's unclear: The localStorage key naming convention in this project.
   - Recommendation: Use `guardian-intel:artifact-prefs:{userId}` key pattern. The project already uses localStorage for various UI preferences.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.0 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NLMA-07 | `useCustomerArtifacts` state transitions and polling stop | unit | `npx vitest run src/lib/hooks/__tests__/use-customer-artifacts.test.ts -x` | No -- Wave 0 |
| NLMA-08 | `CustomerArtifactsPanel` renders cards per status, hides skipped | unit | `npx vitest run src/features/multi-artifact/components/__tests__/CustomerArtifactsPanel.test.tsx -x` | No -- Wave 0 |
| NLMA-09 | `AudioBriefingPlayer` renders controls, handles play/pause | unit | `npx vitest run src/features/multi-artifact/components/__tests__/AudioBriefingPlayer.test.tsx -x` | No -- Wave 0 |
| NLMA-10 | `ReportViewer` renders markdown with brand styling | unit | `npx vitest run src/features/multi-artifact/components/__tests__/ReportViewer.test.tsx -x` | No -- Wave 0 |
| NLMA-11 | Integration mounts exist on 4 surfaces | manual-only | Visual inspection in dev server | N/A -- integration wiring, not unit-testable in isolation |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/hooks/__tests__/use-customer-artifacts.test.ts` -- covers NLMA-07 (hook state machine)
- [ ] `src/features/multi-artifact/components/__tests__/CustomerArtifactsPanel.test.tsx` -- covers NLMA-08
- [ ] `src/features/multi-artifact/components/__tests__/AudioBriefingPlayer.test.tsx` -- covers NLMA-09
- [ ] `src/features/multi-artifact/components/__tests__/ReportViewer.test.tsx` -- covers NLMA-10
- [ ] Test setup: mock `fetch` for status/generate endpoints, mock `HTMLAudioElement` for audio tests

**Note:** Phase 11 (NLMA-16, NLMA-17) is the dedicated testing phase. Wave 0 gaps here are minimal scaffolding if needed, but comprehensive tests are Phase 11's scope.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A -- all API calls go through existing NextAuth session |
| V3 Session Management | no | N/A -- existing JWT session management unchanged |
| V4 Access Control | yes (existing) | `assertCustomerAccess` already wraps both status and generate endpoints (Phase 7 D-04). No new API surface. |
| V5 Input Validation | yes (minimal) | Checkbox selection validated client-side (array of `ArtifactType` values). Backend already validates in `generate-customer-artifacts/route.ts`. |
| V6 Cryptography | no | N/A -- no new crypto operations |

### Known Threat Patterns for React UI

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via react-markdown rendering | Tampering | react-markdown@10 escapes HTML by default (no `rehype-raw` plugin). Safe for untrusted markdown. |
| SSRF via audio/image URLs | Spoofing | URLs come from Supabase storage (backend-controlled). No user-provided URLs rendered in `<audio>` or `<img>`. |
| localStorage key collision | Information Disclosure | Namespace keys with `guardian-intel:` prefix. No secrets stored in localStorage. |

## Sources

### Primary (HIGH confidence)
- `src/app/api/decks/status/[customerId]/route.ts` -- Per-artifact status response shape with `artifacts` block (verified Phase 8 implementation)
- `src/app/api/ai/generate-customer-artifacts/route.ts` -- Generate endpoint request/response shape (verified Phase 8 implementation)
- `src/lib/hooks/use-deck-generation.ts` -- `useDeckStatus` polling pattern with `refetchInterval` callback
- `src/features/infographic-generator/components/ShareSheet.tsx` -- ShareSheet interface and props
- `src/features/infographic-generator/components/InfographicPreview.tsx` -- Pinch-to-zoom touch handler pattern
- `src/features/deck-generator/components/SlideLightbox.tsx` -- Lightbox modal pattern
- `src/features/deck-generator/components/DeckGeneratorModal.tsx` -- Modal spring animation pattern, PDF download pattern
- `src/components/ai/chat-panel.tsx` -- react-markdown custom component override pattern
- `src/components/modals/customer-profile-modal.tsx` -- Tab structure and infographics tab integration point
- `src/components/customer-intel-card.tsx` -- Action buttons area, modal mounting pattern
- `src/app/(dashboard)/decks/page.tsx` -- DeckCard component, artifact chip rendering
- `src/lib/services/notebooklm/types.ts` -- `ArtifactType` and `ArtifactStatus` union types
- `src/components/ui/badge.tsx` -- Badge variant system (cva)
- `src/components/ui/progress.tsx` -- Radix Progress wrapper component
- `src/app/globals.css` -- CSS variable theme system (no brand hex colors in CSS vars)
- `package.json` -- Verified all dependencies already installed
- `tailwind.config.ts` -- Confirmed @tailwindcss/typography NOT in plugins

### Secondary (MEDIUM confidence)
- [CITED: developer.mozilla.org/en-US/docs/Web/API/HTMLAudioElement] -- HTML5 Audio API events and methods
- [VERIFIED: npm registry] -- react-markdown@10.1.0, jspdf@4.0.0, html2canvas@1.4.1, file-saver@2.0.5 versions confirmed current

### Tertiary (LOW confidence)
- iOS Safari iframe PDF rendering behavior [ASSUMED] -- needs device testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries verified as already installed in package.json, versions confirmed against npm registry
- Architecture: HIGH -- all patterns directly adapted from verified existing codebase patterns (useDeckStatus, ShareSheet, DeckGeneratorModal, InfographicPreview, chat-panel markdown)
- Pitfalls: HIGH -- derived from verified codebase analysis (missing typography plugin, ShareSheet props, polling patterns) and well-documented browser APIs (audio autoplay restrictions)

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (stable -- all dependencies already pinned in package.json)
