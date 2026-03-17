# Guardian Intel — Health Check Report

**Date:** 2026-03-16
**Branch:** `main` (commit `997a875`)
**Node dependencies:** Installed (1,043 packages, 8 vulnerabilities: 3 low, 5 high)

---

## 1. Build (`npm run build`)

**Result: FAIL**

The Next.js build fails immediately due to **unresolved merge conflict markers** in 4 files:

| File | Conflict locations (lines) |
|------|--------------------------|
| `src/app/api/analytics/route.ts` | 99, 101, 108 |
| `src/app/api/playbooks/recent/route.ts` | 79, 94, 96 |
| `src/features/deck-generator/utils/dataAggregator.ts` | 368, 370, 372, 482, 484, 486 |
| `src/lib/services/ai/index.ts` | 57, 59, 61 |

All four conflicts follow the same pattern: `<<<<<<< ours` / `=======` / `>>>>>>> theirs` — an incomplete merge from the dead-code audit PR (#24). The "ours" side uses inline type annotations; the "theirs" side uses imported type aliases. Both sides are functionally equivalent.

No other build errors were observed (the merge conflicts prevent further compilation).

---

## 2. Lint (`npm run lint`)

**Result: FAIL (blocked by merge conflicts)**

ESLint (via `next lint`) aborts on the same 4 files with `Parsing error: Merge conflict marker encountered`. No other lint issues were reported before the parser halted.

Note: `next lint` is deprecated in Next.js 15 and will be removed in v16. The warning suggests migrating to the ESLint CLI directly.

---

## 3. TypeScript (`npx tsc --noEmit`)

**Result: FAIL — 15 errors (all TS1185: merge conflict markers)**

Every TypeScript error is a `TS1185: Merge conflict marker encountered` in the same 4 files listed above. There are **no other type errors** — once the merge conflicts are resolved, the codebase should type-check cleanly.

| File | Error count |
|------|------------|
| `src/app/api/analytics/route.ts` | 3 |
| `src/app/api/playbooks/recent/route.ts` | 3 |
| `src/features/deck-generator/utils/dataAggregator.ts` | 6 |
| `src/lib/services/ai/index.ts` | 3 |

---

## 4. Prisma (`npx prisma validate`)

**Result: FAIL — missing environment variable**

```
Error code: P1012
Environment variable not found: DIRECT_URL.
  -->  prisma/schema.prisma:8
   |
 7 |   url       = env("DATABASE_URL")
 8 |   directUrl = env("DIRECT_URL")
```

The schema itself is structurally valid, but `prisma validate` requires `DIRECT_URL` to be set in the environment. This is expected for local dev without a `.env` file present.

---

## 5. TODOs / Stubs

A search for `TODO`, `FIXME`, `HACK`, `STUB`, and `stubbed` across all `.ts` and `.tsx` files returned **zero matches**. All previously-flagged TODO comments have been removed.

---

## 6. February 2025 Audit — Regression Check

### TS2345 `never[]` inference errors

| Location | Feb 2025 Status | Current Status |
|----------|----------------|----------------|
| Analytics route (`weeklyActivity`) | TS2345 error | **Replaced by merge conflict** — the fix is present on one side of the conflict |
| Recent playbooks route (`uniquePlaybooks`) | TS2345 error | **Replaced by merge conflict** — same situation |
| Talking points generator (`points`) | TS2345 error | **Replaced by merge conflict** — same situation |
| Recommended next steps generator (`items`) | TS2345 error | **Replaced by merge conflict** — same situation |
| AI service initialization (`adapters`) | TS2345 error | **Replaced by merge conflict** — same situation |

**Verdict: Partially addressed.** Both sides of each merge conflict contain valid explicit type annotations that would fix the original `never[]` inference errors. The fix was attempted in the dead-code audit PR (#24) but the merge was not completed cleanly.

### ESLint not configured

| Feb 2025 | Current |
|----------|---------|
| No `.eslintrc.json`; `npm run lint` triggered interactive setup wizard | **Resolved.** `.eslintrc.json` exists with `next/core-web-vitals` and `next/typescript` extends, plus several rules disabled. Lint runs (and would pass if not for merge conflicts). |

### Google Fonts fetch failure

| Feb 2025 | Current |
|----------|---------|
| Build failed fetching JetBrains Mono and Outfit from Google Fonts in `src/app/layout.tsx` | **Resolved.** `layout.tsx` now uses `GeistSans` and `GeistMono` from the `geist` package (local fonts, no network fetch). No references to Google Fonts remain. |

### Stubbed TODOs in service files

| Service | Feb 2025 | Current |
|---------|----------|---------|
| Contracts (`src/lib/services/contracts/index.ts`) | Stubbed TODO | **Resolved.** Full implementation with Prisma integration. |
| Outreach (`src/lib/services/outreach/index.ts`) | Stubbed TODO | **Resolved.** Full implementation with campaign execution. |
| Carriers (`src/lib/services/carriers/index.ts`) | Stubbed TODO | **Resolved.** Full adapter-pattern implementation. |
| Competitor analytics (`src/lib/services/competitors/index.ts`) | Stubbed TODO | **Still broken.** `index.ts` exports `getCompetitorAnalytics` from `./analytics`, but the file `analytics.ts` does not exist. This is a missing-module error that would surface at runtime. |
| Proposals (`src/lib/services/proposals/`) | Stubbed TODO | **Resolved.** `generator.ts` has full AI-powered generation with template fallback. |
| AI damage analyzer (`src/lib/services/ai/damage-analyzer.ts`) | Stubbed TODO | **Resolved.** Full implementation with Gemini, OpenAI, and mock fallback. |

---

## Summary

| Category | Status | Blocking? |
|----------|--------|-----------|
| Build | FAIL | Yes — merge conflicts in 4 files |
| Lint | FAIL | Yes — blocked by same merge conflicts |
| TypeScript | FAIL (15 errors) | Yes — all 15 are merge conflict markers |
| Prisma | FAIL (env var) | No — schema is valid; needs `DIRECT_URL` in env |
| TODOs/Stubs | Clean | No |
| Feb audit regressions | 5/6 resolved, 1 still broken | competitor analytics module missing |

### Recommended Priority

1. **Resolve merge conflicts** in the 4 files (choose either the inline type or the imported alias — both are correct). This unblocks build, lint, and TypeScript.
2. **Add the missing `src/lib/services/competitors/analytics.ts`** or remove the broken re-export from `competitors/index.ts`.
3. **Set `DIRECT_URL`** in `.env` (or `.env.local`) for Prisma validation to pass locally.
