/**
 * Infographic Template Index
 *
 * Barrel exports for all infographic presets and helper functions for
 * querying presets by ID, usage moment, or batch eligibility.
 *
 * Downstream consumers (hooks, generator service, UI) access presets
 * through these helpers rather than importing individual template files.
 */

import type { InfographicPreset, UsageMoment } from "../types/infographic.types";
import { preKnockBriefingPreset } from "./pre-knock-briefing";
import { postStormFollowupPreset } from "./post-storm-followup";
import { insuranceMeetingPrepPreset } from "./insurance-meeting-prep";
import { competitiveEdgePreset } from "./competitive-edge";
import { customerLeaveBehindPreset } from "./customer-leave-behind";
import { prepMyDayPreset } from "./prep-my-day";

// -----------------------------------------------------------------------------
// All Presets
// -----------------------------------------------------------------------------

/** Complete set of infographic presets (5 standard + 1 batch). */
export const infographicPresets: InfographicPreset[] = [
  // Field presets
  preKnockBriefingPreset,
  postStormFollowupPreset,

  // Meeting prep presets
  insuranceMeetingPrepPreset,
  competitiveEdgePreset,

  // Customer-facing presets
  customerLeaveBehindPreset,

  // Batch presets
  prepMyDayPreset,
];

// -----------------------------------------------------------------------------
// Re-exports
// -----------------------------------------------------------------------------

export {
  preKnockBriefingPreset,
  postStormFollowupPreset,
  insuranceMeetingPrepPreset,
  competitiveEdgePreset,
  customerLeaveBehindPreset,
  prepMyDayPreset,
};

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Finds a preset by its unique ID.
 *
 * @param id - Preset identifier (e.g., "pre-knock-briefing", "prep-my-day")
 * @returns The matching preset, or undefined if not found
 */
export function getPresetById(id: string): InfographicPreset | undefined {
  return infographicPresets.find((p) => p.id === id);
}

/**
 * Filters presets by their usage moment.
 *
 * @param moment - Usage moment to filter by (e.g., "Meeting Prep", "Parking Lot")
 * @returns Array of presets matching the given usage moment
 */
export function getPresetsByMoment(moment: UsageMoment): InfographicPreset[] {
  return infographicPresets.filter((p) => p.usageMoment === moment);
}

/**
 * Returns presets suitable for batch generation.
 * Currently returns presets with usageMoment === 'Batch'.
 *
 * @returns Array of batch-eligible presets
 */
export function getPresetsForBatch(): InfographicPreset[] {
  return infographicPresets.filter((p) => p.usageMoment === "Batch");
}
