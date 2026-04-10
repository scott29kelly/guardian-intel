---
phase: "08"
plan: "08-03"
subsystem: lead-intel-apis
tags: [api-routes, ingest, backfill, compound-query, outcome-hooks, lead-generation]
dependency_graph:
  requires: [08-01, 08-02]
  provides: [lead-intel-api-surface, backfill-orchestrator, outcome-write-back]
  affects: [src/lib/data/customers.ts, src/lib/env.ts]
tech_stack:
  added: []
  patterns: [shared-secret-auth, constant-time-comparison, admin-role-gate, raw-sql-postgis, outcome-write-back]
key_files:
  created:
    - src/lib/services/lead-intel/queries/saved.ts
    - src/lib/services/lead-intel/backfill/run.ts
    - src/app/api/lead-intel/ingest/route.ts
    - src/app/api/lead-intel/backfill/route.ts
    - src/app/api/lead-intel/properties/route.ts
    - src/app/api/lead-intel/properties/[id]/route.ts
    - src/app/api/lead-intel/queries/high-value-roof-storm-neighbor/route.ts
  modified:
    - src/lib/env.ts
    - src/lib/services/lead-intel/queries/index.ts
    - src/lib/services/lead-intel/backfill/index.ts
    - src/lib/data/customers.ts
decisions:
  - "Constant-time comparison via timingSafeEqual for ingest shared-secret auth"
  - "Canvassing outcome write-back deferred to follow-up micro-phase (customer hooks ship now)"
  - "Backfill orchestrator uses fire-all-extractors pattern per source row"
metrics:
  duration: "453s"
  completed: "2026-04-10T03:27:34Z"
  tasks_completed: 3
  tasks_total: 3
  files_created: 7
  files_modified: 4
---

# Phase 08 Plan 03: Ingest/Backfill/Query/Outcome APIs + Saved Compound Query + Outcome Hook Insertion Summary

Five HTTP routes under `/api/lead-intel/*` with dual auth surfaces (shared-secret for n8n ingest, NextAuth+admin for backfill), the LG-09 doc-aligned compound PostGIS query, the backfill orchestrator wiring all 5 internal extractors, and LG-08 outcome write-back hooks inserted into the customer data layer.

## Completed Tasks

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 08-03.1 | Add env var + saved query + backfill orchestrator | `0fdf2ee` | `src/lib/env.ts`, `queries/saved.ts`, `backfill/run.ts` |
| 08-03.2 | Create 5 API routes | `f98a34a` | `ingest/route.ts`, `backfill/route.ts`, `properties/route.ts`, `properties/[id]/route.ts`, `queries/.../route.ts` |
| 08-03.3 | Insert LG-08 outcome write-back hooks | `8bfb68a` | `src/lib/data/customers.ts` |

## What Was Built

### Task 08-03.1: Env Var + Saved Query + Backfill Orchestrator

- **`LEAD_INTEL_INGEST_SECRET`** added to `src/lib/env.ts` zod schema as `z.string().min(32).optional()`. Throws in production if missing; warns in development.
- **`highValueRoofStormNeighbor`** saved compound query in `src/lib/services/lead-intel/queries/saved.ts` — a single raw SQL query using PostGIS `ST_DWithin` that finds properties with roof age 15-25, 3+ storm events in 36 months, and at least one Guardian closed-won customer within 1 mile in 12 months. Parameterized via Prisma tagged templates.
- **`runInternalBackfill`** orchestrator in `src/lib/services/lead-intel/backfill/run.ts` — reads Customer, WeatherEvent, CanvassingPin, Interaction, and PropertyData; routes each through `processSourceRow` for entity resolution; runs all 5 signal extractors (roof-age, storm-exposure, canvassing-recency, crm-contact-recency, neighbor-win); refreshes denormalized aggregates; optionally recomputes score snapshots.

### Task 08-03.2: Five API Routes

1. **`POST /api/lead-intel/ingest`** — n8n entry point with shared-secret header `X-Lead-Intel-Ingest-Key` and `timingSafeEqual` constant-time comparison. Returns 401 on missing/wrong header. Processes batches of source rows through `processSourceRow`.
2. **`POST /api/lead-intel/backfill`** — admin-only trigger requiring NextAuth session with `role === "admin"`. Runs `runInternalBackfill` and returns `IngestStats`.
3. **`GET /api/lead-intel/properties`** — paginated list with filters (minScore, maxScore, signalTypes, hasPendingResolution, zipCode, state). NextAuth required, any authenticated user.
4. **`GET /api/lead-intel/properties/:id`** — full property detail (provenance, signals, snapshot, outcomes) with lazy snapshot recomputation. NextAuth required.
5. **`GET /api/lead-intel/queries/high-value-roof-storm-neighbor`** — LG-09 saved compound query with optional override params. NextAuth required.

All routes follow CLAUDE.md conventions: try/catch wrapping, `[API] METHOD /path error:` log prefix, `{ success, error, details }` error shape.

### Task 08-03.3: LG-08 Outcome Write-Back Hooks

- **`updateCustomer`** — captures previous stage/status before update; fires `writeOutcomeEvent` with `customer-stage-changed` or `customer-status-changed` when the field actually changes AND the customer is bridged to a `TrackedProperty`.
- **`bulkUpdateCustomers`** — same pattern but iterates over all affected customers.
- **Canvassing hook deferred** — documented as `LG-08 FOLLOW-UP` block at bottom of `customers.ts`. The canvassing mutation surface is scattered across `src/app/api/canvassing/**` and SalesRabbit sync code, outside the Phase 8 surgical-insertion allowlist.

## LG Decision Coverage

| LG-XX | Status | Notes |
|-------|--------|-------|
| LG-05 | Full | All 5 internal sources consumed via `runInternalBackfill`, admin-triggered |
| LG-06 | Full | Shared-secret + NextAuth + admin role gate both implemented |
| LG-08 | Partial | Customer mutations covered; canvassing deferred with FOLLOW-UP doc |
| LG-09 | Full | Exact doc-aligned compound query with PostGIS ST_DWithin |

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None. All API routes are fully wired to the service layer. The canvassing hook deferral is documented but is not a stub -- the `writeOutcomeEvent` helper is complete and will receive canvassing events once the call sites are inserted in a follow-up phase.

## Threat Flags

None. All security surfaces documented in the plan's threat model are implemented:
- T-08-03-01: `timingSafeEqual` for ingest auth
- T-08-03-03: Admin role gate for backfill
- T-08-03-05: Parameterized raw SQL for compound query
- T-08-03-08: Best-effort outcome write-back that cannot break customer updates

## Self-Check: PASSED

All 11 files verified present. All 3 commit hashes verified in git log.
