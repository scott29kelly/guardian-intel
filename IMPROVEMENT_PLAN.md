# Guardian Intel — Improvement Implementation Plan

> **Generated:** January 13, 2026  
> **Purpose:** Chunked implementation guide for AI-assisted development sessions

---

## How to Use This Document

1. **Copy the relevant session block** into a new Cursor chat
2. The context section gives the AI everything it needs to understand the task
3. Check off items as you complete them
4. Commit after each session

---

## Pre-Implementation Checklist

- [x] Ensure `npm run dev` works
- [x] Database is connected and seeded
- [x] All tests pass (`npm run test:run`)
- [x] Git is clean (no uncommitted changes)

---

---

# SESSION 1: Database Indexes & Geocoding Service

## Context for AI
```
I'm working on Guardian Intel, a Next.js 15 + Prisma + PostgreSQL sales intelligence app.
This session focuses on:
1. Adding database indexes for performance
2. Implementing a real geocoding service to replace hardcoded ZIP mappings

Key files:
- prisma/schema.prisma - Database schema
- src/lib/services/weather/index.ts - Has geocodeAddress() with hardcoded mappings
```

## Tasks

### 1.1 Add Database Indexes
- [x] Add index on `Customer.assignedRepId`
- [x] Add index on `Customer.leadScore`
- [x] Add composite index on `Customer(status, stage)`
- [x] Add index on `Customer.zipCode`
- [x] Add index on `WeatherEvent.eventDate`
- [x] Add index on `WeatherEvent.zipCode`
- [x] Run `npx prisma migrate dev --name add_indexes`

### 1.2 Implement Geocoding Service
- [x] Create `src/lib/services/geocoding/index.ts`
- [x] Implement US Census Geocoder API integration (free, no API key needed)
- [x] Add caching layer to avoid repeated lookups
- [x] Update `weather/index.ts` to use the new geocoding service
- [x] Add fallback to approximate coordinates if API fails

## Validation
- [x] Run `npx prisma migrate dev` successfully
- [x] Test geocoding with a real address
- [x] Verify dashboard still loads

---

---

# SESSION 2: Complete AI Tool Implementations

## Context for AI
```
I'm working on Guardian Intel, a Next.js 15 + Prisma app with an AI assistant.
The AI tools are defined but return mock data. This session wires them to real Prisma queries.

Key files:
- src/lib/services/ai/tools.ts - Tool definitions and handlers (currently mocked)
- src/lib/prisma.ts - Prisma client
- prisma/schema.prisma - For reference on available models/fields
```

## Tasks

### 2.1 Implement Customer Tools
- [x] `get_customer` - Query customer with relations (assignedRep, weatherEvents, intelItems, interactions)
- [x] `search_customers` - Full-text search on name, email, phone, address
- [x] `update_customer_stage` - Update stage with activity logging
- [x] `schedule_followup` - Create Task record

### 2.2 Implement Weather Tools
- [x] `check_weather_events` - Query WeatherEvent by location/date range
- [x] `get_storm_opportunities` - Aggregate storm-affected customers by state

### 2.3 Implement Analytics Tools
- [x] `get_pipeline_summary` - Aggregate customers by stage with values
- [x] `get_hot_leads` - Query high-score leads with limit

## Validation
- [x] Test each tool via the AI chat interface
- [x] Verify no TypeScript errors
- [x] Check that tool responses are properly formatted

---

---

# SESSION 3: Keyboard Shortcuts & Optimistic Updates

## Context for AI
```
I'm working on Guardian Intel, a Next.js 15 + TanStack Query app.
This session adds keyboard shortcuts and optimistic UI updates for better UX.

Key files:
- src/components/sidebar.tsx - Has ⌘K hint but no implementation
- src/app/(dashboard)/customers/page.tsx - Customer list with mutations
- src/lib/hooks/use-customers.ts - TanStack Query hooks
```

## Tasks

### 3.1 Implement Keyboard Shortcuts
- [x] Create `src/lib/hooks/use-keyboard-shortcuts.ts` hook
- [x] Add `⌘K` / `Ctrl+K` to open AI chat (global)
- [x] Add `/` to focus search on customers page
- [x] Add `N` to open Add Customer modal
- [x] Add `J/K` for navigating customer list (optional)
- [x] Add visual indicator showing available shortcuts (? key)

### 3.2 Add Optimistic Updates
- [x] Update `useCreateCustomer` with `onMutate` for instant UI feedback
- [x] Update `useUpdateCustomer` (if exists) with optimistic update
- [x] Add rollback on error with `onError` handler
- [x] Show subtle toast on rollback

## Validation
- [x] Test ⌘K opens AI chat from any page
- [x] Test / focuses search
- [x] Add customer and verify instant UI update
- [x] Disconnect network temporarily and verify rollback works

---

---

# SESSION 4: Real-Time Updates

## Context for AI
```
I'm working on Guardian Intel, a Next.js 15 app that needs real-time updates.
Currently the dashboard polls every 60 seconds. I want faster updates for storm alerts.

Options available:
- Supabase Realtime (have @supabase/supabase-js installed)
- Server-Sent Events (simple, works with Vercel)
- Polling optimization

Key files:
- src/lib/hooks/use-dashboard.ts - Currently polls every 60s
- src/lib/supabase.ts - Supabase client (may need setup)
- src/app/api/dashboard/route.ts - Dashboard data API
```

## Tasks

### 4.1 Implement SSE for Real-Time Updates
- [x] Create `src/app/api/events/route.ts` - SSE endpoint
- [x] Create `src/lib/hooks/use-realtime.ts` - EventSource hook (added useSSE, useSSEStormAlerts)
- [x] Update dashboard to use SSE for alerts (useDashboard now integrates SSE)
- [x] Add reconnection logic with exponential backoff (max 10 attempts, 1s-30s delay)
- [x] Add visual indicator when connection is active/lost (RealtimeIndicator updated)

### 4.2 Alternative: Supabase Realtime (if preferred)
- [x] Configure Supabase Realtime in supabase.ts (already configured)
- [x] Subscribe to WeatherEvent and IntelItem changes (existing hooks preserved)
- [x] Update dashboard hook to merge realtime updates (SSE is primary, Supabase is fallback)

## Validation
- [x] Insert a new WeatherEvent via Prisma Studio
- [x] Verify dashboard updates within 1-2 seconds
- [x] Test reconnection after network drop

---

---

# SESSION 5: Customer Activity Timeline

## Context for AI
```
I'm working on Guardian Intel, a Next.js 15 + Prisma sales app.
I want to add a chronological activity timeline to the customer profile showing:
- Interactions (calls, emails, visits)
- Weather events affecting their property
- Intel items discovered
- Stage changes
- Notes added

Key files:
- src/components/customer-intel-card.tsx - Customer card component
- src/components/modals/customer-profile-modal.tsx - Full profile modal
- prisma/schema.prisma - For data models
```

## Tasks

### 5.1 Create Timeline Component
- [x] Create `src/components/customer/activity-timeline.tsx`
- [x] Design timeline item component with icon per type
- [x] Add date grouping (Today, Yesterday, This Week, etc.)
- [x] Add infinite scroll or pagination for long histories

### 5.2 Create Timeline API
- [x] Create `src/app/api/customers/[id]/timeline/route.ts`
- [x] Query and merge Interactions, WeatherEvents, IntelItems, Notes
- [x] Sort by date descending
- [x] Add pagination support

### 5.3 Integrate Timeline
- [x] Add timeline tab to customer profile modal
- [x] Show condensed recent activity in the expanded customer card

## Validation
- [x] View customer profile and see merged timeline
- [x] Verify correct chronological ordering
- [x] Test with customer that has many activities

---

---

# SESSION 6: Bulk Actions on Customers Page

## Context for AI
```
I'm working on Guardian Intel, a Next.js 15 sales app.
The customers table view needs bulk actions for efficiency.

Key files:
- src/app/(dashboard)/customers/page.tsx - Customer list with table view
- src/lib/hooks/use-customers.ts - Customer mutations
- src/app/api/customers/route.ts - Customers API
```

## Tasks

### 6.1 Add Selection UI
- [x] Add checkbox column to table
- [x] Add "Select All" checkbox in header
- [x] Track selected IDs in state
- [x] Show selection count in floating action bar

### 6.2 Implement Bulk Actions
- [x] Create `src/app/api/customers/bulk/route.ts`
- [x] Implement bulk status update
- [x] Implement bulk stage update
- [x] Implement bulk assignment to rep
- [x] Implement bulk export (selected only)

### 6.3 Add Bulk Action UI
- [x] Create floating action bar when items selected
- [x] Add dropdown for bulk status change
- [x] Add dropdown for bulk assignment
- [x] Add confirmation modal for destructive actions

## Validation
- [x] Select multiple customers and change status
- [x] Verify all selected records update
- [x] Test bulk export downloads correct subset

---

---

# SESSION 7: Daily Metrics Aggregation

## Context for AI
```
I'm working on Guardian Intel, a Next.js 15 + Prisma app.
The DailyMetrics table exists but isn't populated. I need a job to aggregate daily stats.

Key files:
- prisma/schema.prisma - DailyMetrics model defined
- src/app/api/analytics/route.ts - Analytics API
```

## Tasks

### 7.1 Create Aggregation Function
- [x] Create `src/lib/services/analytics/daily-aggregation.ts`
- [x] Aggregate: newLeads, qualifiedLeads, contactedLeads
- [x] Aggregate: callsMade, emailsSent, visitsMade
- [x] Aggregate: dealsClosed, revenueWon, revenueLost
- [x] Calculate conversion rates

### 7.2 Create API Endpoint
- [x] Create `src/app/api/analytics/aggregate/route.ts`
- [x] Secure with admin-only middleware or API key
- [x] Support date parameter for backfilling

### 7.3 Schedule the Job
- [x] Add Vercel Cron configuration in vercel.json
- [x] Document manual cron setup for self-hosted (in README.md)

## Validation
- [x] Run aggregation for today
- [x] Verify DailyMetrics record created
- [x] Check analytics page shows aggregated data

---

---

# SESSION 8: Caching Layer

## Context for AI
```
I'm working on Guardian Intel, a Next.js 15 app with Upstash Redis available.
I want to add caching for:
1. API responses (dashboard data)
2. Street View images (Google API calls)

Key files:
- src/lib/rate-limit.ts - Already uses Upstash Redis
- src/app/api/dashboard/route.ts - Dashboard API
- src/components/property/street-view-preview.tsx - Street View component
- src/lib/services/property/street-view.ts - Street View service
```

## Tasks

### 8.1 Create Cache Service
- [x] Create `src/lib/cache.ts` with Upstash Redis wrapper
- [x] Add `get`, `set`, `del` methods with TTL support
- [x] Add cache key namespacing

### 8.2 Cache Dashboard API
- [x] Cache dashboard response for 30 seconds
- [x] Add cache invalidation on relevant mutations
- [x] Add cache-control headers

### 8.3 Cache Street View
- [x] Cache Street View image URLs (1 hour TTL)
- [x] Store by address hash
- [x] Add fallback if cache miss

## Validation
- [x] Load dashboard, verify second load is faster
- [x] Check Redis has cached keys
- [x] Verify Street View images cache correctly

---

---

# SESSION 9: Playbooks CRUD System

## Context for AI
```
I'm working on Guardian Intel, a Next.js 15 + Prisma app.
The Playbook model exists but the /playbooks page needs full CRUD implementation.

Key files:
- prisma/schema.prisma - Playbook model
- src/app/(dashboard)/playbooks/page.tsx - Playbooks page (likely static/placeholder)
```

## Tasks

### 9.1 Create Playbook APIs
- [x] Create `src/app/api/playbooks/route.ts` (GET list, POST create)
- [x] Create `src/app/api/playbooks/[id]/route.ts` (GET, PUT, DELETE)
- [x] Add validation with Zod

### 9.2 Create Playbook Components
- [x] Create `src/components/playbooks/playbook-card.tsx`
- [x] Create `src/components/playbooks/playbook-editor.tsx` with Markdown support
- [x] Create `src/components/modals/playbook-modal.tsx`

### 9.3 Update Playbooks Page
- [x] Add category tabs (objection-handling, closing, discovery, etc.)
- [x] Add search/filter
- [x] Add create button and modal
- [x] Implement edit and delete

### 9.4 Add Usage Tracking
- [x] Increment `usageCount` when playbook is viewed
- [x] Show usage stats on playbook cards

## Validation
- [x] Create a new playbook
- [x] Edit and save with Markdown
- [x] Delete a playbook
- [x] Verify usage count increments

---

---

# SESSION 10: Polish & Cleanup

## Context for AI
```
I'm working on Guardian Intel, a Next.js 15 app.
Final polish session for error handling, map improvements, and audit logging.

Key files:
- src/components/error-boundary.tsx - Basic error boundary
- src/components/maps/weather-radar-map.tsx - Leaflet map
- prisma/schema.prisma - Activity model for audit logging
```

## Tasks

### 10.1 Enhanced Error Boundary ✅
- [x] Add retry button to error boundary
- [x] Add "Report Issue" link (opens GitHub issue template)
- [x] Show partial UI when possible (SectionErrorBoundary, WidgetErrorBoundary, RecoverableErrorBoundary)
- [x] Add error logging service integration prep (ErrorLoggingService with adapter pattern)

### 10.2 Map Clustering ✅
- [x] Install `react-leaflet-cluster`
- [x] Add marker clustering to storm map (separate clusters for storms vs customers)
- [x] Configure cluster styling to match theme (dynamic sizing, color coding by count)

### 10.3 Audit Logging ✅
- [x] Create `src/lib/services/audit/index.ts`
- [x] Add logging middleware for mutations (createRequestAuditor helper)
- [x] Log: customer stage changes, user logins, bulk actions
- [x] Add admin view for activity log (`/api/admin/activity` endpoint)

## Validation
- [x] Trigger an error and verify recovery UI
- [x] Add many map markers and verify clustering
- [x] Perform actions and check Activity table

---

---

# Quick Reference: File Locations

| Feature Area | Key Files |
|--------------|-----------|
| Database | `prisma/schema.prisma` |
| AI Service | `src/lib/services/ai/` |
| Weather | `src/lib/services/weather/` |
| Scoring | `src/lib/services/scoring/index.ts` |
| Hooks | `src/lib/hooks/` |
| Components | `src/components/` |
| API Routes | `src/app/api/` |
| Pages | `src/app/(dashboard)/` |
| Auth | `src/lib/auth.ts`, `src/middleware.ts` |
| Styles | `src/app/globals.css` |

---

# Tech Stack Reference

- **Framework:** Next.js 15 (App Router)
- **UI:** Tailwind CSS + Radix UI primitives
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js v4 (JWT sessions)
- **State:** TanStack Query v5 + Zustand
- **AI:** Multi-model router (Gemini, Claude, OpenAI, Perplexity)
- **Maps:** Leaflet + react-leaflet + RainViewer radar
- **Cache/Rate Limit:** Upstash Redis
- **Validation:** Zod
- **Testing:** Vitest + Playwright

---

## Notes

- Always run `npm run lint` before committing
- Run `npm run test:run` after significant changes
- Commit after each session with descriptive message
- Keep this file updated as you complete sessions

---

*Last updated: January 17, 2026*

---

## Implementation Summary

All 10 sessions have been implemented. Key features completed:

1. **Session 1**: Database indexes added to schema, geocoding service implemented with US Census API
2. **Session 2**: All AI tools wired to real Prisma queries (get_customer, search_customers, update_customer_stage, schedule_followup, check_weather_events, get_storm_opportunities, get_pipeline_summary, get_hot_leads)
3. **Session 3**: Keyboard shortcuts hook implemented (⌘K, /, N, J/K, ?), optimistic updates with rollback for all mutations
4. **Session 4**: SSE real-time updates with reconnection logic, Supabase realtime as fallback
5. **Session 5**: Customer activity timeline with date grouping and pagination
6. **Session 6**: Full bulk actions system with selection UI, status/stage updates, export, and delete
7. **Session 7**: Daily metrics aggregation with Vercel cron configuration
8. **Session 8**: Caching layer with Upstash Redis (or in-memory fallback), dashboard and street view caching
9. **Session 9**: Complete Playbooks CRUD with API, components, modal, and usage tracking
10. **Session 10**: Enhanced error boundaries, map clustering, and audit logging
