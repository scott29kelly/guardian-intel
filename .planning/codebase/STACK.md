# Technology Stack

**Analysis Date:** 2026-03-21

## Languages

**Primary:**
- TypeScript 5.7 - All application code (`src/`, `scripts/`, `prisma/seed.ts`)
- TSX - React component files throughout `src/app/` and `src/components/`

**Secondary:**
- CSS (via Tailwind) - Styling

## Runtime

**Environment:**
- Node.js (target ES2017, module resolution: bundler)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 15.1 - Full-stack React framework with App Router (`src/app/`)
- React 19 - UI rendering
- next-pwa 5.6 - Progressive Web App support; configured in `next.config.ts` with service worker at `public/sw.js`

**ORM / Database:**
- Prisma 6.1 - ORM and schema management; schema at `prisma/schema.prisma`, client via `src/lib/prisma.ts`

**Auth:**
- next-auth 4.24 - Authentication framework; configured in `src/lib/auth.ts`
- @auth/prisma-adapter 2.7 - Persists sessions to PostgreSQL via Prisma

**UI Components:**
- Radix UI - Headless primitives (`@radix-ui/react-progress`, `@radix-ui/react-slot`, `@radix-ui/react-tooltip`)
- Tailwind CSS 3.4 - Utility CSS; config at `tailwind.config.ts`
- tailwind-merge 2.6 - Merges Tailwind classes without conflicts
- class-variance-authority 0.7 - Variant-based component styling
- tailwindcss-animate 1.0 - Animation utilities
- framer-motion 11.15 - Complex animations
- lucide-react 0.468 - Icon library
- Geist 1.7 - Font family (Vercel design system)

**State & Data Fetching:**
- @tanstack/react-query 5.62 - Server state management; provider at `src/lib/query-provider.tsx`

**Mapping:**
- leaflet 1.9 + react-leaflet 5.0 - Interactive maps
- react-leaflet-cluster 4.0 - Marker clustering
- leaflet.heat 0.2 - Heatmap layer

**Charts:**
- recharts 2.15 - Data visualization charts

**Document Generation:**
- jsPDF 4.0 - PDF generation client-side
- html2canvas 1.4 - DOM-to-canvas for PDF captures
- jszip 3.10 - ZIP file creation
- file-saver 2.0 - Browser file downloads

**Validation:**
- zod 4.3 - Runtime schema validation; used in `src/lib/env.ts` and `src/lib/validations.ts`

**Password Hashing:**
- bcryptjs 2.4 - Password hashing in `src/lib/auth.ts`

**Push Notifications:**
- web-push 3.6 - Web Push API for browser notifications; VAPID key endpoint at `src/app/api/notifications/vapid-key/`

**Markdown:**
- react-markdown 10.1 - Renders markdown content (playbooks, AI responses)

**Date Utilities:**
- date-fns 4.1 - Date manipulation

**Testing:**
- vitest 4.0 - Unit/integration test runner; config at `vitest.config.ts`
- @playwright/test 1.57 - E2E tests; config at `playwright.config.ts`
- @testing-library/jest-dom 6.9 - DOM assertion matchers
- jsdom 27.4 - DOM environment for vitest

**Build/Dev:**
- tsx 4.21 - TypeScript executor for scripts (`scripts/deck-worker.ts`)
- autoprefixer 10.4 - PostCSS plugin; config at `postcss.config.mjs`

## Key Dependencies

**Critical:**
- `@prisma/client` 6.1 - Database access; all data operations flow through `src/lib/prisma.ts`
- `next-auth` 4.24 - Authentication; session strategy is JWT (30-day expiry); credentials provider uses bcrypt
- `@supabase/supabase-js` 2.90 - Supabase client for realtime subscriptions and file storage; configured in `src/lib/supabase.ts`

**Infrastructure:**
- `@upstash/redis` 1.36 - Redis client for caching; used in `src/lib/cache.ts`
- `@upstash/ratelimit` 2.0 - Rate limiting against Redis; used in `src/lib/rate-limit.ts`; falls back to in-memory when unconfigured

## Configuration

**Environment:**
- Validated at startup via zod schema in `src/lib/env.ts`
- Development: warns on validation failures rather than crashing
- Production: throws on missing required vars
- Template: `.env.example` (do not read `.env.local`)

**Required env vars:**
- `DATABASE_URL` - Supabase PostgreSQL connection string (required)
- `NEXTAUTH_SECRET` - Min 32 chars (required)

**Optional but recommended env vars:**
- At least one AI key: `GOOGLE_API_KEY` / `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Enables realtime

**Build:**
- `next.config.ts` - Next.js config with PWA, security headers, image remote patterns
- `tsconfig.json` - `strict: true`, `noImplicitAny: false`; path alias `@/*` → `./src/*`
- TypeScript build errors ignored (`ignoreBuildErrors: true`) — pre-existing debt

## Platform Requirements

**Development:**
- Node.js with npm
- PostgreSQL via Supabase (or local Postgres with matching schema)
- Optional: Upstash Redis for rate limiting/caching

**Production:**
- Vercel (inferred from `vercel.json` and `.vercel/` directory)
- Vercel Cron: analytics aggregation runs daily at 2am UTC (`/api/analytics/aggregate`)
- PWA disabled in development, enabled in production
- Server Actions body size limit: 2mb

---

*Stack analysis: 2026-03-21*
