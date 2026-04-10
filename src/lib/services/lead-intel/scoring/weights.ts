/**
 * Signal weights, half-lives, and source reliability — Phase 1 defaults.
 *
 * These are starting values picked by the planner per LG-04. Future
 * calibration (Phase 3 of the lead-gen roadmap — "Learned Weighting")
 * will overwrite these from PropertyOutcomeEvent history.
 */

export const FORMULA_VERSION = "lead-intel-v1";

/** Signal-type -> { baseWeight, halfLifeDays } */
export const SIGNAL_WEIGHTS: Record<
  string,
  { baseWeight: number; halfLifeDays: number }
> = {
  "roof-age": { baseWeight: 30, halfLifeDays: 365 * 5 }, // long-lived; ages slowly
  "storm-exposure": { baseWeight: 25, halfLifeDays: 365 }, // decays over a year
  "canvassing-recency": { baseWeight: 10, halfLifeDays: 90 }, // warm lead half-life 3mo
  "crm-contact-recency": { baseWeight: 8, halfLifeDays: 120 }, // contact signal 4mo
  "neighbor-win": { baseWeight: 20, halfLifeDays: 365 }, // social-proof signal 1yr
};

/** Source-type -> reliabilityWeight (0.0-1.0) */
export const RELIABILITY_WEIGHTS: Record<string, number> = {
  customer: 0.9,         // CRM data — high trust
  "weather-event": 0.95, // NOAA/hail-trace — high trust
  "canvassing-pin": 0.85, // rep field observation — very high but subject to typo
  interaction: 0.8,       // CRM activity log
  "property-data": 0.7,   // third-party scraped data
  permit: 0.95,           // government source
  "real-estate-listing": 0.6,
  manual: 0.5,
};

export function getSignalConfig(signalType: string): { baseWeight: number; halfLifeDays: number } {
  return SIGNAL_WEIGHTS[signalType] ?? { baseWeight: 1, halfLifeDays: 365 };
}

export function getReliability(sourceType: string): number {
  return RELIABILITY_WEIGHTS[sourceType] ?? 0.5;
}
