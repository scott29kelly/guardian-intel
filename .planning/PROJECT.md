# Infographic Generator

## What This Is

An AI-powered visual briefing generator for Guardian Intel that creates on-demand infographic images for sales reps. Reps select a customer and content type, and the system autonomously selects the optimal AI model (or model chain) to produce a branded infographic — zero configuration, quality-first, invisible intelligence.

## Core Value

Reps get actionable visual briefings in one tap — no model pickers, no quality sliders, no configuration. The system always produces the best output using whatever model or chain is optimal.

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

### Active
- [ ] INFOG-006: Data assembler with derived metrics
- [ ] INFOG-007: Prompt composer (model-aware prompts)
- [ ] INFOG-008: Intent parser (conversational → modules + audience)
- [ ] INFOG-009: Pre-Knock + Post-Storm templates
- [ ] INFOG-010: Insurance Prep + Competitive Edge templates
- [ ] INFOG-011: Customer Leave-Behind template
- [ ] INFOG-012: Template index + helpers
- [ ] INFOG-013: Infographic generator service (orchestrator)
- [ ] INFOG-014: API routes (single + batch + intent parse)
- [ ] INFOG-015: Cache service (Redis + service worker)
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
*Last updated: 2026-03-22 after Phase 1 completion*
