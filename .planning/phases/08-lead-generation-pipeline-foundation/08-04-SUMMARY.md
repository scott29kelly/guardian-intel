---
phase: 08
plan: 08-04
subsystem: lead-generation-pipeline
tags: [ui, hooks, react-query, pipeline-inspector, dashboard]
dependency_graph:
  requires: [08-03]
  provides: [pipeline-inspector-page, use-lead-intel-hooks]
  affects: [src/lib/hooks/index.ts]
tech_stack:
  added: []
  patterns: [react-query-key-factory, client-side-kpi-derivation, mobile-first-grid]
key_files:
  created:
    - src/lib/hooks/use-lead-intel.ts
    - src/app/(dashboard)/pipeline/page.tsx
    - src/app/(dashboard)/pipeline/types.ts
    - src/app/(dashboard)/pipeline/components/kpi-cards.tsx
    - src/app/(dashboard)/pipeline/components/filter-bar.tsx
    - src/app/(dashboard)/pipeline/components/property-table.tsx
    - src/app/(dashboard)/pipeline/components/detail-pane.tsx
    - src/app/(dashboard)/pipeline/components/score-explanation.tsx
    - src/app/(dashboard)/pipeline/components/signal-timeline.tsx
    - src/app/(dashboard)/pipeline/components/provenance-list.tsx
    - src/app/(dashboard)/pipeline/components/outcome-history.tsx
  modified:
    - src/lib/hooks/index.ts
decisions:
  - Client-side KPI derivation from list response rather than dedicated stats endpoint
  - outcomesThisWeek shown as 0 until a dedicated stats endpoint is added in a future phase
  - Saved-query results mapped into PropertyListRow shape for table reuse
metrics:
  duration: 299s
  completed: "2026-04-10T03:38:28Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 11
  files_modified: 1
---

# Phase 08 Plan 04: Pipeline Inspector UI (`/pipeline` Sibling Route) Summary

React Query hooks and Pipeline Inspector page for read-only lead-intel data display at `/pipeline`, URL-reachable only (no sidebar nav in Phase 8).

## What Was Built

### Task 08-04.1: use-lead-intel hooks + barrel + types
- Created `src/lib/hooks/use-lead-intel.ts` with `leadIntelKeys` factory, `useLeadIntelProperties`, `useLeadIntelPropertyDetail`, and `useLeadIntelSavedQuery` hooks
- Each hook wraps React Query `useQuery` with fetch helpers targeting `/api/lead-intel/*` routes
- Types mirror the Plan 08-03 API response shapes (list, detail, saved query)
- Barrel re-export added to `src/lib/hooks/index.ts`
- Page-local `KpiSummary` type created in `pipeline/types.ts`

### Task 08-04.2: Pipeline Inspector page + 8 subcomponents
- **page.tsx**: Orchestrates KPI cards, filter bar, property table, and detail pane with React state management
- **kpi-cards.tsx**: Four branded KPI cards (total tracked, scored 24h, pending resolutions, outcomes this week)
- **filter-bar.tsx**: Score range, signal-type multiselect, ZIP/state, pending-resolution toggle, saved-query button
- **property-table.tsx**: Sortable tracked-property table with selection highlighting and pagination count
- **detail-pane.tsx**: Composes score explanation, signal timeline, provenance, and outcome history sections
- **score-explanation.tsx**: Parses JSON contributions from score snapshot, shows sorted effective weights
- **signal-timeline.tsx**: Reverse-chronological signal events with color-coded type indicators
- **provenance-list.tsx**: Source records grouped by type with reliability/date display
- **outcome-history.tsx**: Outcome events with parsed JSON payloads

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 08-04.1 | `9f84604` | Hooks, barrel re-export, and pipeline types |
| 08-04.2 | `6ff1045` | Pipeline Inspector page with all subcomponents |

## Deviations from Plan

None -- plan executed exactly as written.

## Constraints Verified

- **LG-10 compliance**: No sidebar nav entry, no layout.tsx modification, URL-only reach
- **LG-07 compliance**: No imports from `@/lib/services/scoring` or `@/lib/services/property`
- **Client/server separation**: Hooks use `fetch` to API routes, no direct service-layer imports
- **All existing barrel exports preserved**: All 20 existing hook re-exports in index.ts retained

## Known Stubs

- `outcomesThisWeek` KPI hardcoded to 0 -- outcome data is only available in the detail response, not the list response. A dedicated stats endpoint is planned for a future phase.

## Self-Check: PASSED
