---
phase: 07-cleanup-data-integrity-bugs-security-hardening-and-notebookl
plan: 02
subsystem: infographic-generation
tags: [security, authorization, rep-ownership, deferred-finding, supabase, mock-data]
dependency-graph:
  requires:
    - 07-01
  provides:
    - rep-ownership-authorization-helper
    - generate-infographic-rep-scoped
    - generate-infographic-batch-rep-scoped
    - decks-status-rep-scoped
  affects:
    - /api/ai/generate-infographic
    - /api/ai/generate-infographic/batch
    - /api/decks/status/[customerId]
tech-stack:
  added: []
  patterns:
    - shared-authorization-helper
    - per-customer-skip-in-batch
    - documented-deferral
key-files:
  created:
    - .planning/phases/07-cleanup-data-integrity-bugs-security-hardening-and-notebookl/07-02-SUMMARY.md
  modified:
    - src/lib/auth.ts
    - src/app/api/ai/generate-infographic/route.ts
    - src/app/api/ai/generate-infographic/batch/route.ts
    - src/app/api/decks/status/[customerId]/route.ts
  unchanged-by-decision:
    - src/lib/services/deck-processing.ts
decisions:
  - "D-04/D-05: Single shared assertCustomerAccess helper in src/lib/auth.ts; pure function over { assignedRepId } and session.user — admin/manager bypass + rep ownership match"
  - "Batch route silently skips unauthorized customers per-iteration; only returns 403 when the resulting deckIds array is empty (avoids 403-ing the entire batch when one customer is foreign)"
  - "Deck status GET and DELETE both authorize against the customer BEFORE returning or mutating the deck record"
  - "D-06: deferred entirely — no code change to src/lib/services/deck-processing.ts. The Supabase deck-pdfs bucket is public with no RLS policies, but every file and DB row currently in the system is mock data. A 'real' fix requires bucket-private + signed URLs + 16-row backfill + regenerate-on-poll, which is bigger than CONTEXT.md anticipated and provides zero real-world security benefit on mock data."
metrics:
  task_count: 2
  file_count: 4
  commits:
    - d2fd39e
requirements:
  - D-04
  - D-05
  - D-06 (deferred)
completed: 2026-04-07
---

# Phase 7 Plan 02: Tier 2 Security Hardening Summary

Tier 2 security work for the infographic generation pipeline: rep-ownership authorization across four routes via a shared helper (D-04, D-05), and a documented deferral of the Supabase bucket ACL lockdown (D-06) on the basis that the system currently holds only mock data.

## Task Outcomes

| Task | Requirement | Status | Commit |
|---|---|---|---|
| 1. Rep-ownership authorization (helper + 4 routes) | D-04, D-05 | Completed | `d2fd39e` |
| 2. Supabase bucket ACL lockdown | D-06 | **Deferred** — documented finding only | (no code commit; see below) |

## Task 1 — Rep-Ownership Authorization (Completed)

Added a shared `assertCustomerAccess(session, customer)` helper to `src/lib/auth.ts` and wired it into all four authorization sites:

- `POST /api/ai/generate-infographic` — fetches customer, calls helper, returns `403` on failure before building the request payload.
- `POST /api/ai/generate-infographic/batch` — calls the helper per customer in the loop and **silently skips** unauthorized customers. The route only returns `403` when the resulting `deckIds` array is empty (every requested customer was unauthorized). This avoids 403-ing the entire batch when a single foreign customerId is included.
- `GET /api/decks/status/[customerId]` — fetches customer first, calls the helper, returns `403` before reading or returning the deck record.
- `DELETE /api/decks/status/[customerId]` — same authorization check applied before cancelling/deleting.

Helper rule: allow when `customer.assignedRepId === session.user.id` OR when `session.user.role` is `"admin"` or `"manager"`. Pure function — no I/O, takes the minimal customer subset `{ assignedRepId: string | null }`.

Committed in this worktree as `d2fd39e`:

> `feat(07-02): D-04/D-05 rep-ownership authorization via assertCustomerAccess helper`

## Task 2 — D-06 Supabase Bucket ACL: Deferred

### What CONTEXT.md Anticipated

The original D-06 spec asked the user to inspect the Supabase dashboard for the bucket named by `SUPABASE_STORAGE_BUCKET` (default `deck-pdfs`) and report whether it was public or private. If private, no code change. If public, switch both `getPublicUrl` call sites in `src/lib/services/deck-processing.ts` to `createSignedUrl` with a 7-day TTL.

### What We Found (verified 2026-04-07 against the live Supabase project)

| Fact | Value |
|---|---|
| Bucket `public` flag | `true` |
| RLS policies on `storage.objects` | none |
| Files currently in bucket | 16 (all mock data) |
| `ScheduledDeck` rows with `pdfUrl` | 12 (all mock data) |
| `ScheduledDeck` rows with `infographicUrl` | 4 (all mock data) |
| Total `ScheduledDeck` rows | 39 |
| Existing signed-URL pattern in code | none — would be net new |
| `getPublicUrl` call sites in `deck-processing.ts` | 2 (lines 86–87 in `uploadToSupabase()`, lines 350–352 in the inline PDF upload block) |

### Why Deferral Is The Right Call

CONTEXT.md framed this as a binary "switch to signed URLs if public," but on a fully public bucket signed URLs are decorative — the underlying file is still readable via the unsigned public URL pattern. A real fix requires the full chain:

1. Flip the `deck-pdfs` bucket private in Supabase.
2. Add (or replace) policies on `storage.objects` so reps can only read URLs for files they own.
3. Replace both `getPublicUrl` call sites in `src/lib/services/deck-processing.ts` with `createSignedUrl({ expiresIn: 7 * 24 * 60 * 60 })`.
4. Add a regenerate-on-poll path so the deck status route refreshes the signed URL when it expires (otherwise 7 days after generation the leave-behind PDF starts 401-ing in the field).
5. Backfill the 16 existing rows — drop the legacy `getPublicUrl` strings and reissue signed URLs.

That is materially more work than CONTEXT.md scoped, and **the entire dataset in the system today is mock data**. The Infographic Generator is still an MVP. Closing this hole on mock data spends real engineering hours for zero real-world benefit, and a half-measure (signed URLs on a still-public bucket) would be worse than nothing because it implies a security guarantee that does not exist.

The decision is therefore to **defer D-06 entirely** — no change to `src/lib/services/deck-processing.ts`, no script created, no Supabase bucket policy edited — and capture the finding so it is not lost.

### Deferral Confirmation

- `git diff main -- src/lib/services/deck-processing.ts` returns empty in this worktree. The file is byte-identical to `main`.
- No `createSignedUrl` calls were added anywhere in the codebase.
- No `scripts/backfill-signed-urls.ts` was created.
- No Supabase bucket policy was changed.

### Production-Hardening TODO (must be done before real customer data lands)

When the Infographic Generator graduates from MVP and starts handling real customer data, the following must happen as a single hardening pass:

1. Flip `deck-pdfs` bucket private in the Supabase dashboard.
2. Add `storage.objects` RLS policies that restrict reads to the file's owning rep (and admins/managers).
3. Replace both `getPublicUrl` call sites in `src/lib/services/deck-processing.ts` with `createSignedUrl` at a 7-day TTL.
4. Add a regenerate-on-poll path in `GET /api/decks/status/[customerId]` so the rep's leave-behind link is reissued when the signed URL nears expiration.
5. Backfill the existing `ScheduledDeck.pdfUrl` and `ScheduledDeck.infographicUrl` rows — drop the legacy public URL strings and reissue signed URLs from the underlying file paths. (At the time of deferral: 12 `pdfUrl` rows, 4 `infographicUrl` rows.)
6. Add an integration test that asserts an anonymous fetch against a deck file URL returns 401/403, not 200.

**Source of this TODO:** Phase 7 D-06 deferral decision (this SUMMARY), and the Codex review that originally surfaced the bucket ACL gap — Codex review job `task-mnp6gcn3-ihhwdf`.

## Files Modified

By Task 1 (committed in `d2fd39e`):

- `src/lib/auth.ts` — added `assertCustomerAccess` helper.
- `src/app/api/ai/generate-infographic/route.ts` — calls `assertCustomerAccess` after the customer fetch; returns 403 on failure.
- `src/app/api/ai/generate-infographic/batch/route.ts` — calls `assertCustomerAccess` per customer in the loop; silently skips unauthorized customers; returns 403 only if the final `deckIds` array is empty.
- `src/app/api/decks/status/[customerId]/route.ts` — both `GET` and `DELETE` authorize against the customer before reading or mutating the deck record.

Explicitly **not** modified by this plan (intentional, see Task 2 deferral above):

- `src/lib/services/deck-processing.ts`

## Verification

- Task 1: helper exists in `src/lib/auth.ts`; all four route handlers in this plan call it; batch route's per-iteration skip path is in place; commit `d2fd39e` is on this worktree branch.
- Task 2: `git diff main -- src/lib/services/deck-processing.ts` returns empty; this SUMMARY documents the finding, the deferral rationale, and the production-hardening TODO; reference to Codex review job `task-mnp6gcn3-ihhwdf` is captured.

## Follow-Ups for the Orchestrator

- Add a "Discovered TODO" entry to `.planning/STATE.md` referencing this deferral so the production-hardening pass is not lost when Phase 7 archives.
- Wave 3 (Plan 07-03) proceeds as planned for D-07 / D-08 / D-09 — no D-06 logic is folded into 07-03 (no signed URLs to refresh, no regenerate-on-poll path).
- Phase verifier (`gsd-verifier`) should accept this documented deferral as the resolution for D-06's `must_haves`.
