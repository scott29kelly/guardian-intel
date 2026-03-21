# Coding Conventions

**Analysis Date:** 2026-03-21

## Naming Patterns

**Files:**
- React components: PascalCase TSX (`CustomerIntelCard.tsx`, `DeckPreview.tsx`)
- Next.js pages and layouts: lowercase (`page.tsx`, `layout.tsx`)
- API routes: lowercase (`route.ts`)
- Hooks: kebab-case prefixed with `use-` (`use-customers.ts`, `use-dashboard.ts`)
- Services: kebab-case directory with `index.ts` (`scoring/index.ts`, `ai/index.ts`)
- Utility files: kebab-case (`rate-limit.ts`, `auth-secret.ts`)
- Validation schemas: kebab-case at lib root (`validations.ts`)

**Functions:**
- camelCase for all functions (`getCustomers`, `formatCurrency`, `calculateCustomerScores`)
- Async API functions: verb-noun pattern (`fetchCustomers`, `createCustomer`, `bulkUpdateCustomers`)
- Boolean helpers: `is`/`has`/`can` prefix not enforced — use descriptive names
- Event handlers inline in components — no enforced naming prefix

**Variables:**
- camelCase throughout
- Constants: ALL_CAPS_SNAKE_CASE for module-level constants (`REGIONAL_PROFIT_PER_SQFT`, `ROOF_TYPE_MULTIPLIERS`, `CURRENCY_CACHE_SIZE`)
- React Query key factories: camelCase objects with methods (`customerKeys.all`, `customerKeys.list(filters)`)

**Types and Interfaces:**
- PascalCase for all (`Customer`, `AIConfig`, `PaginatedResult<T>`)
- Interfaces over types for object shapes (`interface Customer`, `interface AIConfig`)
- `type` keyword for unions and computed types (`type AIProvider`, `type AITask`, `type MessageRole`)
- Export type aliases for Zod inferences: `export type CreateCustomerInput = z.infer<typeof createCustomerSchema>`
- Suffixes: `Input` for request data, `Response` for API responses, `Result` for return values

## Code Style

**Formatting:**
- No Prettier config present — formatting is not enforced by tooling
- Double quotes for strings (consistent across codebase)
- 2-space indentation
- Trailing commas in multi-line objects and arrays

**Linting:**
- ESLint via `next/core-web-vitals` and `next/typescript` (`.eslintrc.json`)
- Notably permissive: `@typescript-eslint/no-explicit-any: off`, `no-unused-vars: off`, `prefer-const: off`
- `react-hooks/exhaustive-deps: off` — dependency arrays not enforced
- This means type safety and hook correctness rely on developer discipline, not tooling

**TypeScript:**
- `strict: true` in `tsconfig.json` but `noImplicitAny: false` — partially strict
- `allowJs: true` — JavaScript files allowed
- `skipLibCheck: true` — library type errors suppressed

## Import Organization

**Order (observed, not enforced):**
1. React and framework imports (`react`, `next/navigation`, `next-auth/react`)
2. Third-party libraries (`framer-motion`, `lucide-react`, `@tanstack/react-query`)
3. Internal path alias imports (`@/components/...`, `@/lib/...`, `@/features/...`)

**Path Aliases:**
- `@/*` maps to `./src/*` — use `@/lib/utils`, `@/components/ui/button`, etc.
- Never use relative paths with `../` — always use `@/` alias

**Barrel Files:**
- Hooks barrel: `src/lib/hooks/index.ts` — `export * from "./use-customers"` pattern
- Services: export from individual `index.ts` per service directory
- UI components are NOT barrel-exported — import directly from file

## Error Handling

**API Routes:**
- All route handlers wrapped in `try/catch`
- Validation errors return `{ success: false, error: string, details: string }` at 400
- Server errors return `{ success: false, error: string }` at 500
- Success responses return `{ success: true, ...data }`
- Log prefix pattern: `[API] METHOD /api/resource error:` or `[ServiceName] Error:`

```typescript
export async function GET(request: Request) {
  try {
    const validation = schema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "Invalid query parameters", details: formatZodErrors(validation.error) },
        { status: 400 }
      );
    }
    const result = await getData(validation.data);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[API] GET /api/resource error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch data" },
      { status: 500 }
    );
  }
}
```

**Client Hooks (React Query):**
- API fetch functions throw `new Error(error.error || "Fallback message")` on non-ok responses
- React Query surfaces these as `error` state — components handle display

**Validation:**
- Use Zod schemas from `src/lib/validations.ts` — do not define schemas inline in routes
- Always use `.safeParse()` (not `.parse()`) to avoid thrown exceptions in handlers
- Use `formatZodErrors(validation.error)` from `src/lib/validations.ts` for error formatting

## Logging

**Framework:** `console.error`, `console.warn`, `console.log` — no structured logging library

**Patterns:**
- API errors: `console.error("[API] POST /api/resource error:", error)`
- Service-level errors: `console.error("[ServiceName] Description:", error)`
- Temporary/debug logs use bracketed prefixes: `[Composite]`, `[Nano Banana Pro]`
- No logging on the client side in hooks or components — errors surface via React Query

## Comments

**File-Level JSDoc:**
- Every file starts with a JSDoc block describing the module, endpoints, or purpose
```typescript
/**
 * Customer Data Access Layer
 *
 * Provides type-safe database operations for customers.
 */
```

**Section Dividers:**
- Used in large files to separate logical sections:
```typescript
// =============================================================================
// CUSTOMER SCHEMAS
// =============================================================================
```

**Inline Comments:**
- Used for non-obvious logic (`// Older roof = higher urgency`)
- Security notes in API routes (`// Security: Rate limited, Input validated`)
- Avoid restating what the code does — comment the "why"

**Function-Level JSDoc:**
- Used on exported functions in data/service layers
```typescript
/**
 * Get paginated customers with optional filtering
 */
export async function getCustomers(query: CustomerQueryInput): Promise<PaginatedResult<any>> {
```

## Function Design

**Size:** No enforced limit — some service functions exceed 100 lines (scoring logic). Page components can exceed 500+ lines.

**Parameters:**
- Prefer single typed object parameter for functions with 3+ args
- Use TypeScript types/interfaces for all parameters — avoid `any` except where ESLint is disabled

**Return Values:**
- Async functions return `Promise<TypedResult>` — always type the return
- API route handlers always return `NextResponse.json(...)` — never throw out of handlers

## Module Design

**Exports:**
- Named exports only — no default exports except Next.js pages/layouts/configs (where required)
- React components use named exports: `export { Button }` at end of file
- Or inline: `export function MyComponent()`

**Barrel Files:**
- `src/lib/hooks/index.ts` aggregates all hooks via `export *`
- `src/lib/data/index.ts` aggregates data access functions
- `src/lib/services/index.ts` aggregates service exports
- Feature directories (`src/features/deck-generator/`) have their own internal exports

## React/Next.js Patterns

**Client vs Server:**
- All dashboard pages and interactive components require `"use client"` at top of file
- API routes are always server-side — never add `"use client"` to `route.ts` files
- Shared UI components use `"use client"` when they have state or event handlers

**Component Variants:**
- Use `class-variance-authority` (`cva`) for component variants — see `src/components/ui/button.tsx`
- Combine with `cn()` from `src/lib/utils` for className merging

**Data Fetching:**
- All client-side data fetching via React Query hooks in `src/lib/hooks/`
- Query key factories use hierarchical arrays: `["customers", "list", filters]`
- Server-side: direct Prisma calls in data access layer (`src/lib/data/`)

---

*Convention analysis: 2026-03-21*
