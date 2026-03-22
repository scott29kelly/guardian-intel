# Roadmap: Infographic Generator

**Milestone:** v1 - AI-powered visual briefing generator
**Granularity:** Standard
**Total Phases:** 6
**Total Requirements:** 29

## Phases

- [ ] **Phase 1: Foundation + Model Intelligence** - Verify existing code (types, branding, model registry, adapter, router), commit as baseline
- [ ] **Phase 2: Data Layer** - Data assembler, prompt composer, and intent parser for content pipeline
- [ ] **Phase 3: Templates** - All 5 infographic presets plus template index and helpers
- [ ] **Phase 4: Generation Engine** - Orchestrator service, API routes, and cache layer
- [ ] **Phase 5: Hooks + UI** - React hooks and all UI components for the generation experience
- [ ] **Phase 6: Integration + Polish** - Wire into existing app surfaces, offline support, and tests

## Phase Details

### Phase 1: Foundation + Model Intelligence
**Goal**: Verified, committed baseline of types, branding, model intelligence, Gemini adapter, and router updates -- ready for downstream phases to build on
**Depends on**: Nothing
**Requirements**: INFOG-001, INFOG-002, INFOG-003, INFOG-004, INFOG-005
**Success Criteria** (what must be TRUE):
  1. All TypeScript types compile with zero errors and cover every generation entity (modes, presets, requests, responses, progress, cache)
  2. Branding assets render correct palette (Navy/Gold/Teal) for both dark (internal) and light (customer-facing) themes
  3. Model Intelligence scores a request and selects NB2, NB Pro, or a chain strategy based on audience, complexity, and web search dimensions
  4. Gemini Flash Image adapter accepts a prompt and returns a generated image with retry on failure
  5. AI Router routes an image_generation task through Model Intelligence without exposing model choice to callers
**Plans:** 2 plans
Plans:
- [x] 01-01-PLAN.md -- Verify and commit types, branding, and model intelligence (INFOG-001, INFOG-002, INFOG-003)
- [x] 01-02-PLAN.md -- Verify and commit Gemini adapter and router updates (INFOG-004, INFOG-005)

### Phase 2: Data Layer
**Goal**: Content pipeline that assembles customer data, composes model-aware prompts, and parses natural language intent into structured generation parameters
**Depends on**: Phase 1
**Requirements**: INFOG-006, INFOG-007, INFOG-008
**Success Criteria** (what must be TRUE):
  1. Data assembler produces all derived metrics (cumulativeStormExposure, daysSinceLastContact, neighborhoodConversionRate, insuranceDeadlineCountdown) from raw customer data
  2. Prompt composer generates distinct prompt formats for NB2 (with search_types), NB Pro (composition emphasis), and chain mode (split accuracy vs refinement)
  3. Intent parser classifies natural language input (e.g., "prep me for the Johnson meeting") into TopicModules and audience selection
**Plans:** 2 plans
Plans:
- [x] 02-01-PLAN.md -- Data assembler with reused deck-generator functions and 4 derived metrics (INFOG-006)
- [x] 02-02-PLAN.md -- Prompt composer with model-specific templates and intent parser for conversational mode (INFOG-007, INFOG-008)

### Phase 3: Templates
**Goal**: All five infographic presets defined with module structures, audience targeting, and usage moment tagging -- queryable by ID, moment, and batch
**Depends on**: Phase 2
**Requirements**: INFOG-009, INFOG-010, INFOG-011, INFOG-012
**Success Criteria** (what must be TRUE):
  1. Pre-Knock Briefing and Post-Storm Follow-up presets each define their modules, target internal audience, and tag to correct usage moments
  2. Insurance Meeting Prep and Competitive Edge presets define their modules with web search flags where needed
  3. Customer Leave-Behind preset targets customer-facing audience and triggers NB Pro or chain strategy via model intelligence
  4. Template index exposes getPresetById(), getPresetsByMoment(), getPresetsForBatch() and the "Prep My Day" batch preset works
**Plans:** 2 plans
Plans:
- [x] 03-01-PLAN.md -- All 5 infographic preset templates (INFOG-009, INFOG-010, INFOG-011)
- [x] 03-02-PLAN.md -- Template index with barrel exports, helpers, and Prep My Day batch preset (INFOG-012)

### Phase 4: Generation Engine
**Goal**: End-to-end generation pipeline -- a request goes in, an infographic image comes out, cached and accessible via API
**Depends on**: Phase 3
**Requirements**: INFOG-013, INFOG-014, INFOG-015
**Success Criteria** (what must be TRUE):
  1. Generator service orchestrates data assembly, model scoring, prompt composition, and image generation (including chain execution) with progress callbacks
  2. API routes handle single generation, batch generation, batch status polling, and intent parsing -- all behind NextAuth session validation
  3. Cache service stores results in Redis with correct TTLs (24hr standard, 7 days for leave-behinds) and supports invalidation per customer
**Plans:** 3 plans
Plans:
- [ ] 04-01-PLAN.md -- Cache service with Redis TTLs and customer invalidation (INFOG-015)
- [ ] 04-02-PLAN.md -- Generator orchestrator service with chain support and progress callbacks (INFOG-013)
- [ ] 04-03-PLAN.md -- API routes for generation, batch, status polling, and intent parsing (INFOG-014)

### Phase 5: Hooks + UI
**Goal**: Complete React-side generation experience -- hooks manage lifecycle and state, components provide the three-mode generator, progress feedback, preview, and sharing
**Depends on**: Phase 4
**Requirements**: INFOG-016, INFOG-017, INFOG-018, INFOG-019, INFOG-020, INFOG-021, INFOG-022, INFOG-023
**Success Criteria** (what must be TRUE):
  1. useInfographicGeneration hook manages full generation lifecycle with contextual progress messages (no model names exposed) and supports background generation with push notification
  2. useInfographicBatch hook runs parallel generation across customers with progressive result delivery
  3. Generator modal presents three tabs (Presets, Custom, Ask AI) as a mobile-first bottom sheet with a single Generate button
  4. Preview component supports pinch-to-zoom, share sheet offers SMS/email/link, and batch view displays a swipeable card stack
  5. Conversational input accepts natural language with suggested topic chips
**Plans**: TBD

### Phase 6: Integration + Polish
**Goal**: Infographic generator is wired into every relevant app surface, works offline, and has test coverage
**Depends on**: Phase 5
**Requirements**: INFOG-024, INFOG-025, INFOG-026, INFOG-027, INFOG-028, INFOG-029
**Success Criteria** (what must be TRUE):
  1. Customer card shows "Generate Briefing" button and displays badge notification when background generation completes
  2. Dashboard "Prep My Day" triggers batch generation for all today's appointments and shows progressive results
  3. Customer profile modal includes infographic tab with quick-launch presets and displays recent cached infographics
  4. Offline mode caches generated PNGs via service worker, prompts on WiFi awareness, and offers regeneration when back online
  5. Unit tests cover model scoring, data assembler metrics, prompt templates, and intent classification; E2E tests cover generation flows and sharing
**Plans**: TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Model Intelligence | 2/2 | Complete | 2026-03-22 |
| 2. Data Layer | 2/2 | Complete | 2026-03-22 |
| 3. Templates | 2/2 | Complete | 2026-03-22 |
| 4. Generation Engine | 0/3 | Planned | - |
| 5. Hooks + UI | 0/? | Not started | - |
| 6. Integration + Polish | 0/? | Not started | - |

---
*Roadmap created: 2026-03-21*
*Last updated: 2026-03-22*
