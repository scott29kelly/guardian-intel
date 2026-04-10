---
phase: 08-lead-generation-pipeline-foundation
reviewed: 2026-04-10T02:15:00Z
depth: standard
files_reviewed: 38
files_reviewed_list:
  - prisma/schema.prisma
  - prisma/migrations/08_lead_intel_postgis/migration.sql
  - src/lib/env.ts
  - src/lib/data/customers.ts
  - src/lib/services/lead-intel/index.ts
  - src/lib/services/lead-intel/normalization/address.ts
  - src/lib/services/lead-intel/entity-resolution/resolve.ts
  - src/lib/services/lead-intel/entity-resolution/types.ts
  - src/lib/services/lead-intel/ingest/run.ts
  - src/lib/services/lead-intel/ingest/types.ts
  - src/lib/services/lead-intel/backfill/run.ts
  - src/lib/services/lead-intel/backfill/extractors/roof-age.ts
  - src/lib/services/lead-intel/backfill/extractors/storm-exposure.ts
  - src/lib/services/lead-intel/backfill/extractors/canvassing-recency.ts
  - src/lib/services/lead-intel/backfill/extractors/crm-contact-recency.ts
  - src/lib/services/lead-intel/backfill/extractors/neighbor-win.ts
  - src/lib/services/lead-intel/queries/properties.ts
  - src/lib/services/lead-intel/queries/saved.ts
  - src/lib/services/lead-intel/spatial/radius.ts
  - src/lib/services/lead-intel/scoring/decay.ts
  - src/lib/services/lead-intel/scoring/weights.ts
  - src/lib/services/lead-intel/scoring/score.ts
  - src/lib/services/lead-intel/scoring/outcomes.ts
  - src/app/api/lead-intel/ingest/route.ts
  - src/app/api/lead-intel/backfill/route.ts
  - src/app/api/lead-intel/properties/route.ts
  - src/app/api/lead-intel/properties/[id]/route.ts
  - src/app/api/lead-intel/queries/high-value-roof-storm-neighbor/route.ts
  - src/lib/hooks/use-lead-intel.ts
  - src/app/(dashboard)/pipeline/page.tsx
  - src/app/(dashboard)/pipeline/types.ts
  - src/app/(dashboard)/pipeline/components/kpi-cards.tsx
  - src/app/(dashboard)/pipeline/components/filter-bar.tsx
  - src/app/(dashboard)/pipeline/components/property-table.tsx
  - src/app/(dashboard)/pipeline/components/detail-pane.tsx
  - src/app/(dashboard)/pipeline/components/score-explanation.tsx
  - src/app/(dashboard)/pipeline/components/signal-timeline.tsx
  - src/app/(dashboard)/pipeline/components/provenance-list.tsx
  - src/app/(dashboard)/pipeline/components/outcome-history.tsx
findings:
  critical: 1
  warning: 5
  info: 4
  total: 10
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-04-10T02:15:00Z
**Depth:** standard
**Files Reviewed:** 38
**Status:** issues_found

## Summary

Phase 8 introduces the Lead Generation Pipeline Foundation -- a property-first intelligence backbone with entity resolution, signal-based scoring with exponential decay, PostGIS spatial queries, internal-data backfill, an n8n ingest endpoint, and a read-only Pipeline Inspector UI. The architecture is well-designed with clean separation of concerns: normalization is pure, extractors are stateless, the scoring layer is immutable-snapshot-based, and provenance is fully traceable.

The implementation is generally high quality. The most significant issue is an unbounded recursive call in the detail query reader that can infinite-loop when score recomputation fails to advance the snapshot timestamp. There are also several input validation gaps in API routes, a timing-safe comparison that leaks secret length, and a backfill idempotency gap where re-running the backfill produces duplicate signal events.

## Critical Issues

### CR-01: Unbounded recursion in getPropertyDetail causes infinite loop

**File:** `src/lib/services/lead-intel/queries/properties.ts:170-173`
**Issue:** When `shouldRecompute` is true, `getPropertyDetail` calls `computeScoreSnapshot(id)` and then recursively calls itself. If `computeScoreSnapshot` succeeds but the new snapshot's `evaluatedAt` is still older than `latestSignalAt` (e.g., due to clock skew, or if `computeScoreSnapshot` throws and is caught silently elsewhere), the recursion will repeat infinitely. Each recursive call also reads the full property with all relations, making this both a correctness and availability risk. In a serverless environment (Vercel), this will exhaust the function execution timeout.
**Fix:** Add a recursion guard parameter. If recomputation was just performed, do not recurse again -- return the data as-is with the freshly computed snapshot.
```typescript
export async function getPropertyDetail(id: string, _recomputed = false): Promise<PropertyDetail | null> {
  const property = await prisma.trackedProperty.findUnique({
    where: { id },
    include: { /* ... */ },
  });
  if (!property) return null;

  const latestSnapshot = property.scoreSnapshots[0] ?? null;
  const latestSignalAt =
    property.signalEvents[0]?.eventTimestamp ?? property.lastSignalAt ?? null;
  const shouldRecompute =
    !_recomputed &&
    (!latestSnapshot ||
      (latestSignalAt && latestSignalAt > latestSnapshot.evaluatedAt));

  if (shouldRecompute) {
    await computeScoreSnapshot(id);
    return getPropertyDetail(id, true); // guard: only one retry
  }

  // ... rest of mapping
}
```

## Warnings

### WR-01: Timing-safe comparison leaks secret length via early-return

**File:** `src/app/api/lead-intel/ingest/route.ts:50-55`
**Issue:** The `constantTimeEqual` function checks `aBuf.length !== bBuf.length` and returns `false` immediately before calling `timingSafeEqual`. This early return is observable via timing differences: an attacker can determine the length of the secret by sending keys of different lengths and measuring response times. Once the length is known, the search space for brute-forcing the secret is significantly reduced. While `timingSafeEqual` requires equal-length buffers, the standard mitigation is to HMAC both values with a fixed key first, which produces equal-length outputs regardless of input length.
**Fix:** Hash both values to produce fixed-length digests before comparing:
```typescript
import { createHmac, timingSafeEqual } from "crypto";

function constantTimeEqual(a: string, b: string): boolean {
  const hmacA = createHmac("sha256", "lead-intel-compare").update(a).digest();
  const hmacB = createHmac("sha256", "lead-intel-compare").update(b).digest();
  return timingSafeEqual(hmacA, hmacB);
}
```

### WR-02: Backfill re-runs produce duplicate PropertySignalEvent rows

**File:** `src/lib/services/lead-intel/backfill/run.ts:92-131`
**Issue:** When backfill is re-run, `processSourceRow` upserts the `PropertySourceRecord` (using the `sourceType_sourceId` unique key), so re-runs are idempotent for source records. However, the signal extraction calls (`extractRoofAge`, `extractStormExposure`, etc.) execute unconditionally after `processSourceRow` regardless of whether the property was newly created or already existed. The `writeSignals` function creates new `PropertySignalEvent` rows every time via `prisma.propertySignalEvent.create`. There is no unique constraint on `PropertySignalEvent` to prevent duplicates. Each backfill re-run will add duplicate signal rows, inflating scores.
**Fix:** Either (a) gate signal extraction on `resolution.created` (only write signals for newly created source records), or (b) add a `sourceRecordId` to each signal and add a unique constraint on `(trackedPropertyId, signalType, sourceRecordId)` to make signal writes idempotent. Option (a) is simpler:
```typescript
// Only write signals when the source record was newly created
if (resolution.created) {
  await writeSignals(
    [extractRoofAge({ /* ... */ })],
    ctx.runId,
    stats,
  );
}
```
Note: This is already acknowledged in the module docstring ("Signal events are only written when the source record is newly inserted (tracked via the `created` return from processSourceRow)") but the actual code does not implement this guard.

### WR-03: NaN propagation from unvalidated Number() casts on query parameters

**File:** `src/app/api/lead-intel/properties/route.ts:36-43`
**Issue:** When query parameters like `minScore`, `maxScore`, `limit`, or `offset` contain non-numeric strings (e.g., `?minScore=abc`), `Number("abc")` returns `NaN`. This `NaN` is passed directly into the Prisma `where` clause (e.g., `where.latestScore.gte = NaN`). Prisma may reject this with an opaque error or pass it through to PostgreSQL, resulting in a 500 error rather than a clean 400 validation error. The same pattern appears in the high-value query route.
**Fix:** Validate parsed numbers and return 400 for non-numeric values:
```typescript
const minScoreRaw = sp.get("minScore");
const minScore = minScoreRaw != null ? Number(minScoreRaw) : undefined;
if (minScore !== undefined && isNaN(minScore)) {
  return NextResponse.json(
    { success: false, error: "Validation error", details: "minScore must be a number" },
    { status: 400 },
  );
}
```
Alternatively, use a Zod schema for query parameter validation (consistent with the project convention of using `validations.ts` schemas).

### WR-04: Sequential awaited outcome writes in bulk update hot path

**File:** `src/lib/data/customers.ts:332-349`
**Issue:** In `bulkUpdateCustomers`, outcome events are written sequentially in a `for` loop with `await` on each `writeOutcomeEvent` call. If a bulk update touches 100 customers with `trackedPropertyId` and both stage and status change, this produces 200 sequential database upserts after the bulk update completes. While `writeOutcomeEvent` is best-effort (catches its own errors), the sequential nature means the API response is delayed proportionally to the number of customers. This can cause request timeouts on Vercel's serverless functions.
**Fix:** Fire outcome writes concurrently with `Promise.allSettled` since they are independent and best-effort:
```typescript
if (outcomeRelevant) {
  const now = new Date();
  const outcomePromises: Promise<void>[] = [];
  for (const prev of previousRows) {
    if (!prev.trackedPropertyId) continue;
    if (updates.stage && updates.stage !== prev.stage) {
      outcomePromises.push(writeOutcomeEvent({ /* ... */ }));
    }
    if (updates.status && updates.status !== prev.status) {
      outcomePromises.push(writeOutcomeEvent({ /* ... */ }));
    }
  }
  await Promise.allSettled(outcomePromises);
}
```

### WR-05: Ingest route processes rows without validating reliabilityWeight range

**File:** `src/app/api/lead-intel/ingest/route.ts:99-116`
**Issue:** The ingest route validates that each row has `sourceType`, `sourceId`, `address`, `zipCode`, and `sourceRecordedAt`, but does not validate `reliabilityWeight`. An n8n workflow could send `reliabilityWeight: 999` or `reliabilityWeight: -1`, which would corrupt score calculations. The decay formula multiplies `baseWeight * reliabilityWeight * decayFactor`, so an out-of-range reliability weight directly inflates or inverts scores. The `city` and `state` fields are also not validated despite being required by `IngestedSourceRow`.
**Fix:** Add validation for the numeric fields and required string fields:
```typescript
if (
  !row.sourceType ||
  !row.sourceId ||
  !row.address ||
  !row.city ||
  !row.state ||
  !row.zipCode ||
  !row.sourceRecordedAt ||
  typeof row.reliabilityWeight !== "number" ||
  row.reliabilityWeight < 0 ||
  row.reliabilityWeight > 1
) {
  stats.recordsSkipped += 1;
  stats.errors.push(`invalid row: sourceId=${row.sourceId ?? "?"}`);
  continue;
}
```

## Info

### IN-01: KPI "scoredLast24h" and "pendingResolutions" computed from partial page data

**File:** `src/app/(dashboard)/pipeline/page.tsx:43-48`
**Issue:** The `scoredLast24h` and `pendingResolutions` KPIs are derived from `listQuery.data?.rows` which is a single page of results (default 50 rows). These counts do not reflect the full dataset -- if there are 1000 tracked properties but only 50 are loaded, the KPIs will undercount. The `totalTracked` KPI correctly uses the `total` field from the API response.
**Fix:** The comment at line 36-37 acknowledges this ("In a later phase we'll add a dedicated stats endpoint"). Consider adding a note in the UI indicating these are page-level counts, or use the `total` field for `totalTracked` and show dashes for the other KPIs until a stats endpoint is available.

### IN-02: Address normalization does not expand "st" at position 0 (street number-like token)

**File:** `src/lib/services/lead-intel/normalization/address.ts:68`
**Issue:** The directional expansion only fires when `idx > 0`, which is correct to avoid expanding the street number. However, the street-type expansion on line 70 (`if (STREET_TYPE[tok]) return STREET_TYPE[tok]`) has no such guard. If someone has a street number that happens to be a key in `STREET_TYPE` this would cause a false match, though in practice all `STREET_TYPE` keys are alphabetic and street numbers are numeric, so this is a theoretical rather than practical concern. Worth noting for future maintainers adding numeric abbreviation keys.
**Fix:** No immediate action needed. Add a comment noting the assumption that street-type keys are always alphabetic.

### IN-03: Filter bar local state can drift from parent filters

**File:** `src/app/(dashboard)/pipeline/components/filter-bar.tsx:22-23`
**Issue:** `FilterBar` initializes its local state from `props.filters` via `useState(props.filters)`, but `useState` only uses the initial value on first render. If the parent updates `filters` (e.g., via the Reset button which calls `setFilters({})`), the `FilterBar`'s local state will not reflect the parent's reset. The Reset handler at line 25-28 does explicitly reset local state, so the current flow works. However, if `filters` is ever changed externally (e.g., URL-driven state in a future phase), the drift will become visible.
**Fix:** Consider using `useEffect` to sync local state with props, or derive local state from props with a key reset pattern. Low priority since the current UI flow handles it correctly.

### IN-04: Raw `$queryRaw` in saved query returns BigInt from COUNT that may serialize incorrectly

**File:** `src/lib/services/lead-intel/queries/saved.ts:69`
**Issue:** The `COUNT(*)::int` cast on line 69 should prevent BigInt issues, and the `::int` cast is correctly applied in both `storm_counts` (line 69) and `neighbor_wins` (line 79). This is well-handled. However, `nearestWinMeters` on line 84 comes from `MIN(ST_Distance(...))` which returns a `double precision` -- Prisma's `$queryRaw` may return this as a `Decimal` type rather than a JavaScript `number` in some Prisma versions. If this happens, the JSON serialization in the API response will produce a string representation instead of a number.
**Fix:** Add an explicit `::double precision` cast to the `MIN(ST_Distance(...))` expression, or add a `.toNumber()` / `Number()` conversion in the API response mapping. Low priority -- test with actual data to verify behavior.

---

_Reviewed: 2026-04-10T02:15:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
