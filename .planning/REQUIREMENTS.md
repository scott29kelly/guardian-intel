# Requirements: Infographic Generator

**Defined:** 2026-03-21
**Core Value:** Reps get actionable visual briefings in one tap — zero configuration, quality-first, invisible intelligence

## v1 Requirements

### Foundation

- [ ] **INFOG-001**: TypeScript types for all infographic generation entities (GenerationMode, InfographicPreset, TopicModule, ModelCapabilities, ScoringResult, InfographicRequest/Response, GenerationProgress, BatchRequest, CacheEntry)
- [ ] **INFOG-002**: Branding assets with dark theme (internal) and light theme (customer-facing), audience-based helper, brand reference images

### Model Intelligence

- [ ] **INFOG-003**: Model registry with NB2 + NB Pro capability profiles, 3-dimension scoring engine (audience, complexity, web search), chain strategies (A: web-grounded quality, B: complexity upgrade, C: batch elevation), singleton accessor
- [ ] **INFOG-004**: Gemini Flash Image adapter implementing AIAdapter interface with web search grounding, resolution tiers (1K/2K/4K), reference image support (up to 14), retry with exponential backoff (1s, 2s, 4s)
- [ ] **INFOG-005**: AI Router updates — image_generation task in TASK_MODEL_MAP, generateImage() method delegating to Model Intelligence for model selection

### Data Layer

- [ ] **INFOG-006**: Data assembler extending deck generator patterns — reuse existing functions, add derived metrics (cumulativeStormExposure, daysSinceLastContact, neighborhoodConversionRate, insuranceDeadlineCountdown)
- [ ] **INFOG-007**: Prompt composer with model-specific templates — NB2 prompts with search_types, NB Pro prompts emphasizing composition, chain prompts splitting data accuracy vs visual refinement
- [ ] **INFOG-008**: Intent parser for conversational mode — classifies natural language into TopicModules + audience using AI Router classify task

### Templates

- [ ] **INFOG-009**: Pre-Knock Briefing (internal, 6 modules, "Parking Lot" moment) + Post-Storm Follow-up (internal, 5 modules with web search, "Post-Storm" moment)
- [ ] **INFOG-010**: Insurance Meeting Prep (internal, 5 modules with web search, "Meeting Prep") + Competitive Edge (internal, 5 modules, "Meeting Prep")
- [ ] **INFOG-011**: Customer Leave-Behind (customer-facing, 6 modules, "Leave-Behind" — triggers NB Pro or chain)
- [ ] **INFOG-012**: Template index with barrel exports, getPresetById(), getPresetsByMoment(), getPresetsForBatch() + Prep My Day batch preset

### Generation + Caching

- [ ] **INFOG-013**: Infographic generator service — orchestrates data assembly → model scoring → prompt composition → generation (with chain support), progress callbacks with contextual messages
- [ ] **INFOG-014**: API routes — POST /api/ai/generate-infographic (single), POST batch/, GET batch/[jobId], POST /api/ai/parse-infographic-intent — all with NextAuth session validation
- [ ] **INFOG-015**: Cache service — Upstash Redis (24hr standard, 7 days leave-behinds) + service worker layer, getCached/cacheResult/invalidateForCustomer

### Hooks

- [ ] **INFOG-016**: useInfographicGeneration hook — generation lifecycle, contextual progress messages (no model names), background generation, PWA push notification on complete
- [ ] **INFOG-017**: useInfographicBatch hook — per-customer autonomous model selection, parallel generation, progressive results
- [ ] **INFOG-018**: useInfographicPresets hook — template management with presets/getPreset/getByMoment/searchPresets

### UI Components

- [ ] **INFOG-019**: Generator modal — three-mode tabs (Presets | Custom | Ask AI), single Generate button, AnimatePresence, mobile-first bottom sheet
- [ ] **INFOG-020**: Preset selector (visual cards with usage moment labels) + Topic picker (checkbox grid with web search badges, audience toggle)
- [ ] **INFOG-021**: Generation progress — animated non-linear progress bar, contextual status messages, NO time estimates, NO model names, background generation support
- [ ] **INFOG-022**: Infographic preview (pinch-to-zoom) + Share sheet (SMS/email/link) + Batch day view (swipeable card stack)
- [ ] **INFOG-023**: Conversational input — text input for natural language, suggested topic chips

### Integration

- [ ] **INFOG-024**: Customer card integration — "Generate Briefing" button alongside existing deck generator button, badge notification for background completion
- [ ] **INFOG-025**: Dashboard "Prep My Day" — batch trigger for all today's appointments, shows BatchDayView with progressive results
- [ ] **INFOG-026**: Customer profile modal — infographic tab/action button, quick-launch preset generation, show recent cached infographics

### Polish & Testing

- [ ] **INFOG-027**: Offline support — service worker PNG caching, WiFi-aware prompting, offline indicator with regeneration offer
- [ ] **INFOG-028**: Unit tests — modelIntelligence scoring, dataAssembler metrics, promptComposer templates, intentParser classification (Vitest)
- [ ] **INFOG-029**: E2E tests — single generation, custom topics, conversational, batch, chain execution, share flows (Playwright)

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
| INFOG-001 | Phase 1 | Pending |
| INFOG-002 | Phase 1 | Pending |
| INFOG-003 | Phase 1 | Pending |
| INFOG-004 | Phase 1 | Pending |
| INFOG-005 | Phase 1 | Pending |
| INFOG-006 | Phase 2 | Pending |
| INFOG-007 | Phase 2 | Pending |
| INFOG-008 | Phase 2 | Pending |
| INFOG-009 | Phase 3 | Pending |
| INFOG-010 | Phase 3 | Pending |
| INFOG-011 | Phase 3 | Pending |
| INFOG-012 | Phase 3 | Pending |
| INFOG-013 | Phase 4 | Pending |
| INFOG-014 | Phase 4 | Pending |
| INFOG-015 | Phase 4 | Pending |
| INFOG-016 | Phase 5 | Pending |
| INFOG-017 | Phase 5 | Pending |
| INFOG-018 | Phase 5 | Pending |
| INFOG-019 | Phase 6 | Pending |
| INFOG-020 | Phase 6 | Pending |
| INFOG-021 | Phase 6 | Pending |
| INFOG-022 | Phase 6 | Pending |
| INFOG-023 | Phase 6 | Pending |
| INFOG-024 | Phase 7 | Pending |
| INFOG-025 | Phase 7 | Pending |
| INFOG-026 | Phase 7 | Pending |
| INFOG-027 | Phase 8 | Pending |
| INFOG-028 | Phase 8 | Pending |
| INFOG-029 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 after initial definition*
