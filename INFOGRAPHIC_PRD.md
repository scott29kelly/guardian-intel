# Infographic Generator Feature - PRD v3

> **Autonomous Model Intelligence · Zero-Configuration · Quality-First**
>
> Companion to: `NB2-Infographic-Generator-PRD-v3.docx` (full design document)
>
> Pattern reference: Deck Generator (`src/features/deck-generator/`)

---

## Design Principles (for Claude Code context)

1. **Quality is the only objective.** No "fast mode" or "budget mode." The system always produces the best output using whatever model or chain is optimal.
2. **Time is not a constraint.** Never degrade quality to save seconds. Reps can wait minutes.
3. **Zero configuration.** Rep's surface: select customer → choose content → generate. No model pickers, quality sliders, or resolution selectors.
4. **Invisible intelligence.** Model Intelligence Layer operates behind the scenes. Rep never sees model names.
5. **Automatic chaining.** When NB2→NB Pro produces better results, chain automatically. No opt-in.
6. **Future-proof.** New models register a capability profile and immediately compete. No refactoring needed.

---

## Available Models

| Property | NB2 (`gemini-3.1-flash-image-preview`) | NB Pro (`gemini-3-pro-image`) |
|---|---|---|
| Core strength | Web grounding, cost efficiency | Visual fidelity, complex layouts |
| Cost (1K) | ~$0.067 | ~$0.27 |
| Web search grounding | Yes | No |
| Max reference images | 14 | 10 |
| fidelityScore | 7 | 9 |
| complexCompositionScore | 6 | 9 |
| chainable | source | finisher |

---

## Group 0: Foundation

- [ ] **INFOG-001: TypeScript Types** — Create `src/features/infographic-generator/types/infographic.types.ts` with all type definitions:
  - `GenerationMode` = `'preset' | 'custom' | 'conversational'`
  - `InfographicPreset` — id, name, description, audience ('internal' | 'customer-facing'), modules (TopicModuleConfig[]), usageMoment, icon
  - `TopicModule` — id, label, dataSource (function name from dataAssembler), requiresWebSearch boolean, visualElement description
  - `TopicModuleConfig` — module: TopicModule, enabled: boolean, required: boolean
  - `ModelCapabilities` — id (AIModel), costPerImage1K, maxResolution, webSearchGrounding, maxReferenceImages, fidelityScore, textRenderingScore, complexCompositionScore, chainable ('source' | 'finisher' | 'standalone')
  - `ModelChainStrategy` — id, name, trigger description, steps: { model, role ('generate' | 'refine'), resolution, searchEnabled }[]
  - `ScoringResult` — selectedModel or selectedChain, scores: { audience, complexity, webSearch }, reasoning string
  - `InfographicRequest` — customerId, mode: GenerationMode, presetId?, selectedModules?, conversationalPrompt?, audience?
  - `InfographicResponse` — imageData (base64), imageUrl?, model used (internal only), chainUsed boolean, generationTimeMs, cached boolean
  - `InfographicCacheEntry` — customerId, presetId, imageData, generatedAt, expiresAt, modelStrategy (internal)
  - `BatchRequest` — customerIds[], autoSelectPresets boolean
  - `GenerationProgress` — phase: 'data' | 'scoring' | 'generating' | 'refining' | 'complete', percent, statusMessage (contextual, no model names)
  - No `QualityTier` type — removed in v3
  - **Pattern reference:** `src/features/deck-generator/types/deck.types.ts` — follow same structure with branded types and union discriminators
  - **Depends on:** Nothing (no dependencies)

- [ ] **INFOG-002: Branding Assets** — Create `src/features/infographic-generator/utils/brandingAssets.ts`:
  - Export `infographicBrandConfig` with dark theme (primary #1E3A5F navy, secondary #D4A656 gold, accent #4A90A4 teal, background #0F1419)
  - Export `infographicLightBrandConfig` for customer-facing output (white background, navy text)
  - Export `getBrandingForInfographic(audience: 'internal' | 'customer-facing')` helper
  - Base64 brand reference images for logo, watermark
  - **Pattern reference:** `src/features/deck-generator/utils/brandingConfig.ts` — same color system, extend with infographic-specific reference images
  - **Depends on:** Nothing

---

## Group 1: Autonomous Model Intelligence

> **This is the core differentiator from Deck Generator.** Deck Generator uses NB Pro (fixed). This feature uses autonomous scoring.

- [ ] **INFOG-003: Model Registry + Scoring** — Create `src/features/infographic-generator/services/modelIntelligence.ts`:
  - `ModelRegistry` class with `register(model: ModelCapabilities)` and `getAll()` methods
  - Pre-register NB2 and NB Pro with their capability profiles (see table above)
  - `scoreRequest(request: InfographicRequest, modules: TopicModule[])` — evaluates 3 dimensions:
    - **Dimension 1: Audience** — internal (moderate fidelity threshold) vs customer-facing (maximum fidelity, resolution floor 2K)
    - **Dimension 2: Data Complexity** — computed from module count. Low (1–3): NB2 sufficient. Medium (4–6): NB Pro preferred. High (7+): NB Pro strongly favored
    - **Dimension 3: Web Search Dependency** — HARD CONSTRAINT. If any module has `requiresWebSearch: true`, MUST use web-search-capable model (NB2) or NB2-first chain
  - `selectModelOrChain(scores: ScoringResult)` — returns single model config or chain strategy
  - Chain definitions:
    - **Chain A (Web-Grounded Quality):** web search + customer-facing OR high complexity → NB2@1K → NB Pro@2K-4K (~$0.34)
    - **Chain B (Complexity Upgrade):** 7+ modules + internal + no web → NB2@1K → NB Pro@2K (~$0.34)
    - **Chain C (Batch Elevation):** per-customer independent scoring in batch mode
  - Export singleton `getModelIntelligence()`
  - **Pattern reference:** `src/lib/services/ai/router.ts` — follow TASK_MODEL_MAP pattern but with scoring instead of static mapping
  - **Depends on:** INFOG-001

- [ ] **INFOG-004: Gemini Flash Image Adapter** — Create `src/lib/services/ai/adapters/gemini-flash-image.ts`:
  - Implement `AIAdapter` interface (same as existing adapters in `src/lib/services/ai/adapters/`)
  - Support `search_types` parameter for web + image search grounding
  - Resolution tiers: 1K, 2K, 4K
  - Accept reference images (up to 14 for NB2)
  - Retry logic with exponential backoff (1s, 2s, 4s) — same as `src/features/deck-generator/services/slideImageGenerator.ts`
  - Return base64 image data
  - **Pattern reference:** Existing adapters in `src/lib/services/ai/adapters/` + `slideImageGenerator.ts` retry pattern
  - **Depends on:** Nothing (can be built in parallel with INFOG-003)

- [ ] **INFOG-005: AI Router Updates** — Modify existing files:
  - `src/lib/services/ai/types.ts`:
    - Add `"gemini-3.1-flash-image-preview"` to `AIModel` union type
    - Add `"image_generation"` to `AITask` union type
    - Add `ImageGenerationRequest` interface (prompt, referenceImages?, searchTypes?, resolution)
    - Add `ImageGenerationResponse` interface (imageData: string, model: string)
  - `src/lib/services/ai/router.ts`:
    - Add `image_generation` to `TASK_MODEL_MAP` (default to NB2, but actual selection delegated to Model Intelligence)
    - Add `generateImage(request: ImageGenerationRequest)` method that delegates to Model Intelligence Layer for model selection
    - Register the new Gemini Flash Image adapter via `getAdapter()` fallback chain
  - **Pattern reference:** Existing router.ts TASK_MODEL_MAP pattern and getAdapter() method
  - **Depends on:** INFOG-004

---

## Group 2: Data Layer

- [ ] **INFOG-006: Data Assembler** — Create `src/features/infographic-generator/utils/infographicDataAssembler.ts`:
  - Extends patterns from `src/features/deck-generator/utils/dataAggregator.ts`
  - Reuse existing functions: `getCustomerTitleData`, `getCustomerOverviewStats`, `getPropertyIntelData`, `getStormHistoryTimeline`
  - Add derived metric functions:
    - `cumulativeStormExposure(customerId)` — total storm events × severity weighted
    - `daysSinceLastContact(customerId)` — from Interaction[] timestamps
    - `neighborhoodConversionRate(customerId)` — CanvassingPin[] analysis within radius
    - `insuranceDeadlineCountdown(customerId)` — days until filing deadline
  - `assembleDataForModules(customerId: string, modules: TopicModule[])` — fetches all required data, returns structured object per module
  - Data source mapping: each TopicModule.dataSource maps to an assembler function (same pattern as deck template `dataSource` fields)
  - **Pattern reference:** `src/features/deck-generator/utils/dataAggregator.ts` — follow same Prisma query patterns, same CustomerContext interface from `src/lib/services/ai/types.ts`
  - **Depends on:** INFOG-001

- [ ] **INFOG-007: Prompt Composer** — Create `src/features/infographic-generator/services/promptComposer.ts`:
  - `composePrompt(data, modules, branding, modelCapabilities)` — builds model-specific prompts
  - Different prompt templates per model:
    - NB2 prompts include `search_types` instructions when web modules present
    - NB Pro prompts emphasize visual composition and layout fidelity
    - Chain prompts: NB2 prompt focuses on data accuracy, NB Pro prompt focuses on visual refinement using NB2 output as reference
  - Include branding instructions (colors, fonts, logo placement) in prompt
  - `{{placeholder}}` syntax for data injection
  - **Pattern reference:** `src/features/deck-generator/services/slideImageGenerator.ts` prompt construction
  - **Depends on:** INFOG-001, INFOG-002

- [ ] **INFOG-008: Intent Parser** — Create `src/features/infographic-generator/services/intentParser.ts`:
  - For Mode 3 (Conversational) — classifies natural language into TopicModules + audience
  - Uses existing AI Router with `classify` task (Claude Haiku) to parse:
    - Which TopicModules the rep wants (e.g., "weather and insurance info" → Live Weather + Insurance Status modules)
    - Audience inference from language signals: "send to Mrs. Johnson" / "share with" / "for the homeowner" → customer-facing; default → internal
  - Returns `{ modules: TopicModule[], audience: 'internal' | 'customer-facing', confidence: number }`
  - **Pattern reference:** Existing AI Router classify task pattern
  - **Depends on:** INFOG-001

---

## Group 3: Templates (Presets)

> All presets define content modules, audience type, and data requirements. Model selection is entirely handled by Model Intelligence — templates never specify models.

- [ ] **INFOG-009: Pre-Knock + Post-Storm Templates** — Create two files:
  - `src/features/infographic-generator/templates/pre-knock-briefing.ts`:
    - Audience: internal | Modules: property-overview, roof-assessment, storm-timeline, lead-scoring, interaction-history, next-steps
    - Usage moment: "Parking Lot" — quick 60-second prep
  - `src/features/infographic-generator/templates/post-storm-followup.ts`:
    - Audience: internal | Modules: storm-timeline (required), live-weather (web search), neighborhood-context, insurance-status, filing-deadline
    - Usage moment: "Post-Storm" — storm response follow-up
  - **Pattern reference:** `src/features/deck-generator/templates/customer-cheat-sheet.ts` — same structure with sections array, `dataSource`, `aiEnhanced`, `optional`/`defaultEnabled` booleans
  - **Depends on:** INFOG-001

- [ ] **INFOG-010: Insurance Prep + Competitive Edge Templates** — Create two files:
  - `src/features/infographic-generator/templates/insurance-meeting-prep.ts`:
    - Audience: internal | Modules: insurance-status (required), carrier-intel (web search, required), interaction-history, property-overview, next-steps
    - Usage moment: "Meeting Prep" — adjuster meetings
  - `src/features/infographic-generator/templates/competitive-edge.ts`:
    - Audience: internal | Modules: competitor-landscape (required), lead-scoring, property-overview, neighborhood-context, next-steps
    - Usage moment: "Meeting Prep" — competitive scenarios
  - **Depends on:** INFOG-001

- [ ] **INFOG-011: Customer Leave-Behind Template** — Create `src/features/infographic-generator/templates/customer-leave-behind.ts`:
  - Audience: **customer-facing** (this is the key difference — triggers NB Pro or NB2→NB Pro chain)
  - Modules: property-overview, storm-timeline, insurance-status, next-steps, company-credentials, contact-info
  - Light brand theme applied automatically via `getBrandingForInfographic('customer-facing')`
  - Usage moment: "Leave-Behind"
  - **Depends on:** INFOG-001, INFOG-002

- [ ] **INFOG-012: Template Index + Helpers** — Create two files:
  - `src/features/infographic-generator/templates/prep-my-day.ts`:
    - Batch preset — auto-selects modules per customer based on pipeline stage + recent signals
    - Each customer scored independently by Model Intelligence
  - `src/features/infographic-generator/templates/index.ts`:
    - Barrel export with `infographicPresets` array
    - Helpers: `getPresetById()`, `getPresetsByMoment()`, `getPresetsForBatch()`
  - **Pattern reference:** `src/features/deck-generator/templates/index.ts` — same barrel pattern with getTemplateById, getTemplatesByAudience
  - **Depends on:** INFOG-009, INFOG-010, INFOG-011

---

## Group 4: Generation + Caching

- [ ] **INFOG-013: Infographic Generator Service** — Create `src/features/infographic-generator/services/infographicGenerator.ts`:
  - Single entry point: `generateInfographic(request: InfographicRequest)` → `InfographicResponse`
  - Orchestration flow:
    1. Resolve modules (from preset, custom selection, or intent parser)
    2. Call `assembleDataForModules()` — data assembly
    3. Call `scoreRequest()` + `selectModelOrChain()` — model scoring
    4. Call `composePrompt()` — prompt building
    5. If single model: call adapter directly via AI Router
    6. If chain: call first adapter → use output as reference image → call second adapter
  - Progress callback for UI updates (contextual messages, no model names):
    - "Assembling customer data..." (data phase)
    - "Pulling live weather conditions..." (if web search modules)
    - "Generating your briefing..." (generation phase)
    - "Polishing final output..." (chain refinement phase)
  - Background generation support: can execute without blocking UI
  - **Pattern reference:** `src/features/deck-generator/services/slideImageGenerator.ts` — same retry logic, similar orchestration
  - **Depends on:** INFOG-003, INFOG-006, INFOG-007

- [ ] **INFOG-014: API Routes** — Create API route files:
  - `src/app/api/ai/generate-infographic/route.ts` — POST: single generation. Receives InfographicRequest, returns InfographicResponse. Model Intelligence auto-selects.
  - `src/app/api/ai/generate-infographic/batch/route.ts` — POST: batch generation. Receives BatchRequest with customerIds[]. Returns job ID. Per-customer model selection.
  - `src/app/api/ai/generate-infographic/batch/[jobId]/route.ts` — GET: poll batch status. Returns completed URLs + per-customer progress.
  - `src/app/api/ai/parse-infographic-intent/route.ts` — POST: Mode 3 intent parsing. Receives conversational prompt, returns parsed modules + audience type.
  - All routes use NextAuth session validation (same pattern as existing `/api/ai/` routes)
  - **Depends on:** INFOG-013, INFOG-008

- [ ] **INFOG-015: Cache Service** — Create `src/features/infographic-generator/services/infographicCache.ts`:
  - **Redis layer** (Upstash): Key format `infographic:{customerId}:{preset}:{date}`. 24hr expiry standard, 7 days for customer-facing leave-behinds.
  - **Service worker layer**: PNGs stored with customer ID + timestamp for offline access
  - `getCached(customerId, presetId)` — check Redis first, then service worker
  - `cacheResult(entry: InfographicCacheEntry)` — write to both layers
  - `invalidateForCustomer(customerId)` — when customer data changes
  - Cross-device access via Upstash Redis (existing infrastructure)
  - **Pattern reference:** Existing Upstash Redis usage in Guardian Intel codebase
  - **Depends on:** INFOG-001

---

## Group 5: Hooks

- [ ] **INFOG-016: useInfographicGeneration** — Create `src/features/infographic-generator/hooks/useInfographicGeneration.ts`:
  - Primary hook managing generation lifecycle
  - Returns: `{ isGenerating, progress: GenerationProgress, result: InfographicResponse | null, error, generate(request), reset() }`
  - Contextual progress messages (no model names exposed):
    - "Assembling customer data..." → "Pulling live weather conditions..." → "Generating your briefing..." → "Polishing final output..."
  - Background generation support: generation continues if modal dismissed
  - Push notification via PWA service worker when complete: "Your briefing for [Customer Name] is ready"
  - TanStack Query for API calls (same pattern as deck generator hooks)
  - **Pattern reference:** `src/features/deck-generator/hooks/useDeckGeneration.ts`
  - **Depends on:** INFOG-013, INFOG-014

- [ ] **INFOG-017: useInfographicBatch** — Create `src/features/infographic-generator/hooks/useInfographicBatch.ts`:
  - Batch "Prep My Day" hook
  - Per-customer autonomous model selection (each customer scored independently)
  - Parallel generation where possible
  - Progressive results: each infographic appears as it completes (not all-or-nothing)
  - Returns: `{ isBatching, batchProgress: { customerId, status, result }[], startBatch(customerIds), cancelBatch() }`
  - Cache all results for offline field access
  - **Depends on:** INFOG-016, INFOG-015

- [ ] **INFOG-018: useInfographicPresets** — Create `src/features/infographic-generator/hooks/useInfographicPresets.ts`:
  - Template/preset management hook
  - Returns: `{ presets, getPreset(id), getByMoment(moment), searchPresets(query) }`
  - Barrel export: `src/features/infographic-generator/hooks/index.ts`
  - **Pattern reference:** `src/features/deck-generator/hooks/useDeckTemplates.ts`
  - **Depends on:** INFOG-012

---

## Group 6: UI Components

> **Critical v3 constraint:** ZERO model/quality controls in any component. No model pickers, no quality sliders, no resolution selectors. Single "Generate" button.

- [ ] **INFOG-019: Generator Modal** — Create `src/features/infographic-generator/components/InfographicGeneratorModal.tsx`:
  - Three-mode tabs: Presets | Custom | Ask AI
  - Flow: select content → tap Generate → see progress → view result
  - Single Generate button (no intermediate previews, no configuration steps beyond content selection)
  - AnimatePresence transitions between steps (Framer Motion)
  - Radix UI/shadcn dialog component
  - Mobile-first: bottom sheet trigger on customer cards
  - **Pattern reference:** `src/features/deck-generator/components/DeckGeneratorModal.tsx` — same multi-step flow pattern
  - **Depends on:** INFOG-020, INFOG-021, INFOG-023

- [ ] **INFOG-020: Preset Selector + Topic Picker** — Create two components:
  - `src/features/infographic-generator/components/PresetSelector.tsx`:
    - Visual preset cards with usage moment labels ("Parking Lot", "Meeting Prep", "Leave-Behind")
    - Module previews on each card
    - No model implications exposed
  - `src/features/infographic-generator/components/TopicPicker.tsx`:
    - Checkbox grid of all available TopicModules
    - Web search badges on modules that require it (visual indicator only — no model selection implication to rep)
    - Audience toggle: "This is for the customer" checkbox (only UI control that affects model selection, but rep doesn't know that)
  - **Pattern reference:** `src/features/deck-generator/components/DeckTemplateSelector.tsx` + `DeckCustomizer.tsx`
  - **Depends on:** INFOG-018

- [ ] **INFOG-021: Generation Progress** — Create `src/features/infographic-generator/components/GenerationProgress.tsx`:
  - Animated progress bar: smooth, non-linear (accelerates during data assembly, slows during generation)
  - Contextual status messages: "Assembling customer data..." → "Pulling live weather conditions..." → "Generating your briefing..." → "Polishing final output..."
  - **NO time estimates.** Progress feels continuous and purposeful.
  - **NO model names.** Rep never sees "Using Nano Banana 2..." or "Chaining to NB Pro..."
  - Background generation support: dismiss modal, badge notification on customer card when ready
  - Framer Motion for progress animations
  - **Depends on:** INFOG-016

- [ ] **INFOG-022: Preview + Share + Batch View** — Create three components:
  - `src/features/infographic-generator/components/InfographicPreview.tsx`:
    - Full-screen viewer with pinch-to-zoom (mobile-first)
    - Double-tap to share
  - `src/features/infographic-generator/components/ShareSheet.tsx`:
    - SMS/email/link sharing options
    - Auto-selected resolution based on share target
  - `src/features/infographic-generator/components/BatchDayView.tsx`:
    - Swipeable card stack for "Prep My Day" results
    - Per-customer progress indicators
    - Each card appears as generation completes
  - **Depends on:** INFOG-016, INFOG-017

- [ ] **INFOG-023: Conversational Input** — Create `src/features/infographic-generator/components/ConversationalInput.tsx`:
  - Text input for Mode 3 natural language requests
  - Suggested topic chips below input (e.g., "Weather + Insurance", "Full Briefing", "Leave-Behind")
  - No quality tier indicators
  - Submits to intent parser → generates infographic
  - **Depends on:** INFOG-008

---

## Group 7: Integration

- [ ] **INFOG-024: Customer Card Integration** — Modify `src/components/customer-intel-card.tsx`:
  - Add "Generate Briefing" button (alongside existing "Generate Prep Deck" from DECK-016)
  - Import `InfographicGeneratorModal`
  - Add `showInfographicGenerator` state
  - Pass `customerId` and optional `initialPresetId` to modal
  - Badge notification spot for background generation completion
  - **Depends on:** INFOG-019

- [ ] **INFOG-025: Dashboard "Prep My Day"** — Modify dashboard `src/app/(dashboard)/page.tsx` (or equivalent):
  - Add "Prep My Day" button/card on dashboard
  - Triggers batch generation for all today's appointments
  - Shows `BatchDayView` with progressive results
  - **Depends on:** INFOG-017, INFOG-022

- [ ] **INFOG-026: Customer Profile Modal** — Modify `src/components/modals/customer-profile-modal.tsx`:
  - Add Infographic tab or action button
  - Quick-launch preset generation from customer profile context
  - Show recent cached infographics for this customer
  - **Depends on:** INFOG-019, INFOG-015

---

## Group 8: Polish & Testing

- [ ] **INFOG-027: Offline Support** — Implement across existing service worker:
  - Service worker caches generated PNGs with customer ID + timestamp
  - WiFi-aware prompting: "You have 5 appointments today — generate briefings now while connected?"
  - Offline indicator: "Generated 3 hours ago" badge, offer regeneration when back online
  - Integrate with existing PWA push notification infrastructure
  - **Depends on:** INFOG-015

- [ ] **INFOG-028: Unit Tests** — Create `src/features/infographic-generator/__tests__/`:
  - `modelIntelligence.test.ts` — scoring dimensions, chain triggers, model selection for all scenarios (see Cost & Performance table: 7 scenario types)
  - `infographicDataAssembler.test.ts` — derived metrics, data assembly per module
  - `promptComposer.test.ts` — model-specific prompt generation, branding injection
  - `intentParser.test.ts` — conversational → modules + audience inference
  - Use Vitest (existing test infrastructure)
  - **Depends on:** INFOG-003, INFOG-006, INFOG-007, INFOG-008

- [ ] **INFOG-029: E2E Tests** — Create Playwright tests:
  - Single generation flow (preset → generate → view result)
  - Custom topic picker flow (select modules → generate)
  - Conversational flow (type prompt → parse → generate)
  - Batch "Prep My Day" flow (dashboard → batch → progressive results)
  - Chain execution verification (web search module → verify chain triggered)
  - Share flow (generate → share via SMS/email/link)
  - **Depends on:** All previous groups

---

## Claude Code Session Prompts

### Session 1: Foundation + Model Intelligence (Groups 0–1)

```
I'm building an Infographic Generator feature for my Guardian Intel app (Next.js 15, React 19, TypeScript, Prisma). This feature generates on-demand visual briefings for sales reps using AI image models.

Read INFOGRAPHIC_PRD.md in the repo root for the full spec. Focus on Groups 0 and 1:

GROUP 0 — INFOG-001 and INFOG-002:
- Create src/features/infographic-generator/types/infographic.types.ts
- Create src/features/infographic-generator/utils/brandingAssets.ts
- Follow patterns from src/features/deck-generator/types/deck.types.ts and utils/brandingConfig.ts

GROUP 1 — INFOG-003, INFOG-004, INFOG-005:
- Create src/features/infographic-generator/services/modelIntelligence.ts (scoring system with 3 dimensions: audience, complexity, web search)
- Create src/lib/services/ai/adapters/gemini-flash-image.ts (NB2 adapter with web search grounding + retry logic)
- Modify src/lib/services/ai/types.ts (add image_generation task + gemini-3.1-flash-image-preview model)
- Modify src/lib/services/ai/router.ts (add image_generation routing + generateImage method)

Key context: The Model Intelligence Layer autonomously selects between NB2, NB Pro, or NB2→NB Pro chains. No rep-facing controls. Quality-first. See the PRD for scoring logic and chain strategies.

Run npm run build when done to verify no type errors.
```

### Session 2: Data Layer (Group 2)

```
Continue building the Infographic Generator. Read INFOGRAPHIC_PRD.md, focus on Group 2.

GROUP 2 — INFOG-006, INFOG-007, INFOG-008:
- Create src/features/infographic-generator/utils/infographicDataAssembler.ts — extends the deck generator's dataAggregator pattern. Reuse existing functions, add derived metrics (cumulativeStormExposure, daysSinceLastContact, neighborhoodConversionRate, insuranceDeadlineCountdown). Reference src/features/deck-generator/utils/dataAggregator.ts.
- Create src/features/infographic-generator/services/promptComposer.ts — model-aware prompts. Different templates for NB2 (with search_types) vs NB Pro (composition focus) vs chain steps.
- Create src/features/infographic-generator/services/intentParser.ts — parse natural language into TopicModules + audience using existing AI Router classify task.

Types from INFOG-001 should already exist. Use them.
Run npm run build when done.
```

### Session 3: Templates + Generation (Groups 3–4)

```
Continue building the Infographic Generator. Read INFOGRAPHIC_PRD.md, focus on Groups 3 and 4.

GROUP 3 — INFOG-009 through INFOG-012:
- Create all preset template files in src/features/infographic-generator/templates/
- Follow the pattern from src/features/deck-generator/templates/customer-cheat-sheet.ts
- Templates define modules and audience — they NEVER specify models (Model Intelligence handles that)
- Create index.ts barrel with helpers

GROUP 4 — INFOG-013, INFOG-014, INFOG-015:
- Create the main infographicGenerator.ts service — orchestrates the full pipeline: data assembly → model scoring → prompt composition → generation (including chains)
- Create API routes: /api/ai/generate-infographic (single + batch + intent parse)
- Create infographicCache.ts — Redis (Upstash) + service worker dual cache

This is the heaviest session. The generator service is the central orchestrator — make sure chain execution works (NB2 generates → output becomes reference image for NB Pro).
Run npm run build when done.
```

### Session 4: Hooks + UI (Groups 5–6)

```
Continue building the Infographic Generator. Read INFOGRAPHIC_PRD.md, focus on Groups 5 and 6.

GROUP 5 — INFOG-016, INFOG-017, INFOG-018:
- Create React hooks in src/features/infographic-generator/hooks/
- useInfographicGeneration — primary hook with contextual progress messages (NO model names)
- useInfographicBatch — per-customer parallel generation with progressive results
- useInfographicPresets — template management
- Use TanStack Query, follow patterns from src/features/deck-generator/hooks/

GROUP 6 — INFOG-019 through INFOG-023:
- Create all UI components in src/features/infographic-generator/components/
- CRITICAL: Zero model/quality controls. No model pickers. No quality sliders. Single Generate button.
- InfographicGeneratorModal — three-mode tabs (Presets | Custom | Ask AI)
- GenerationProgress — animated progress with contextual messages, NO time estimates, NO model info
- Mobile-first: bottom sheet, pinch-to-zoom, swipeable batch cards
- Use Radix UI/shadcn, Framer Motion, Tailwind

Run npm run build when done.
```

### Session 5: Integration + Testing (Groups 7–8)

```
Continue building the Infographic Generator. Read INFOGRAPHIC_PRD.md, focus on Groups 7 and 8.

GROUP 7 — INFOG-024, INFOG-025, INFOG-026:
- Add "Generate Briefing" button to src/components/customer-intel-card.tsx (next to existing deck generator button)
- Add "Prep My Day" batch trigger to dashboard
- Add infographic action to src/components/modals/customer-profile-modal.tsx
- Create barrel exports: src/features/infographic-generator/index.ts

GROUP 8 — INFOG-027, INFOG-028, INFOG-029:
- Wire up offline support in service worker
- Write Vitest unit tests for modelIntelligence, dataAssembler, promptComposer, intentParser
- Write Playwright E2E tests for all generation flows

Run npm run build && npm run test when done.
```

---

## File Structure Summary

```
src/features/infographic-generator/
├── types/
│   └── infographic.types.ts          # INFOG-001
├── utils/
│   ├── brandingAssets.ts              # INFOG-002
│   ├── infographicDataAssembler.ts    # INFOG-006
│   └── promptTemplates.ts            # INFOG-007 (companion)
├── services/
│   ├── modelIntelligence.ts           # INFOG-003
│   ├── promptComposer.ts             # INFOG-007
│   ├── intentParser.ts               # INFOG-008
│   ├── infographicGenerator.ts       # INFOG-013
│   └── infographicCache.ts           # INFOG-015
├── templates/
│   ├── pre-knock-briefing.ts          # INFOG-009
│   ├── post-storm-followup.ts         # INFOG-009
│   ├── insurance-meeting-prep.ts      # INFOG-010
│   ├── competitive-edge.ts            # INFOG-010
│   ├── customer-leave-behind.ts       # INFOG-011
│   ├── prep-my-day.ts                # INFOG-012
│   └── index.ts                       # INFOG-012
├── hooks/
│   ├── useInfographicGeneration.ts    # INFOG-016
│   ├── useInfographicBatch.ts         # INFOG-017
│   ├── useInfographicPresets.ts       # INFOG-018
│   └── index.ts
├── components/
│   ├── InfographicGeneratorModal.tsx   # INFOG-019
│   ├── PresetSelector.tsx             # INFOG-020
│   ├── TopicPicker.tsx                # INFOG-020
│   ├── GenerationProgress.tsx         # INFOG-021
│   ├── InfographicPreview.tsx         # INFOG-022
│   ├── ShareSheet.tsx                 # INFOG-022
│   ├── BatchDayView.tsx               # INFOG-022
│   ├── ConversationalInput.tsx        # INFOG-023
│   └── index.ts
├── __tests__/
│   ├── modelIntelligence.test.ts      # INFOG-028
│   ├── infographicDataAssembler.test.ts
│   ├── promptComposer.test.ts
│   └── intentParser.test.ts
└── index.ts                           # Barrel export

src/lib/services/ai/
├── adapters/
│   └── gemini-flash-image.ts          # INFOG-004 (new)
├── types.ts                           # INFOG-005 (modified)
└── router.ts                          # INFOG-005 (modified)

src/app/api/ai/
├── generate-infographic/
│   ├── route.ts                       # INFOG-014
│   └── batch/
│       ├── route.ts                   # INFOG-014
│       └── [jobId]/route.ts           # INFOG-014
└── parse-infographic-intent/
    └── route.ts                       # INFOG-014
```

---

## Modified Existing Files

| File | Task | Changes |
|---|---|---|
| `src/lib/services/ai/types.ts` | INFOG-005 | Add `gemini-3.1-flash-image-preview` to AIModel, `image_generation` to AITask, new interfaces |
| `src/lib/services/ai/router.ts` | INFOG-005 | Add image_generation routing, generateImage() method |
| `src/components/customer-intel-card.tsx` | INFOG-024 | Add "Generate Briefing" button + modal |
| `src/app/(dashboard)/page.tsx` | INFOG-025 | Add "Prep My Day" batch trigger |
| `src/components/modals/customer-profile-modal.tsx` | INFOG-026 | Add infographic tab/action |
