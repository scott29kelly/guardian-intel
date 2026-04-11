---
phase: 08-lead-generation-pipeline-foundation
fixed_at: 2026-04-11T01:08:01Z
review_path: .planning/phases/08-lead-generation-pipeline-foundation/08-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 8: Code Review Fix Report

**Fixed at:** 2026-04-11T01:08:01Z
**Source review:** .planning/phases/08-lead-generation-pipeline-foundation/08-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

## Fixed Issues

### CR-01: Unbounded recursion in getPropertyDetail causes infinite loop

**Files modified:** `src/lib/services/lead-intel/queries/properties.ts`
**Commit:** 55d9436
**Applied fix:** Added a `_recomputed = false` parameter to `getPropertyDetail`. The `shouldRecompute` condition now includes `!_recomputed &&` so the function can only recurse once. The recursive call passes `true` to prevent further recursion. This prevents infinite loops caused by clock skew or `computeScoreSnapshot` failing to advance the snapshot timestamp.

### WR-01: Timing-safe comparison leaks secret length via early-return

**Files modified:** `src/app/api/lead-intel/ingest/route.ts`
**Commit:** c0fa946
**Applied fix:** Replaced the length-checking `constantTimeEqual` implementation with an HMAC-based approach. Both input values are now hashed with `createHmac("sha256", "lead-intel-compare")` to produce fixed-length 32-byte digests before calling `timingSafeEqual`. This eliminates the timing side-channel that leaked the secret's length through the early-return on mismatched buffer sizes.

### WR-02: Backfill re-runs produce duplicate PropertySignalEvent rows

**Files modified:** `src/lib/services/lead-intel/backfill/run.ts`
**Commit:** 823846e
**Applied fix:** Gated all signal extraction calls on whether the source record was newly created, matching the idempotency contract documented in the module docstring:
- **Customers section:** Wrapped `writeSignals` calls (roof-age and neighbor-wins) inside `if (resolution.created)`.
- **WeatherEvents section:** Added `sourceRecordCreated` flag, set from `resolution.created` when `processSourceRow` is called. Signal writes gated on this flag. Customer-bridge-FK path leaves flag `false` (property already existed).
- **CanvassingPins section:** Wrapped both `writeSignals` calls (canvassing-recency and roof-age) inside `if (resolution.created)`.
- **Interactions section:** Added a `findFirst` check for existing `crm-contact-recency` signals on the tracked property before writing, since this section uses the customer bridge FK and has no `resolution.created` flag.
- **PropertyData section:** Wrapped `writeSignals` call inside `if (resolution.created)`.

### WR-03: NaN propagation from unvalidated Number() casts on query parameters

**Files modified:** `src/app/api/lead-intel/properties/route.ts`, `src/app/api/lead-intel/queries/high-value-roof-storm-neighbor/route.ts`
**Commit:** 3214740
**Applied fix:** In both API routes, numeric query parameters are now parsed into local variables first, then validated with `isNaN()` checks. If any parsed number is `NaN`, the route returns a 400 response with `{ success: false, error: "Validation error", details: "..." }` before reaching the service layer. This prevents `NaN` from propagating into Prisma `where` clauses or raw SQL parameters.

### WR-04: Sequential awaited outcome writes in bulk update hot path

**Files modified:** `src/lib/data/customers.ts`
**Commit:** 0a47ae5
**Applied fix:** Replaced the sequential `for`/`await` loop over `writeOutcomeEvent` calls with a `Promise.allSettled` pattern. Outcome write promises are collected into an `outcomePromises: Promise<void>[]` array during the loop, then awaited concurrently via `Promise.allSettled(outcomePromises)`. Since each write is independent and best-effort (errors are swallowed by `writeOutcomeEvent` itself), `allSettled` is the correct choice over `all` -- it ensures all writes are attempted regardless of individual failures.

### WR-05: Ingest route processes rows without validating reliabilityWeight range

**Files modified:** `src/app/api/lead-intel/ingest/route.ts`
**Commit:** 2e21b6f
**Applied fix:** Extended the per-row validation guard to include `!row.city`, `!row.state`, `typeof row.reliabilityWeight !== "number"`, `row.reliabilityWeight < 0`, and `row.reliabilityWeight > 1`. Rows that fail any of these checks are now skipped with an error message, preventing out-of-range reliability weights from corrupting score calculations and ensuring `city`/`state` are present as required by `IngestedSourceRow`.

---

_Fixed: 2026-04-11T01:08:01Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
