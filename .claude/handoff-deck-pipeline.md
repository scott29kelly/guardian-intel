# Continuation: NotebookLM Deck Pipeline — Quality + Preview Fix

## What Was Fixed (prior session)

1. **Modal remounting** — Parent component (`src/components/customer-intel-card.tsx:550`) was conditionally rendering `{showDeckGenerator && <DeckGeneratorModal/>}`, causing full unmount/remount on every parent re-render. Fixed: always render the modal, control via `isOpen` prop.

2. **CLI timeout** — `GENERATE_TIMEOUT_MS` in `src/lib/services/notebooklm/cli-bridge.ts` was 300s but NotebookLM generation takes 4-6 min. Increased to 600s. Also fixed timeout rejection to throw proper Error (was plain object → "Unknown error" in DB).

3. **Polling wrong deck** — `useDeckStatus` in `src/lib/hooks/use-deck-generation.ts` now accepts `deckId` param. Status endpoint (`src/app/api/decks/status/[customerId]/route.ts`) accepts `?deckId=xxx` query param.

4. **Gemini/NB Pro fallback removed** — Entire `generateDeckViaGemini` function and `mapAIContent` deleted from `src/features/deck-generator/hooks/useDeckGeneration.ts`. NotebookLM-only now.

5. **PDF fallback** — When `pdfToImages()` fails, `setDeckFromResult` creates a fallback slide with `pdfData`. `DeckPreview.tsx` tries to render it via `<object data="data:application/pdf;base64,...">`.

## What's Still Broken (two issues)

### Issue A: Preview should show individual slides, not a PDF embed

**Screenshot evidence:** The modal shows "NotebookLM Deck (PDF)" with a small embedded PDF viewer. The PDF DOES render (it's not blank), but the user wants to see individual slides in the modal's native slide viewer — not an embedded PDF. The current experience feels like a downgrade from the normal slide-by-slide preview.

**Current code:** `src/features/deck-generator/components/DeckPreview.tsx` around line 134-165 — shows a `<object>` PDF embed when the deck has `pdfData` but no slide images. This works but is a poor UX.

**Root cause:** `pdfToImages()` in `src/lib/services/notebooklm/formatters.ts` is failing server-side for NotebookLM-generated PDFs (works fine with simple test PDFs). When it fails, the pipeline stores the raw PDF as base64 (`pdfData`) but creates 0 slide images. The preview falls back to the PDF embed.

**Two-pronged fix:**

**Prong 1: Fix server-side pdfToImages (preferred path)**
- Run `notebooklm list` to find an existing notebook, then `notebooklm download slide-deck /tmp/test-nlm.pdf` to get an actual NotebookLM PDF
- Test `pdfToImages` directly against it to see the actual error
- The function already retries at scale=1 if scale=2 fails (added in prior session)
- If pdf-to-img can't handle NotebookLM PDFs, try alternative: `--format pptx` download + pptx-to-images, or use `pdfjs-dist` server-side

**Prong 2: Client-side PDF-to-images fallback (if server-side can't be fixed)**
```
1. Install pdfjs-dist
2. In DeckPreview, when a slide has content.pdfData:
   a. Decode base64 → Uint8Array
   b. Load with pdfjs: pdfjsLib.getDocument({ data })
   c. For each page, render to canvas at 2x scale
   d. Convert canvas to PNG data URL
   e. Replace the single pdfData placeholder with N rendered slide images
3. Show individual pages in the existing slide list (same as normal slides)
4. Keep "Download PDF" button as well
```

**Key files:**
- `src/features/deck-generator/components/DeckPreview.tsx` — PDF fallback rendering (lines ~134-165)
- `src/lib/services/notebooklm/formatters.ts` — `pdfToImages()` function
- `src/features/deck-generator/hooks/useDeckGeneration.ts` — `setDeckFromResult` where pdfData fallback slide is created
- `src/features/deck-generator/types/deck.types.ts` — may need to add pdfData to GeneratedSlide content type

### Issue B: Deck output quality is low

**Evidence:** The generated PDF ("Customer Interaction Prep.pdf") is low quality — not up to NotebookLM's normal standard. The pipeline in `src/lib/services/deck-processing.ts` builds the NotebookLM request with these instructions (lines 116-123):

```typescript
const templateInstructions = `Create a professional ${deck.templateName} presentation for Guardian Roofing.
This deck is for ${deck.customerName}.

Style requirements:
- Use a dark navy (#1E3A5F) and gold (#D4A656) color scheme
- Professional, corporate aesthetic suitable for the roofing industry
- Include data visualizations where relevant
- Make it visually impactful and easy to scan quickly`;
```

**Problems with the current instructions:**
1. Too generic — doesn't tell NotebookLM what SECTIONS to include
2. Doesn't leverage the template's section structure at all
3. Doesn't pass the template's `enabledSections` to shape the deck content
4. The customer data formatting (`formatCustomerDataForNotebook` in `src/lib/services/notebooklm/formatters.ts`) may be too sparse

**Fix needed:**
1. Read the selected template's sections from the `requestPayload` (which includes `templateId`)
2. Map template sections to specific slide instructions for NotebookLM
3. Include more detailed prompting: slide count expectations, section breakdown, talking points format, data viz requirements
4. Consider passing `enabledSections` through the schedule API → requestPayload → deck-processing so the instructions are tailored

**Key files:**
- `src/lib/services/deck-processing.ts` — `processDeckWithNotebookLM()`, lines 116-131 where template instructions are built
- `src/lib/services/notebooklm/formatters.ts` — `formatCustomerDataForNotebook()` and `formatWeatherHistoryForNotebook()`
- `src/features/deck-generator/hooks/useDeckTemplates.ts` — template definitions with section structure
- `src/app/api/decks/schedule/route.ts` — where `requestPayload` is built (check if template sections are included)

## Architecture Context

The async deck generation flow:
```
User clicks Generate
  → useDeckGeneration.generateDeck() [client hook]
  → scheduleNotebookLMDeck() [client, calls APIs]
    → POST /api/decks/schedule [creates ScheduledDeck in DB with requestPayload]
    → POST /api/decks/process-now [fire-and-forget trigger]
      → processDeckWithNotebookLM(deckId) [server, background]
        → healthCheck() [notebooklm list]
        → Parse requestPayload, format data
        → generateCustomerDeck(request) [creates notebook, adds sources, generates slides, downloads PDF]
        → pdfToImages(outputPath) [converts PDF pages to base64 PNGs]
        → Update ScheduledDeck with resultPayload
  → useDeckStatus polls GET /api/decks/status/{customerId}?deckId={jobId}
  → On completion: setDeckFromResult(resultPayload) → DeckPreview renders slides
```

## Priority

**Issue A (PDF preview) is P0** — the user literally cannot see their deck without downloading. Fix this first.

**Issue B (quality) is P1** — deck generates but content is underwhelming. Improve the template instructions after preview works.

## DB State

Check current deck state with:
```bash
cd C:/Users/scott/Documents/guardian-intel
set -a && source .env.local && set +a
cat > /tmp/q.js << 'SCRIPT'
const{PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
p.scheduledDeck.findMany({select:{id:true,status:true,errorMessage:true,customerName:true,actualSlides:true,createdAt:true},orderBy:{createdAt:'desc'},take:5}).then(d=>{console.log(JSON.stringify(d,null,2));p.$disconnect()});
SCRIPT
NODE_PATH=./node_modules node /tmp/q.js
```

## Test Script

`npx tsx scripts/test-async-pipeline.ts` — tests the DB pipeline without AI calls (free).
