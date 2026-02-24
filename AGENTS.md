# AGENTS.md

## Cursor Cloud specific instructions

### Overview
Guardian Intel is a Next.js 15 full-stack sales intelligence platform for Guardian Storm Repair. Single-package app (not a monorepo) with Prisma ORM, NextAuth credentials auth, and a Supabase-hosted PostgreSQL database.

### Running the dev server
```bash
npm run dev  # starts Next.js on port 3000
```
The app redirects unauthenticated users to `/login`. Demo credentials are seeded by `npm run db:seed`:
- **Manager:** `demo.manager@guardian.com` / `GuardianDemo2026!`
- **Rep:** `demo.rep@guardian.com` / `GuardianDemo2026!`

### Database
- `DATABASE_URL` is injected via environment secrets (Supabase). Do not hardcode it.
- After schema changes: `npx prisma generate && npx prisma db push`
- To re-seed: `npm run db:seed` (idempotent via upserts)

### Lint, Test, Build
- **Lint:** `npm run lint` (uses `next lint` with ESLint 9 flat config via `eslint.config.mjs`)
- **Unit tests:** `npm run test:run` (Vitest). One pre-existing failure in `deck-templates.test.ts`.
- **E2E tests:** `npm run test:e2e` (Playwright, requires `npx playwright install` first)
- **Build:** `npm run build` (TypeScript errors are ignored via `next.config.ts` setting `ignoreBuildErrors: true`)

### Gotchas
- The `.env` file provides `NEXTAUTH_SECRET` and `NEXTAUTH_URL`. `DATABASE_URL` comes from environment secrets and takes precedence over `.env`.
- The env validation in `src/lib/env.ts` gracefully falls back in development mode when env vars are missing.
- AI features (Gemini/Google AI) require optional API keys; they degrade gracefully without them.
- Some pages (Customers, Playbooks) may show "Failed to load" errors—these are pre-existing API issues, not environment problems.
- PostgreSQL is installed locally as a fallback but the primary DB is the Supabase instance via `DATABASE_URL` secret.
