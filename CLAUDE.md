<!-- GSD:project-start source:PROJECT.md -->
## Project

**Infographic Generator**

An AI-powered visual briefing generator for Guardian Intel that creates on-demand infographic images for sales reps. Reps select a customer and content type, and the system autonomously selects the optimal AI model (or model chain) to produce a branded infographic — zero configuration, quality-first, invisible intelligence.

**Core Value:** Reps get actionable visual briefings in one tap — no model pickers, no quality sliders, no configuration. The system always produces the best output using whatever model or chain is optimal.

### Constraints

- **Tech stack**: Next.js 15, React 19, TypeScript, Prisma, Tailwind, Radix UI, Framer Motion
- **AI models**: NB2 and NB Pro only — no other image generation models
- **Zero config**: No model pickers, quality sliders, or resolution selectors exposed to reps
- **Branding**: Navy (#1E3A5F), Gold (#D4A656), Teal (#4A90A4) palette — dark for internal, light for customer-facing
- **Caching**: Upstash Redis (24hr standard, 7 days for leave-behinds) + service worker for offline
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.7 - All application code (`src/`, `scripts/`, `prisma/seed.ts`)
- TSX - React component files throughout `src/app/` and `src/components/`
- CSS (via Tailwind) - Styling
## Runtime
- Node.js (target ES2017, module resolution: bundler)
- npm
- Lockfile: `package-lock.json` present
## Frameworks
- Next.js 15.1 - Full-stack React framework with App Router (`src/app/`)
- React 19 - UI rendering
- next-pwa 5.6 - Progressive Web App support; configured in `next.config.ts` with service worker at `public/sw.js`
- Prisma 6.1 - ORM and schema management; schema at `prisma/schema.prisma`, client via `src/lib/prisma.ts`
- next-auth 4.24 - Authentication framework; configured in `src/lib/auth.ts`
- @auth/prisma-adapter 2.7 - Persists sessions to PostgreSQL via Prisma
- Radix UI - Headless primitives (`@radix-ui/react-progress`, `@radix-ui/react-slot`, `@radix-ui/react-tooltip`)
- Tailwind CSS 3.4 - Utility CSS; config at `tailwind.config.ts`
- tailwind-merge 2.6 - Merges Tailwind classes without conflicts
- class-variance-authority 0.7 - Variant-based component styling
- tailwindcss-animate 1.0 - Animation utilities
- framer-motion 11.15 - Complex animations
- lucide-react 0.468 - Icon library
- Geist 1.7 - Font family (Vercel design system)
- @tanstack/react-query 5.62 - Server state management; provider at `src/lib/query-provider.tsx`
- leaflet 1.9 + react-leaflet 5.0 - Interactive maps
- react-leaflet-cluster 4.0 - Marker clustering
- leaflet.heat 0.2 - Heatmap layer
- recharts 2.15 - Data visualization charts
- jsPDF 4.0 - PDF generation client-side
- html2canvas 1.4 - DOM-to-canvas for PDF captures
- jszip 3.10 - ZIP file creation
- file-saver 2.0 - Browser file downloads
- zod 4.3 - Runtime schema validation; used in `src/lib/env.ts` and `src/lib/validations.ts`
- bcryptjs 2.4 - Password hashing in `src/lib/auth.ts`
- web-push 3.6 - Web Push API for browser notifications; VAPID key endpoint at `src/app/api/notifications/vapid-key/`
- react-markdown 10.1 - Renders markdown content (playbooks, AI responses)
- date-fns 4.1 - Date manipulation
- vitest 4.0 - Unit/integration test runner; config at `vitest.config.ts`
- @playwright/test 1.57 - E2E tests; config at `playwright.config.ts`
- @testing-library/jest-dom 6.9 - DOM assertion matchers
- jsdom 27.4 - DOM environment for vitest
- tsx 4.21 - TypeScript executor for scripts (`scripts/deck-worker.ts`)
- autoprefixer 10.4 - PostCSS plugin; config at `postcss.config.mjs`
## Key Dependencies
- `@prisma/client` 6.1 - Database access; all data operations flow through `src/lib/prisma.ts`
- `next-auth` 4.24 - Authentication; session strategy is JWT (30-day expiry); credentials provider uses bcrypt
- `@supabase/supabase-js` 2.90 - Supabase client for realtime subscriptions and file storage; configured in `src/lib/supabase.ts`
- `@upstash/redis` 1.36 - Redis client for caching; used in `src/lib/cache.ts`
- `@upstash/ratelimit` 2.0 - Rate limiting against Redis; used in `src/lib/rate-limit.ts`; falls back to in-memory when unconfigured
## Configuration
- Validated at startup via zod schema in `src/lib/env.ts`
- Development: warns on validation failures rather than crashing
- Production: throws on missing required vars
- Template: `.env.example` (do not read `.env.local`)
- `DATABASE_URL` - Supabase PostgreSQL connection string (required)
- `NEXTAUTH_SECRET` - Min 32 chars (required)
- At least one AI key: `GOOGLE_API_KEY` / `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Enables realtime
- `next.config.ts` - Next.js config with PWA, security headers, image remote patterns
- `tsconfig.json` - `strict: true`, `noImplicitAny: false`; path alias `@/*` → `./src/*`
- TypeScript build errors ignored (`ignoreBuildErrors: true`) — pre-existing debt
## Platform Requirements
- Node.js with npm
- PostgreSQL via Supabase (or local Postgres with matching schema)
- Optional: Upstash Redis for rate limiting/caching
- Vercel (inferred from `vercel.json` and `.vercel/` directory)
- Vercel Cron: analytics aggregation runs daily at 2am UTC (`/api/analytics/aggregate`)
- PWA disabled in development, enabled in production
- Server Actions body size limit: 2mb
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- React components: PascalCase TSX (`CustomerIntelCard.tsx`, `DeckPreview.tsx`)
- Next.js pages and layouts: lowercase (`page.tsx`, `layout.tsx`)
- API routes: lowercase (`route.ts`)
- Hooks: kebab-case prefixed with `use-` (`use-customers.ts`, `use-dashboard.ts`)
- Services: kebab-case directory with `index.ts` (`scoring/index.ts`, `ai/index.ts`)
- Utility files: kebab-case (`rate-limit.ts`, `auth-secret.ts`)
- Validation schemas: kebab-case at lib root (`validations.ts`)
- camelCase for all functions (`getCustomers`, `formatCurrency`, `calculateCustomerScores`)
- Async API functions: verb-noun pattern (`fetchCustomers`, `createCustomer`, `bulkUpdateCustomers`)
- Boolean helpers: `is`/`has`/`can` prefix not enforced — use descriptive names
- Event handlers inline in components — no enforced naming prefix
- camelCase throughout
- Constants: ALL_CAPS_SNAKE_CASE for module-level constants (`REGIONAL_PROFIT_PER_SQFT`, `ROOF_TYPE_MULTIPLIERS`, `CURRENCY_CACHE_SIZE`)
- React Query key factories: camelCase objects with methods (`customerKeys.all`, `customerKeys.list(filters)`)
- PascalCase for all (`Customer`, `AIConfig`, `PaginatedResult<T>`)
- Interfaces over types for object shapes (`interface Customer`, `interface AIConfig`)
- `type` keyword for unions and computed types (`type AIProvider`, `type AITask`, `type MessageRole`)
- Export type aliases for Zod inferences: `export type CreateCustomerInput = z.infer<typeof createCustomerSchema>`
- Suffixes: `Input` for request data, `Response` for API responses, `Result` for return values
## Code Style
- No Prettier config present — formatting is not enforced by tooling
- Double quotes for strings (consistent across codebase)
- 2-space indentation
- Trailing commas in multi-line objects and arrays
- ESLint via `next/core-web-vitals` and `next/typescript` (`.eslintrc.json`)
- Notably permissive: `@typescript-eslint/no-explicit-any: off`, `no-unused-vars: off`, `prefer-const: off`
- `react-hooks/exhaustive-deps: off` — dependency arrays not enforced
- This means type safety and hook correctness rely on developer discipline, not tooling
- `strict: true` in `tsconfig.json` but `noImplicitAny: false` — partially strict
- `allowJs: true` — JavaScript files allowed
- `skipLibCheck: true` — library type errors suppressed
## Import Organization
- `@/*` maps to `./src/*` — use `@/lib/utils`, `@/components/ui/button`, etc.
- Never use relative paths with `../` — always use `@/` alias
- Hooks barrel: `src/lib/hooks/index.ts` — `export * from "./use-customers"` pattern
- Services: export from individual `index.ts` per service directory
- UI components are NOT barrel-exported — import directly from file
## Error Handling
- All route handlers wrapped in `try/catch`
- Validation errors return `{ success: false, error: string, details: string }` at 400
- Server errors return `{ success: false, error: string }` at 500
- Success responses return `{ success: true, ...data }`
- Log prefix pattern: `[API] METHOD /api/resource error:` or `[ServiceName] Error:`
- API fetch functions throw `new Error(error.error || "Fallback message")` on non-ok responses
- React Query surfaces these as `error` state — components handle display
- Use Zod schemas from `src/lib/validations.ts` — do not define schemas inline in routes
- Always use `.safeParse()` (not `.parse()`) to avoid thrown exceptions in handlers
- Use `formatZodErrors(validation.error)` from `src/lib/validations.ts` for error formatting
## Logging
- API errors: `console.error("[API] POST /api/resource error:", error)`
- Service-level errors: `console.error("[ServiceName] Description:", error)`
- Temporary/debug logs use bracketed prefixes: `[Composite]`, `[Nano Banana Pro]`
- No logging on the client side in hooks or components — errors surface via React Query
## Comments
- Every file starts with a JSDoc block describing the module, endpoints, or purpose
- Used in large files to separate logical sections:
- Used for non-obvious logic (`// Older roof = higher urgency`)
- Security notes in API routes (`// Security: Rate limited, Input validated`)
- Avoid restating what the code does — comment the "why"
- Used on exported functions in data/service layers
## Function Design
- Prefer single typed object parameter for functions with 3+ args
- Use TypeScript types/interfaces for all parameters — avoid `any` except where ESLint is disabled
- Async functions return `Promise<TypedResult>` — always type the return
- API route handlers always return `NextResponse.json(...)` — never throw out of handlers
## Module Design
- Named exports only — no default exports except Next.js pages/layouts/configs (where required)
- React components use named exports: `export { Button }` at end of file
- Or inline: `export function MyComponent()`
- `src/lib/hooks/index.ts` aggregates all hooks via `export *`
- `src/lib/data/index.ts` aggregates data access functions
- `src/lib/services/index.ts` aggregates service exports
- Feature directories (`src/features/deck-generator/`) have their own internal exports
## React/Next.js Patterns
- All dashboard pages and interactive components require `"use client"` at top of file
- API routes are always server-side — never add `"use client"` to `route.ts` files
- Shared UI components use `"use client"` when they have state or event handlers
- Use `class-variance-authority` (`cva`) for component variants — see `src/components/ui/button.tsx`
- Combine with `cn()` from `src/lib/utils` for className merging
- All client-side data fetching via React Query hooks in `src/lib/hooks/`
- Query key factories use hierarchical arrays: `["customers", "list", filters]`
- Server-side: direct Prisma calls in data access layer (`src/lib/data/`)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Server-side API routes co-located with pages under `src/app/api/`
- Client components drive UI; server components handle data at layout boundaries
- Service layer in `src/lib/services/` encapsulates all business logic and external integrations
- AI routing abstraction allows pluggable model adapters (Claude, Gemini, Kimi, Perplexity, OpenAI)
- Singleton service instances (Prisma client, AI router, outreach service, terrain data provider) initialized once per process
## Layers
- Purpose: React UI components, pages, and layouts
- Location: `src/app/(dashboard)/`, `src/app/(auth)/`, `src/components/`
- Contains: Page components (`page.tsx`), layout wrappers (`layout.tsx`), reusable UI components
- Depends on: Hooks layer, `src/lib/` utilities
- Used by: End users via browser
- Purpose: HTTP request handling, auth checks, validation, and response shaping
- Location: `src/app/api/`
- Contains: Next.js Route Handlers (`route.ts`), webhook receivers
- Depends on: Service layer, Prisma client, validation schemas (`src/lib/validations.ts`)
- Used by: Client components via fetch, external webhooks
- Purpose: Data fetching state management bridging components to API routes
- Location: `src/lib/hooks/`
- Contains: Custom React hooks (e.g., `use-customers.ts`, `use-claims.ts`, `use-dashboard.ts`)
- Depends on: Fetch calls to `/api/` routes, React Query (via `src/lib/query-provider.tsx`)
- Used by: Page and component files
- Purpose: Business logic, external API clients, domain operations
- Location: `src/lib/services/`
- Contains: Domain services (outreach, weather, carriers, scoring, analytics, AI, etc.)
- Depends on: Prisma client (`src/lib/prisma.ts`), external SDKs and APIs
- Used by: API route handlers
- Purpose: Database access and schema management
- Location: `prisma/schema.prisma`, `src/lib/prisma.ts`
- Contains: Prisma ORM client, PostgreSQL schema (via Supabase)
- Depends on: `DATABASE_URL` and `DIRECT_URL` environment variables
- Used by: Service layer
- Purpose: Self-contained vertical slices for complex features
- Location: `src/features/`
- Contains: `deck-generator/` and `infographic-generator/` with their own components, services, hooks, types, and utils
- Depends on: AI service layer, Prisma
- Used by: API routes under `/api/decks/` and `/api/ai/generate-slide/`
## Data Flow
- Server state: React Query (TanStack Query) via `src/lib/query-provider.tsx`
- UI state: React `useState` / context providers (`ThemeProvider`, `SidebarProvider`, `GamificationProvider`)
- Realtime updates: Supabase Realtime subscriptions in `src/lib/supabase.ts` for weather events, intel items, and customer updates
## Key Abstractions
- Purpose: Routes AI tasks to the correct model adapter with fallback logic
- Examples: `src/lib/services/ai/adapters/claude.ts`, `gemini.ts`, `kimi.ts`, `perplexity.ts`, `openai.ts`
- Pattern: Registry pattern — adapters registered at startup via `initializeAI()` in `src/lib/services/ai/index.ts`; task-to-model mapping in `TASK_MODEL_MAP`
- Purpose: Normalize insurance carrier API differences behind a common interface
- Examples: `state-farm-adapter.ts`, `mock-adapter.ts`
- Pattern: Template method via `BaseCarrierAdapter` base class
- Purpose: Singleton that holds generated demo data for the Terrain Intelligence module (storms, permits, briefs, competitors, alerts)
- Pattern: Singleton with lazy async initialization; generators in `src/lib/terrain/generators/` produce synthetic data
- Purpose: Executes storm-triggered and manual SMS/email campaigns with template personalization
- Pattern: Service class singleton exported as `outreachService`
## Entry Points
- Location: `src/app/layout.tsx`
- Triggers: Every page render
- Responsibilities: Wraps app in `QueryProvider`, `ThemeProvider`, `ToastProvider`; sets PWA metadata
- Location: `src/app/(dashboard)/layout.tsx`
- Triggers: Any dashboard route render
- Responsibilities: Wraps content in `AnimationPreferencesProvider`, `SidebarProvider`, `GamificationProvider`; renders `Sidebar` (desktop) and `MobileHeader`/`MobileBottomNav`
- Location: `src/app/api/auth/[...nextauth]/route.ts`
- Triggers: Login/logout requests
- Responsibilities: Delegates to NextAuth with `authOptions` from `src/lib/auth.ts`; supports credentials (password + demo token + dev bypass) with JWT sessions
- Location: `src/lib/services/ai/index.ts` → `initializeAI()`
- Triggers: First call to `getAI()` from any API route
- Responsibilities: Instantiates adapters for all configured API keys (Gemini required, Claude/Kimi/Perplexity/OpenAI optional); registers them with the singleton `AIRouter`
- Location: `src/app/api/analytics/aggregate/route.ts` and `src/app/api/cron/process-scheduled-decks/route.ts`
- Triggers: Vercel cron scheduler (analytics at 02:00 UTC daily per `vercel.json`)
- Responsibilities: Analytics aggregation; batch deck generation processing
## Error Handling
- `z.ZodError` caught explicitly and returned as `{ error: "Validation error", details: error.issues }` with `400`
- Unexpected errors caught by outer `try/catch` and returned as `{ error: "Failed to ..." }` with `500`
- Auth errors return `{ error: "Unauthorized" }` with `401` before any business logic runs
- Error boundaries (`src/components/error-boundary.tsx`) wrap dashboard content at layout level
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
