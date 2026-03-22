/**
 * Insurance Meeting Prep Preset
 *
 * Adjuster meeting preparation with carrier intelligence, claim status,
 * and filing strategy. Includes web-search-grounded carrier intel.
 *
 * Audience: internal (rep-facing)
 * Usage Moment: Meeting Prep
 */

import type { InfographicPreset, TopicModuleConfig } from "../types/infographic.types";
import { AVAILABLE_MODULES } from "../services/intentParser";

/**
 * Looks up a TopicModule by ID from the shared AVAILABLE_MODULES registry.
 * Throws at startup if the module ID is missing — indicates a schema drift.
 */
function findModule(id: string) {
  const mod = AVAILABLE_MODULES.find((m) => m.id === id);
  if (!mod) {
    throw new Error(`[Insurance Meeting Prep] Module "${id}" not found in AVAILABLE_MODULES`);
  }
  return mod;
}

export const insuranceMeetingPrepPreset: InfographicPreset = {
  id: "insurance-meeting-prep",
  name: "Insurance Meeting Prep",
  description:
    "Adjuster meeting preparation with carrier intelligence, claim status, and filing strategy.",
  audience: "internal",
  usageMoment: "Meeting Prep",
  icon: "Shield",
  modules: [
    { module: findModule("insurance-status"), enabled: true, required: true },
    { module: findModule("carrier-intel"), enabled: true, required: true },
    { module: findModule("interaction-history"), enabled: true, required: false },
    { module: findModule("property-overview"), enabled: true, required: false },
    { module: findModule("next-steps"), enabled: true, required: false },
  ] satisfies TopicModuleConfig[],
};
