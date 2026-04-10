# Guardian Intel — Infographic Generator + NotebookLM Multi-Artifact

## What This Is

An AI-powered sales briefing generator for Guardian Intel that turns a single NotebookLM notebook into multiple rep-ready artifacts (slide decks, infographics, audio briefings, written reports) plus on-demand visual briefings for field reps. Reps select a customer and the system autonomously orchestrates the right set of artifacts, branded and delivered with zero configuration.

## Core Value

Reps get actionable, multi-format briefings in one tap — no model pickers, no quality sliders, no configuration. A single 3-5 minute notebook creation yields every artifact a rep might need for a customer interaction, with background processing and push notifications so reps never babysit a modal.

## Current Milestone: v1.1 NotebookLM Multi-Artifact + UI Loops

**Goal:** Turn each NotebookLM notebook creation into 4 artifacts (deck, infographic, audio briefing, written report) with rep-facing UI to view all of them, and wire the push-notification flow so 3-5 minute background runs don't silently fail the rep.

**Target features:**
- Multi-artifact orchestration off a single notebook — backend service + API + Prisma model + storage paths
- CustomerArtifactsPanel — 2x2 grid with per-artifact status, preview, audio player, markdown report viewer
- Push notification subscribe prompt — mount existing dead component, heuristic trigger after first background generation
- (Stretch) Proposals UI — only if primary scope lands under budget

**Key context:**
- NLM service already exposes all 4 generator entry points (`src/lib/services/notebooklm/index.ts` lines 186, 301, 438, 537) — they need orchestration, not new generation logic
- Build on the async "fire and forget" pattern in `/api/decks/process-now/route.ts`
- Reuse `assertCustomerAccess` (Phase 7 D-04), `recoverStuckDecks` (D-07), and existing preview/share components
- Explicit deprioritizations: D-06 Supabase bucket lockdown, real SendGrid/Twilio delivery, NLM auth refresh hardening, Contracts/Carriers UI, v2 infographic features — safe while on mock data; must land before real-customer rollout

**Current state (Phase 8 complete, 2026-04-10):**
- Multi-artifact backend landed: `generateCustomerArtifacts` orchestrator, `POST /api/ai/generate-customer-artifacts`, per-artifact Prisma columns, generalized Supabase upload prefixes, per-artifact stuck-job sweep with orphan notebook cleanup
- Next: Phase 9 (Multi-Artifact UI) — CustomerArtifactsPanel, audio player, report viewer

## Requirements

### Validated

- ✓ AI Router with multi-model support (Gemini, Claude, Kimi, Perplexity, OpenAI) — existing
- ✓ Deck Generator feature with templates, branding, data aggregation — existing pattern reference
- ✓ Customer data model with property, insurance, pipeline, weather, interactions — existing
- ✓ PWA service worker for offline support — existing
- ✓ TanStack Query + Radix UI + Framer Motion UI stack — existing
- ✓ Upstash Redis caching infrastructure — existing
- ✓ INFOG-001: TypeScript types for infographic generation — Phase 1
- ✓ INFOG-002: Branding assets (dark + light themes) — Phase 1
- ✓ INFOG-003: Model Intelligence Layer (registry, scoring, chain strategies) — Phase 1
- ✓ INFOG-004: Gemini Flash Image adapter (NB2 with web grounding) — Phase 1
- ✓ INFOG-005: AI Router updates (image_generation task routing) — Phase 1
- ✓ INFOG-006: Data assembler with derived metrics — Phase 2
- ✓ INFOG-007: Prompt composer (model-aware prompts) — Phase 2
- ✓ INFOG-008: Intent parser (conversational → modules + audience) — Phase 2
- ✓ INFOG-009: Pre-Knock + Post-Storm templates — Phase 3
- ✓ INFOG-010: Insurance Prep + Competitive Edge templates — Phase 3
- ✓ INFOG-011: Customer Leave-Behind template — Phase 3
- ✓ INFOG-012: Template index + helpers — Phase 3
- ✓ INFOG-013: Infographic generator service (orchestrator) — Phase 4
- ✓ INFOG-014: API routes (single + batch + intent parse) — Phase 4
- ✓ INFOG-015: Cache service (Redis + service worker) — Phase 4 (SW layer deferred to Phase 6)

### Active
- [ ] INFOG-016: useInfographicGeneration hook
- [ ] INFOG-017: useInfographicBatch hook
- [ ] INFOG-018: useInfographicPresets hook
- [ ] INFOG-019: Generator modal (3-mode tabs)
- [ ] INFOG-020: Preset selector + Topic picker
- [ ] INFOG-021: Generation progress component
- [ ] INFOG-022: Preview + Share + Batch view
- [ ] INFOG-023: Conversational input component
- [ ] INFOG-024: Customer card integration
- [ ] INFOG-025: Dashboard "Prep My Day"
- [ ] INFOG-026: Customer profile modal integration
- [ ] INFOG-027: Offline support
- [ ] INFOG-028: Unit tests
- [ ] INFOG-029: E2E tests

### Out of Scope

- Video generation — complexity and cost, defer to future
- Custom model selection UI — violates "zero configuration" principle
- Quality/resolution sliders — violates "invisible intelligence" principle
- Real-time collaborative editing of infographics — not needed for field reps
- PDF export of infographics — PNG is sufficient for mobile use

## Context

- **Existing pattern:** Deck Generator (`src/features/deck-generator/`) provides the architectural pattern — templates, data aggregation, hooks, components, API routes
- **Available models:** NB2 (gemini-3.1-flash-image-preview) for web grounding + cost efficiency; NB Pro (gemini-3-pro-image) for visual fidelity + complex layouts
- **Chain strategies:** NB2→NB Pro for web-grounded quality, complexity upgrades, and batch elevation
- **Groups 0-1 already implemented:** Types, branding, model intelligence, Gemini adapter, and router updates exist as untracked/modified files
- **Mobile-first:** Reps use this in the field on phones — bottom sheets, pinch-to-zoom, swipeable cards

## Constraints

- **Tech stack**: Next.js 15, React 19, TypeScript, Prisma, Tailwind, Radix UI, Framer Motion
- **AI models**: NB2 and NB Pro only — no other image generation models
- **Zero config**: No model pickers, quality sliders, or resolution selectors exposed to reps
- **Branding**: Navy (#1E3A5F), Gold (#D4A656), Teal (#4A90A4) palette — dark for internal, light for customer-facing
- **Caching**: Upstash Redis (24hr standard, 7 days for leave-behinds) + service worker for offline

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Autonomous model selection over user choice | Quality-first, zero-config design principle | — Pending |
| NB2→NB Pro chain for web+customer-facing | NB2 provides web grounding NB Pro lacks; NB Pro provides fidelity NB2 lacks | — Pending |
| Follow Deck Generator patterns | Proven architecture in same codebase reduces risk | — Pending |
| PRD groups as phase structure | Natural dependency ordering already defined | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-22 after Phase 4 completion*
