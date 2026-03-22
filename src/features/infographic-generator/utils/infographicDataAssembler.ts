/**
 * Infographic Data Assembler
 *
 * First stage of the infographic content pipeline. Gathers and transforms
 * raw customer data into structured objects that the prompt composer can
 * inject into model-specific prompts.
 *
 * Re-exports existing deck-generator data functions and adds 4 derived
 * metrics specific to infographic content:
 * - cumulativeStormExposure: weighted storm event total
 * - daysSinceLastContact: days since last interaction
 * - neighborhoodConversionRate: zip-level close rate from canvassing pins
 * - insuranceDeadlineCountdown: days until insurance filing deadline
 */

import type { TopicModule } from "../types/infographic.types";
import {
  getCustomerTitleData,
  getCustomerOverviewStats,
  getPropertyIntelData,
  getStormHistoryTimeline,
} from "@/features/deck-generator/utils/dataAggregator";

// Re-export deck-generator functions for infographic module use
export {
  getCustomerTitleData,
  getCustomerOverviewStats,
  getPropertyIntelData,
  getStormHistoryTimeline,
};

// =============================================================================
// CONSTANTS
// =============================================================================

/** Severity-to-weight mapping for storm exposure scoring */
const SEVERITY_WEIGHTS: Record<string, number> = {
  minor: 1,
  moderate: 2,
  severe: 3,
  catastrophic: 5,
};

/** Milliseconds per day */
const MS_PER_DAY = 86400000;

/** State-specific insurance filing windows in days */
const STATE_FILING_WINDOWS: Record<string, number> = {
  PA: 365,
};

/** Default filing window for states without specific rules */
const DEFAULT_FILING_WINDOW = 730;

/** Active claim statuses that count toward deadline calculation */
const ACTIVE_CLAIM_STATUSES = ["pending", "approved"];

// =============================================================================
// DERIVED METRICS
// =============================================================================

/**
 * Calculate cumulative storm exposure for a customer.
 * Returns the sum of severity-weighted storm events.
 * Higher values indicate more storm exposure over time.
 *
 * @param customerId - The customer ID to look up
 * @returns Weighted storm exposure score, or 0 on error
 */
export async function cumulativeStormExposure(customerId: string): Promise<number> {
  try {
    const response = await fetch(`/api/customers/${customerId}`);
    if (!response.ok) throw new Error("Failed to fetch customer");
    const data = await response.json();
    const weatherEvents = data.customer?.weatherEvents || [];

    return weatherEvents.reduce(
      (total: number, event: { severity: string }) =>
        total + (SEVERITY_WEIGHTS[event.severity] || 1),
      0,
    );
  } catch {
    console.error("[InfographicDataAssembler] cumulativeStormExposure error for", customerId);
    return 0;
  }
}

/**
 * Calculate days since last customer interaction.
 * Sorts interactions by date descending and computes elapsed days.
 *
 * @param customerId - The customer ID to look up
 * @returns Integer days since last contact, or -1 if no interactions
 */
export async function daysSinceLastContact(customerId: string): Promise<number> {
  try {
    const response = await fetch(`/api/customers/${customerId}`);
    if (!response.ok) throw new Error("Failed to fetch customer");
    const data = await response.json();
    const interactions = data.customer?.interactions || [];

    if (interactions.length === 0) return -1;

    // Sort by createdAt descending to find most recent
    const sorted = [...interactions].sort(
      (a: { createdAt: string }, b: { createdAt: string }) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const mostRecent = new Date(sorted[0].createdAt).getTime();
    return Math.floor((Date.now() - mostRecent) / MS_PER_DAY);
  } catch {
    console.error("[InfographicDataAssembler] daysSinceLastContact error for", customerId);
    return -1;
  }
}

/**
 * Calculate neighborhood conversion rate from canvassing pin data.
 * Looks up all pins in the same zip code and computes the close rate.
 *
 * @param customerId - The customer ID to look up
 * @returns Percentage (0-100) of closed-won pins, or 0 if no pins/error
 */
export async function neighborhoodConversionRate(customerId: string): Promise<number> {
  try {
    // First fetch customer to get their zip code
    const customerResponse = await fetch(`/api/customers/${customerId}`);
    if (!customerResponse.ok) throw new Error("Failed to fetch customer");
    const customerData = await customerResponse.json();
    const zipCode = customerData.customer?.zipCode;

    if (!zipCode) return 0;

    // Fetch canvassing pins in the same zip
    const pinsResponse = await fetch(`/api/canvassing/pins?zipCode=${zipCode}`);
    if (!pinsResponse.ok) throw new Error("Failed to fetch canvassing pins");
    const pinsData = await pinsResponse.json();
    const pins = pinsData.pins || [];

    if (pins.length === 0) return 0;

    const won = pins.filter(
      (pin: { outcome: string }) => pin.outcome === "closed-won",
    ).length;

    return Math.round((won / pins.length) * 100);
  } catch {
    console.error("[InfographicDataAssembler] neighborhoodConversionRate error for", customerId);
    return 0;
  }
}

/**
 * Calculate days until insurance filing deadline.
 * Uses state-specific filing windows (PA = 1 year, default = 2 years from date of loss).
 * Returns the minimum days remaining across all active claims.
 *
 * @param customerId - The customer ID to look up
 * @returns Minimum days until deadline, or -1 if no active claims
 */
export async function insuranceDeadlineCountdown(customerId: string): Promise<number> {
  try {
    const response = await fetch(`/api/customers/${customerId}`);
    if (!response.ok) throw new Error("Failed to fetch customer");
    const data = await response.json();
    const customer = data.customer;
    const claims = customer?.claims || [];
    const state = customer?.state || "";

    // Filter to active claims only
    const activeClaims = claims.filter(
      (claim: { status: string }) => ACTIVE_CLAIM_STATUSES.includes(claim.status),
    );

    if (activeClaims.length === 0) return -1;

    const filingWindow = STATE_FILING_WINDOWS[state] || DEFAULT_FILING_WINDOW;
    const now = Date.now();

    const daysRemaining = activeClaims.map((claim: { dateOfLoss: string }) => {
      const lossDate = new Date(claim.dateOfLoss).getTime();
      const deadline = lossDate + filingWindow * MS_PER_DAY;
      return Math.floor((deadline - now) / MS_PER_DAY);
    });

    return Math.min(...daysRemaining);
  } catch {
    console.error("[InfographicDataAssembler] insuranceDeadlineCountdown error for", customerId);
    return -1;
  }
}

// =============================================================================
// DATA SOURCE MAP
// =============================================================================

/**
 * Maps dataSource string names (from TopicModule.dataSource) to their
 * corresponding assembler functions. Used by assembleDataForModules to
 * dynamically dispatch data fetching.
 */
const DATA_SOURCE_MAP: Record<string, (customerId: string) => Promise<unknown>> = {
  getCustomerTitleData,
  getCustomerOverviewStats,
  getPropertyIntelData,
  getStormHistoryTimeline,
  cumulativeStormExposure,
  daysSinceLastContact,
  neighborhoodConversionRate,
  insuranceDeadlineCountdown,
};

// =============================================================================
// MODULE ASSEMBLY ORCHESTRATOR
// =============================================================================

/**
 * Assemble data for a set of topic modules in parallel.
 * Maps each module's dataSource to the corresponding function, calls all
 * concurrently via Promise.allSettled, and returns results keyed by module ID.
 *
 * Unknown data sources produce an error entry rather than throwing.
 *
 * @param customerId - The customer ID to fetch data for
 * @param modules - Array of TopicModule definitions with dataSource strings
 * @returns Record keyed by module.id with resolved data or error objects
 */
export async function assembleDataForModules(
  customerId: string,
  modules: TopicModule[],
): Promise<Record<string, unknown>> {
  const promises = modules.map(async (module) => {
    const fn = DATA_SOURCE_MAP[module.dataSource];
    if (!fn) {
      return {
        id: module.id,
        result: { error: `Unknown data source: ${module.dataSource}` },
      };
    }

    const result = await fn(customerId);
    return { id: module.id, result };
  });

  const settled = await Promise.allSettled(promises);

  const output: Record<string, unknown> = {};
  for (const entry of settled) {
    if (entry.status === "fulfilled") {
      output[entry.value.id] = entry.value.result;
    } else {
      // This shouldn't happen since individual functions catch their own errors,
      // but handle it defensively
      output["unknown"] = { error: entry.reason?.message || "Unknown error" };
    }
  }

  return output;
}
