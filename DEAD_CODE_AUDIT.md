# Dead Code & Bloat Audit Report

**Date:** 2026-03-04
**Codebase:** guardian-intel (~88K lines TypeScript/TSX)

---

## Executive Summary

This audit identified significant dead code across the codebase:

| Category | Count | Est. Removable Lines |
|----------|-------|---------------------|
| Unused exports (functions, types, components) | **258** | ~3,000+ |
| Unused npm dependencies | **18** | N/A (bundle size) |
| Completely unused files (never imported) | **10** | ~2,000+ |
| Orphaned API routes (no frontend consumer) | **13** | ~1,500+ |
| Duplicate/overlapping definitions | **3 areas** | ~200+ |

---

## 1. Unused npm Dependencies (18 packages)

### Production Dependencies (15 packages)

These packages are in `dependencies` but are never imported anywhere in source code:

| Package | Reason |
|---------|--------|
| `@google/generative-ai` | Never imported — AI uses custom adapters instead |
| `@radix-ui/react-accordion` | Never imported |
| `@radix-ui/react-avatar` | Never imported |
| `@radix-ui/react-collapsible` | Never imported |
| `@radix-ui/react-dialog` | Never imported |
| `@radix-ui/react-dropdown-menu` | Never imported |
| `@radix-ui/react-hover-card` | Never imported |
| `@radix-ui/react-label` | Never imported |
| `@radix-ui/react-popover` | Never imported |
| `@radix-ui/react-scroll-area` | Never imported |
| `@radix-ui/react-select` | Never imported |
| `@radix-ui/react-separator` | Never imported |
| `@radix-ui/react-tabs` | Never imported |
| `@react-google-maps/api` | Never imported — app uses Leaflet for maps |
| `zustand` | Never imported — app uses React Query + Context instead |

> **Note:** 11 of the 15 unused Radix packages are likely shadcn/ui scaffolding that was installed but never used to generate components. Only `react-progress`, `react-slot`, and `react-tooltip` are actually used.

### Dev Dependencies (3 packages)

| Package | Reason |
|---------|--------|
| `@testing-library/react` | Never imported (only `jest-dom/vitest` is used in test setup) |
| `@testing-library/user-event` | Never imported |
| `@types/uuid` | No corresponding `uuid` package exists in dependencies |

---

## 2. Completely Unused Files (10 files)

These files are never imported by any other file in the codebase:

| File | Description |
|------|-------------|
| `src/components/realtime-indicator.tsx` | SSE connection status indicator — never rendered |
| `src/components/ui/optimized-image.tsx` | Image optimization wrapper — never used |
| `src/components/ui/ai-textarea.tsx` | AI-enhanced textarea — never integrated |
| `src/components/maps/storm-heatmap.tsx` | Storm heatmap — app uses `weather-radar-map.tsx` instead |
| `src/components/customer/customer-playbooks-tab.tsx` | Customer playbooks tab — never mounted |
| `src/components/customer/prep-deck-button.tsx` | Prep deck button — never rendered |
| `src/components/push-notification-prompt.tsx` | Push notification opt-in — never rendered |
| `src/components/charts/trend-chart.tsx` | Trend chart — never imported by any page |
| `src/components/charts/pipeline-chart.tsx` | Pipeline chart — never imported by any page |
| `src/lib/utils/batch-operations.ts` | Batch operation utilities — never imported |

---

## 3. Orphaned API Routes (13 routes, no frontend consumer)

These API routes exist but have zero client-side fetch calls:

| Route | Notes |
|-------|-------|
| `/api/admin/cache` | Admin cache management |
| `/api/admin/activity` | Admin activity log |
| `/api/crm/sync` | CRM sync trigger |
| `/api/canvassing/stats` | Canvassing statistics |
| `/api/canvassing/push-leads` | Push leads to SalesRabbit |
| `/api/canvassing/routes` | Route management |
| `/api/canvassing/sync` | Canvassing sync |
| `/api/weather/daily-brief` | Daily weather briefing |
| `/api/weather/check-address` | Weather check for address |
| `/api/weather/storm-reports` | Storm reports |
| `/api/weather/opportunities` | Weather-based opportunities |
| `/api/analytics/aggregate` | Analytics aggregation |
| `/api/decks/schedule/bulk` | Bulk deck scheduling |

> **Note:** The entire **canvassing subsystem** (4 routes + `src/lib/services/canvassing/`) is backend-only with no UI. Webhook routes (`/api/webhooks/leap`, `/api/webhooks/salesrabbit`) and cron routes are excluded — they're expected to be called externally.

---

## 4. Unused Exports by Category (258 total)

### 4a. Unused Hooks (96 exports across 20 hook files)

The hooks in `src/lib/hooks/` export many symbols that are never imported. Major offenders:

| Hook File | Unused Exports |
|-----------|---------------|
| `use-proposals.ts` | 12 unused: `useProposals`, `useProposal`, `useCreateProposal`, `useUpdateProposal`, `useDeleteProposal`, `useCustomerProposals`, `useProposalPreview`, `CreateProposalRequest`, `UpdateProposalRequest`, `ProposalDetail`, `ProposalListItem`, `ProposalQueryParams` |
| `use-outreach.ts` | 8 unused: `useTemplates`, `useCreateTemplate`, `useDeleteCampaign`, `useTriggerStormOutreach`, `outreachKeys`, `CampaignExecution`, `ExecuteCampaignInput`, `OutreachTemplate`, `UpdateCampaignInput` |
| `use-deck-generation.ts` | 7 unused: `useScheduleDeck`, `useDeckStatus`, `useCancelDeck`, `deckQueryKeys`, `DeckJob`, `DeckStatusResponse`, `ScheduleDeckRequest`, `ScheduleDeckResponse` |
| `use-contracts.ts` | 5 unused: `useContracts`, `useContractStats`, `useCancelContract`, `contractKeys`, `SignContractInput` |
| `use-realtime.ts` | 5 unused: `useStormAlerts`, `useSSEStormAlerts`, `useCustomerUpdates`, `useCustomerIntelUpdates`, `RealtimeEvent` |
| `use-competitors.ts` | 6 unused: `useUpdateCompetitor`, `CompetitorDetail`, `CompetitorListItem`, `CompetitorActivityItem`, `CreateCompetitorRequest`, `LogActivityRequest` |
| `use-customers.ts` | 5 unused: `useUpdateCustomer`, `useDeleteCustomer`, `useInfiniteCustomers`, `usePrefetchCustomer`, `customerKeys` |
| `use-dashboard.ts` | 5 unused: `DashboardData`, `DashboardMetrics`, `DashboardAlert`, `DashboardCustomer`, `DashboardIntelItem`, `DashboardWeatherEvent` |
| `use-photos.ts` | 5 unused: `useCustomerPhotos`, `photoKeys`, `PhotoFilters`, `UpdatePhotoInput`, `UploadPhotoInput` |
| `use-carriers.ts` | 4 unused: `useCarriers`, `useDirectFilingCarriers`, `useSyncAllClaims`, `carrierKeys` |
| `use-claims.ts` | 4 unused: `useUpdateClaimStatus`, `claimKeys`, `ClaimFilters`, `UpdateClaimInput` |
| `use-damage-analysis.ts` | 3 unused: `useQuickAnalysis`, `AnalysisSummary`, `AnalyzePhotoInput` |
| `use-mobile.ts` | 4 unused: `useMediaQuery`, `useBreakpoint`, `useIsTouchDevice`, `useOrientation` |
| `use-playbooks.ts` | 6 unused: `usePlaybookAI`, `usePrefetchPlaybook`, `playbookKeys`, `PlaybookAIAction`, `PlaybookAIRequest`, `PlaybookAIResponse` |
| `use-debounce.ts` | 2 unused: `useDebouncedCallback`, `useDebouncedSearch` |
| `use-predictions.ts` | 2 unused: `predictionKeys`, `PredictionFilters` |
| `use-keyboard-shortcuts.ts` | 2 unused: `APP_SHORTCUTS`, `formatShortcut` |
| `use-ai-analysis.ts` | 3 unused: `TextAnalysisResult`, `UseAIAnalysisOptions`, `UseAIAnalysisReturn` |
| `use-analytics.ts` | 1 unused: `useTrends` |
| `use-timeline.ts` | 1 unused: `timelineKeys` |

### 4b. Unused Service Exports (48 exports)

| Service File | Unused Exports |
|-------------|---------------|
| `services/property/street-view.ts` | 9 unused: `getStreetViewImageUrl`, `getStreetViewImageUrlByCoords`, `getStreetViewEmbedUrl`, `getMultiAngleStreetView`, `checkStreetViewAvailability`, `getCachedStreetViewData`, `invalidateStreetViewCache`, `StreetViewOptions`, `StreetViewResult`, `CachedStreetViewData` |
| `services/weather/storm-intel-service.ts` | 4 unused: `StormIntelService`, `StormOpportunity`, `DailyStormBrief`, `CustomerWeatherImpact` |
| `services/weather/noaa-service.ts` | 1 unused: `NOAAWeatherService` |
| `services/weather/predictive-storm-service.ts` | 1 unused: `PredictiveAlertSummary` |
| `services/weather/index.ts` | 2 unused: `weatherService`, `WeatherLookupResult` |
| `services/property/index.ts` | 4 unused: `propertyService`, `PropertyDetails`, `PropertyLookupOptions`, `PropertySearchFilters` |
| `services/competitors/analytics.ts` | 4 unused: `calculateActivityTrends`, `calculateCompetitorRankings`, `calculateTerritoryBreakdown`, `getRecentActivity` |
| `services/competitors/types.ts` | 4 unused: `CompetitorData`, `CreateActivityRequest`, `MentionSource`, `MentionType` |
| `services/contracts/index.ts` | 3 unused: `DEFAULT_CONTRACT_TEMPLATE`, `DEFAULT_TERMS`, `SignatureData` |
| `services/carriers/types.ts` | 5 unused: `AdjusterInfo`, `CarrierWebhookEvent`, `ClaimPhoto`, `ClaimTimelineEvent`, `DocumentType` |
| `services/outreach/types.ts` | 4 unused: `CampaignConfig`, `CampaignStatus`, `EmailAttachment`, `OutreachChannel` |
| `services/crm/types.ts` | 1 unused: `CrmConfig` |
| `services/notifications/index.ts` | 2 unused: `sendPushNotification`, `buildStormAlertPayload` |
| `services/playbooks/variables.ts` | 2 unused: `VariableDefinition`, `hasVariables` |
| `services/audit/index.ts` | 3 unused: `AuditLogEntry`, `AuditLogFilter`, `getClientInfo` |
| `services/geocoding/index.ts` | 1 unused: `GeocodingResult` |
| `services/ai/damage-analyzer.ts` | 1 unused: `AnalyzePhotoOptions` |
| `services/ai/types.ts` | 2 unused: `MessageRole`, `ToolParameter` |

### 4c. Unused Validation Schemas (40 exports in `src/lib/validations.ts`)

Nearly the entire validations file is unused. 40 exported schemas and types are never imported:

`addressLookupSchema`, `aiTaskSchema`, `causeOfLossSchema`, `claimStatusSchema`, `claimTypeSchema`, `coordinatesSchema`, `createInteractionSchema`, `customerStageSchema`, `customerStatusSchema`, `damageAreaSchema`, `emailSchema`, `interactionOutcomeSchema`, `interactionTypeSchema`, `loginSchema`, `messageRoleSchema`, `messageSchema`, `paginationSchema`, `phoneSchema`, `playbookCategorySchema`, `playbookStepSchema`, `playbookTypeSchema`, `playbookUsageContextSchema`, `playbookUsageOutcomeSchema`, `propertyTypeSchema`, `registerSchema`, `roleplayPersonaSchema`, `roofTypeSchema`, `stateSchema`, `weatherAlertQuerySchema`, `validateInput`, `AddressLookupInput`, `BulkDeleteCustomersInput`, `ClaimCreateInput`, `ClaimUpdateInput`, `CreateInteractionInput`, `DamageAnalysisInput`, `LoginInput`, `PlaybookRatingInput`, `RegisterInput`, `RoleplayRequestInput`

### 4d. Unused Component Exports (22 exports)

| Component File | Unused Exports |
|---------------|---------------|
| `error-boundary.tsx` | 4 unused: `AsyncErrorBoundary`, `RecoverableErrorBoundary`, `WidgetErrorBoundary`, `errorLogger`, `ErrorLogPayload` |
| `gamification/animated-counter.tsx` | 4 unused: `AnimatedCurrency`, `AnimatedScore`, `StreakCounter`, `XPCounter` |
| `gamification/celebration-modal.tsx` | 2 unused: `DealClosedCelebration`, `InlineCelebration` |
| `gamification/confetti.tsx` | 1 unused: `ConfettiBurst` |
| `dashboard/ready-decks-widget.tsx` | 1 unused: `ReadyDecksBadge` |
| `modals/lazy-modals.tsx` | 1 unused: `LazyPlaybookModal` |
| `customers/types.ts` | 1 unused: `getCustomerUrgency` |

### 4e. Unused Utility/Lib Exports (52 exports)

| File | Unused Exports |
|------|---------------|
| `lib/validations.ts` | 40 exports (see section 4c) |
| `lib/auth.ts` | 3 unused: `hashPassword`, `verifyPassword`, `validateDemoToken` |
| `lib/utils.ts` | 3 unused: `formatNumber`, `formatPercentage`, `getPriorityClass` |
| `lib/env.ts` | 6 unused: `hasAICapability`, `hasGoogleMaps`, `hasLeapIntegration`, `hasRedisCache`, `isDevelopment`, `isProduction` |
| `lib/cache.ts` | 2 unused: `invalidateDashboardCache`, `CacheStatsResult` |
| `lib/rate-limit.ts` | 2 unused: `RATE_LIMITS`, `getRateLimitHeaders` |
| `lib/supabase.ts` | 3 unused: `getSupabaseClient`, `subscribeToTable`, `RealtimePayload` |
| `lib/data/customers.ts` | 4 unused: `getCustomerStats`, `getStormAffectedCustomers`, `CustomerWithRelations`, `PaginatedResult` |
| `lib/terrain/constants.ts` | 2 unused: `GUARDIAN_STATES`, `STORM_TYPE_LABELS` |
| `lib/terrain/types.ts` | 2 unused: `BriefType`, `DataPoint`, `DataSourceType` |
| `lib/gamification/types.ts` | 3 unused: `AchievementCategory`, `LEVEL_THRESHOLDS`, `getAchievementProgress` |
| `lib/utils/batch-operations.ts` | 6 unused: `chunkArray`, `createBatchAccumulator`, `createRateLimiter`, `processBatched`, `processParallel`, `retryWithBackoff` |

---

## 5. Duplicate / Overlapping Definitions

### 5a. `WeatherAlert` defined 3 times independently

- `src/lib/services/weather/noaa-service.ts` (line 18)
- `src/lib/services/weather/index.ts` (line 19)
- `src/components/modals/storm-details/types.ts` (line 35)

Each has slightly different fields. Should be consolidated to a single source of truth.

### 5b. Dead `weather/index.ts` barrel service

`src/lib/services/weather/index.ts` defines a complete weather service that is never imported outside its directory. All consumers import directly from `noaa-service.ts`, `storm-intel-service.ts`, or `predictive-storm-service.ts`.

### 5c. Dev-only page in production

`src/app/design-options/page.tsx` — A design theme picker page that appears to be a development artifact. Not linked from any navigation.

---

## 6. Recommendations

### Quick Wins (safe to do now)
1. **Remove 18 unused npm packages** — reduces install time and bundle size
2. **Remove 10 completely unused files** — they are never imported anywhere
3. **Remove `src/app/design-options/`** — dev artifact

### Medium Effort
4. **Audit and trim hook files** — 96 unused hook exports suggest over-engineering; many hooks were written but never consumed
5. **Clean up `src/lib/validations.ts`** — 40 of its exports are unused; keep only what's actively validated
6. **Consolidate `WeatherAlert` type** to a single definition
7. **Remove dead `weather/index.ts`** barrel service

### Requires Product Decision
8. **Canvassing subsystem** — 4 API routes + service with no UI. Build the page or remove the backend.
9. **13 orphaned API routes** — Decide which features to complete vs. remove
10. **Gamification components** — Multiple unused celebration/counter components suggest an unfinished feature
