---
status: partial
phase: 08-lead-generation-pipeline-foundation
source: [08-VERIFICATION.md]
started: 2026-04-10T04:00:00Z
updated: 2026-04-10T04:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Backfill produces real data
expected: POST `/api/lead-intel/backfill` with admin session against a live seeded database creates TrackedProperty rows, signal events, and score snapshots
result: [pending]

### 2. Pipeline Inspector renders real data
expected: Browser navigation to `/pipeline` after backfill shows KPI cards with non-zero counts, property table with rows, and detail pane opens with score explanation
result: [pending]

### 3. Integration tests pass with live DB
expected: `npx vitest run tests/integration/lead-intel/` with `LEAD_INTEL_INGEST_SECRET` set and live database connection passes all integration tests
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
