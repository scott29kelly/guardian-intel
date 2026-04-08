# Architecture

**Analysis Date:** 2026-03-21

## Pattern Overview

**Overall:** Next.js App Router full-stack application with layered service architecture

**Key Characteristics:**
- Server-side API routes co-located with pages under `src/app/api/`
- Client components drive UI; server components handle data at layout boundaries
- Service layer in `src/lib/services/` encapsulates all business logic and external integrations
- AI routing abstraction allows pluggable model adapters (Claude, Gemini, Kimi, Perplexity, OpenAI)
- Singleton service instances (Prisma client, AI router, outreach service, terrain data provider) initialized once per process

## Layers

**Presentation Layer:**
- Purpose: React UI components, pages, and layouts
- Location: `src/app/(dashboard)/`, `src/app/(auth)/`, `src/components/`
- Contains: Page components (`page.tsx`), layout wrappers (`layout.tsx`), reusable UI components
- Depends on: Hooks layer, `src/lib/` utilities
- Used by: End users via browser

**Route/API Layer:**
- Purpose: HTTP request handling, auth checks, validation, and response shaping
- Location: `src/app/api/`
- Contains: Next.js Route Handlers (`route.ts`), webhook receivers
- Depends on: Service layer, Prisma client, validation schemas (`src/lib/validations.ts`)
- Used by: Client components via fetch, external webhooks

**Hooks Layer:**
- Purpose: Data fetching state management bridging components to API routes
- Location: `src/lib/hooks/`
- Contains: Custom React hooks (e.g., `use-customers.ts`, `use-claims.ts`, `use-dashboard.ts`)
- Depends on: Fetch calls to `/api/` routes, React Query (via `src/lib/query-provider.tsx`)
- Used by: Page and component files

**Service Layer:**
- Purpose: Business logic, external API clients, domain operations
- Location: `src/lib/services/`
- Contains: Domain services (outreach, weather, carriers, scoring, analytics, AI, etc.)
- Depends on: Prisma client (`src/lib/prisma.ts`), external SDKs and APIs
- Used by: API route handlers

**Data/Persistence Layer:**
- Purpose: Database access and schema management
- Location: `prisma/schema.prisma`, `src/lib/prisma.ts`
- Contains: Prisma ORM client, PostgreSQL schema (via Supabase)
- Depends on: `DATABASE_URL` and `DIRECT_URL` environment variables
- Used by: Service layer

**Feature Modules:**
- Purpose: Self-contained vertical slices for complex features
- Location: `src/features/`
- Contains: `deck-generator/` and `infographic-generator/` with their own components, services, hooks, types, and utils
- Depends on: AI service layer, Prisma
- Used by: API routes under `/api/decks/` and `/api/ai/generate-slide/`

## Data Flow

**Standard API Request:**

1. User action triggers a hook (e.g., `useCustomers`) which calls `fetch('/api/customers')`
2. Route handler in `src/app/api/customers/route.ts` runs
3. Handler calls `getServerSession(authOptions)` to verify session
4. Input is validated with Zod schema from `src/lib/validations.ts`
5. Handler calls Prisma directly or delegates to a service (e.g., `outreachService`)
6. Response returned as `NextResponse.json({ success: true, data: ... })`
7. Hook updates React Query cache, component re-renders

**AI Chat Request:**

1. Component calls `POST /api/ai/chat` with messages and optional `customerId`
2. `rateLimit()` checked against Upstash Redis (or in-memory fallback)
3. `getAI()` returns singleton `AIRouter`; `getCustomerContext(customerId)` loads enriched context from Prisma
4. `AIRouter.getAdapter(task)` selects the correct model adapter via `TASK_MODEL_MAP`
5. Adapter (e.g., `ClaudeAdapter`, `GeminiAdapter`) calls external AI API
6. Response streamed (SSE) or returned as JSON

**Storm Outreach Trigger:**

1. Weather event detected (NOAA polling or webhook)
2. `outreachService.triggerStormOutreach(stormData)` finds active campaigns matching storm criteria
3. `findAffectedCustomers()` queries Prisma for customers in affected ZIP codes
4. Outreach messages queued in `OutreachMessage` table with `queued` status
5. Provider webhooks (Leap/SalesRabbit) update delivery status

**State Management:**
- Server state: React Query (TanStack Query) via `src/lib/query-provider.tsx`
- UI state: React `useState` / context providers (`ThemeProvider`, `SidebarProvider`, `GamificationProvider`)
- Realtime updates: Supabase Realtime subscriptions in `src/lib/supabase.ts` for weather events, intel items, and customer updates

## Key Abstractions

**AIRouter (`src/lib/services/ai/router.ts`):**
- Purpose: Routes AI tasks to the correct model adapter with fallback logic
- Examples: `src/lib/services/ai/adapters/claude.ts`, `gemini.ts`, `kimi.ts`, `perplexity.ts`, `openai.ts`
- Pattern: Registry pattern — adapters registered at startup via `initializeAI()` in `src/lib/services/ai/index.ts`; task-to-model mapping in `TASK_MODEL_MAP`

**Carrier Adapters (`src/lib/services/carriers/adapters/`):**
- Purpose: Normalize insurance carrier API differences behind a common interface
- Examples: `state-farm-adapter.ts`, `mock-adapter.ts`
- Pattern: Template method via `BaseCarrierAdapter` base class

**TerrainDataProvider (`src/lib/terrain/data-provider.ts`):**
- Purpose: Singleton that holds generated demo data for the Terrain Intelligence module (storms, permits, briefs, competitors, alerts)
- Pattern: Singleton with lazy async initialization; generators in `src/lib/terrain/generators/` produce synthetic data

**Outreach Service (`src/lib/services/outreach/index.ts`):**
- Purpose: Executes storm-triggered and manual SMS/email campaigns with template personalization
- Pattern: Service class singleton exported as `outreachService`

## Entry Points

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: Every page render
- Responsibilities: Wraps app in `QueryProvider`, `ThemeProvider`, `ToastProvider`; sets PWA metadata

**Dashboard Layout:**
- Location: `src/app/(dashboard)/layout.tsx`
- Triggers: Any dashboard route render
- Responsibilities: Wraps content in `AnimationPreferencesProvider`, `SidebarProvider`, `GamificationProvider`; renders `Sidebar` (desktop) and `MobileHeader`/`MobileBottomNav`

**Auth Entry:**
- Location: `src/app/api/auth/[...nextauth]/route.ts`
- Triggers: Login/logout requests
- Responsibilities: Delegates to NextAuth with `authOptions` from `src/lib/auth.ts`; supports credentials (password + demo token + dev bypass) with JWT sessions

**AI Service Initialization:**
- Location: `src/lib/services/ai/index.ts` → `initializeAI()`
- Triggers: First call to `getAI()` from any API route
- Responsibilities: Instantiates adapters for all configured API keys (Gemini required, Claude/Kimi/Perplexity/OpenAI optional); registers them with the singleton `AIRouter`

**Cron Job:**
- Location: `src/app/api/analytics/aggregate/route.ts`
- Triggers: Vercel cron scheduler (analytics at 02:00 UTC daily per `vercel.json`)
- Responsibilities: Analytics aggregation

## Error Handling

**Strategy:** Try/catch in every API route handler; errors logged with context prefix (e.g., `[Claims API]`); Zod validation errors returned with `400` and structured `details`

**Patterns:**
- `z.ZodError` caught explicitly and returned as `{ error: "Validation error", details: error.issues }` with `400`
- Unexpected errors caught by outer `try/catch` and returned as `{ error: "Failed to ..." }` with `500`
- Auth errors return `{ error: "Unauthorized" }` with `401` before any business logic runs
- Error boundaries (`src/components/error-boundary.tsx`) wrap dashboard content at layout level

## Cross-Cutting Concerns

**Logging:** `console.error` / `console.warn` with bracketed context prefixes (e.g., `[AI Router]`, `[Auth]`, `[Supabase Realtime]`); no structured logging framework

**Validation:** Zod schemas centralized in `src/lib/validations.ts`; all API POST/PATCH bodies validated before processing

**Authentication:** `getServerSession(authOptions)` called at top of every protected API route; JWT strategy with 30-day expiry; demo bypass modes for dev/staging

**Rate Limiting:** `rateLimit(request, type)` utility in `src/lib/rate-limit.ts`; uses Upstash Redis in production, in-memory `Map` in development; limits: AI=20/min, auth=5/min, weather=30/min, general=100/min

**Security Headers:** Applied globally via `next.config.ts` (`X-Frame-Options: DENY`, `HSTS`, `X-Content-Type-Options`, etc.)

---

*Architecture analysis: 2026-03-21*
