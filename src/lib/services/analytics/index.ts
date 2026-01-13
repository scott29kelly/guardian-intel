/**
 * Analytics Service
 *
 * Re-exports analytics-related functionality.
 */

export {
  runDailyAggregation,
  aggregateForDate,
  backfillMetrics,
  type AggregationResult,
  type DailyMetricsData,
} from "./daily-aggregation";
