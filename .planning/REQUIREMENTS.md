# Requirements: Guardian Intel — Infographic Generator + NotebookLM Multi-Artifact

**Defined:** 2026-03-21 (v1.0), 2026-04-09 (v1.1)
**Core Value:** Reps get actionable, multi-format briefings in one tap — zero configuration, background processing, push notifications

## v1.1 Requirements — NotebookLM Multi-Artifact + UI Loops

### Multi-Artifact Backend

- [ ] **NLMA-01**: Prisma model for multi-artifact job tracking — either new `ScheduledArtifactSet` or extend `ScheduledDeck` with per-artifact status fields (`deckStatus`, `infographicStatus`, `audioStatus`, `reportStatus`) and per-artifact URLs; migrations committed
- [ ] **NLMA-02**: `generateCustomerArtifacts({ customer, artifacts, notebookId? })` orchestrator in `src/lib/services/notebooklm/index.ts` — creates or reuses notebook, runs requested generators against single notebook, returns structured result with per-artifact outcomes
- [ ] **NLMA-03**: POST `/api/ai/generate-customer-artifacts` route — accepts `{ customerId, artifacts: ['deck','infographic','audio','report'] }`, enforces `assertCustomerAccess` rep-ownership, creates job record, fires background processor, returns job ID immediately
- [ ] **NLMA-04**: Per-artifact status polling — generalize `/api/decks/status/[customerId]` to return `{ deck, infographic, audio, report }` each with `{ status, url, progress, error }`
- [ ] **NLMA-05**: Storage orchestration in `src/lib/services/deck-processing.ts` — distinct Supabase paths per artifact type (`decks/`, `infographics/`, `audio/`, `reports/`) with type-appropriate content-type headers
- [ ] **NLMA-06**: Stuck-job recovery extended to per-artifact state — `recoverStuckDecks` updated to sweep any artifact stuck in "processing" > 15 minutes, preserving already-completed artifacts in the same job

### Multi-Artifact UI

- [ ] **NLMA-07**: `useCustomerArtifacts(customerId)` hook in `src/lib/hooks/` — polls per-artifact status endpoint, returns unified state with TanStack Query key factory, stops polling when all artifacts terminal
- [ ] **NLMA-08**: `CustomerArtifactsPanel` component — 2x2 responsive grid with four artifact cards, each showing status (pending/processing/ready/failed), preview thumbnail, tap-to-open action, follows existing mobile-first bottom-sheet patterns
- [ ] **NLMA-09**: `AudioBriefingPlayer` component — branded wrapper around `<audio controls>` with Navy/Gold/Teal palette, playback controls sized for mobile use, share action reuses `ShareSheet`
- [ ] **NLMA-10**: `ReportViewer` component — `react-markdown` render with brand typography (Geist + palette), mobile scroll behavior, share/download actions
- [ ] **NLMA-11**: Mount `CustomerArtifactsPanel` in customer profile modal and in `InfographicGeneratorModal` success state, wire "Generate all artifacts" action on customer card alongside existing deck/infographic buttons

### Push Notification Flow

- [ ] **NLMA-12**: Mount `push-notification-prompt.tsx` component in `src/app/(dashboard)/layout.tsx` with `localStorage`-gated render (prompt at most once per session, never on cold load)
- [ ] **NLMA-13**: Trigger heuristic — prompt appears only after a rep has fired their first background generation in the session, dismissible state persists across reloads
- [ ] **NLMA-14**: Verify `public/sw.js` push event handler surfaces toast on multi-artifact artifact-ready events, add per-artifact-type payload handling if missing
- [ ] **NLMA-15**: Extend `deck-processing.ts` to fire push notifications per-artifact-completion (not just full-set completion), so reps get "your audio briefing is ready" even if reports are still generating

### Testing

- [ ] **NLMA-16**: Unit tests (Vitest) — `generateCustomerArtifacts` orchestrator logic, per-artifact stuck-job recovery edge cases, `useCustomerArtifacts` hook state transitions, audio/report component rendering
- [ ] **NLMA-17**: E2E test (Playwright) — full flow: rep fires multi-artifact generation → background processing starts → push notification prompt appears → rep accepts → toast fires on artifact completion → `CustomerArtifactsPanel` shows all four artifacts viewable

### Stretch (only if primary scope lands under budget)

- [ ] **NLMA-18**: Proposals UI stretch — rep-facing "Generate proposal" button + preview + send flow on customer profile, reusing existing `src/lib/services/proposals/generator.ts` AI generation

## v1 Requirements

### Foundation

- [x] **INFOG-001**: TypeScript types for all infographic generation entities (GenerationMode, InfographicPreset, TopicModule, ModelCapabilities, ScoringResult, InfographicRequest/Response, GenerationProgress, BatchRequest, CacheEntry)
- [x] **INFOG-002**: Branding assets with dark theme (internal) and light theme (customer-facing), audience-based helper, brand reference images

### Model Intelligence

- [x] **INFOG-003**: Model registry with NB2 + NB Pro capability profiles, 3-dimension scoring engine (audience, complexity, web search), chain strategies (A: web-grounded quality, B: complexity upgrade, C: batch elevation), singleton accessor
- [x] **INFOG-004**: Gemini Flash Image adapter implementing AIAdapter interface with web search grounding, resolution tiers (1K/2K/4K), reference image support (up to 14), retry with exponential backoff (1s, 2s, 4s)
- [x] **INFOG-005**: AI Router updates — image_generation task in TASK_MODEL_MAP, generateImage() method delegating to Model Intelligence for model selection

### Data Layer

- [x] **INFOG-006**: Data assembler extending deck generator patterns — reuse existing functions, add derived metrics (cumulativeStormExposure, daysSinceLastContact, neighborhoodConversionRate, insuranceDeadlineCountdown)
- [x] **INFOG-007**: Prompt composer with model-specific templates — NB2 prompts with search_types, NB Pro prompts emphasizing composition, chain prompts splitting data accuracy vs visual refinement
- [x] **INFOG-008**: Intent parser for conversational mode — classifies natural language into TopicModules + audience using AI Router classify task

### Templates

- [x] **INFOG-009**: Pre-Knock Briefing (internal, 6 modules, "Parking Lot" moment) + Post-Storm Follow-up (internal, 5 modules with web search, "Post-Storm" moment)
- [x] **INFOG-010**: Insurance Meeting Prep (internal, 5 modules with web search, "Meeting Prep") + Competitive Edge (internal, 5 modules, "Meeting Prep")
- [x] **INFOG-011**: Customer Leave-Behind (customer-facing, 6 modules, "Leave-Behind" — triggers NB Pro or chain)
- [x] **INFOG-012**: Template index with barrel exports, getPresetById(), getPresetsByMoment(), getPresetsForBatch() + Prep My Day batch preset

### Generation + Caching

- [x] **INFOG-013**: Infographic generator service — orchestrates data assembly → model scoring → prompt composition → generation (with chain support), progress callbacks with contextual messages
- [x] **INFOG-014**: API routes — POST /api/ai/generate-infographic (single), POST batch/, GET batch/[jobId], POST /api/ai/parse-infographic-intent — all with NextAuth session validation
- [x] **INFOG-015**: Cache service — Upstash Redis (24hr standard, 7 days leave-behinds) + service worker layer, getCached/cacheResult/invalidateForCustomer

### Hooks

- [x] **INFOG-016**: useInfographicGeneration hook — generation lifecycle, contextual progress messages (no model names), background generation, PWA push notification on complete
- [x] **INFOG-017**: useInfographicBatch hook — per-customer autonomous model selection, parallel generation, progressive results
- [x] **INFOG-018**: useInfographicPresets hook — template management with presets/getPreset/getByMoment/searchPresets

### UI Components

- [ ] **INFOG-019**: Generator modal — three-mode tabs (Presets | Custom | Ask AI), single Generate button, AnimatePresence, mobile-first bottom sheet
- [ ] **INFOG-020**: Preset selector (visual cards with usage moment labels) + Topic picker (checkbox grid with web search badges, audience toggle)
- [x] **INFOG-021**: Generation progress — animated non-linear progress bar, contextual status messages, NO time estimates, NO model names, background generation support
- [x] **INFOG-022**: Infographic preview (pinch-to-zoom) + Share sheet (SMS/email/link) + Batch day view (swipeable card stack)
- [x] **INFOG-023**: Conversational input — text input for natural language, suggested topic chips

### Integration

- [x] **INFOG-024**: Customer card integration — "Generate Briefing" button alongside existing deck generator button, badge notification for background completion
- [x] **INFOG-025**: Dashboard "Prep My Day" — batch trigger for all today's appointments, shows BatchDayView with progressive results
- [x] **INFOG-026**: Customer profile modal — infographic tab/action button, quick-launch preset generation, show recent cached infographics

### Polish & Testing

- [ ] **INFOG-027**: Offline support — service worker PNG caching, WiFi-aware prompting, offline indicator with regeneration offer
- [x] **INFOG-028**: Unit tests — modelIntelligence scoring, dataAssembler metrics, promptComposer templates, intentParser classification (Vitest)
- [x] **INFOG-029**: E2E tests — single generation, custom topics, conversational, batch, chain execution, share flows (Playwright)

## v2 Requirements

### Advanced Features

- **INFOG-V2-01**: Multi-page infographic support (carousel/swipeable pages)
- **INFOG-V2-02**: Custom template builder for reps to create their own presets
- **INFOG-V2-03**: Infographic analytics (view count, share count, time spent viewing)
- **INFOG-V2-04**: A/B testing of model chains for quality optimization
- **INFOG-V2-05**: PDF export with print-optimized layout

## Out of Scope

| Feature | Reason |
|---------|--------|
| Video generation | High complexity and cost, image-first approach |
| Model selection UI | Violates "zero configuration" design principle |
| Quality/resolution sliders | Violates "invisible intelligence" principle |
| Real-time collaborative editing | Field reps work solo, not collaborating |
| Third-party image model integration | NB2 + NB Pro cover all quality tiers needed |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFOG-001 | Phase 1 | Complete |
| INFOG-002 | Phase 1 | Complete |
| INFOG-003 | Phase 1 | Complete |
| INFOG-004 | Phase 1 | Complete |
| INFOG-005 | Phase 1 | Complete |
| INFOG-006 | Phase 2 | Complete |
| INFOG-007 | Phase 2 | Complete |
| INFOG-008 | Phase 2 | Complete |
| INFOG-009 | Phase 3 | Complete |
| INFOG-010 | Phase 3 | Complete |
| INFOG-011 | Phase 3 | Complete |
| INFOG-012 | Phase 3 | Complete |
| INFOG-013 | Phase 4 | Complete |
| INFOG-014 | Phase 4 | Complete |
| INFOG-015 | Phase 4 | Complete |
| INFOG-016 | Phase 5 | Complete |
| INFOG-017 | Phase 5 | Complete |
| INFOG-018 | Phase 5 | Complete |
| INFOG-019 | Phase 5 | Pending |
| INFOG-020 | Phase 5 | Pending |
| INFOG-021 | Phase 5 | Complete |
| INFOG-022 | Phase 5 | Complete |
| INFOG-023 | Phase 5 | Complete |
| INFOG-024 | Phase 6 | Complete |
| INFOG-025 | Phase 6 | Complete |
| INFOG-026 | Phase 6 | Complete |
| INFOG-027 | Phase 6 | Pending |
| INFOG-028 | Phase 6 | Complete |
| INFOG-029 | Phase 6 | Complete |

**Coverage:**
- v1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 after roadmap phase compression (8 -> 6 phases)*
