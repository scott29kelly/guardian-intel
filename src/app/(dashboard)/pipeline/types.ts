/**
 * Pipeline Inspector page-local types. Kept local to the route so nothing
 * outside src/app/(dashboard)/pipeline/ needs to import from here.
 */

export interface KpiSummary {
  totalTracked: number;
  scoredLast24h: number;
  pendingResolutions: number;
  outcomesThisWeek: number;
}

// Convenience for building the KPI summary from a property list + detail data.
// In Phase 8 we derive these from the list endpoint's `total` plus a few
// client-side counts; future phases will add a dedicated stats endpoint.
