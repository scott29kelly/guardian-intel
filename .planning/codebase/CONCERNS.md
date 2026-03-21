# Codebase Concerns

**Analysis Date:** 2026-03-21

---

## Tech Debt

**Terrain/Brief system runs entirely on mock data:**
- Issue: The entire Terrain intelligence feature generates simulated data, not real data. `TerrainDataProvider` (singleton at `src/lib/terrain/data-provider.ts`) seeds itself from generator functions at startup. Storm events, permit records, market indicators, competitor activities, and intelligence briefs are all fabricated.
- Files: `src/lib/terrain/data-provider.ts`, `src/lib/terrain/generators/brief-generator.ts`, `src/lib/terrain/constants.ts`
- Impact: The Terrain section (briefs, alerts, sources, map) presents generated numbers to users as intelligence. Data source statuses are explicitly tagged `'mock'` or `'placeholder'` in `src/lib/terrain/constants.ts` lines 65–130.
- Fix approach: Replace generator functions with real NOAA API calls (`src/lib/services/weather/noaa-service.ts` is already wired) and real county permit data sources. The `DataSourceStatus` type (`src/lib/terrain/types.ts`) already supports `'live'` status.

**Property data service only reads from internal customer records:**
- Issue: `src/lib/services/property/index.ts` is built to aggregate county assessor, Zillow, and satellite imagery data but its `fetchPropertyData()` method exclusively queries the Prisma `Customer` table. When no matching customer record exists, it returns `null`. No external property APIs are integrated.
- Files: `src/lib/services/property/index.ts` (lines 250–320)
- Impact: Property lookups for addresses not already in the CRM return empty results. Roof age, lot size, and market value fields in the deck generator rely on this service and silently degrade.
- Fix approach: Integrate a real property data API (e.g., ATTOM, CoreLogic) or the free county assessor endpoints referenced in the service JSDoc.

**`src/lib/validations.ts` is almost entirely unused:**
- Issue: 40 of the file's exported schemas and types are never imported anywhere in the codebase (documented in `DEAD_CODE_AUDIT.md` §4c). Active routes import `chatRequestSchema`, `customerQuerySchema`, and a few others, but the file contains ~200 lines of dead validation logic.
- Files: `src/lib/validations.ts`
- Impact: False sense of input validation coverage. New developers may assume more routes are validated than actually are.
- Fix approach: Remove the 40 unused exports. Keep only the schemas that are actively imported by API routes.

**Entire canvassing subsystem has no frontend:**
- Issue: A complete backend for canvassing exists (`/api/canvassing/stats`, `/api/canvassing/push-leads`, `/api/canvassing/routes`, `/api/canvassing/sync`) plus `src/lib/services/canvassing/` with no corresponding UI page or hook consumer.
- Files: `src/app/api/canvassing/` (4 routes), `src/lib/services/canvassing/`
- Impact: Dead server code executed by no user action. Increases cold start time, complicates codebase navigation.
- Fix approach: Either build the canvassing page or remove all canvassing routes and service code.

**Gamification feature is incomplete:**
- Issue: Multiple gamification components are built but never rendered: `AnimatedCurrency`, `AnimatedScore`, `StreakCounter`, `XPCounter` in `src/components/gamification/animated-counter.tsx`; `DealClosedCelebration`, `InlineCelebration` in `src/components/gamification/celebration-modal.tsx`; `ConfettiBurst` in `src/components/gamification/confetti.tsx`.
- Files: `src/components/gamification/` (multiple files), `src/lib/gamification/types.ts`
- Impact: Bundle includes JavaScript for features users never see. Suggests a half-built feature with no clear owner.
- Fix approach: Either render the components in the analytics/dashboard pages, or delete the gamification directory and remove the `/api/gamification` route.

**`WeatherAlert` type defined 3 times with diverging shapes:**
- Issue: Three independent `WeatherAlert` interfaces exist with different fields.
  - `src/lib/services/weather/noaa-service.ts` (line 18) — primary shape with `counties`, `instruction`, `onset`, `expires` fields
  - `src/lib/services/weather/index.ts` (line 19) — barrel that re-exports a slightly different shape
  - `src/components/modals/storm-details/types.ts` (line 35) — UI-local type with different field names
- Impact: Type mismatches surface at integration boundaries. Components and services must cast or transform between incompatible shapes. Any change to the primary type requires updating three locations.
- Fix approach: Consolidate to a single `WeatherAlert` in `src/lib/services/weather/noaa-service.ts`, re-export from `src/lib/services/weather/index.ts`, and update the storm details modal to use the shared type.

**13 orphaned API routes with no frontend consumers:**
- Issue: As documented in `DEAD_CODE_AUDIT.md` §3, 13 routes have zero client-side fetch calls. Notable examples: `/api/admin/cache`, `/api/admin/activity`, `/api/crm/sync`, `/api/analytics/aggregate`, `/api/weather/daily-brief`, `/api/weather/check-address`, `/api/weather/storm-reports`, `/api/weather/opportunities`, `/api/decks/schedule/bulk`.
- Files: `src/app/api/admin/`, `src/app/api/crm/sync/`, `src/app/api/weather/daily-brief/`, `src/app/api/weather/check-address/`, `src/app/api/weather/storm-reports/`, `src/app/api/weather/opportunities/`, `src/app/api/analytics/aggregate/`, `src/app/api/decks/schedule/bulk/`
- Impact: Inflated API surface with security exposure (routes exist and may be reachable). Increases cognitive load for developers exploring the codebase.
- Fix approach: Audit each route — those with no near-term product plan should be deleted; those planned for future features should be gated behind feature flags or moved to a `_planned/` directory.

---

## Known Bugs

**`src/lib/services/competitors/index.ts` exports a missing module:**
- Symptoms: `index.ts` contains `export * from "./types"` but previously documented re-exports from `./analytics` — a file that does not exist (`analytics.ts` is absent from the `competitors/` directory). Any code path that reaches the competitor analytics exports at runtime will throw a module-not-found error.
- Files: `src/lib/services/competitors/index.ts`
- Trigger: Any runtime import that traverses through competitor analytics (competitor analytics page, AI tool using competitor data).
- Workaround: The current `index.ts` only exports from `./types`, so the broken re-export has been partially addressed but the analytics functions referenced in the dead-code audit (`calculateActivityTrends`, `calculateCompetitorRankings`, etc.) are simply gone.

**`/api/events` SSE endpoint uses module-level mutable state:**
- Symptoms: `src/app/api/events/route.ts` stores `clients` (a `Set`) and `centralPollInterval` as module-level variables. On Vercel's serverless runtime, each cold start creates a new module instance. Clients connected to one function instance cannot receive events broadcast from a different instance. Under load with multiple function instances, real-time updates will be silently lost.
- Files: `src/app/api/events/route.ts` (lines 20–33)
- Trigger: Multiple concurrent users in production on Vercel.
- Workaround: None currently. Requires replacing module-level state with a shared pub/sub mechanism (Redis pub/sub or Supabase Realtime).

**In-memory rate limiting breaks on serverless:**
- Symptoms: `src/lib/rate-limit.ts` falls back to an in-memory `Map` (`inMemoryStore`) when Upstash Redis is not configured. On serverless, each invocation may be a new process, so the counter resets with every cold start. Requests can exceed rate limits when Redis is unavailable.
- Files: `src/lib/rate-limit.ts` (lines 17, 62–87)
- Trigger: Development environments without Redis, or production if `UPSTASH_REDIS_REST_URL` is unset.
- Workaround: Configure Upstash Redis for production. In-memory mode is acceptable for development only.

---

## Security Considerations

**AI slide generation routes lack authentication and rate limiting:**
- Risk: `src/app/api/ai/generate-slide/route.ts` and `src/app/api/ai/generate-slide-image/route.ts` have no `getServerSession` call and no `rateLimit` call. Any unauthenticated HTTP request can trigger AI generation, consuming API quota.
- Files: `src/app/api/ai/generate-slide/route.ts`, `src/app/api/ai/generate-slide-image/route.ts`
- Current mitigation: The middleware (`src/middleware.ts`) protects all routes that are not in the explicit exclusion list. These routes may be covered by the catch-all matcher pattern, but explicit per-route auth checks are absent.
- Recommendations: Add `getServerSession` checks at the top of each handler and wrap with `rateLimit(request, "ai")`.

**SSE endpoint has no authentication:**
- Risk: `src/app/api/events/route.ts` has no auth check. Any unauthenticated client can establish an SSE connection and receive internal data (storm events, customer updates, intel items).
- Files: `src/app/api/events/route.ts`
- Current mitigation: Middleware catch-all matcher may cover this path, but no explicit check exists in the route.
- Recommendations: Add `getServerSession` at the start of the `GET` handler and close the stream with a 401 if no valid session.

**Session user fields accessed via `as any` cast:**
- Risk: `src/app/api/customers/route.ts` (line 87) and `src/components/sidebar.tsx` (line 96) cast `session.user` to `any` to access `id` and `role` fields. This bypasses TypeScript's type checking for authorization-critical fields.
- Files: `src/app/api/customers/route.ts`, `src/components/sidebar.tsx`, `src/types/next-auth.d.ts`
- Current mitigation: The fields are present at runtime via NextAuth session augmentation, but are not typed in the NextAuth module declaration.
- Recommendations: Extend the `Session` and `JWT` types in `src/types/next-auth.d.ts` to include `id`, `role`, and `companyId`. Eliminate `as any` casts on session objects.

**Rate limiting uses client IP from `x-forwarded-for` without sanitization:**
- Risk: `src/lib/rate-limit.ts` (line 118–119) takes the first IP from `x-forwarded-for` and uses it as the rate limit key without validation. An attacker can send a spoofed `X-Forwarded-For` header to bypass IP-based rate limiting.
- Files: `src/lib/rate-limit.ts`
- Current mitigation: When Upstash Redis is configured, limits are more resilient. No sanitization of the header value currently.
- Recommendations: Use the rightmost IP in the forwarded chain, or prefer `x-real-ip` (set by Vercel edge). Validate that the IP is a valid IPv4/IPv6 address before using it as a key.

**jsPDF critical vulnerability in dependencies:**
- Risk: `jsPDF` has a critical severity PDF Object Injection vulnerability (GHSA-7x6v-j9x4-qf24) and HTML Injection in New Window paths (GHSA-wfv2-pwc8-crg5). Used in deck generation for PDF export.
- Files: `package.json` (jspdf dependency)
- Current mitigation: None. Vulnerability is confirmed via `npm audit`.
- Recommendations: Run `npm audit fix` — a patch is available without breaking changes. Verify deck PDF generation still works after patching.

**next-pwa dependency chain contains RCE-risk vulnerability:**
- Risk: `next-pwa` → `workbox-webpack-plugin` → `workbox-build` → `rollup-plugin-terser` → `serialize-javascript` contains a high-severity RCE vulnerability via RegExp and Date prototype (GHSA-5c6j-r48x-rmvq). Fix requires `npm audit fix --force` with a breaking version change to `next-pwa@2.0.2`.
- Files: `package.json` (next-pwa dependency)
- Current mitigation: Vulnerability is in the build toolchain, not runtime. Risk is lower but present in CI/CD environments.
- Recommendations: Evaluate migrating from `next-pwa` to `@ducanh2912/next-pwa` or Serwist, which are maintained forks without this dependency chain.

---

## Performance Bottlenecks

**`dataAggregator.ts` is a 2,615-line monolith with redundant API calls:**
- Problem: `src/features/deck-generator/utils/dataAggregator.ts` (2,615 lines) contains slide-specific data fetching functions that each make independent `fetch('/api/customers/${id}')` calls. Multiple slide types fetch the same customer record redundantly with no request deduplication.
- Files: `src/features/deck-generator/utils/dataAggregator.ts`
- Cause: Each slide aggregator function was written independently without a shared data layer.
- Improvement path: Extract a single customer fetch at the deck generation orchestration level and pass the result as context to each slide aggregator. Split the file into per-slide-type modules.

**Analytics route builds weekly activity data with 7 sequential DB queries:**
- Problem: `src/app/api/analytics/route.ts` (lines 99–160) runs 7 separate `prisma.interaction.count()` calls in a `for` loop (one per day) to build the weekly activity chart. Each loop iteration waits for the previous query.
- Files: `src/app/api/analytics/route.ts`
- Cause: Loop-based date aggregation without a GROUP BY query.
- Improvement path: Replace with a single `GROUP BY DATE(createdAt)` raw query, or use `Promise.all` to run the 7 queries concurrently.

**`src/lib/services/ai/tools.ts` is a 1,012-line file with all tool implementations inline:**
- Problem: All AI tool definitions and their executor implementations live in one file. Loading the module loads all tool business logic, including Prisma queries and data transformation code, on every AI request regardless of which tools are invoked.
- Files: `src/lib/services/ai/tools.ts`
- Cause: All tools were added to a single file without code splitting.
- Improvement path: Split into per-tool modules under `src/lib/services/ai/tools/` with dynamic imports at execution time.

**In-memory property cache is per-process and unbounded:**
- Problem: `src/lib/services/property/index.ts` caches property lookups in a module-level `Map` with a 24-hour TTL. In a serverless environment, the cache is lost on cold starts (no benefit). In long-lived processes (local dev), the cache grows without bound as there is no eviction strategy beyond TTL expiry.
- Files: `src/lib/services/property/index.ts` (lines 81–83, 325–350)
- Cause: Simple Map-based cache without LRU or size limits.
- Improvement path: Replace with Redis-backed caching using the Upstash client already present in the project, or use Next.js `unstable_cache`/`revalidatePath`.

---

## Fragile Areas

**AI initialization uses a module-level boolean guard that can desync:**
- Files: `src/lib/services/ai/index.ts` (line 46), `src/app/api/ai/generate-slide/route.ts` (line 13)
- Why fragile: `isInitialized = false` at module load. If the first call to `initializeAI()` throws (e.g., bad API key format), `isInitialized` stays `false`, and every subsequent call retries initialization — this is fine. But in `generate-slide/route.ts`, a separate `aiInitialized` boolean is kept and set to `true` even if `initializeAI()` does nothing (no adapters configured). The two flags can diverge.
- Safe modification: Use a single initialization path. Remove the local flag in `generate-slide/route.ts` and always call `getAI()` directly, which handles the guard in `src/lib/services/ai/index.ts`.
- Test coverage: No tests for AI initialization state.

**SSE polling uses a module-level `lastCheck` timestamp shared across all clients:**
- Files: `src/app/api/events/route.ts` (line 33)
- Why fragile: `lastCheck` is a single `Date` updated after each poll cycle. If the poll throws mid-cycle before updating `lastCheck`, the same events will be re-broadcast on the next cycle (duplicates). Additionally, `lastCheck` resets to `new Date()` at module load, which means events that occurred before the server started are never delivered to clients connecting after a restart.
- Safe modification: Store `lastCheck` per event type and persist it to Redis.
- Test coverage: No tests for SSE event deduplication.

**Competitor analytics exports functions from a file that does not exist:**
- Files: `src/lib/services/competitors/index.ts`, `src/lib/services/competitors/` (missing `analytics.ts`)
- Why fragile: The dead-code audit removed the `analytics.ts` file or its re-export, but the `index.ts` comment header still documents `calculateActivityTrends`, `calculateCompetitorRankings`, etc. as available. Any developer following the JSDoc will find a broken API.
- Safe modification: Either create `analytics.ts` with the documented functions, or update the `index.ts` header to remove references to non-existent exports.
- Test coverage: None.

**`weather-radar-map.tsx` uses 7 `eslint-disable` suppressions for `no-explicit-any`:**
- Files: `src/components/maps/weather-radar-map.tsx` (lines 62–106)
- Why fragile: Leaflet components are dynamically imported with `dynamic<any>(...)` to bypass SSR. The `any` typing means Leaflet prop changes will not be caught by TypeScript. The map is a core customer-facing component (storms page, terrain map).
- Safe modification: Use typed dynamic imports with the actual Leaflet component props, or create typed wrapper components.
- Test coverage: No tests for the weather radar map component.

---

## Scaling Limits

**SSE client list is bounded by single server process:**
- Current capacity: Unlimited clients per process, but all clients on one process share `centralPollInterval`.
- Limit: On serverless (Vercel), each function instance is independent. Clients on different instances don't share broadcasts. With > ~50 concurrent users, events will silently fail to propagate across instances.
- Scaling path: Replace module-level `clients` Set with Redis pub/sub or Supabase Realtime as the broadcast layer.

**In-memory rate limiting does not scale horizontally:**
- Current capacity: Per-process request tracking. Works correctly only with a single server instance.
- Limit: With multiple Vercel function instances, each instance has its own counter. A user can make `N × limit` requests by hitting different instances.
- Scaling path: Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in production to activate the Upstash-backed limiter already implemented in `src/lib/rate-limit.ts`.

---

## Dependencies at Risk

**`next-pwa` (v5.6.0) is effectively unmaintained:**
- Risk: The package's last release was 2022. It depends on `workbox-webpack-plugin@6` which has known vulnerabilities (see security section). The Next.js 15 App Router has changed how service workers are typically managed.
- Impact: PWA features (offline support, push notifications) depend on this package. The `public/sw.js` and `public/workbox-*.js` files are generated by it.
- Migration plan: Migrate to `@ducanh2912/next-pwa` or Serwist — both are maintained forks with Next.js 15 support and updated workbox dependencies.

**`next-auth` v4 (used) is superseded by Auth.js v5:**
- Risk: NextAuth v4 is in maintenance mode. The `next-auth` package at `src/lib/auth.ts` uses v4 patterns (`authOptions`, `getServerSession`). Auth.js v5 has a breaking API change.
- Impact: Security patches for v4 are limited. The `cookie` vulnerability found in npm audit traces through `@auth/core` which is the v5 dependency path.
- Migration plan: Plan a migration to Auth.js v5 (`next-auth@5`). The adapter pattern and session augmentation in `src/types/next-auth.d.ts` will need updating.

**`jspdf` has a critical unpatched vulnerability:**
- Risk: PDF Object Injection (GHSA-7x6v-j9x4-qf24) — critical severity.
- Impact: Deck PDF export functionality in `src/features/deck-generator/`.
- Migration plan: `npm audit fix` installs the patch without breaking changes. Run immediately.

---

## Missing Critical Features

**No real-time authorization on SSE stream:**
- Problem: Users who are logged out (session expired) while connected to `/api/events` continue receiving broadcasts until they disconnect or the browser refreshes. There is no session re-validation on the long-lived SSE connection.
- Blocks: Secure multi-tenant usage where a de-provisioned user should immediately lose access to live data.

**Leap CRM sync is one-directional and partially implemented:**
- Problem: `src/lib/services/crm/leap-adapter.ts` implements `syncCustomers()` (Leap → Guardian) but the reverse path (Guardian → Leap) is scaffolded but not wired. The `/api/crm/sync` route is an orphaned endpoint with no frontend trigger.
- Blocks: Sales reps adding customers in Guardian cannot push them to Leap; changes made in Leap are not automatically pulled into Guardian.

---

## Test Coverage Gaps

**Zero tests for API routes:**
- What's not tested: All 70+ API route handlers in `src/app/api/`. Authentication checks, rate limiting behavior, input validation, database error handling, and response shapes are untested.
- Files: `src/app/api/` (entire directory)
- Risk: Regressions in authentication enforcement, input validation bypasses, or incorrect response shapes go undetected until production.
- Priority: High

**Zero tests for AI service and adapters:**
- What's not tested: `src/lib/services/ai/router.ts`, `src/lib/services/ai/adapters/`, `src/lib/services/ai/tools.ts`, `src/lib/services/ai/context.ts`.
- Files: `src/lib/services/ai/` (entire directory)
- Risk: Model routing logic, tool execution, and customer context building are untested. A bad prompt injection or tool execution error would not be caught.
- Priority: High

**No tests for SSE event broadcasting or realtime hooks:**
- What's not tested: `src/app/api/events/route.ts` event deduplication, `src/lib/hooks/use-realtime.ts` reconnection logic.
- Files: `src/app/api/events/route.ts`, `src/lib/hooks/use-realtime.ts`
- Risk: SSE reconnection race conditions and duplicate broadcast bugs are invisible until production load.
- Priority: Medium

**No tests for deck generator pipeline:**
- What's not tested: `src/features/deck-generator/utils/dataAggregator.ts`, `src/features/deck-generator/services/aiSlideGenerator.ts`, `src/app/api/ai/generate-slide/route.ts`, `src/app/api/ai/generate-slide-image/route.ts`.
- Files: `src/features/deck-generator/` (entire feature directory, ~5,000+ lines)
- Risk: The largest feature in the codebase by line count has no test coverage.
- Priority: Medium

---

*Concerns audit: 2026-03-21*
