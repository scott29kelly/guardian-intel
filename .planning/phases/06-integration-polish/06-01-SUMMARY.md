---
phase: 06-integration-polish
plan: 01
subsystem: app-integration
tags: [integration, ui-wiring, customer-card, dashboard, profile-modal]
dependency_graph:
  requires: [05-01, 05-02, 05-04]
  provides: [infographic-access-from-all-surfaces]
  affects: [customer-intel-card, dashboard-page, customer-profile-modal]
tech_stack:
  added: []
  patterns: [modal-wiring, batch-hook-integration, tab-extension]
key_files:
  created: []
  modified:
    - src/components/customer-intel-card.tsx
    - src/app/(dashboard)/page.tsx
    - src/components/modals/customer-profile-modal.tsx
decisions:
  - Used firstName + lastName concatenation for customerName (Customer type has no name property)
  - Quick-launch presets in profile modal open the full generator modal (preset selection handled by modal)
  - Batch generation in dashboard maps priorityCustomers to BatchDayView with name resolution via IIFE
metrics:
  duration: 173s
  completed: 2026-03-22
  tasks: 3
  files: 3
---

# Phase 06 Plan 01: App Surface Integration Summary

Wire infographic generator into customer card, dashboard batch trigger, and profile modal tab -- three-surface access with zero model configuration exposed.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Customer card BRIEFING button + modal | f6852c7 | src/components/customer-intel-card.tsx |
| 2 | Dashboard Prep My Day batch trigger | f6852c7 | src/app/(dashboard)/page.tsx |
| 3 | Profile modal infographics tab | f6852c7 | src/components/modals/customer-profile-modal.tsx |

## Changes Made

### Task 1: Customer Card BRIEFING Button
- Added `Image` icon import from lucide-react
- Added `InfographicGeneratorModal` import from infographic-generator components
- Added `showInfographicGenerator` state hook alongside existing `showDeckGenerator`
- Added BRIEFING button in action bar after PREP DECK button, matching exact same styling pattern
- Added conditional InfographicGeneratorModal render with customerId and customerName props

### Task 2: Dashboard Prep My Day
- Added `useInfographicBatch` hook and `BatchDayView` component imports
- Wired `isBatching`, `batchProgress`, `startBatch`, `cancelBatch` from batch hook
- Added "Prep My Day" button in action buttons section with loading state
- Added conditional BatchDayView below action buttons showing progressive batch results
- Customer name resolution maps priorityCustomers firstName/lastName to BatchDayView items

### Task 3: Profile Modal Infographics Tab
- Added `Image` icon to lucide-react imports
- Added `InfographicGeneratorModal` import
- Extended activeTab type union with "infographics"
- Added `showInfographicGenerator` state
- Added infographics tab entry to tabs array
- Added tab content with "Generate New" button, description text, and 4 quick-launch preset buttons
- Added conditional InfographicGeneratorModal render at bottom of component

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed customer.name property access**
- **Found during:** TypeScript verification
- **Issue:** Plan used `customer.name` but Customer type only has `firstName` and `lastName` properties
- **Fix:** Changed all three files to use `customer.firstName + " " + customer.lastName`
- **Files modified:** All 3 modified files
- **Commit:** f6852c7

## Verification

- TypeScript compilation: PASSED (0 errors)
- All acceptance criteria: PASSED (12/12 grep checks)
- No model names or configuration exposed to reps

## Known Stubs

None -- all integrations are fully wired to existing components and hooks.

## Self-Check: PASSED

- All 3 modified files exist on disk
- Commit f6852c7 verified in git log
- TypeScript compiles with 0 errors
- All 12 acceptance criteria pass
