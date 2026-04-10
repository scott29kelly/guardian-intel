---
status: partial
phase: 08-multi-artifact-backend
source: [08-VERIFICATION.md]
started: 2026-04-09T23:45:00Z
updated: 2026-04-09T23:45:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. POST /api/ai/generate-customer-artifacts end-to-end against a real customer with all four artifact types
expected: Returns 202 with `{ success, jobId, status: 'processing', customerId, requestedArtifacts }`. Background processing fires. Polling `GET /api/decks/status/[customerId]` shows deck → infographic → audio → report each transitioning pending → processing → ready independently. Deck lands in `decks/`, infographic in `infographics/`, audio in `audio/` Supabase prefixes with correct content types. Report comes back inline in `artifacts.report.markdown` (no Supabase URL).
result: [pending]

### 2. Stuck-audio scenario: simulate a job where deck and infographic complete but audio stalls for >15 minutes
expected: On the next `GET /api/decks/status/[customerId]` poll (which triggers `recoverStuckDecks()`), only `audioStatus` flips from `'processing'` to `'failed'` with `audioError = 'Artifact stalled — recovered by stuck-job sweep'` and `audioCompletedAt` set. `deckStatus`, `deckUrl`, `infographicStatus`, `infographicUrl`, and `reportStatus` are untouched.
result: [pending]

### 3. Orphaned notebook cleanup observability
expected: A job with `notebookId` set and all four per-artifact statuses terminal triggers a best-effort `deleteNotebook` call during the next status poll. On success, `notebookId` is nulled on the row; on failure, the row is unchanged and the error is logged. Query cost is bounded by `take: 20`.
result: [pending]

### 4. Single push notification per job (D-10)
expected: A successful multi-artifact job fires exactly ONE push notification titled "Artifacts Ready" with body "All artifacts ready for {customerName}.". A job with any failure fires ONE notification titled "Generation Finished with Errors" with body "Generation finished with errors for {customerName}. Tap to review.". Notification tag is `artifacts-${jobId}` and URL is `/decks?jobId=${jobId}`. The old per-artifact notifications are NOT fired.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
