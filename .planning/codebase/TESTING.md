# Testing Patterns

**Analysis Date:** 2026-03-21

## Test Framework

**Unit/Integration Runner:**
- Vitest 4.x
- Config: `vitest.config.ts`
- React plugin: `@vitejs/plugin-react`
- Environment: `jsdom`
- Globals enabled (`globals: true`) — no need to import `describe`, `it`, `expect`

**Assertion Library:**
- Vitest built-in (`expect`) plus `@testing-library/jest-dom` for DOM matchers
- Setup file imports `@testing-library/jest-dom/vitest` (`tests/setup.ts`)

**E2E Runner:**
- Playwright 1.57+
- Config: `playwright.config.ts`
- Browser: Chromium only (Desktop Chrome)
- Base URL: `http://localhost:3002`

**Run Commands:**
```bash
npm run test             # Vitest watch mode
npm run test:run         # Vitest single run (CI)
npm run test:coverage    # Vitest with v8 coverage report
npm run test:e2e         # Playwright headless
npm run test:e2e:ui      # Playwright with interactive UI
```

## Test File Organization

**Unit Test Location:**
- `tests/unit/*.test.ts` — primary location for unit tests
- `src/**/*.test.{ts,tsx}` — co-located tests also supported (per vitest config)
- Currently all tests live in `tests/unit/`, not co-located

**E2E Test Location:**
- `tests/setup.ts` — global test setup (mocks, env vars)
- `e2e/*.spec.ts` — all Playwright E2E tests

**Naming:**
- Unit test files: `{subject}.test.ts` (`scoring.test.ts`, `utils.test.ts`, `brandingConfig.test.ts`)
- E2E spec files: `{feature}.spec.ts` (`login.spec.ts`, `dashboard.spec.ts`)

**Structure:**
```
tests/
  setup.ts              # Global Vitest setup — mocks and env
  unit/
    brandingConfig.test.ts
    deck-templates.test.ts
    scoring.test.ts
    utils.test.ts
e2e/
  dashboard.spec.ts
  login.spec.ts
```

## Test Structure

**Suite Organization (Vitest):**
```typescript
/**
 * Module description comment at top
 */
import { describe, it, expect } from "vitest";
import { functionUnderTest } from "@/path/to/module";
import type { SomeType } from "@/path/to/types";

describe("ModuleName or ClassName", () => {
  describe("methodName or concept", () => {
    it("should do specific thing", () => {
      // arrange
      // act
      // assert
    });
  });
});
```

**Patterns:**
- Top-level `describe` matches the module/feature name
- Nested `describe` for sub-groups (methods, scenarios)
- `it("should ...")` phrasing for all test cases
- No `beforeAll`/`afterAll` in unit tests — tests are self-contained
- Global `afterEach(() => { vi.clearAllMocks(); })` in `tests/setup.ts`

## Mocking

**Framework:** Vitest's `vi` object

**Global Mocks (in `tests/setup.ts`):**
```typescript
// Next.js router mock — applied to all unit tests automatically
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// next-auth session mock — authenticated state by default
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "1", email: "test@guardian.com", name: "Test User" } },
    status: "authenticated",
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));
```

**What to Mock:**
- `next/navigation` (useRouter, usePathname, useSearchParams) — always in unit tests
- `next-auth/react` — always in unit tests
- External API calls when testing service logic in isolation

**What NOT to Mock:**
- Pure utility functions being tested (scoring logic, formatters)
- Module-level constants and config objects

**Note:** No component-level tests exist yet — `@testing-library/react` is available via setup but not used in current test suite. If adding component tests, use `@testing-library/react` with the global mocks already configured.

## Fixtures and Factories

**Test Data:**
- Tests define data inline — no shared fixture files or factory functions
- Domain objects are constructed directly in each test:
```typescript
it("should score older roofs higher", () => {
  const scoreRoofAge = (age: number) => { /* inline implementation */ };
  expect(scoreRoofAge(30)).toBe(50);
});
```

**Pattern Note:** Several unit tests redefine helper functions locally rather than importing from source (e.g., `clamp`, `scoreRoofAge` in `scoring.test.ts`). When adding tests for existing source functions, import the real function instead.

**Location:**
- No shared fixture directory — create `tests/fixtures/` if test data sharing becomes needed

## Coverage

**Requirements:** No minimum threshold enforced

**Provider:** v8

**Included:**
- `src/**/*.{ts,tsx}` (all source files)

**Excluded from coverage:**
- `src/**/*.d.ts` — type declarations
- `src/**/*.test.{ts,tsx}` — test files themselves
- `src/app/api/**` — API routes (covered by E2E instead)

**View Coverage:**
```bash
npm run test:coverage
# Output: text (terminal), json (coverage/coverage-summary.json), html (coverage/index.html)
```

## Test Types

**Unit Tests (`tests/unit/`):**
- Pure function testing — scoring algorithms, utility functions, config validation
- No database, no network, no React rendering
- All framework dependencies mocked globally in `tests/setup.ts`
- Currently: 4 test files, ~50 test cases

**Integration Tests:**
- Not present as a separate category — `vitest.config.ts` includes `src/**/*.test.*` which could support co-located integration tests

**E2E Tests (`e2e/`):**
- Full browser automation via Playwright
- Tests authenticated flows — login via "Manager Demo" button in `beforeEach`
- API routes are covered here, not in unit tests (per vitest coverage exclusion)
- Currently: 2 spec files (`login.spec.ts`, `dashboard.spec.ts`)

## Common Patterns

**Async Testing:**
```typescript
it("should delay function execution", async () => {
  // Use real timers with await new Promise(r => setTimeout(r, delay))
  await new Promise((r) => setTimeout(r, 100));
  expect(callCount).toBe(1);
});
```

**Error Testing:**
- Not established yet — no test cases cover error paths
- For error testing, use `expect(() => fn()).toThrow()` or `await expect(promise).rejects.toThrow()`

**E2E Authentication Setup:**
```typescript
// Standard beforeEach for authenticated E2E tests
test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Manager Demo/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
});
```

**E2E Element Selection:**
```typescript
// Prefer role-based selectors
page.getByRole("button", { name: /Manager Demo/i })
page.getByRole("heading", { name: /Command Center/i })
page.getByRole("link", { name: /Targets/i })

// data-testid as fallback (sparse — only one usage in dashboard.spec.ts)
page.locator('[data-testid="customer-card"]')

// Text content
page.getByText(/Revenue MTD/i)
```

## Gaps and Conventions to Follow

**When adding new unit tests:**
- Place in `tests/unit/{module-name}.test.ts`
- Import real functions from source — do not redefine inline
- Use `describe("FunctionName")` > `it("should ...")` nesting
- Global mocks from `tests/setup.ts` apply automatically

**When adding new E2E tests:**
- Place in `e2e/{feature}.spec.ts`
- Use `test.describe` (not `describe`) and `test` (not `it`)
- Always log in via `beforeEach` with the Manager Demo button
- Prefer `getByRole` selectors; add `data-testid` attributes to components when needed

**Missing coverage areas:**
- No tests for React components (hooks, rendering, interactions)
- No tests for API route handlers directly
- No tests for Zod schema validation edge cases
- No tests for AI service adapter logic

---

*Testing analysis: 2026-03-21*
