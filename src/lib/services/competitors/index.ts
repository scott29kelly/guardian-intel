/**
 * Competitor Intelligence Service
 * 
 * Track and analyze competitor activity to gain market insights.
 * 
 * Features:
 * - Competitor database management
 * - Activity logging (sightings, quotes, wins/losses)
 * - Analytics and trend analysis
 * - Territory breakdown
 * - Win/loss analysis
 * 
 * Usage:
 *   import { getCompetitorAnalytics } from "@/lib/services/competitors";
 *   const analytics = await getCompetitorAnalytics({ startDate: "2026-01-01" });
 */

export { getCompetitorAnalytics } from "./analytics";
export * from "./types";
