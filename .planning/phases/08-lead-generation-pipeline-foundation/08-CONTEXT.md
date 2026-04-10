# Phase 8: Lead Generation Pipeline Foundation - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning
**Source:** `/gsd-discuss-phase 08 --auto` — decisions pre-locked from prior-session investigation + user-confirmed proposal (this conversation, before context save). All ten implementation decisions were aligned with the user via AskUserQuestion before any files were written; auto-mode then captured them verbatim into this CONTEXT.md without re-asking. Discussion log: `08-DISCUSSION-LOG.md`.

<domain>
## Phase Boundary

Stand up a **property-first intelligence backbone** for Guardian Intel — the durable layer that everything in the Lead Generation Machine roadmap (Phases 2-4) will build on. This phase delivers the data model, services, ingest contract, query layer, outcome feedback hooks, and a minimal Pipeline Inspector page. It is **Phase 1 of the Lead Generation Machine roadmap** (Weeks 1-4 — "Signal Collection Infrastructure") from `Lead_Generation_Machine - app idea overview.docx`.

### In Scope

1. **Data model:** new Prisma models — `TrackedProperty`, `SourceIngestionRun`, `PropertySourceRecord`, `PropertyResolution`, `PropertySignalEvent`, `PropertyScoreSnapshot`, `PropertyOutcomeEvent` — plus nullable `trackedPropertyId` bridge fields on existing tables (`Customer`, `WeatherEvent`, `CanvassingPin`, `PropertyData`)
2. **PostGIS enablement:** migration enables the `postgis` extension, adds `location geography(Point,4326)` on `TrackedProperty`, and creates GIST indexes for radius queries
3. **Service layer:** new `src/lib/services/lead-intel/` with `normalization/`, `entity-resolution/`, `ingest/`, `backfill/`, `queries/`, `spatial/`, `scoring/`. Pure-function core, Prisma-backed adapters
4. **APIs:** ingest, backfill (admin), property list, property detail, compound query, outcome write-back hooks — all under `/api/lead-intel/*`
5. **Backfill from internal sources only:** `Customer`, `WeatherEvent`, `CanvassingPin`, `Interaction`, `PropertyData`. No external connectors in this phase.
6. **One saved compound query:** roof age 15-25 + 3+ storms in 36 months + Guardian neighbor conversion in 12 months (the doc-aligned Phase 1 example)
7. **Pipeline Inspector UI:** new route at `/pipeline` — KPI cards, filters, tracked-property table, detail pane (provenance, signal history, score explanation, outcomes)
8. **Tests:** unit (normalization, resolution, decay math, query builders) + API (ingest auth, idempotent re-ingest, backfill stats, radius query, outcome→snapshot refresh) + migration smoke (`postgis` enabled, GIST indexes, `ST_DWithin`)

### Out of Scope (Deferred to Lead-Gen Phases 2-4)

- **External source connectors** (permits, real estate, NOAA pull, website analytics, social, competitive) — Phase 2 Signal Experiments
- **Learned weighting / ML scoring** — Phase 3 Learned Weighting
- **Outreach automation, notifications, scheduled refresh/re-score jobs** — Phase 4 Automated Prioritization
- **n8n workflow implementations** — only the ingest contract is shipped here. Actual n8n workflows live in n8n, not in this repo.
- **RLS policies on the new tables** — explicitly deferred (see D-02). Tracks the existing Phase 7 D-06 Supabase lockdown TODO in STATE.md.
- **Refactoring `src/lib/services/property/index.ts`** to read from `TrackedProperty` — coexistence-only in Phase 1 (see D-07)
- **Refactoring `src/lib/services/scoring/index.ts`** to use the new explainable score snapshots — coexistence-only in Phase 1 (see D-07)
- **Replacing terrain demo data** in `src/lib/terrain/data-provider.ts` — separate phase
- **Fixing outreach API/hook shape mismatches** — separate cleanup phase
- **Edits to deck-generator, customers, outreach, terrain, claims, dashboard, or analytics surfaces** — strictly hands-off. The new Pipeline Inspector is a sibling route, not a modification of existing pages.

</domain>

<decisions>
## Implementation Decisions

All ten decisions below were resolved with the user before this CONTEXT.md was written. Downstream agents (`gsd-phase-researcher`, `gsd-planner`, `gsd-executor`) MUST treat them as locked.

### Schema + Migration

#### LG-01: PostGIS via Supabase migration with GIST index
- **Locked:** The migration that creates `TrackedProperty` also runs `CREATE EXTENSION IF NOT EXISTS postgis;` and adds `location geography(Point,4326)` (declared in Prisma as `location Unsupported("geography(Point,4326)")?`). A GIST index `idx_tracked_property_location` is created on the `location` column.
- **Why:** Almost every Lead-Gen query is spatial ("all signals within 1 mile of coordinates" — DOCX §"Geographic Index"). PostGIS is the only path that scales past brute-force JS distance math.
- **How to apply:** Use `prisma migrate dev` for the model side, then a hand-written `migration.sql` block for the extension + geography column + index. Mirror the pattern Supabase docs recommend; do NOT try to express geography in pure Prisma.
- **Verification:** Migration smoke test in Plan 08-05 must confirm `SELECT * FROM pg_extension WHERE extname='postgis'` returns a row, the GIST index exists, and `ST_DWithin` returns expected results on seeded properties.

#### LG-02: RLS on new tables — DEFERRED, do not block Foundation
- **Locked:** Phase 8 ships the new `lead_intel_*` tables with the SAME loose policy posture as existing `Customer` / `WeatherEvent` / `CanvassingPin` (no row-level security policies). RLS is **not** added in this phase.
- **Why:** Adding RLS expands scope and couples Foundation to the deferred Phase 7 D-06 Supabase lockdown TODO already parked in `.planning/STATE.md`. Both items will be resolved together in a future security-hardening phase. This phase is data foundation, not auth/authz hardening.
- **How to apply:** Plan 08-01 explicitly notes "no RLS policies in this migration" in the migration file's header comment. Plan 08-03 (APIs) enforces auth at the route layer (NextAuth session + role check) — not at the database layer.
- **Future tracking:** A new TODO must be added to STATE.md `### Discovered TODOs` linking the new tables to the existing D-06 lockdown TODO so they get hardened in the same future pass.

### Service Layer + Scoring

#### LG-03: Entity resolution order
- **Locked:** Resolution attempts run in this order, stopping at the first match:
  1. **Exact normalized address** (street + city + state + ZIP, all lowercased + whitespace-collapsed + standard abbreviations expanded — "St" → "Street", "Rd" → "Road", "N" → "North", etc.)
  2. **Parcel match** (when both records have a parcel number — use it as a hard key)
  3. **Geo-near + street-number + ZIP** (within 100 meters using `ST_DWithin`, AND street number matches, AND ZIP matches)
- **Ambiguous cases (multiple candidates at the same priority level):** mark the new record as `resolution_status: "pending_review"`, do NOT auto-merge. Pending records are visible in the Pipeline Inspector detail pane.
- **Why:** Roofing CRMs are full of address typos. Strict normalization catches 90% of duplicates; parcel handles known-good cases; geo-near handles "123 Main St Apt 4" vs "123 Main Street #4". Auto-merging on geo proximity alone is dangerous (apartment buildings, condos) — pending_review is the safe default.
- **How to apply:** Implement in `src/lib/services/lead-intel/entity-resolution/`. Pure functions for the matching logic; Prisma-backed adapter for the actual lookups. Plan 08-02 owns this.

#### LG-04: Decay math + explainable score snapshots
- **Locked:** Score formula for every signal contribution:
  ```
  effectiveWeight = baseWeight * reliabilityWeight * exp(-ln(2) * ageDays / halfLifeDays)
  ```
  - `baseWeight` — signal-type weight (configured per signal type in `src/lib/services/lead-intel/scoring/weights.ts`)
  - `reliabilityWeight` — source reliability (0.0-1.0, configured per source type)
  - `halfLifeDays` — signal-type half-life (configured per signal type — e.g., storm exposure 365 days, canvassing visit 90 days)
  - `ageDays` — `now() - signal.eventTimestamp` in days
  - `exp(-ln(2) * ageDays / halfLifeDays)` — standard half-life decay (the signal contributes half its weight after `halfLifeDays`)
- **Snapshot persistence:** Every score evaluation writes a `PropertyScoreSnapshot` row containing: total score, contributing signals (signal-event ID + effectiveWeight + base/reliability/decay components), formula version, evaluatedAt. Snapshots are immutable — recomputation creates a new row.
- **Why:** Explainability is the only way reps will trust the system. "Why did this property score 87?" must always be answerable from the snapshot, no recomputation required. The DOCX §"Temporal Event Store" calls this out as a required capability.
- **How to apply:** Pure functions in `src/lib/services/lead-intel/scoring/decay.ts` and `score.ts`. No I/O in the math layer. Plan 08-02 owns this.

#### LG-05: Phase 1 active signals — internal-only
- **Locked:** Phase 1 backfill and scoring use ONLY signals derivable from existing internal data already in the repo. No external sources, no n8n connectors firing in production.
  - **Roof age signal** — from `Customer.roofAge`, `Customer.yearBuilt`, `PropertyData.yearBuilt`, `CanvassingPin.roofAge`
  - **Storm exposure signal** — from `WeatherEvent` rows joined by lat/lng radius (or by `customerId` when set)
  - **Canvassing recency signal** — from `CanvassingPin.knockedAt`
  - **CRM contact recency signal** — from `Interaction` (most recent contact date)
  - **Nearby Guardian wins signal** — from `Customer` rows where `status` is `closed-won` within a configurable radius (default 1 mile) and time window (default 12 months)
- **Why:** The DOCX explicitly says "Tier 1: Data You Already Have (Mine It Deeper)" — start with what you have, don't promise external connectors before the foundation works. Validates the architecture against real internal data before any n8n integration cost.
- **How to apply:** Plan 08-02 implements signal extractors as adapters in `src/lib/services/lead-intel/backfill/`. Each extractor returns `PropertySignalEvent[]` for a given source row.

### Ingest API + Auth

#### LG-06: Two auth surfaces — shared secret for n8n, NextAuth + role for backfill/admin
- **Locked:**
  - **`POST /api/lead-intel/ingest`** — accepts a shared-secret header `X-Lead-Intel-Ingest-Key` matching `LEAD_INTEL_INGEST_SECRET` env var. No NextAuth session required. Returns 401 if header missing/wrong. This is the contract n8n workflows will hit when they exist.
  - **`POST /api/lead-intel/backfill`** — requires NextAuth session AND `session.user.role === "admin"`. Returns 403 otherwise. This is the manual / admin-triggered backfill from internal sources.
  - **`GET /api/lead-intel/properties` and `GET /api/lead-intel/properties/:id`** — require NextAuth session, any authenticated user, no role gate. (Rep-ownership filtering is **deferred** — see D-02 / Phase 7 D-06 lockdown TODO.)
- **Why:** n8n workflows can't carry NextAuth sessions; they need a shared secret. Backfill is destructive enough to deserve admin-only. List/detail endpoints are read-only and used by the Pipeline Inspector — locking them to admins would break the page.
- **How to apply:** Add `LEAD_INTEL_INGEST_SECRET` to `src/lib/env.ts` zod schema as a required string in production, optional in dev (warns if missing). Plan 08-03 implements both auth gates and the role-check helper.
- **Future tracking:** Rep-ownership filtering on the list endpoint is a known limitation. Add a TODO to STATE.md.

### Coexistence + Architecture

#### LG-07: Additive-only — leave existing scoring/property services untouched
- **Locked:** `src/lib/services/scoring/index.ts` (customer-centric rule scoring) and `src/lib/services/property/index.ts` (Customer-only "property" reads) are NOT modified in Phase 8. The new `src/lib/services/lead-intel/` lives alongside them. The existing customer dashboard, customers page, and any scoring/property-aware features continue to use the old services unchanged.
- **Why:** Phase 8 is Foundation. Refactoring two existing services to use the new property-first model would (a) explode scope, (b) risk regressions in the customer dashboard, and (c) couple this phase to a downstream "unification" decision the user hasn't made yet. Coexistence is the safe Foundation move.
- **How to apply:** Plans 08-02 through 08-05 must NOT import from `src/lib/services/scoring/` or `src/lib/services/property/`. Reverse direction is also forbidden — existing services must NOT import from `src/lib/services/lead-intel/`. The two service families are siblings until a future phase explicitly unifies them.
- **Verification:** Plan 08-05 should add a grep-based test or assertion that confirms zero cross-imports between the two service trees.

#### LG-08: Outcome write-back via thin helper, not via cron
- **Locked:** When existing customer-stage mutations or canvassing-appointment mutations fire, a thin helper (`writeOutcomeEvent`) in `src/lib/services/lead-intel/scoring/outcomes.ts`) is called inline to write a `PropertyOutcomeEvent` row. The helper is idempotent (deduplicates by `(trackedPropertyId, eventType, sourceMutationId)`). It does NOT trigger an immediate score recomputation — that happens lazily on the next list/detail read.
- **Hook locations (must be added in Plan 08-03):**
  - Customer status/stage mutation handler — wherever `Customer.status` or `Customer.stage` is updated (likely `src/lib/data/customers.ts` or the corresponding API route)
  - Canvassing pin appointment mutation handler — wherever `CanvassingPin.appointmentDate` or `CanvassingPin.outcome` is updated
- **Why:** A cron is out of scope (Phase 4 Automation), and inline writes are immediately visible in the Pipeline Inspector without polling. Lazy recomputation keeps the mutation hot path cheap. Idempotency prevents duplicate outcome events when the user toggles a status back and forth.
- **How to apply:** Plan 08-03 owns the helper + hook insertion. Each insertion site gets a code comment `// LG-08: outcome write-back to lead-intel` so future developers can find them.

### Saved Compound Query + UI

#### LG-09: Ship one saved compound query in Phase 8 (the doc-aligned example)
- **Locked:** Plan 08-03 ships exactly one saved compound query, registered in `src/lib/services/lead-intel/queries/saved.ts` and exposed via `GET /api/lead-intel/queries/high-value-roof-storm-neighbor`:
  - Roof age between 15 and 25 years
  - 3 or more storm events (any severity) within 36 months
  - At least one Guardian closed-won customer within 1 mile within 12 months
- **Why:** This is the literal example from the DOCX §"Compound Signal Approach" — proving the query layer works against real backfilled data is the most important Phase 1 validation. Shipping a library of saved queries is Phase 2 work.
- **How to apply:** The saved query is a function `(prisma) => Promise<TrackedProperty[]>` with explicit Prisma + raw SQL (PostGIS `ST_DWithin`) — NOT a generic query builder. Generic compound queries are Phase 2.

#### LG-10: Pipeline Inspector — new sibling route, zero edits to existing dashboard
- **Locked:** New route at `src/app/(dashboard)/pipeline/page.tsx`. Layout:
  - **Top:** KPI cards — Total tracked properties, Properties scored in last 24h, Pending entity-resolutions, Outcomes recorded this week
  - **Middle:** Filter bar — score range slider, signal-type multiselect, has-pending-resolution toggle, ZIP/state filter, "Run saved query: High-value roof+storm+neighbor" button
  - **Left/center:** Tracked-property table — sortable by score, last updated, signal count
  - **Right (or modal on mobile):** Detail pane — provenance section (source records grouped by source), signal history timeline, score explanation (most recent snapshot's contributions), outcome history
- **Hooks:** New `src/lib/hooks/use-lead-intel.ts` with React Query keys `["lead-intel", "properties", filters]`, `["lead-intel", "property", id]`, `["lead-intel", "saved-query", queryId]`. Follows existing hook patterns from `src/lib/hooks/use-customers.ts`.
- **Out of scope for Plan 08-04:** Editing rep-ownership, triggering ingest from the UI, or adding the route to the sidebar nav. The route is reachable by URL only in Phase 8 (a follow-up pass adds the nav entry once the data layer is proven).
- **Why:** The whole point of Phase 1 is to prove the data layer is trustworthy. The inspector is for the user (and reps in pilot) to look at backfilled data, not to drive workflows. A read-only sibling route is the lowest-risk way to expose the data without touching any existing page.

### Claude's Discretion

The following are intentionally NOT locked — `gsd-planner` and `gsd-executor` may decide based on their research and the codebase:

- **Exact column list on `TrackedProperty`** beyond canonical address fields, lat/lng, location, parcelNumber, normalizedAddress, normalizedKey, resolutionStatus, createdAt, updatedAt. Add what makes sense; defer "nice-to-have" fields.
- **Index strategy** beyond GIST on `location`. Add `@@index` declarations as needed for query performance — planner should profile expected query shapes and decide.
- **Exact normalization rules** beyond the ones listed in LG-03 (lowercase, whitespace, standard abbreviations). Address normalization is a research area; the planner should look at `libpostal` or `postal-address-parser` and decide whether to vendor or hand-roll.
- **Half-life and base-weight defaults** for each signal type. Pick reasonable starting values; document them in `weights.ts`. Future calibration is Phase 3 work.
- **Detail pane interaction** — whether it's a modal, side panel, or full page. Mobile-first is fine; desktop layout is at planner's discretion.
- **Test framework choice** between vitest unit tests, Playwright API tests, and a Prisma test helper. Match existing patterns in `tests/` and `src/features/infographic-generator/utils/__tests__/`.
- **Backfill batch size and progress reporting** — the backfill script is admin-triggered and one-shot; reasonable defaults are fine. If it takes more than a minute, show progress in API response.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source spec (the lead-gen vision)
- `C:\Users\scott\Documents\business\concepts\lead-generation-machine\Lead_Generation_Machine - app idea overview.docx` — **The DOCX is the source of truth.** Read it in full before planning. Pay particular attention to:
  - §"System Architecture Requirements" — six core capabilities
  - §"Tier 1: Data You Already Have (Mine It Deeper)" — Phase 1 signal scope
  - §"Compound Signal Approach" — the example query LG-09 implements
  - §"Technical Architecture: Data Fusion" — entity resolution, temporal store, geographic index, reliability weighting, feedback loop
  - §"Implementation Roadmap" — confirms Phase 1 = "Signal Collection Infrastructure", not scoring or automation
- The PDF version exists in the same folder but is NOT canonical — use the DOCX only.

### Project guidelines
- `CLAUDE.md` — Tech stack (Next.js 15, React 19, Prisma 6, Supabase, Upstash Redis), naming conventions, error handling patterns, GSD workflow enforcement, NotebookLM-only feedback memory (does not affect this phase but explains why deck-generator is hands-off)
- `.planning/PROJECT.md` — Project core value (Infographic Generator) — note that Phase 8 introduces a new product area (Lead Generation Pipeline) inside the same milestone; PROJECT.md is not updated here, but a future `/gsd-new-milestone` may.
- `.planning/STATE.md` — Accumulated decisions; in particular the Phase 7 D-06 Supabase lockdown TODO that LG-02 (deferred RLS) tracks against
- `.planning/ROADMAP.md` — Phase 8 entry (added 2026-04-09)

### Schema files (read before LG-01 / LG-03 / LG-05 / LG-08 work)
- `prisma/schema.prisma:113-214` — `Customer` model (note: has `latitude`/`longitude`, `roofAge`, `yearBuilt`, no FK to `PropertyData`)
- `prisma/schema.prisma:244-291` — `WeatherEvent` model (note: has `customerId?`, `latitude`/`longitude`, `eventDate`, `severity`, hail/wind specifics)
- `prisma/schema.prisma:293-335` — `InsuranceClaim` model (Phase 7 reference; not consumed in Phase 8 backfill but worth knowing the field shape)
- `prisma/schema.prisma:337-` — `PropertyData` model (note: has `@@unique([address, city, state, zipCode])` — useful for entity resolution baseline)
- `prisma/schema.prisma:805-845` — `CanvassingPin` model (note: has `customerId?`, `latitude`/`longitude`, `roofAge`, `knockedAt`, `appointmentDate`, `outcome`)

### Service files to read for pattern reference (do NOT modify them in Phase 8 — see LG-07)
- `src/lib/services/property/index.ts` — Existing customer-only "property" service. Read to understand the gap LG-07 leaves intentionally unbridged.
- `src/lib/services/scoring/index.ts` — Existing customer-centric rule-based scoring. Read to understand why LG-04's explainable snapshots are a different abstraction.
- `src/lib/data/customers.ts` and `src/lib/data/index.ts` — Pattern reference for the `lead-intel` data adapter layer; LG-08 outcome hooks may need to be inserted here or in the corresponding API routes.
- `src/lib/hooks/use-customers.ts` — Pattern reference for `src/lib/hooks/use-lead-intel.ts` (LG-10)
- `src/lib/env.ts` — Pattern reference for adding `LEAD_INTEL_INGEST_SECRET` (LG-06)

### Existing test patterns
- `src/features/infographic-generator/utils/__tests__/infographicDataAssembler.test.ts` — Pattern for unit tests against pure functions (matches LG-04 decay math, LG-03 normalization tests)
- `tests/` directory — top-level test patterns; check before deciding test layout

### Files NOT to read or modify
- Anything under `src/features/deck-generator/` or `src/features/infographic-generator/` — explicit hands-off per CLAUDE.md feedback memory
- `src/app/api/ai/generate-infographic/*` — Phase 7 territory
- `src/app/api/decks/*` — deck-generator territory
- `src/lib/terrain/*` — demo-backed; LG-05 explicitly excludes terrain data
- `src/lib/services/outreach/*` — known shape mismatches; not relevant to Foundation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`prisma/schema.prisma` Prisma 6 + Supabase Postgres** — Migration tooling already in place. The `Unsupported("geography(Point,4326)")?` pattern is documented; use it for `TrackedProperty.location`.
- **`src/lib/env.ts` zod schema** — New env var (`LEAD_INTEL_INGEST_SECRET`) plugs into the existing validation pattern. Production = required, dev = warn.
- **`@upstash/redis` cache layer (`src/lib/cache.ts`)** — Optional caching for the Pipeline Inspector list endpoint if performance demands it. Planner discretion. Not required by any locked decision.
- **React Query provider at `src/lib/query-provider.tsx`** — `use-lead-intel.ts` plugs into existing query infrastructure with no setup work
- **NextAuth + JWT session in `src/lib/auth.ts`** — Role-check pattern (`session.user.role === "admin"`) already established by Phase 7 D-04/D-05. LG-06 reuses the same pattern for the backfill endpoint.
- **`PropertyData.@@unique([address, city, state, zipCode])`** — A composite-key uniqueness already enforced in the schema. Useful as a normalization-quality baseline; LG-03 should produce equal-or-better deduplication.
- **Existing `Customer.latitude` / `Customer.longitude` fields** — Backfill source for `TrackedProperty.location`. Coordinates are nullable, so backfill must skip rows without coordinates and surface a count in the backfill response.

### Established Patterns

- **Service singleton via barrel `index.ts`** — Match `src/lib/services/scoring/index.ts` and `outreach/index.ts`. Each subdirectory exports its own surface; the top-level `lead-intel/index.ts` re-exports.
- **Data layer in `src/lib/data/`** — Phase 8's `lead-intel` service is allowed to call Prisma directly OR go through a thin `src/lib/data/lead-intel.ts` layer. Planner discretion. Match whatever the planner finds is most consistent with the surrounding code.
- **API route style (`src/app/api/.../route.ts`)** — try/catch wrapping, `{ success: false, error, details }` shape on errors, `[API] METHOD /api/path error:` log prefix, NextAuth session check before any business logic. Phase 7's D-04/D-05 routes are the most recent reference.
- **Hook key factories** — `customerKeys.all`, `customerKeys.list(filters)` style. `leadIntelKeys.all`, `leadIntelKeys.list(filters)`, `leadIntelKeys.detail(id)`, `leadIntelKeys.savedQuery(queryId)`.
- **Tailwind + Radix UI + Framer Motion** — same stack as the existing dashboard pages. The Pipeline Inspector should match the visual language of the customers/dashboard pages but does NOT need to import any existing dashboard components — keep it self-contained to avoid coupling.

### Integration Points

- **`prisma/schema.prisma`** — Single file with all model additions + bridge fields. Plan 08-01 owns this.
- **`src/lib/env.ts`** — Add `LEAD_INTEL_INGEST_SECRET` to the zod schema. Plan 08-03 owns this.
- **`src/lib/data/customers.ts`** (or wherever Customer status mutations live) — LG-08 outcome write-back hook insertion site. Plan 08-03 owns this.
- **`src/lib/data/`** for canvassing mutations (location TBD by planner) — LG-08 hook insertion site. Plan 08-03 owns this.
- **`src/app/(dashboard)/`** — New sibling route at `pipeline/page.tsx`. Plan 08-04 owns this. Do NOT touch the existing `(dashboard)/layout.tsx`, sidebar, or any other route.
- **`src/lib/hooks/index.ts`** — Re-export `use-lead-intel` from the barrel. Plan 08-04 owns this.

</code_context>

<specifics>
## Specific Ideas

- **DOCX-aligned saved query is the validation litmus test.** If Plan 08-03 cannot make the high-value-roof-storm-neighbor query return reasonable results against backfilled data, the Foundation has failed. This is the single most important signal of Phase 1 success.
- **Coexistence over unification.** The user explicitly wants new `lead-intel/` services to live alongside existing `scoring/` and `property/` services without touching them. Do NOT propose a "while we're here, let's unify" refactor in any plan. Unification is a future-phase decision.
- **n8n is a contract, not an implementation.** No n8n workflows are written in this repo. The ingest API is shaped so n8n can call it later. The user understands no external connectors fire in Phase 8.
- **Ten thousand properties is small.** PostgreSQL + PostGIS handles this scale trivially. Don't over-engineer for scale; over-engineer for correctness and explainability.
- **Backfill should be re-runnable.** The same backfill called twice should produce zero new records and zero duplicates. Idempotency is enforced by entity resolution + the ingestion run's source-record dedup key.

</specifics>

<deferred>
## Deferred Ideas

These came up in the plan or in the user's vision but explicitly belong outside Phase 8.

### Lead-Gen Roadmap Phase 2 (Signal Experiments)
- Adding 2-4 external sources via n8n (permits, real estate listings, NOAA pull)
- Library of saved compound queries beyond the one shipped in LG-09
- Manual conversion-rate measurement against backfilled queries

### Lead-Gen Roadmap Phase 3 (Learned Weighting)
- Recalibrating weights from `PropertyOutcomeEvent` history
- Any ML or learned-scoring component
- Per-market weight tuning

### Lead-Gen Roadmap Phase 4 (Automation)
- Routing prioritized properties into outreach/canvassing workflows
- Push notifications when high-score properties appear
- Scheduled refresh and re-score jobs (cron)

### Other Phases / Future Hardening
- **RLS policies on the new `lead_intel_*` tables** — tracked alongside Phase 7 D-06 Supabase lockdown TODO. Add new STATE.md TODO entry at end of Phase 8.
- **Rep-ownership filtering on `GET /api/lead-intel/properties`** — currently any authenticated user sees all tracked properties. Same future security pass.
- **Refactoring `src/lib/services/scoring/index.ts` and `src/lib/services/property/index.ts`** to use the new property-first model — coexistence in Phase 8; unification is a future decision.
- **Replacing `src/lib/terrain/data-provider.ts` demo data** — separate phase
- **Fixing `src/lib/services/outreach/` API/hook shape mismatches** — separate cleanup phase
- **Adding the Pipeline Inspector to the sidebar nav** — follow-up pass once the data layer is proven
- **`PROJECT.md` rewrite to reflect the addition of a Lead Generation Pipeline product area** — best handled by `/gsd-new-milestone` once Phase 8 lands
- **Resolving the `npm run lint` ESLint missing-binary issue** — pre-existing repo condition flagged in the user's prior session; not introduced by Phase 8 but may block Plan 08-05's lint step
- **Resolving the `npm run test:run -- tests/unit/scoring.test.ts` `spawn EPERM` error** — pre-existing repo condition; same caveat for Plan 08-05

</deferred>

<known_blocked>
## Known-Blocked Verification (carry into Plan 08-05)

These were observed during the prior investigation session and are NOT introduced by this phase, but Plan 08-05 owns either resolving or formally working around them:

1. **`npm run test:run -- tests/unit/scoring.test.ts` failed with `spawn EPERM`** — Windows/permissions issue with vitest spawn. Plan 08-05 must either fix the underlying issue or document a working test command (e.g., `npx vitest run path/...`).
2. **`npm run lint` failed because `next lint` cannot find ESLint in the current environment** — ESLint not installed or not on PATH. Plan 08-05 must either install/restore ESLint or document the workaround.

If 08-05 cannot resolve these in-phase, it must add them to STATE.md `### Discovered TODOs` with a clear rationale before the phase is marked complete.

</known_blocked>

---

*Phase: 08-lead-generation-pipeline-foundation*
*Context gathered: 2026-04-09 via `/gsd-discuss-phase 08 --auto`*
*All ten implementation decisions (LG-01..LG-10) were locked with the user via AskUserQuestion before this file was written; auto-mode captured them verbatim without re-asking.*
