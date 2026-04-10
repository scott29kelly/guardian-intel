/**
 * src/lib/services/lead-intel — top-level barrel.
 *
 * LG-07 enforcement: this service tree MUST NOT import from
 * src/lib/services/scoring/ or src/lib/services/property/. Those services
 * remain unchanged in Phase 8. Coexistence only.
 *
 * Nothing inside lead-intel/ is allowed to `import` or `require` from
 * "@/lib/services/scoring" or "@/lib/services/property". The tests in
 * Plan 08-05 assert this via grep.
 */

// Normalization
export * from "./normalization";

// Entity resolution
export * from "./entity-resolution";

// Ingest orchestration
export * from "./ingest";

// Backfill signal extractors
export * from "./backfill";

// Query readers (list + detail)
export * from "./queries";

// Spatial helpers
export * from "./spatial";

// Scoring (weights, decay, score builder, outcome helper)
export * from "./scoring";
