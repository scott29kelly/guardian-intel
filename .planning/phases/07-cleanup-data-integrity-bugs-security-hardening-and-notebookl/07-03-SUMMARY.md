---
phase: 07-cleanup-data-integrity-bugs-security-hardening-and-notebookl
plan: 03
subsystem: deck-processing
tags: [notebooklm, operational-hardening, stuck-job-recovery, soft-delete, dead-code-removal]
dependency-graph:
  requires:
    - 07-02
  provides:
    - stuck-job-recovery-helper
    - poll-driven-self-healing
    - cancellable-processing-jobs
    - orphaned-cron-removed
  affects:
    - /api/decks/status/[customerId]
    - deck-processing service module
    - codebase architecture doc
tech-stack:
  added: []
  patterns:
    - poll-driven-recovery (no separate cron)
    - soft-delete-for-audit-trail
    - dead-code-removal
key-files:
  created:
    - .planning/phases/07-cleanup-data-integrity-bugs-security-hardening-and-notebookl/07-03-SUMMARY.md
  modified:
    - src/lib/services/deck-processing.ts
    - src/app/api/decks/status/[customerId]/route.ts
    - .planning/codebase/ARCHITECTURE.md
  deleted:
    - src/app/api/cron/process-scheduled-decks/route.ts
    - src/app/api/cron/process-scheduled-decks/ (directory)
    - src/app/api/cron/ (parent directory, became empty)
decisions:
  - "D-07: stuck-job sweep is invoked from the GET status poll, not a separate cron — single updateMany per request, idempotent, self-healing without new infrastructure"
  - "D-07: 15-minute stale threshold = longest legitimate NotebookLM run (~12 min) + 3-minute buffer"
  - "D-07: sweep errors are logged but never block the status response — recovery is best-effort"
  - "D-07: sweep runs BEFORE the deck fetch so a recovered row returns its new failed status on the same request instead of forcing the user to poll again"
  - "D-08: cancel-while-processing is a SOFT delete (status='failed', errorMessage='Cancelled by user') rather than a hard delete — preserves audit trail; pending/failed/completed paths still hard-delete"
  - "D-08: the no-deckId DELETE branch's findFirst filter must also include 'processing' so the soft-delete path is reachable when the caller does not pass an explicit deckId"
  - "D-09: orphaned cron route file + directory deleted; the inline `cron: '0 2 * * *'` config it carried was never honored anyway because Vercel reads schedules from vercel.json (verified — only /api/analytics/aggregate is scheduled)"
  - "D-09: CLAUDE.md is intentionally NOT hand-edited — its architecture section is regenerated from .planning/codebase/ARCHITECTURE.md, which has been cleaned"
metrics:
  task_count: 2
  file_count: 4
requirements:
  - D-07
  - D-08
  - D-09
completed: 2026-04-07
---

# Phase 7 Plan 03: Tier 4 NotebookLM Operational Hardening Summary

Tier 4 work for the NotebookLM-backed deck pipeline: a self-healing stuck-job sweep, a user escape hatch for stalled processing jobs, and the removal of an orphaned cron route that was advertising a schedule Vercel never honored.

## What Changed

| Requirement | Description | Where |
|---|---|---|
| **D-07** | Stuck-job recovery sweep | `src/lib/services/deck-processing.ts` (new exported helper), `src/app/api/decks/status/[customerId]/route.ts` (wired into GET) |
| **D-08** | Cancel processing jobs via soft-delete | `src/app/api/decks/status/[customerId]/route.ts` (DELETE handler) |
| **D-09** | Delete orphaned cron route | `src/app/api/cron/process-scheduled-decks/route.ts` deleted; `.planning/codebase/ARCHITECTURE.md` reference removed; JSDoc in `deck-processing.ts` updated |

## D-07 — Stuck-Job Recovery Sweep

### Helper signature

```ts
export async function recoverStuckDecks(
  staleMinutes: number = 15,
): Promise<number>
```

### Query shape

```ts
const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000);

await prisma.scheduledDeck.updateMany({
  where: {
    status: "processing",
    updatedAt: { lt: cutoff },
  },
  data: {
    status: "failed",
    errorMessage: "Job stalled — recovered by stuck-job sweep",
    completedAt: new Date(),
  },
});
```

Returns the count of rows recovered. Logs a warning when count > 0.

### Why every status poll triggers a sweep

The original CONTEXT.md spec considered a separate cron for this. Plan 07-03 chose poll-driven recovery instead because:

1. **No new infrastructure.** A single `updateMany` runs in low single-digit milliseconds. There is no need for a `vercel.json` cron entry, a separate route handler, or an external scheduler.
2. **Self-healing on the path that actually matters.** The user only sees a stuck deck when they poll for status. Sweeping at poll time guarantees that the very next response after the 15-minute threshold reflects the recovered state.
3. **Idempotent.** `updateMany` with the same WHERE clause is a no-op when there is nothing to recover. Calling it on every poll is fine.
4. **Cron-free is consistent with D-09.** The orphaned `process-scheduled-decks` cron route is being deleted in this same plan; adding a new cron for stuck-job recovery would have undone that simplification.

### Ordering inside the GET handler

The sweep is invoked **before** the customer fetch and **before** the deck fetch. This is load-bearing:

```
session check  →  customerId extract  →  recoverStuckDecks()  →
customer fetch  →  assertCustomerAccess  →  deck fetch  →  response
```

If the sweep ran *after* the deck fetch, the same poll request would still return `status: "processing"` and the user would have to poll again to see the recovered state. Running it first means the recovered row is read with its new `failed` status on this same request.

The sweep is wrapped in its own `try/catch` — if it throws (e.g. transient DB issue), the warning is logged and the rest of the handler continues. Stuck-job recovery is best-effort and must never block the status response.

## D-08 — Cancel Processing Jobs (Soft-Delete)

### Two-part fix

**Part 1: findFirst filter.** The DELETE handler's no-deckId branch previously filtered to `{ status: { in: ["pending", "failed"] } }`, so a caller invoking `DELETE /api/decks/status/{customerId}` without a `deckId` query param could never find a processing deck — making the new soft-delete path unreachable on the no-deckId code path. The filter is now `{ in: ["pending", "failed", "processing"] }`.

**Part 2: replace the 409 refusal with a soft-delete.** The handler used to return `409 Cannot cancel a deck that is currently processing`. It now updates the row to `status: "failed"` with `errorMessage: "Cancelled by user"` and `completedAt: now`, then returns `200` with a `cancelledId` payload.

### Why soft-delete and not hard-delete

Pending, failed, and completed decks still hard-delete (existing behavior preserved). Only the `processing` branch is soft. The reason is the audit trail: the background NotebookLM job may still complete *after* the cancel request, producing artifacts that the UI must know to ignore. Keeping the row around with a known `errorMessage` lets the UI distinguish "user explicitly cancelled this" from a generic failure, and lets ops trace cancel-vs-stall ratios in the data later.

The completed path's Supabase artifact cleanup is unchanged — it still runs for `status: "completed"` decks before the row is hard-deleted.

## D-09 — Orphaned Cron Route Removal

### What was deleted

- **File:** `src/app/api/cron/process-scheduled-decks/route.ts`
- **Directory:** `src/app/api/cron/process-scheduled-decks/`
- **Parent directory:** `src/app/api/cron/` (became empty after the file was removed)

### Why it was dead code

The route declared an inline `export const config = { cron: "0 2 * * *" }`, but Vercel does not honor inline cron config — it reads schedules from `vercel.json`. `vercel.json` only schedules `/api/analytics/aggregate` (verified). The route was therefore unscheduled, unmonitored, and never running. With D-07 in place, there is also no functional need for a separate batch processor — the poll-driven recovery covers the same ground.

### Doc cleanup

- `.planning/codebase/ARCHITECTURE.md` line 137 referenced both cron route paths in its "Cron Job" section. The `process-scheduled-decks` reference was removed; the `analytics/aggregate` line and surrounding section are unchanged.
- The top-of-file JSDoc in `src/lib/services/deck-processing.ts` previously mentioned both `/api/decks/process-now` and `/api/cron/process-scheduled-decks` as callers. The cron reference was removed and the JSDoc now also documents the new `recoverStuckDecks` export.
- **`CLAUDE.md` was intentionally not hand-edited.** Its architecture section is generated from `.planning/codebase/ARCHITECTURE.md` (per the GSD comment markers in the file). The next regeneration of CLAUDE.md will pick up the cleaned reference automatically.
- `public/sw.js` is a single-line minified bundle produced by `next-pwa` and contains a precache reference to the deleted route. It will be regenerated on the next production build — not hand-edited.

## Verification

All plan acceptance grep checks pass:

- `recoverStuckDecks` is exported from `deck-processing.ts` with the canonical errorMessage and the `updatedAt: { lt: ... }` query shape.
- The GET handler invokes `await recoverStuckDecks()` exactly once, before the customer fetch.
- The DELETE handler's no-deckId filter includes `"processing"`.
- `"Cancelled by user"` appears in the soft-delete code path; `"Cannot cancel a deck that is currently processing"` and `status: 409` are gone.
- `src/app/api/cron/process-scheduled-decks/route.ts` and the directory above it no longer exist.
- `grep -rn "process-scheduled-decks" src/` → zero matches.
- `grep -n "process-scheduled-decks" .planning/codebase/ARCHITECTURE.md` → zero matches.

## Reminder for Next CLAUDE.md Regeneration

The architecture section of `CLAUDE.md` is sourced from `.planning/codebase/ARCHITECTURE.md`. Because ARCHITECTURE.md has already been cleaned, the next regeneration will automatically remove the stale `process-scheduled-decks` reference from `CLAUDE.md`. No manual edit to `CLAUDE.md` is required or wanted.
