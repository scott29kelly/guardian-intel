---
phase: 04-generation-engine
plan: 03
subsystem: api-routes
tags: [api, routes, generation, batch, intent-parsing, auth]
dependency_graph:
  requires: [04-01, 04-02]
  provides: [infographic-api-routes]
  affects: [05-hooks-ui]
tech_stack:
  added: []
  patterns: [cache-first-retrieval, fire-and-forget-background, in-memory-job-store]
key_files:
  created:
    - src/app/api/ai/generate-infographic/route.ts
    - src/app/api/ai/generate-infographic/batch/route.ts
    - src/app/api/ai/generate-infographic/batch/[jobId]/route.ts
    - src/app/api/ai/parse-infographic-intent/route.ts
  modified: []
decisions:
  - Manual validation instead of Zod for lightweight request parsing (types already well-defined)
  - In-memory Map for batch job store (sufficient for v1 single-instance)
  - Fire-and-forget async IIFE for background batch generation
metrics:
  duration: 109s
  completed: "2026-03-22T02:06:34Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 0
---

# Phase 04 Plan 03: API Routes Summary

Four API route handlers exposing infographic generation, batch generation, batch status polling, and intent parsing -- all behind NextAuth session validation with cache-first retrieval pattern.

## What Was Built

### Task 1: Single Generation and Intent Parsing Routes (63c1ffc)

**POST /api/ai/generate-infographic** (`src/app/api/ai/generate-infographic/route.ts`)
- NextAuth session check (401 if unauthenticated)
- Manual validation of customerId (string) and mode (preset|custom|conversational)
- Cache-first: checks getCached() for preset+presetId before generating
- Calls generateInfographic() from orchestrator service
- Stores result via cacheResult() with audience-aware TTL
- Returns InfographicResponse with cached flag

**POST /api/ai/parse-infographic-intent** (`src/app/api/ai/parse-infographic-intent/route.ts`)
- NextAuth session check (401 if unauthenticated)
- Validates prompt (string) required field
- Calls parseIntent() and returns modules, audience, confidence
- try/catch with 500 error handling

### Task 2: Batch Generation and Status Polling Routes (0c8e967)

**POST /api/ai/generate-infographic/batch** (`src/app/api/ai/generate-infographic/batch/route.ts`)
- NextAuth session check (401 if unauthenticated)
- Validates customerIds (non-empty string array) and autoSelectPresets (boolean)
- Generates jobId via crypto.randomUUID()
- In-memory Map<string, BatchJob> for job tracking
- Fire-and-forget async IIFE runs sequential generation per customer
- Each result cached via cacheResult()
- Returns 202 with { jobId, customerCount }

**GET /api/ai/generate-infographic/batch/[jobId]** (`src/app/api/ai/generate-infographic/batch/[jobId]/route.ts`)
- NextAuth session check (401 if unauthenticated)
- Looks up job from exported batchJobs Map
- Returns 404 if job not found
- Computes summary stats: total, completed, failed, pending, generating
- Returns status as "complete" when all customers are complete or error

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Manual validation over Zod | Types already well-defined in infographic.types.ts; keeps routes lightweight |
| In-memory Map for batch jobs | Sufficient for v1 single-instance; Redis upgrade noted for production |
| Fire-and-forget IIFE | HTTP returns 202 immediately; polling endpoint provides progress |
| Sequential batch generation | Avoids overwhelming AI provider; each result cached individually |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all routes are fully wired to their respective service functions.

## Verification Results

- TypeScript compiles with zero errors
- All 4 route files exist under correct Next.js App Router paths
- Every route checks NextAuth session before processing
- Single generation route integrates cache check + store
- Batch route runs generation in background and returns immediately
- Status route returns structured progress per customer
- All acceptance criteria grep checks pass (9/9 Task 1, 9/9 Task 2)

## Self-Check: PASSED

- All 4 created files verified on disk
- Both task commits (63c1ffc, 0c8e967) verified in git log
