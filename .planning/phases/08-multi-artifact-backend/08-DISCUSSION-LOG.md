# Phase 8: Multi-Artifact Backend - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 08-multi-artifact-backend
**Areas discussed:** Prisma schema shape, Orchestrator contract, API + route strategy, Storage paths + stuck-recovery

---

## Prisma Schema Shape

### Q: How should per-artifact state be modeled in Prisma?

| Option | Description | Selected |
|--------|-------------|----------|
| Extend ScheduledDeck in place | Add deck/infographic/audio/reportStatus + Error + CompletedAt columns to existing row. ~60% schema already there. | ✓ |
| New ScheduledArtifactSet + ScheduledArtifact child rows | Proper normalization, scales to future artifact types. Two-table JOIN on every poll. | |
| Extend in place + rename later | Same as extend, flagged as rename-later debt. | |

**User's choice:** Extend ScheduledDeck in place
**Notes:** Matches the finding that existing ScheduledDeck already has requestedArtifacts, audioUrl, infographicUrl, reportMarkdown, etc. Zero-risk additive migration.

### Q: What role does the existing top-level `status` field play alongside the new per-artifact status columns?

| Option | Description | Selected |
|--------|-------------|----------|
| Derived from per-artifact rollup | One source of truth; top-level status computed from per-artifact states. | ✓ |
| Independent + both written explicitly | Tracks "orchestrator still running" separately. Risks drift. | |
| Deprecate top-level status entirely | Biggest refactor; breaks recoverStuckDecks query filter. | |

**User's choice:** Derived from per-artifact

### Q: Should per-artifact status use a TypeScript enum/union or raw strings?

| Option | Description | Selected |
|--------|-------------|----------|
| Exported TS union type | `type ArtifactStatus = 'pending'\|'processing'\|'ready'\|'failed'\|'skipped'`. Prisma keeps String. | ✓ |
| Prisma native enum | DB-level enforcement. Mixing styles with existing String `status` column. | |

**User's choice:** Exported TS union type

### Q: Should the notebookId be persisted on the ScheduledDeck row?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, new notebookId column | Enables stuck-job cleanup, debugging, audit. | ✓ |
| No, keep it in-memory only | Current pattern. Cleaner state but no cleanup hooks for orphaned notebooks. | |

**User's choice:** Yes, new notebookId column

### Q: How should per-artifact progress (0-100) be stored for the UI progress bar?

| Option | Description | Selected |
|--------|-------------|----------|
| No progress column — derive from status | Indeterminate spinner from status string. Matches Phase 5 INFOG-021 "no fake progress" rule. | ✓ |
| Add per-artifact progress Int column | Write 0→50→100. Fake numbers; extra column. | |

**User's choice:** No progress column

---

## Orchestrator Contract

### Q: How should `generateCustomerArtifacts` generate the four artifacts against a single notebook?

| Option | Description | Selected |
|--------|-------------|----------|
| Sequential, fail-tolerant | deck→infographic→audio→report, each try/caught, mark-failed-and-continue. NLM CLI selectNotebook is stateful. | ✓ |
| Parallel with Promise.allSettled | Concurrent against one notebook — unsafe due to stateful selectNotebook. | |
| Sequential, fail-fast | Abort whole job on first failure. Violates SC #4. | |

**User's choice:** Sequential, fail-tolerant

### Q: Where does `generateCustomerArtifacts` live and how does it relate to the existing `processDeckWithNotebookLM`?

| Option | Description | Selected |
|--------|-------------|----------|
| New function in notebooklm/index.ts, refactor processDeckWithNotebookLM to call it | Clean separation, no duplicate formatting. | ✓ |
| New top-level in deck-processing.ts, parallel to processDeckWithNotebookLM | Duplicated formatting code. | |
| New function, coexist forever | Double maintenance. | |

**User's choice:** New function in notebooklm/index.ts, refactor to call it

### Q: Should the orchestrator always create a fresh notebook or support reusing one passed in?

| Option | Description | Selected |
|--------|-------------|----------|
| Optional notebookId param; create if missing | Matches NLMA-02 spec verbatim. Enables future re-run flows. | ✓ |
| Always create fresh, never reuse | Regression against NLMA-02. | |
| Always create fresh but expose notebookId in return | Half-measure. | |

**User's choice:** Optional notebookId param; create if missing

### Q: If deck generation fails mid-orchestration, should subsequent artifacts still attempt?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, each artifact is independent | All four read from notebook sources, not deck. Matches SC #4. | ✓ |
| No, bail on deck failure | Reps lose 3 working artifacts for 1 flaky generator. | |
| Only bail if notebook creation fails | Same as Recommended in practice. | |

**User's choice:** Yes, each artifact is independent

### Q: Per-artifact push notifications — when and from where are they fired?

| Option | Description | Selected |
|--------|-------------|----------|
| Inside orchestrator loop, after each successful upload | Aligns with NLMA-15 as originally written. | |
| Only overall-completion notification (defer per-artifact to Phase 10) | Single push per job. | ✓ (pivoted) |
| Per-artifact events emitted, Phase 10 wires the push send | Indirect, adds plumbing. | |

**User's choice:** (first response) requested clarification; flagged jargon in the options. After clarification, explicitly chose:

### Q (follow-up): One-notification-only — is this the new rule for v1.1, overriding NLMA-15 and Phase 10 Criterion #4?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, one notification only — override the requirement | One push at job completion. NLMA-15 + Phase 10 SC#4 rewritten. | ✓ |
| Yes, one notification — but only notify on failure per-artifact | One success, per-artifact failure. | |
| Keep per-artifact notifications | Revert. | |

**User's choice:** Yes, one notification only — override the requirement
**Notes:** User's exact words: "Sending the user a push notification for every single one would be 'wearisome and annoying'. So, I only want one push notification sent, despite how many notebook, LM outputs the user requested. There should just be a single notification when everything is finished, because it's not going to take more than 15 minutes or so max for even the most heavily requested set of outputs." Overrides a written requirement; captured in D-10 and flagged for REQUIREMENTS.md + ROADMAP.md updates.

---

## API + Route Strategy

### Q: How should the new POST /api/ai/generate-customer-artifacts route relate to the existing /api/decks/process-now?

| Option | Description | Selected |
|--------|-------------|----------|
| New route, dedicated endpoint | Matches NLMA-03 verbatim. Legacy route stays untouched. | ✓ |
| Extend existing /api/decks/process-now | Conflates two use cases. | |
| New route that deprecates the old one | Breaks existing UI during Phase 9 cutover. | |

**User's choice:** New route, dedicated endpoint

### Q: For the status polling endpoint, generalize /api/decks/status/[customerId] in place or create a new /api/artifacts/status/[customerId]?

| Option | Description | Selected |
|--------|-------------|----------|
| Generalize in place, add per-artifact fields to response | Zero URL churn, zero UI breakage. | ✓ |
| New /api/artifacts/status/[customerId] route | Duplicated auth/sweep code. | |
| Generalize + alias | Overkill. | |

**User's choice:** Generalize in place

### Q: What does POST /api/ai/generate-customer-artifacts return on success?

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal: `{ jobId, status: 'processing' }` | Matches existing process-now pattern. | ✓ |
| Rich: initial per-artifact state block already populated | Duplicates shape the status endpoint already returns. | |

**User's choice:** Minimal

### Q: How should the route validate the `artifacts` array in the request body?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline manual check, consistent with existing routes | Matches Phase 4 D-13. | ✓ |
| Zod schema in src/lib/validations.ts | Contradicts Phase 4 decision. | |

**User's choice:** Inline manual check

### Q: What's the exact per-artifact block shape the status endpoint returns?

| Option | Description | Selected |
|--------|-------------|----------|
| `{ status, url, error, completedAt }` | Minimal. Maps 1:1 to DB columns. | ✓ |
| Include isReady/isProcessing/isFailed booleans server-side | Pre-computed flags. | |
| Mirror exact ScheduledDeck column names | Exposes internal naming. | |

**User's choice:** `{ status, url, error, completedAt }`

### Q: How should the report's markdown content be delivered in the status response?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline markdown in the status response | Matches existing code at deck-processing.ts:507. | ✓ |
| Upload markdown to Supabase, return a URL | Extra upload step, extra fetch in UI. | |

**User's choice:** Inline markdown

---

## Storage Paths + Stuck-Recovery

### Q: What storage path convention should each artifact type use in Supabase?

| Option | Description | Selected |
|--------|-------------|----------|
| Top-level per-type prefixes | Matches NLMA-05. Enables per-type lifecycle policies. | ✓ |
| Single per-job folder: artifacts/{jobId}/{type}.ext | Contradicts NLMA-05. | |
| Keep existing `decks/{deckId}/` for everything | Directly contradicts NLMA-05. | |

**User's choice:** Top-level per-type prefixes

### Q: What's the exact content-type for each artifact type?

| Option | Description | Selected |
|--------|-------------|----------|
| Standard MIME types (application/pdf, image/png, audio/mpeg) | Matches existing calls. | ✓ |
| Detect from file extension at upload time | Premature flexibility. | |

**User's choice:** Standard MIME types

### Q: How should recoverStuckDecks generalize to per-artifact state?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-artifact sweep: flip only the stalled artifact fields | 4 updateMany queries scoped per-type. Sequential orchestrator makes sweep unambiguous. | ✓ |
| Whole-row sweep: any stalled artifact = whole job fails | Violates SC #4. | |
| Per-artifact sweep + notebook cleanup | Recommended + delete orphan notebook from NLM. | (folded into chosen option) |

**User's choice:** Per-artifact sweep (notebook-side cleanup folded in as D-22)

### Q: Should the 15-minute threshold be per-artifact or total-job-age?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-artifact: compare updatedAt to cutoff | updatedAt bumps on every transition — only true stalls get swept. | ✓ |
| Total job age from createdAt | Would sweep legitimate long-running jobs mid-progress. | |

**User's choice:** Per-artifact (updatedAt)

---

## User-Driven Scope Input: Decks Page Feedback

Mid-discussion, user shared a screenshot of the current Decks page (2026-04-09 17:11) and gave two pieces of feedback:

1. Decks-page cards should display a chip/thumbnail for every generated artifact type, not just infographic (which is the only chip currently visible, on two circled cards).
2. Clicking an artifact chip should open a large in-page modal, not open the file in a new browser tab.

### Q: How should I handle this Decks-page feedback relative to Phase 8?

| Option | Description | Selected |
|--------|-------------|----------|
| Defer to Phase 9 — capture as locked Phase 9 decisions | Phase 8 stays backend-pure. | ✓ |
| Pull into Phase 8 as part of backend verification | Mixes backend and UI. | |
| Stop Phase 8 and rescope | Only if v1.1 roadmap is fundamentally wrong. | |

**User's choice:** Defer to Phase 9
**Notes:** Captured as D-DECKS-01, D-DECKS-02, D-DECKS-03 in the deferred ideas section of 08-CONTEXT.md. Phase 9 discuss-phase should treat these as locked inputs, not re-derive them. NLMA-11 scope expands: Decks page joins customer profile modal, InfographicGeneratorModal success state, and customer card as a first-class mount surface.

---

## Claude's Discretion

- Migration file naming and sequencing in `prisma/migrations/`.
- Exact location of the `ArtifactStatus` union type file.
- Whether `generateCustomerArtifacts` accepts `customerId` vs a pre-fetched `customer` object.
- Error message wording on per-artifact failure.
- Log prefix convention for the new orchestrator.

## Deferred Ideas

- **D-DECKS-01..03** — Decks page chip rendering and in-page modal (Phase 9 locked inputs).
- **D-PUSH-01** — NLMA-15 + Phase 10 SC#4 must be rewritten when Phase 8 lands.
- Video artifacts — already in v1.0 PROJECT.md "Out of Scope"; flag as v1.2 backlog if user revisits.
- Cross-customer artifact reuse (cache one briefing, share across neighborhood) — not v1.1.
- Rate limiting on the new POST route — existing routes don't, NLM wall time is natural throttle.
