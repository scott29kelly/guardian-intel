---
phase: 07-cleanup-data-integrity-bugs-security-hardening-and-notebookl
plan: 01
subsystem: infographic-generation
tags: [bug-fix, data-integrity, security, notebooklm, infographic]
dependency-graph:
  requires: []
  provides:
    - corrected-claim-payload
    - strict-user-attribution
    - true-sequential-batch-loop
  affects:
    - /api/ai/generate-infographic
    - /api/ai/generate-infographic/batch
    - deck-processing pipeline (downstream consumer of requestPayload.recentClaims)
tech-stack:
  added: []
  patterns:
    - surgical-edit-only
    - no-new-tests (API routes excluded from vitest coverage per vitest.config.ts:20)
    - try/catch-per-iteration for batch fault isolation
key-files:
  created:
    - .planning/phases/07-cleanup-data-integrity-bugs-security-hardening-and-notebookl/07-01-SUMMARY.md
  modified:
    - src/app/api/ai/generate-infographic/route.ts
    - src/app/api/ai/generate-infographic/batch/route.ts
decisions:
  - "Emit claim output keys (claimType/approvedValue/dateOfLoss) that match formatClaimsForNotebook's ClaimData shape end-to-end rather than preserving legacy key names"
  - "Drop the `description` key from recentClaims entirely — the Prisma InsuranceClaim model has no `description` column and formatClaimsForNotebook does not consume one"
  - "Inner try/catch in batch loop also writes a best-effort `failed` status on the deck so the UI unblocks if the prisma.update call itself threw"
metrics:
  duration_seconds: 256
  task_count: 2
  file_count: 2
  commits:
    - c8ce061
    - 18ace6c
completed: 2026-04-07
requirements:
  - D-01
  - D-02
  - D-03
---

# Phase 7 Plan 01: Tier 1 Data Integrity Bug Fixes Summary

Tier 1 data-integrity fixes for the infographic generation pipeline: claim field drift (D-01), fake-sequential batch loop (D-02), and silent first-user fallback (D-03) — all as surgical edits to two API route files with no new dependencies and no new tests.

## What Changed

### `src/app/api/ai/generate-infographic/route.ts` (single route, commit `c8ce061`)

1. **D-01 — claim field mapping.** The `recentClaims` map in `requestPayload` now reads the real Prisma `InsuranceClaim` fields (`c.claimType`, `c.approvedValue`, `c.dateOfLoss`) instead of the legacy names `c.type`, `c.amount`, `c.filedDate`. Output keys switched to `claimType`/`approvedValue`/`dateOfLoss` to match the `ClaimData` interface at `src/lib/services/notebooklm/formatters.ts:130-137` that `formatClaimsForNotebook` consumes. Also added `carrier` (the formatter uses it) and dropped the legacy `description` key entirely — no such column exists on the Prisma model.
2. **D-03 — strict user attribution.** Removed the silent fallback `customer.assignedRepId || prisma.user.findFirst()`. `session.user.id` MUST now match a real DB user; otherwise the route returns `{ error: "Unauthorized" }` with status 401.
3. **JSDoc.** Header now documents the strict-401 posture and the 2026-04-07 claim-mapping fix under a Phase 7 Tier 1 heading.

### `src/app/api/ai/generate-infographic/batch/route.ts` (batch route, commit `18ace6c`)

1. **D-01 — claim field mapping.** Same correction as the single route, with the same output key set, adapted to the batch route's slightly trimmed claim shape (batch never emitted `description`, so nothing to drop).
2. **D-02 — truly sequential processing loop.** The old loop awaited `prisma.scheduledDeck.update({ status: "processing" })` but then fired `processDeckWithNotebookLM(deckId).then(...).catch(...)` — a textbook fire-and-forget inside a `for` loop. Replaced with a loop that `await`s `processDeckWithNotebookLM` directly and wraps each iteration in `try/catch`. The inner catch logs with the existing `[BatchInfographic]` prefix and best-effort writes `{ status: "failed", errorMessage }` to the deck so the UI unblocks even if the error came from the `prisma.update` call itself. Response shape `{ batchId, deckIds, customerCount }` with status 202 is unchanged.
3. **D-03 — strict user attribution.** Same fix as the single route.
4. **JSDoc.** Header now documents all three fixes.

## Why Each Fix Matters

### D-01 was a silent data-loss bug (Prisma field name drift)

The `InsuranceClaim` Prisma model at `prisma/schema.prisma:293-335` exposes `claimType`, `dateOfLoss`, and `approvedValue`. Somewhere in the project's history, the infographic routes were coded against names `type`, `filedDate`, and `amount` — columns that do not exist. TypeScript did not catch this because the claims array was typed as `any` at the `.map((c: any) => ...)` boundary. The result: every claim in every infographic briefing was serialized to JSON with three `undefined` fields. Downstream, `formatClaimsForNotebook` in `src/lib/services/notebooklm/formatters.ts` reads `c.claimType`, `c.dateOfLoss`, `c.approvedValue`, and `c.carrier` — so the formatter's output for a customer with N claims was "N empty claim sections with fallback placeholders" no matter how rich the underlying data was. Sales reps got briefings about customers with real, paid-out, carrier-adjudicated claims with none of that context surfaced. This is the worst kind of bug: it looks like a working feature on the happy path because N empty claim sections still render, but every downstream product (deck generator emits the correct keys at `src/app/api/decks/schedule/route.ts:370-379` already) silently degraded by the exact amount of claim signal the product was designed to carry.

### D-02's "fake sequential" pattern was the worst of both worlds

The comment above the loop literally said `// Fire processing sequentially (NotebookLM has rate limits)` — which is the correct intent — but the body was `processDeckWithNotebookLM(deckId).then((result) => ...)`. That `.then()` is a promise chain, not an `await`, so the loop body returned before NotebookLM started and the next iteration began immediately. Result: for a batch of N customers, N concurrent NotebookLM jobs fired against the **same headless-browser session** inside the NotebookLM CLI bridge, which has no per-job isolation. Symptoms in the wild would be state contamination (one job's output appearing in another's notebook), auth-cookie refresh races, and rate-limit 429s that the catch handler silently logged without re-throwing. The fix is not clever — just `await` the call inside the loop body, so iteration `K+1` starts only after iteration `K` resolves or rejects. Per-iteration `try/catch` preserves the batch's ability to survive a single failure, which was the original (unstated) reason the `.catch()` was probably there.

### D-03's fallback was unreachable dead code with a dangerous failure mode if ever triggered

The user-resolution block was: "if `session.user.id` doesn't match a User row, fall back to `customer.assignedRepId` or the first user returned by `prisma.user.findFirst()`." Under the current `auth.ts` (which uses `@auth/prisma-adapter` with JWT sessions), the session's user id is always persisted from a real User row — PrismaAdapter guarantees this at sign-in. So the fallback is unreachable on any legitimate auth flow. But code doesn't know what it *would* be reached by; it only knows what it *does* when reached. If a stale session token ever leaked across a database wipe, or a migration dropped and re-seeded the user table, or any bug caused `session.user.id` to desync from the live `User` table, this fallback would silently misattribute every infographic generation to an arbitrary user (the first returned by `findFirst` — likely the seed admin account) with no audit trail and no error surfaced to the caller. Fixes like this cost nothing: delete the branch, return 401, trust the type invariant that PrismaAdapter already enforces. The only defensible behavior when an invariant breaks is to crash loudly, not silently rewrite the caller's identity.

## Verification

All 18 phase-level grep checks from the plan pass with exact expected counts:

| Check | Single route | Batch route | Expected |
|---|---|---|---|
| `c.claimType` | 1 | 1 | 1 each |
| `c.approvedValue` | 1 | 1 | 1 each |
| `c.dateOfLoss` | 1 | 1 | 1 each |
| `\bc\.type\b` legacy | 0 | 0 | 0 |
| `\bc\.amount\b` legacy | 0 | 0 | 0 |
| `\bc\.filedDate\b` legacy | 0 | 0 | 0 |
| `prisma.user.findFirst` | 0 | 0 | 0 |
| `await processDeckWithNotebookLM` | n/a | 1 | 1 (batch only) |
| `processDeckWithNotebookLM(deckId).then` fire-and-forget | n/a | 0 | 0 (batch only) |
| `status: 401` | 2 | 2 | ≥2 each |

TypeScript check: `npx tsc --noEmit` reports no errors in either modified file (pre-existing `ignoreBuildErrors: true` in `next.config.ts` was not triggered).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Output key shape corrected to match `formatClaimsForNotebook` input**

- **Found during:** Task 1, reading `src/lib/services/notebooklm/formatters.ts:130-137`
- **Issue:** The plan's example correction suggested emitting legacy output keys (`type`/`amount`/`filedDate`) "if the formatter reads legacy keys." Inspection of `formatClaimsForNotebook` showed the opposite — the `ClaimData` interface exposes `claimType`, `dateOfLoss`, `approvedValue`, `carrier`, `status`, `id`. The plan's hedged fallback language was ambiguous about the correct output keys; verifying against the formatter was the deciding step.
- **Fix:** Emit `claimType`/`approvedValue`/`dateOfLoss` (plus `carrier`, which the formatter uses and the old mapping omitted) as output keys in BOTH routes. This aligns the shape end-to-end: Prisma → route mapping → JSON serialization → deck-processing reads back → `formatClaimsForNotebook` consumes. It also aligns with the already-correct mapping in `src/app/api/decks/schedule/route.ts:370-379`.
- **Files modified:** both routes already listed above
- **Commits:** c8ce061, 18ace6c

**2. [Rule 2 - Critical] Best-effort `failed` status write in batch inner catch**

- **Found during:** Task 2, reviewing the D-02 replacement loop
- **Issue:** The plan's inner-catch pseudocode only logged; it did not update the deck status. If the thrown error came from the `prisma.scheduledDeck.update({ status: "processing" })` call at the top of the iteration (before `processDeckWithNotebookLM` could handle the failure itself), the deck would be stuck in `pending` forever with no error surfaced and no path for the UI to unblock.
- **Fix:** Added a nested best-effort `try { prisma.scheduledDeck.update({ status: "failed", errorMessage }) } catch { /* swallow */ }` inside the outer catch. Verified `errorMessage` exists on the `ScheduledDeck` model at `prisma/schema.prisma:765`. The nested catch is intentional: if the database itself is down (the likely cause of the original throw), we don't want the loop to abort on the recovery write.
- **Files modified:** `src/app/api/ai/generate-infographic/batch/route.ts`
- **Commit:** 18ace6c

No architectural changes. No authentication gates. No checkpoints hit.

## No New Tests

Matching the codebase coverage policy: `vitest.config.ts:20` explicitly excludes `src/app/api/**` from coverage. Per the plan's CONTEXT.md discretion clause, verification is grep + TypeScript compilation + manual smoke (plan-level `verification` block); no unit or integration tests were added. The downstream `formatClaimsForNotebook` unit tests in `src/lib/services/notebooklm/__tests__/` (if any) remain the safety net for the claim-rendering shape, and they were not broken because the formatter's input interface did not change — only the upstream producer caught up to it.

## Known Stubs

None. Both routes are fully wired to real data sources; no placeholders, mocks, or hardcoded defaults were introduced.

## Self-Check: PASSED

Verified on disk after commit:

- FOUND: `src/app/api/ai/generate-infographic/route.ts` (modified at commit c8ce061)
- FOUND: `src/app/api/ai/generate-infographic/batch/route.ts` (modified at commit 18ace6c)
- FOUND: `.planning/phases/07-cleanup-data-integrity-bugs-security-hardening-and-notebookl/07-01-SUMMARY.md` (this file)
- FOUND commit: c8ce061 `fix(07-01): D-01 claim field drift + D-03 strict 401 in single infographic route`
- FOUND commit: 18ace6c `fix(07-01): D-01 claim drift + D-02 sequential batch loop + D-03 strict 401 in batch infographic route`
- All 18 phase-level grep checks pass with exact expected counts
- `npx tsc --noEmit` reports clean for both modified files
