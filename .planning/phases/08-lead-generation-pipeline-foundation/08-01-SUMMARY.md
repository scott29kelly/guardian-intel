---
phase: "08"
plan: "08-01"
subsystem: "data-model"
tags: [prisma, postgis, schema, migration, lead-intel]
dependency_graph:
  requires: []
  provides:
    - TrackedProperty model
    - SourceIngestionRun model
    - PropertySourceRecord model
    - PropertyResolution model
    - PropertySignalEvent model
    - PropertyScoreSnapshot model
    - PropertyOutcomeEvent model
    - Bridge FK fields on Customer, WeatherEvent, CanvassingPin, PropertyData
    - PostGIS migration SQL with GIST spatial index
  affects:
    - prisma/schema.prisma
    - prisma/migrations/
tech_stack:
  added: [PostGIS geography(Point,4326), GIST spatial index]
  patterns: [Unsupported column escape hatch, hand-written migration SQL, bridge FK with SetNull]
key_files:
  created:
    - prisma/migrations/08_lead_intel_postgis/migration.sql
  modified:
    - prisma/schema.prisma
decisions:
  - "Used Prisma Unsupported escape hatch for geography(Point,4326) column declaration"
  - "Hand-written migration SQL for PostGIS extension + geography column + GIST index (Prisma cannot express these)"
  - "All bridge FKs use onDelete: SetNull to prevent cascade deletion of TrackedProperty from destroying source records"
  - "NO RLS policies deferred per LG-02 -- tracked alongside Phase 7 D-06 Supabase lockdown TODO"
  - "Migration includes full model DDL + bridge FK ALTER TABLEs + PostGIS DDL in single file"
metrics:
  duration: "457s"
  completed: "2026-04-09"
  tasks_completed: 4
  tasks_total: 4
  files_created: 1
  files_modified: 1
---

# Phase 08 Plan 01: Schema + PostGIS Migration (Lead-Intel Foundation) Summary

Seven new Prisma models for property-first intelligence backbone with PostGIS geography column, GIST spatial index, and bridge FK fields linking existing Customer/WeatherEvent/CanvassingPin/PropertyData models to TrackedProperty.

## What Was Done

### Task 08-01.1: Add seven new Prisma models to schema.prisma
- Added `TrackedProperty` with PostGIS `Unsupported("geography(Point,4326)")` column, normalized address/key fields, resolution status, and denormalized stats
- Added `SourceIngestionRun` for batch ingest audit trail with completion stats
- Added `PropertySourceRecord` with immutable source payloads and reliability weights, `@@unique([sourceType, sourceId])` for backfill idempotency
- Added `PropertyResolution` for entity resolution audit trail (into/from bidirectional pointers)
- Added `PropertySignalEvent` as temporal event store with decay metadata (baseWeight, reliabilityWeight, halfLifeDays)
- Added `PropertyScoreSnapshot` for immutable explainable score snapshots with JSON contributions
- Added `PropertyOutcomeEvent` with `@@unique([trackedPropertyId, eventType, sourceMutationId])` idempotency constraint
- All models under `// LEAD INTEL (Phase 8)` section header with NO RLS deferral note
- **Commit:** `1202f84`

### Task 08-01.2: Add nullable trackedPropertyId bridge FK fields to 4 existing models
- `Customer.trackedPropertyId` with `onDelete: SetNull` + `@@index`
- `WeatherEvent.trackedPropertyId` with `onDelete: SetNull` + `@@index`
- `CanvassingPin.trackedPropertyId` with `onDelete: SetNull` + `@@index`
- `PropertyData.trackedPropertyId` with `onDelete: SetNull` + `@@index`
- No existing fields, indexes, or unique constraints modified
- **Commit:** `90f63ea`

### Task 08-01.3: Write hand-written migration SQL
- Created `prisma/migrations/08_lead_intel_postgis/migration.sql` with:
  - `CREATE TABLE` DDL for all 7 new models
  - `ALTER TABLE` for 4 bridge FK columns on existing tables
  - All unique constraints, indexes, and foreign key constraints
  - `CREATE EXTENSION IF NOT EXISTS postgis` for PostGIS enablement
  - `geography(Point, 4326)` column on TrackedProperty via `ALTER TABLE ADD COLUMN IF NOT EXISTS`
  - Backfill `UPDATE` converting latitude/longitude to geography
  - `CREATE INDEX ... USING GIST` for `idx_tracked_property_location` spatial index
  - `NO RLS POLICIES` deferral noted in header comment
- **Commit:** `c5b8907`

### Task 08-01.4: Prisma generate verification
- Ran `npx prisma generate` successfully (with dummy connection URLs since no live DB in worktree)
- Verified all 7 new model accessors (`trackedProperty`, `sourceIngestionRun`, `propertySourceRecord`, `propertyResolution`, `propertySignalEvent`, `propertyScoreSnapshot`, `propertyOutcomeEvent`) exist on the PrismaClient instance
- Database-dependent steps (`prisma migrate dev`, `prisma db push`, PostGIS verification queries) require live database connectivity -- deferred to branch merge on connected environment
- No files to commit (prisma generate only updates node_modules)

## Decisions Made

1. **Unsupported escape hatch for PostGIS:** Used Prisma's `Unsupported("geography(Point,4326)")` for the location column -- the only supported pattern for non-native types in Prisma 6
2. **Single migration file:** Combined all model DDL, bridge FKs, constraints, indexes, and PostGIS DDL into one migration file for atomic application
3. **SetNull cascade strategy:** All 4 bridge FKs use `onDelete: SetNull` so deleting a TrackedProperty does not destroy its upstream source records (Customer, WeatherEvent, etc.)
4. **RLS deferral:** Explicitly deferred per LG-02, documented in both schema header and migration header comment

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] No database connectivity in worktree environment**
- **Found during:** Task 08-01.4
- **Issue:** `prisma migrate dev`, `prisma db push`, and PostGIS verification queries require DATABASE_URL/DIRECT_URL environment variables pointing to a live Supabase PostgreSQL instance. These are not available in the CI/worktree environment.
- **Fix:** Ran `prisma generate` with dummy connection URLs to verify typed client generation. Migration SQL is written and ready for application. Database steps will execute when the branch runs against a connected environment.
- **Files affected:** None (node_modules only)

## Verification Results

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| New model count in schema | 7 | 7 | PASS |
| Bridge FK count | 4 | 4 | PASS |
| PostGIS Unsupported declaration | 1 | 1 | PASS |
| Migration file exists + complete | yes | yes | PASS |
| RLS deferral notes (schema + migration) | present | present | PASS |
| Prisma client model accessors | 7 models | 7 models | PASS |
| DB migration applied | -- | deferred (no DB) | N/A |
| PostGIS extension live | -- | deferred (no DB) | N/A |
| GIST index live | -- | deferred (no DB) | N/A |

## Self-Check: PASSED

- FOUND: prisma/schema.prisma
- FOUND: prisma/migrations/08_lead_intel_postgis/migration.sql
- FOUND: .planning/phases/08-lead-generation-pipeline-foundation/08-01-SUMMARY.md
- FOUND: commit 1202f84 (Task 1 - 7 new models)
- FOUND: commit 90f63ea (Task 2 - 4 bridge FKs)
- FOUND: commit c5b8907 (Task 3 - migration SQL)
