# Codebase Structure

**Analysis Date:** 2026-03-21

## Directory Layout

```
guardian-intel/
├── prisma/                    # Database schema and migrations
│   ├── schema.prisma          # Prisma data model (PostgreSQL via Supabase)
│   └── migrations/            # SQL migration history
├── public/                    # Static assets (icons, mockups, PWA manifest)
├── scripts/                   # One-off Node scripts (seeding, maintenance)
├── e2e/                       # Playwright end-to-end tests
├── tests/
│   └── unit/                  # Vitest unit tests
├── docs/                      # Internal documentation
├── src/
│   ├── app/                   # Next.js App Router root
│   │   ├── layout.tsx         # Root layout (QueryProvider, ThemeProvider, ToastProvider)
│   │   ├── globals.css        # Global CSS / design tokens
│   │   ├── (auth)/            # Route group: unauthenticated pages
│   │   │   └── login/         # Login page
│   │   ├── (dashboard)/       # Route group: authenticated app pages
│   │   │   ├── layout.tsx     # Dashboard shell (Sidebar, mobile nav, gamification)
│   │   │   ├── page.tsx       # Home dashboard
│   │   │   ├── analytics/     # Analytics & leaderboard
│   │   │   ├── claims/        # Insurance claims management
│   │   │   ├── competitors/   # Competitor intelligence
│   │   │   ├── customers/     # Customer CRM
│   │   │   ├── outreach/      # Campaign management
│   │   │   ├── playbooks/     # Sales playbooks
│   │   │   ├── settings/      # User settings
│   │   │   ├── storms/        # Storm tracking
│   │   │   └── terrain/       # Terrain Intelligence (map, briefs, alerts, sources)
│   │   └── api/               # API Route Handlers
│   │       ├── ai/            # AI endpoints (chat, analyze-damage, generate-slide, roleplay)
│   │       ├── analytics/     # Analytics & leaderboard endpoints
│   │       ├── auth/          # NextAuth + demo credentials endpoints
│   │       ├── carriers/      # Insurance carrier integration endpoints
│   │       ├── claims/        # Claims CRUD
│   │       ├── competitors/   # Competitor data endpoints
│   │       ├── contracts/     # Contract management
│   │       ├── conversations/ # Conversation threads
│   │       ├── cron/          # Scheduled job endpoints
│   │       ├── customers/     # Customer CRM endpoints
│   │       ├── dashboard/     # Dashboard aggregation
│   │       ├── decks/         # Deck generation endpoints
│   │       ├── events/        # Event logging
│   │       ├── gamification/  # Gamification leaderboard
│   │       ├── notifications/ # Push notification endpoints
│   │       ├── outreach/      # Campaign & template endpoints
│   │       ├── photos/        # Photo upload/analysis
│   │       ├── playbooks/     # Playbook CRUD + analytics
│   │       ├── proposals/     # Proposal generation
│   │       ├── storms/        # Storm data
│   │       ├── terrain/       # Terrain intelligence endpoints
│   │       ├── weather/       # Weather (NOAA, forecasts, alerts, heatmap, predictions)
│   │       └── webhooks/      # Incoming webhooks (Leap, SalesRabbit)
│   ├── components/            # Shared React components
│   │   ├── ai/                # AI chat interface components
│   │   ├── claims/            # Claims UI components
│   │   ├── contracts/         # Contract UI components
│   │   ├── customer/          # Single-customer components
│   │   ├── customers/         # Customer list/table components
│   │   ├── dashboard/         # Dashboard widgets
│   │   ├── gamification/      # Achievement/celebration components
│   │   ├── maps/              # Map and radar components
│   │   ├── modals/            # Modal dialogs (customer profile, storm details, take action)
│   │   ├── outreach/          # Campaign UI components
│   │   ├── photos/            # Photo capture/upload components
│   │   ├── playbooks/         # Playbook UI components
│   │   ├── property/          # Property details components
│   │   ├── terrain/           # Terrain Intelligence UI components
│   │   ├── weather/           # Weather display components
│   │   └── ui/                # Primitive UI components (button, badge, card, toast, etc.)
│   ├── features/              # Self-contained feature modules
│   │   ├── deck-generator/    # Sales deck PDF generation
│   │   │   ├── components/    # Deck UI components
│   │   │   ├── hooks/         # Deck-specific React hooks
│   │   │   ├── services/      # AI slide + image generation services
│   │   │   ├── templates/     # Slide layout templates
│   │   │   ├── types/         # TypeScript types for decks
│   │   │   └── utils/         # Deck utility functions
│   │   └── infographic-generator/  # AI infographic generation (in progress)
│   │       ├── services/      # Model intelligence layer
│   │       ├── types/         # Infographic types
│   │       └── utils/         # Utility helpers
│   ├── lib/                   # Shared utilities, services, and contexts
│   │   ├── auth.ts            # NextAuth configuration + demo token logic
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── supabase.ts        # Supabase client for realtime subscriptions
│   │   ├── validations.ts     # Centralized Zod schemas
│   │   ├── rate-limit.ts      # Rate limiting utility (Upstash/in-memory)
│   │   ├── utils.ts           # General utilities (cn, etc.)
│   │   ├── cache.ts           # Caching utilities
│   │   ├── env.ts             # Typed environment variable access
│   │   ├── query-provider.tsx # TanStack Query provider
│   │   ├── theme-context.tsx  # Theme provider
│   │   ├── sidebar-context.tsx # Sidebar state context
│   │   ├── hooks/             # Custom React hooks (use-customers, use-dashboard, etc.)
│   │   ├── gamification/      # Gamification context and types
│   │   ├── preferences/       # Animation preferences provider
│   │   ├── data/              # Mock/seed data helpers (customers.ts)
│   │   ├── terrain/           # Terrain Intelligence data and generators
│   │   │   ├── data-provider.ts  # Singleton terrain data store
│   │   │   ├── types.ts          # Terrain domain types
│   │   │   ├── constants.ts      # Terrain configuration constants
│   │   │   └── generators/       # Demo data generators (storms, permits, briefs, etc.)
│   │   └── services/          # Domain service layer
│   │       ├── ai/            # AI router + adapters
│   │       │   ├── index.ts   # Service initialization + exports
│   │       │   ├── router.ts  # AIRouter class + singleton
│   │       │   ├── types.ts   # AI type definitions
│   │       │   ├── context.ts # CustomerContext builder
│   │       │   ├── tools.ts   # AI tool definitions + executors
│   │       │   └── adapters/  # claude.ts, gemini.ts, kimi.ts, perplexity.ts, openai.ts, gemini-flash-image.ts
│   │       ├── analytics/     # Analytics aggregation service
│   │       ├── audit/         # Audit log service
│   │       ├── carriers/      # Insurance carrier integrations
│   │       │   └── adapters/  # state-farm-adapter.ts, mock-adapter.ts
│   │       ├── competitors/   # Competitor tracking service
│   │       ├── contracts/     # Contract management service
│   │       ├── crm/           # CRM sync service
│   │       ├── geocoding/     # Address geocoding service
│   │       ├── notifications/ # Push notification service
│   │       ├── outreach/      # Campaign execution service + providers
│   │       ├── playbooks/     # Playbook service
│   │       ├── property/      # Property data service
│   │       ├── proposals/     # Proposal generation service
│   │       ├── scoring/       # Lead scoring service
│   │       └── weather/       # NOAA weather + predictive storm service
│   └── types/                 # Global TypeScript type declarations
│       ├── crm.ts             # CRM integration types
│       ├── next-auth.d.ts     # NextAuth session type augmentation
│       └── leaflet-heat.d.ts  # Leaflet heatmap plugin types
├── next.config.ts             # Next.js config (PWA, security headers, image domains)
├── tailwind.config.ts         # Tailwind CSS config
├── tsconfig.json              # TypeScript config
├── vitest.config.ts           # Vitest unit test config
└── playwright.config.ts       # Playwright e2e config
```

## Directory Purposes

**`src/app/(dashboard)/`:**
- Purpose: All authenticated application pages
- Contains: Page components and nested route segments
- Key files: `layout.tsx` (dashboard shell with sidebar), `page.tsx` (home dashboard)
- Route group `(dashboard)` means the segment does not appear in URLs

**`src/app/api/`:**
- Purpose: All REST API endpoints as Next.js Route Handlers
- Contains: `route.ts` files with exported `GET`, `POST`, `PUT`, `DELETE`, `PATCH` functions
- Pattern: Each resource has its own directory; nested paths for sub-resources (e.g., `customers/[id]/timeline/`)

**`src/components/`:**
- Purpose: Shared React components organized by domain
- Contains: Feature-specific component subdirectories plus `ui/` primitives
- `ui/`: Only primitive building blocks (button, badge, card, toast, tooltip, etc.)
- Domain folders (`claims/`, `customers/`, etc.): Composite components for that domain

**`src/features/`:**
- Purpose: Complex features with their own full internal structure
- Contains: `deck-generator/` (complete sales deck AI generation) and `infographic-generator/` (in progress)
- Use when: A feature has its own services, types, hooks, and components that shouldn't pollute `src/lib/` or `src/components/`

**`src/lib/services/`:**
- Purpose: Business logic services called from API routes
- Contains: One directory per domain service; each exports a singleton instance or named functions
- Pattern: Service classes exported as singletons (e.g., `export const outreachService = new OutreachService()`)

**`src/lib/hooks/`:**
- Purpose: Custom React hooks for all data fetching and UI state
- Contains: One file per domain (e.g., `use-customers.ts`, `use-claims.ts`)
- All hooks exported from `src/lib/hooks/index.ts`

**`src/lib/terrain/`:**
- Purpose: Terrain Intelligence module data layer (storms, permits, market, competitors, briefs)
- Contains: `TerrainDataProvider` singleton, type definitions, generator functions for demo data
- Note: Currently uses generated demo data; intended to integrate with real NOAA/permit APIs

**`prisma/`:**
- Purpose: Database schema and migration history
- Generated: `@prisma/client` generated into `node_modules`
- Committed: `schema.prisma` and `migrations/` are committed; generated client is not

## Key File Locations

**Entry Points:**
- `src/app/layout.tsx`: Root HTML shell with providers
- `src/app/(dashboard)/layout.tsx`: Authenticated dashboard shell
- `src/app/(auth)/login/page.tsx`: Login page
- `src/app/(dashboard)/page.tsx`: Home dashboard page

**Configuration:**
- `prisma/schema.prisma`: Full database schema
- `src/lib/auth.ts`: NextAuth options, demo token logic
- `src/lib/validations.ts`: All Zod schemas for API validation
- `src/lib/rate-limit.ts`: Rate limiting configuration and middleware
- `next.config.ts`: Next.js + PWA + security headers
- `vercel.json`: Cron job schedule

**Core Logic:**
- `src/lib/services/ai/router.ts`: AI task routing with model fallback
- `src/lib/services/ai/index.ts`: AI service initialization and adapter registration
- `src/lib/services/outreach/index.ts`: Storm campaign execution engine
- `src/lib/services/weather/noaa-service.ts`: NOAA weather API integration
- `src/lib/terrain/data-provider.ts`: Terrain Intelligence singleton data store
- `src/lib/prisma.ts`: Prisma client singleton

**Testing:**
- `tests/unit/`: Vitest unit tests
- `e2e/`: Playwright end-to-end tests
- `vitest.config.ts`: Unit test runner configuration
- `playwright.config.ts`: E2E test configuration

## Naming Conventions

**Files:**
- Page files: `page.tsx` (required by Next.js App Router)
- Layout files: `layout.tsx` (required by Next.js App Router)
- API routes: `route.ts` (required by Next.js App Router)
- Component files: PascalCase for named exports (`CustomerIntelCard.tsx`), kebab-case for default exports (`brief-viewer.tsx`)
- Hook files: `use-{name}.ts` (e.g., `use-customers.ts`, `use-damage-analysis.ts`)
- Service files: `{name}-service.ts` or `{name}.ts` within a named directory
- Type files: `types.ts` within a directory, or `{domain}.types.ts` at feature level

**Directories:**
- API resource directories: kebab-case matching the resource name (e.g., `outreach/campaigns/[id]/`)
- Component directories: kebab-case (e.g., `modals/customer-profile/`)
- Service directories: kebab-case matching the domain (e.g., `carriers/adapters/`)

## Where to Add New Code

**New Dashboard Page:**
- Page file: `src/app/(dashboard)/{feature}/page.tsx`
- Components: `src/components/{feature}/` directory with an `index.ts` barrel
- Hook: `src/lib/hooks/use-{feature}.ts` (export from `src/lib/hooks/index.ts`)

**New API Endpoint:**
- Route file: `src/app/api/{resource}/route.ts`
- Add Zod validation schema to `src/lib/validations.ts`
- Call service or Prisma directly; always check session at top with `getServerSession(authOptions)`

**New Service:**
- Implementation: `src/lib/services/{domain}/index.ts`
- Export singleton from file; add re-export to `src/lib/services/index.ts` if broadly used
- Types: `src/lib/services/{domain}/types.ts`

**New AI Adapter:**
- Implementation: `src/lib/services/ai/adapters/{name}.ts` implementing `AIAdapter` interface from `src/lib/services/ai/types.ts`
- Register in `src/lib/services/ai/index.ts` → `initializeAI()` function

**New Feature Module (complex feature):**
- Directory: `src/features/{feature-name}/` with `components/`, `services/`, `hooks/`, `types/`, `utils/` subdirectories

**New Shared Component:**
- Primitive: `src/components/ui/{component}.tsx`
- Domain component: `src/components/{domain}/{ComponentName}.tsx`

**Utilities:**
- Shared helpers: `src/lib/utils.ts`
- Domain-specific utilities: `src/lib/services/{domain}/` or `src/features/{feature}/utils/`

## Special Directories

**`.planning/`:**
- Purpose: GSD workflow planning artifacts (phases, codebase analysis)
- Generated: No
- Committed: Yes

**`.next/`:**
- Purpose: Next.js build output and development cache
- Generated: Yes (by `next build` / `next dev`)
- Committed: No

**`prisma/migrations/`:**
- Purpose: SQL migration history for schema changes
- Generated: By `prisma migrate dev`
- Committed: Yes

**`public/`:**
- Purpose: Static assets served at root (icons, PWA manifest, mockup images)
- Generated: Partially (`sw.js`, `workbox-*.js` generated by next-pwa)
- Committed: Static assets yes; generated service worker files committed (`sw.js` in git status)

---

*Structure analysis: 2026-03-21*
