---
phase: 02-data-layer
plan: 02
subsystem: infographic-generator
tags: [prompt-composer, intent-parser, ai-classification, model-specific-prompts]
dependency_graph:
  requires: [01-01, 02-01]
  provides: [prompt-composition, intent-parsing, topic-modules-registry]
  affects: [03-templates, 04-orchestrator, 05-ui]
tech_stack:
  added: []
  patterns: [model-dispatch, audience-branching, keyword-fallback, multi-label-classification]
key_files:
  created:
    - src/features/infographic-generator/services/promptComposer.ts
    - src/features/infographic-generator/services/intentParser.ts
  modified: []
key_decisions:
  - "Prompt composer dispatches on ScoringResult model properties rather than model ID strings for extensibility"
  - "Intent parser uses confidence threshold 0.3 with default module fallback for low-confidence results"
  - "Chain prompts split into accuracy (data focus) and refinement (visual polish) with independent branding"
metrics:
  duration: 134s
  completed: "2026-03-22T01:23:17Z"
  tasks: 2
  files_created: 2
  files_modified: 0
---

# Phase 02 Plan 02: Prompt Composer and Intent Parser Summary

Model-aware prompt composition for NB2/NB Pro/chain scenarios with audience-specific branding, plus AI-powered natural language intent parsing into TopicModule selections.

## What Was Built

### Prompt Composer (`promptComposer.ts`)

Three distinct prompt templates for infographic generation:

1. **NB2 Prompt** -- Includes `search_types ["web", "image"]` instructions when modules require web search grounding. Optimized for data accuracy and web-augmented content.

2. **NB Pro Prompt** -- Emphasizes `COMPOSITION PRIORITY` with magazine-quality layout instructions. No search_types (NB Pro cannot search). Focuses on typography, whitespace, and visual polish.

3. **Chain Prompts** -- Two-step process:
   - `accuracyPrompt` (NB2 step): Data-focused with web grounding, notes that layout will be refined
   - `refinementPrompt` (NB Pro step): Takes reference image, preserves data, applies branding and professional finish

All prompts inject audience-aware branding via `buildBrandingInstructions`:
- Internal: dark theme, navy background, gold/teal accents, logo top-left, data-dense
- Customer-facing: light theme, white background, navy text, logo centered, professional

### Intent Parser (`intentParser.ts`)

Conversational mode (Mode 3) support:

- **13 AVAILABLE_MODULES** defining the full topic module registry with data sources and visual elements
- **AI Classification** via `getAIRouter().classify()` with `multiLabel: true` for multi-topic selection
- **Audience Inference** from 10 customer-facing signal patterns (e.g., "leave behind", "share with", "for the homeowner")
- **Confidence Filtering** at threshold 0.3 -- modules below are excluded
- **Keyword Fallback** when AI Router is unavailable, mapping keywords to module IDs
- **Default Modules** (property-overview, storm-timeline, lead-scoring, next-steps) when no modules match

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create prompt composer with model-specific templates | 2caf459 | promptComposer.ts |
| 2 | Create intent parser for conversational mode | 756ad59 | intentParser.ts |

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- both services are fully implemented with all exports and logic wired.

## Self-Check: PASSED
