---
phase: "08"
plan: "08-02"
subsystem: lead-intel-service-layer
tags: [lead-generation, normalization, entity-resolution, scoring, decay, backfill, spatial, ingest]
dependency_graph:
  requires: [08-01]
  provides: [lead-intel-service-barrel, normalization, entity-resolution, spatial-helpers, decay-math, score-snapshots, signal-extractors, ingest-orchestrator, outcome-writeback, property-queries]
  affects: []
tech_stack:
  added: []
  patterns: [prisma-queryraw-for-postgis, half-life-decay-scoring, three-stage-entity-resolution, barrel-re-export-per-subdirectory]
key_files:
  created:
    - src/lib/services/lead-intel/index.ts
    - src/lib/services/lead-intel/normalization/address.ts
    - src/lib/services/lead-intel/normalization/index.ts
    - src/lib/services/lead-intel/entity-resolution/types.ts
    - src/lib/services/lead-intel/entity-resolution/resolve.ts
    - src/lib/services/lead-intel/entity-resolution/index.ts
    - src/lib/services/lead-intel/spatial/radius.ts
    - src/lib/services/lead-intel/spatial/index.ts
    - src/lib/services/lead-intel/scoring/weights.ts
    - src/lib/services/lead-intel/scoring/decay.ts
    - src/lib/services/lead-intel/scoring/score.ts
    - src/lib/services/lead-intel/scoring/outcomes.ts
    - src/lib/services/lead-intel/scoring/index.ts
    - src/lib/services/lead-intel/ingest/types.ts
    - src/lib/services/lead-intel/ingest/run.ts
    - src/lib/services/lead-intel/ingest/index.ts
    - src/lib/services/lead-intel/backfill/extractors/roof-age.ts
    - src/lib/services/lead-intel/backfill/extractors/storm-exposure.ts
    - src/lib/services/lead-intel/backfill/extractors/canvassing-recency.ts
    - src/lib/services/lead-intel/backfill/extractors/crm-contact-recency.ts
    - src/lib/services/lead-intel/backfill/extractors/neighbor-win.ts
    - src/lib/services/lead-intel/backfill/index.ts
    - src/lib/services/lead-intel/queries/properties.ts
    - src/lib/services/lead-intel/queries/index.ts
  modified: []
decisions:
  - "LG-07 coexistence enforced: zero cross-imports between lead-intel and scoring/property services"
  - "Decay formula implemented as pure function: effectiveWeight = baseWeight * reliabilityWeight * exp(-ln(2) * ageDays / halfLifeDays)"
  - "Entity resolution uses strict 3-stage priority with pending_review fallback for ambiguous matches"
  - "Score snapshots are immutable and explainable with per-signal contributions JSON"
  - "Outcome writes are best-effort (try/catch swallows errors) to prevent lead-intel failures from blocking parent mutations"
  - "Query layer caps page size at 200 to prevent DoS"
metrics:
  duration: "355s"
  completed: "2026-04-10T03:15:50Z"
  tasks: 2
  files: 24
---

# Phase 08 Plan 02: Lead-Intel Service Layer Summary

Pure-function lead-intel service tree with 7 subdirectories: deterministic address normalization, three-stage entity resolution with pending_review fallback, half-life decay scoring via exp(-ln(2) * ageDays / halfLifeDays), 5 internal signal extractors (roof-age, storm-exposure, canvassing-recency, crm-contact-recency, neighbor-win), PostGIS spatial helpers, ingest run orchestrator, and property query layer with lazy score recomputation.

## Task Results

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 08-02.1 | Directory scaffold + normalization + entity resolution + spatial helpers | d504faa | normalization/address.ts, entity-resolution/resolve.ts, spatial/radius.ts |
| 08-02.2 | Scoring + ingest + backfill extractors + queries + barrel | 87a1027 | scoring/decay.ts, scoring/score.ts, backfill/extractors/*.ts, queries/properties.ts, index.ts |

## What Was Built

### Normalization (normalization/)
- `normalizeAddress()`: deterministic lowercase + whitespace collapse + USPS abbreviation expansion
- `buildNormalizedKey()`: address|zip dedup key for TrackedProperty
- `extractStreetNumber()`: leading digit extraction for geo-near resolver

### Entity Resolution (entity-resolution/)
- Three-stage resolver: exact-normalized (0.98 confidence) -> parcel (1.0) -> geo-near+street+ZIP (0.85)
- Ambiguous matches always land as `pending_review` with candidate IDs (never auto-merge)
- Resolution audit trail via PropertyResolution rows

### Spatial (spatial/)
- `findPropertiesWithinRadius()`: PostGIS ST_DWithin via Prisma $queryRaw with tagged-template parameterization
- `metersFromMiles()`: conversion helper

### Scoring (scoring/)
- `computeDecayFactor()` + `computeEffectiveWeight()`: pure-function decay math implementing LG-04 formula
- `buildSnapshotDraft()`: pure-function score computation from signal events
- `computeScoreSnapshot()`: Prisma-backed snapshot persistence + TrackedProperty denormalized update
- `writeOutcomeEvent()`: idempotent outcome write-back (best-effort, try/catch wrapped)
- `SIGNAL_WEIGHTS` / `RELIABILITY_WEIGHTS`: configurable lookup tables with FORMULA_VERSION tagging

### Ingest (ingest/)
- `startIngestRun()` / `finishIngestRun()`: SourceIngestionRun lifecycle management
- `processSourceRow()`: entity resolution -> TrackedProperty create/match -> PropertySourceRecord upsert

### Backfill Extractors (backfill/extractors/)
- `extractRoofAge()`: derives from roofAge or yearBuilt with linear age scaling
- `extractStormExposure()`: severity-multiplied storm signal
- `extractCanvassingRecency()`: knock-event signal with 90-day half-life
- `extractContactRecency()`: most-recent CRM interaction signal
- `extractNeighborWins()`: PostGIS-based nearby closed-won customer signal with distance decay

### Queries (queries/)
- `listTrackedProperties()`: filtered, paginated list with 200-row cap
- `getPropertyDetail()`: full property with source records, signals, snapshot, outcomes + lazy recomputation

### Barrel (index.ts)
- Top-level re-exports all 7 subdirectory surfaces for clean import paths

## LG-07 Enforcement

Zero cross-imports in either direction:
- `src/lib/services/lead-intel/` does NOT import from `@/lib/services/scoring` or `@/lib/services/property`
- `src/lib/services/scoring/` does NOT import from `@/lib/services/lead-intel`
- `src/lib/services/property/` does NOT import from `@/lib/services/lead-intel`

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all functions are fully implemented with their documented behavior.

## Threat Flags

None - all security surfaces (raw SQL parameterization, pending_review default, page-size caps, best-effort outcome writes) are implemented as documented in the threat model.

## Self-Check: PASSED

- All 24 created files verified present on disk
- Commit d504faa (Task 08-02.1) verified in git log
- Commit 87a1027 (Task 08-02.2) verified in git log
