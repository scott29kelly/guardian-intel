# Phase 8: Lead Generation Pipeline Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `08-CONTEXT.md` — this log preserves the alternatives considered
> and the provenance of each locked decision.

**Date:** 2026-04-09
**Phase:** 08-lead-generation-pipeline-foundation
**Command:** `/gsd-discuss-phase 08 --auto`
**Areas discussed:** Roadmap placement, branch strategy, entry command, RLS scope, then 10 auto-resolved implementation decisions derived from a prior-session investigation and a paste-in plan from the user.

---

## Provenance

This phase was NOT gathered through an interactive 4-question-per-area discussion. Instead:

1. **Prior-session investigation** (codex rescue, 2026-04-08 or earlier) produced a thorough implementation plan that the user pasted into the current conversation as context carryover. The plan already contained a Summary, Current State, Roadmap, Phase 1 Implementation, Test Plan, Assumptions and Risks sections.
2. **Current session proposal** — Claude read CLAUDE.md, STATE.md, ROADMAP.md, PROJECT.md, and the `Lead_Generation_Machine - app idea overview.docx` source spec, then proposed:
   - Phase directory `08-lead-generation-pipeline-foundation`
   - 10 locked implementation decisions (LG-01..LG-10)
   - 5-plan breakdown (schema → services → APIs → UI → tests)
   - Branch strategy (keep `codex/lead-gen-pipeline-feature-plan`)
   - Milestone boundary flag (Phase 08 inside v1.0 vs new milestone)
3. **User decisions via `AskUserQuestion`** (captured below)
4. **`/gsd-discuss-phase 08 --auto` invocation** — Claude wrote `08-CONTEXT.md` with the locked decisions. Auto-mode skipped interactive gray-area questions since they had already been resolved in the proposal phase.

---

## Pre-CONTEXT decisions (from AskUserQuestion in the proposal turn)

### Milestone scope

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 08 inside v1.0 (Recommended) | Append to current milestone. Fastest path — write 08-CONTEXT.md + 5 plans under the existing v1.0 roadmap and move on. | ✓ |
| Start new milestone v2.0 | Run /gsd-new-milestone first. Adds a fresh PROJECT.md/REQUIREMENTS.md pass before any phase files. Slower but cleaner separation from the Infographic Generator product area. | |

**User's choice:** Phase 08 inside v1.0
**Notes:** ROADMAP.md updated in this session to add the Phase 8 entry inline with the existing v1.0 phases. PROJECT.md was NOT touched — a future `/gsd-new-milestone` will handle that rewrite.

### Branch strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Keep codex/lead-gen-pipeline-feature-plan (Recommended) | Reuse the existing clean branch. Matches config.json branching_strategy=none. No new branch overhead. | ✓ |
| Cut a new phase branch | Create gsd/phase-08-lead-generation-pipeline-foundation from the current tip, then discard the codex/* branch. | |

**User's choice:** Keep codex/lead-gen-pipeline-feature-plan
**Notes:** `.planning/config.json` has `branching_strategy: "none"`. The branch is a leftover from the prior-session codex rescue investigation and is clean.

### Entry command

| Option | Description | Selected |
|--------|-------------|----------|
| /gsd-discuss-phase --auto (Recommended) | Claude writes 08-CONTEXT.md directly with the locked decisions above (no interactive Q&A — the DOCX + the plan already resolved them). Then stop and wait for user's /gsd-plan-phase call. | ✓ |
| /gsd-discuss-phase (interactive) | Run the full discuss flow with questions. Slower but gives user a chance to refine each locked decision before it hits CONTEXT.md. | |
| /gsd-plan-phase directly | Skip discuss entirely — Claude writes CONTEXT.md + all 5 PLAN.md files in one pass. Riskier if any decision is wrong because there's no checkpoint. | |

**User's choice:** `/gsd-discuss-phase --auto`
**Notes:** Auto-mode normally auto-advances to `/gsd-plan-phase`. This session **intentionally overrides** the auto-advance: per the proposal the user accepted, after CONTEXT.md lands Claude stops and waits for an explicit `/gsd-plan-phase` call. This gives the user a checkpoint to review the locked decisions before planning begins.

### RLS scope

| Option | Description | Selected |
|--------|-------------|----------|
| Defer RLS to a later plan (Recommended) | Phase 1 is Foundation — new tables use the same loose policy posture as existing Customer/WeatherEvent. Matches the D-06 Supabase lockdown TODO already parked in STATE.md. | ✓ |
| Ship RLS with 08-01 | Add RLS policies for all new tables inline with the migration. More secure but expands scope and couples Foundation to the deferred D-06 work. | |

**User's choice:** Defer RLS to a later plan
**Notes:** Locked as LG-02 in CONTEXT.md. Plan 08-05 (or a STATE.md TODO update at phase-end) must link the new tables to the existing Phase 7 D-06 Supabase lockdown TODO.

---

## Locked implementation decisions (LG-01 through LG-10)

These were NOT asked as separate AskUserQuestion items. They were presented as a proposal in the turn before `/gsd-discuss-phase --auto` and the user gave implicit go-ahead by invoking the auto-mode command with the recommended options. They are captured as locked decisions in `08-CONTEXT.md <decisions>`.

| # | Decision | Source |
|---|----------|--------|
| LG-01 | PostGIS via Supabase migration with GIST index on `TrackedProperty.location` | User plan §"Data model" + DOCX §"Geographic Index" |
| LG-02 | RLS on new tables — DEFERRED (matches Phase 7 D-06 TODO) | AskUserQuestion: RLS scope (user selected "Defer") |
| LG-03 | Entity resolution order: exact normalized address → parcel → geo-near+street-number+ZIP; ambiguous → pending_review | User plan §"Services" |
| LG-04 | Decay math `baseWeight * reliabilityWeight * exp(-ln(2) * ageDays / halfLifeDays)` + explainable score snapshots | User plan §"Services" + DOCX §"Temporal Event Store" |
| LG-05 | Phase 1 signals internal-only (roof age, storm exposure, canvassing/CRM recency, Guardian neighbor wins) | User plan §"Phase 1 Implementation" + DOCX §"Tier 1" |
| LG-06 | Two auth surfaces — shared secret (`LEAD_INTEL_INGEST_SECRET`) for n8n ingest; NextAuth + admin role for backfill | User plan §"APIs" |
| LG-07 | Additive-only — existing `scoring/` and `property/` services untouched | User plan §"UI" ("Keep `customers`, `outreach`, `terrain`, and all deck-generator files unchanged") |
| LG-08 | Outcome write-back via thin helper inline with mutations, NOT via cron; lazy score recomputation | User plan §"APIs" + Lead-Gen Phase 4 deferred to later |
| LG-09 | Ship one saved compound query (roof 15-25 + 3 storms 36mo + Guardian neighbor 12mo) | User plan §"APIs" + DOCX §"Compound Signal Approach" |
| LG-10 | Pipeline Inspector at `/pipeline` — read-only sibling route, no nav entry in Phase 8 | User plan §"UI" |

---

## Claude's Discretion (intentionally not locked)

These were listed in `08-CONTEXT.md <decisions>` as Claude's Discretion:

- Exact column list on `TrackedProperty` beyond the required canonical fields
- Index strategy beyond the GIST on `location`
- Exact normalization rules beyond the basic set (whether to vendor `libpostal` or hand-roll)
- Half-life and base-weight defaults per signal type
- Detail pane interaction (modal vs side panel vs full page)
- Test framework choice (vitest vs Playwright for API tests)
- Backfill batch size and progress reporting

---

## Deferred Ideas

Captured in `08-CONTEXT.md <deferred>`. Summary:

- **Lead-Gen Phase 2:** external connectors, query library, conversion-rate measurement
- **Lead-Gen Phase 3:** learned weighting, ML, per-market tuning
- **Lead-Gen Phase 4:** outreach routing, notifications, cron-based refresh
- **Future hardening:** RLS on new tables (tracked w/ Phase 7 D-06), rep-ownership filtering on list endpoint, scoring/property service unification, terrain data replacement, outreach shape fixes, sidebar nav entry, PROJECT.md milestone rewrite
- **Pre-existing verification blockers:** `spawn EPERM` on vitest, missing ESLint binary — Plan 08-05 owns resolving or documenting them

---

## Scope creep attempts

None in this session. The prior-session investigation (the user's paste-in plan) explicitly scoped down from the full 50-signal DOCX vision to an internal-only Foundation. The user reinforced this in the current session by confirming "Phase 1 Foundation" scope and asking to stay isolated from deck-generator work.

---

*Generated: 2026-04-09 via `/gsd-discuss-phase 08 --auto`*
*This log is human-only and not consumed by downstream agents.*
