# Roadmap: Infographic Generator + NotebookLM Multi-Artifact

**Milestone:** v1.1 - NotebookLM Multi-Artifact + UI Loops (current)
**Previous Milestone:** v1 - AI-powered visual briefing generator (Phases 1-7, complete)
**Granularity:** Standard
**Total Phases:** 12 (7 v1.0 + 5 v1.1 including one stretch)
**Total Requirements:** 47 (29 v1.0 + 18 v1.1)

## Phases

- [x] **Phase 1: Foundation + Model Intelligence** - Verify existing code (types, branding, model registry, adapter, router), commit as baseline
- [x] **Phase 2: Data Layer** - Data assembler, prompt composer, and intent parser for content pipeline
- [x] **Phase 3: Templates** - All 5 infographic presets plus template index and helpers
- [x] **Phase 4: Generation Engine** - Orchestrator service, API routes, and cache layer
- [x] **Phase 5: Hooks + UI** - React hooks and all UI components for the generation experience
- [x] **Phase 6: Integration + Polish** - Wire into existing app surfaces, offline support, and tests
- [x] **Phase 7: Cleanup + Hardening** - Data integrity bugs, rep-ownership authorization, NotebookLM operational hardening
- [ ] **Phase 8: Multi-Artifact Backend** - Prisma model, orchestrator, API routes, storage paths, and stuck-job recovery for per-artifact job tracking
- [ ] **Phase 9: Multi-Artifact UI** - CustomerArtifactsPanel with 2x2 grid, audio player, report viewer, and customer profile wiring
- [ ] **Phase 10: Push Notification Flow** - Mount prompt component with heuristic trigger, wire per-artifact push events through service worker
- [ ] **Phase 11: Testing** - Unit tests for orchestrator + hook + components, E2E test for full rep-fires-multi-artifact flow
- [ ] **Phase 12 (Stretch): Proposals UI** - Optional rep-facing proposal generation flow, only if primary scope lands under budget

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
- [x] 04-01-PLAN.md -- Cache service with Redis TTLs and customer invalidation (INFOG-015)
- [x] 04-02-PLAN.md -- Generator orchestrator service with chain support and progress callbacks (INFOG-013)
- [x] 04-03-PLAN.md -- API routes for generation, batch, status polling, and intent parsing (INFOG-014)

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
**Plans:** 4 plans
**UI hint**: yes
Plans:
- [x] 05-01-PLAN.md -- React hooks: useInfographicGeneration, useInfographicBatch, useInfographicPresets (INFOG-016, INFOG-017, INFOG-018)
- [x] 05-02-PLAN.md -- Generator modal with three-mode tabs, PresetSelector, and TopicPicker (INFOG-019, INFOG-020)
- [x] 05-03-PLAN.md -- GenerationProgress with animated progress bar, ConversationalInput with topic chips (INFOG-021, INFOG-023)
- [x] 05-04-PLAN.md -- InfographicPreview with pinch-to-zoom, ShareSheet, BatchDayView card stack (INFOG-022)

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
**Plans:** 3 plans
**UI hint**: yes
Plans:
- [x] 06-01-PLAN.md -- App surface integration: customer card button, dashboard Prep My Day, profile modal tab (INFOG-024, INFOG-025, INFOG-026)
- [x] 06-02-PLAN.md -- Offline support: service worker PNG caching, WiFi awareness utilities (INFOG-027)
- [x] 06-03-PLAN.md -- Tests: unit tests for model intelligence, prompt composer, intent parser + E2E generation flows (INFOG-028, INFOG-029)

### Phase 7: Cleanup: data integrity bugs, security hardening, and NotebookLM operational hardening

**Goal:** Fix three tiers of debt in the deck-generator and infographic-generator pipelines: Tier 1 data integrity bugs (claim field drift, fake-sequential batch loop, silent first-user fallback), Tier 2 security hardening (rep-ownership authorization on infographic + deck-status routes, Supabase bucket ACL verification), and Tier 4 NotebookLM operational hardening (stuck-job recovery sweep, cancelable processing jobs, removal of orphaned cron route). Sourced from Codex adversarial review `task-mnp6gcn3-ihhwdf` (2026-04-07).
**Requirements**: D-01, D-02, D-03, D-04, D-05, D-06, D-07, D-08, D-09 (nine locked decisions from 07-CONTEXT.md — remediation phase, no INFOG-xxx requirement IDs)
**Depends on:** Phase 6
**Plans:** 3 plans

Plans:
- [x] 07-01-PLAN.md -- Tier 1: D-01 claim field drift, D-02 sequential batch loop, D-03 strict 401 (data integrity)
- [x] 07-02-PLAN.md -- Tier 2: D-04/D-05 rep-ownership authorization via assertCustomerAccess, D-06 Supabase bucket ACL verification (security hardening)
- [x] 07-03-PLAN.md -- Tier 4: D-07 stuck-job recovery sweep, D-08 cancel processing jobs, D-09 delete orphaned cron route (operational hardening)

---

## v1.1 Milestone: NotebookLM Multi-Artifact + UI Loops

Phases 8-12 deliver the v1.1 milestone: turn each NotebookLM notebook run into four rep-ready artifacts (deck, infographic, audio briefing, written report) with a unified rep-facing UI and reliable push notifications so reps don't babysit 3-5 minute background generations. Stretch Phase 12 (Proposals UI) is optional — only if primary scope (Phases 8-11) lands under budget.

### Phase 8: Multi-Artifact Backend
**Goal**: A single API call produces all four artifacts off one notebook, tracked per-artifact in the database, stored in distinct Supabase paths, and recoverable when any artifact gets stuck
**Depends on**: Phase 7
**Requirements**: NLMA-01, NLMA-02, NLMA-03, NLMA-04, NLMA-05, NLMA-06
**Success Criteria** (what must be TRUE):
  1. A rep-authorized POST to `/api/ai/generate-customer-artifacts` with `{ customerId, artifacts: ['deck','infographic','audio','report'] }` returns a job ID immediately and begins background generation against a single reused notebook
  2. Polling the status endpoint returns per-artifact state (`deck`, `infographic`, `audio`, `report` each with `status`, `url`, `progress`, `error`), transitioning from `pending` to `processing` to `ready` independently as each generator finishes
  3. Each completed artifact lands in its type-specific Supabase path (`decks/`, `infographics/`, `audio/`, `reports/`) with the correct content-type header and a retrievable URL
  4. A job whose audio artifact hangs in "processing" for more than 15 minutes is swept by the stuck-job recovery pass without clobbering the already-completed deck or infographic in the same job
  5. Prisma migrations land cleanly against the existing `ScheduledDeck` model or a partnered `ScheduledArtifactSet` table, committed with the schema change and generated client
**Plans:** TBD

### Phase 9: Multi-Artifact UI
**Goal**: Reps see all four artifacts for a customer in one mobile-first panel — grid view, inline audio playback, markdown report rendering — and can launch "Generate all artifacts" from the existing customer surfaces
**Depends on**: Phase 8
**Requirements**: NLMA-07, NLMA-08, NLMA-09, NLMA-10, NLMA-11
**Success Criteria** (what must be TRUE):
  1. `useCustomerArtifacts(customerId)` polls the per-artifact status endpoint, returns a unified TanStack Query state, and stops polling once all four artifacts are in a terminal state
  2. `CustomerArtifactsPanel` renders a 2x2 responsive grid where each card shows live status (pending/processing/ready/failed), a preview thumbnail, and a tap-to-open action that respects the existing mobile bottom-sheet patterns
  3. `AudioBriefingPlayer` plays a ready audio briefing inline with Navy/Gold/Teal branded controls sized for mobile thumb use and offers a share action through the existing `ShareSheet`
  4. `ReportViewer` renders the markdown report with Geist typography and brand palette, scrolls smoothly on mobile, and offers share/download actions
  5. The customer profile modal, `InfographicGeneratorModal` success state, and customer card all surface the artifacts panel or a "Generate all artifacts" action alongside the existing deck/infographic buttons
**Plans:** TBD
**UI hint**: yes

### Phase 10: Push Notification Flow
**Goal**: Reps get reliably prompted to enable push once they've shown intent, and their service worker fires exactly one push notification per job when all requested artifacts have reached a terminal state (per Phase 8 D-10)
**Depends on**: Phase 8 (backend events must exist to be consumed)
**Requirements**: NLMA-12, NLMA-13, NLMA-14, NLMA-15
**Success Criteria** (what must be TRUE):
  1. `push-notification-prompt.tsx` is mounted in the dashboard layout and never appears on cold load — only after a rep has fired their first background generation in the current session
  2. A rep who dismisses the prompt does not see it again on reload (persisted via `localStorage`), and a rep who accepts receives the browser permission flow exactly once
  3. When the backend marks a multi-artifact job as terminal (all requested artifacts reached ready/failed/skipped), `deck-processing.ts::sendArtifactJobCompletionNotification` fires exactly ONE push notification — "All artifacts ready" on success, "Generation finished with errors" on partial failure — and `public/sw.js` surfaces a corresponding toast with the job id as the notification tag. Phase 8 D-10 overrode the original per-artifact notification plan; Phase 10 verifies the single-notification UX and mounts the prompt.
**Plans:** TBD
**UI hint**: yes

### Phase 11: Testing
**Goal**: The multi-artifact pipeline has unit coverage on orchestrator + hook + components and an end-to-end Playwright spec that drives the full rep flow
**Depends on**: Phases 8, 9, 10 (all primary scope must be wired)
**Requirements**: NLMA-16, NLMA-17
**Success Criteria** (what must be TRUE):
  1. Vitest unit tests cover `generateCustomerArtifacts` orchestrator happy path and failure branches, per-artifact stuck-job recovery edge cases, `useCustomerArtifacts` state transitions, and audio/report component rendering
  2. Playwright E2E spec drives the full flow: rep fires multi-artifact generation, push notification prompt appears, rep accepts, one toast fires when the job reaches terminal state, `CustomerArtifactsPanel` ends showing all four artifacts viewable
  3. Test suites run green in CI and fail clearly on regression (orchestrator contract changes, hook state machine drift, UI status rendering)
**Plans:** TBD

### Phase 12 (Stretch): Proposals UI
**Goal**: (Optional — only if Phases 8-11 land under budget) Reps can generate, preview, and send a proposal from the customer profile, reusing the existing `src/lib/services/proposals/generator.ts` service
**Depends on**: Phase 11 (only attempted after primary scope is testing-green)
**Requirements**: NLMA-18
**Success Criteria** (what must be TRUE):
  1. A "Generate proposal" button appears on the customer profile and kicks off generation through the existing `proposals/generator.ts` service without duplicating AI plumbing
  2. Reps see a proposal preview in a mobile-friendly layout with send/share actions
  3. The proposal flow reuses existing rep-ownership authorization (`assertCustomerAccess`) and storage patterns — no net-new security surface
**Plans:** TBD
**UI hint**: yes
**Status**: Stretch — only attempt if primary v1.1 scope (Phases 8-11) lands under budget

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Model Intelligence | 2/2 | Complete | 2026-03-22 |
| 2. Data Layer | 2/2 | Complete | 2026-03-22 |
| 3. Templates | 2/2 | Complete | 2026-03-22 |
| 4. Generation Engine | 3/3 | Complete | 2026-03-22 |
| 5. Hooks + UI | 4/4 | Complete | 2026-03-22 |
| 6. Integration + Polish | 3/3 | Complete | 2026-03-22 |
| 7. Cleanup + Hardening | 3/3 | Complete | 2026-04-07 |
| 8. Multi-Artifact Backend | 0/? | Not started | - |
| 9. Multi-Artifact UI | 0/? | Not started | - |
| 10. Push Notification Flow | 0/? | Not started | - |
| 11. Testing | 0/? | Not started | - |
| 12. Proposals UI (Stretch) | 0/? | Not started | - |

---
*Roadmap created: 2026-03-21*
*Last updated: 2026-04-09 — v1.1 milestone added (Phases 8-12)*
