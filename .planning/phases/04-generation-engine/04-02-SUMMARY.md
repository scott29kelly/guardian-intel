---
phase: 04-generation-engine
plan: 02
subsystem: infographic-generator
tags: [orchestrator, pipeline, generation, chain]
dependency_graph:
  requires: [04-01]
  provides: [generateInfographic]
  affects: [04-03]
tech_stack:
  added: []
  patterns: [pipeline-orchestrator, progress-callback, mode-dispatch]
key_files:
  created:
    - src/features/infographic-generator/services/infographicGenerator.ts
  modified: []
decisions:
  - No retry logic in generator -- AI Router adapter handles retries
  - No caching in generator -- API route layer (Plan 03) handles cache check/store
  - Progress messages use contextual language with zero model name exposure
metrics:
  duration: 65s
  completed: "2026-03-22T02:02:37Z"
  tasks: 1
  files: 1
---

# Phase 04 Plan 02: Infographic Generator Service Summary

Pipeline orchestrator wiring all Phase 1-3 components (data assembler, model intelligence, prompt composer, intent parser, templates, AI Router) into a single `generateInfographic()` entry point with chain support and contextual progress callbacks.

## What Was Built

### Task 1: Infographic Generator Orchestrator Service
**Commit:** `6a76ffc`
**File:** `src/features/infographic-generator/services/infographicGenerator.ts`

Created the central orchestrator service with:

1. **Module resolution** (`resolveModules`): Dispatches by generation mode
   - `preset`: looks up preset by ID, extracts enabled modules and audience
   - `custom`: uses directly provided modules with optional audience override
   - `conversational`: calls `parseIntent()` for AI-powered module selection

2. **Single model generation** (`generateSingle`): Builds `ImageGenerationRequest` with web search grounding and resolution from scoring result, calls `AIRouter.generateImage()`

3. **Chain generation** (`generateChain`): Two-step pipeline
   - Step 1 (accuracy): NB2 with web grounding, emits "Generating your briefing..."
   - Step 2 (refinement): NB Pro using step 1 output as `referenceImages`, emits "Polishing final output..."

4. **Main entry point** (`generateInfographic`): Full pipeline orchestration
   - Resolve modules (5%) -> Assemble data (15%) -> Score model (25%) -> Compose prompt -> Generate (40%) -> Complete (100%)
   - Error handling wraps entire pipeline, emits failure progress on error
   - Returns `InfographicResponse` with timing, chain flag, and no cache (cache handled upstream)

## Pipeline Architecture

```
InfographicRequest
  |
  v
resolveModules() -- preset | custom | conversational
  |
  v
assembleDataForModules() -- parallel data fetching
  |
  v
scoreRequest() -- sync model/chain selection
  |
  v
composePrompt() -- model-aware prompt
  |
  v
generateSingle() or generateChain() -- AI Router calls
  |
  v
InfographicResponse
```

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all data sources, scoring, prompt composition, and AI Router calls are wired to real upstream implementations.

## Verification

- TypeScript compilation: zero errors (`npx tsc --noEmit`)
- All 13 acceptance criteria pass (grep checks for exports, imports, progress messages)
- Chain execution sends step 1 output as `referenceImages` to step 2
- Progress messages contain no model names

## Self-Check: PASSED
