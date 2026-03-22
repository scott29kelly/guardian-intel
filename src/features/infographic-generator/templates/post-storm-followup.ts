/**
 * Post-Storm Follow-up Preset
 *
 * Storm response briefing with live weather, damage timeline, and insurance
 * filing deadlines. Includes web-search-grounded live weather data.
 *
 * Audience: internal (rep-facing)
 * Usage Moment: Post-Storm
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
    throw new Error(`[Post-Storm Follow-up] Module "${id}" not found in AVAILABLE_MODULES`);
  }
  return mod;
}

export const postStormFollowupPreset: InfographicPreset = {
  id: "post-storm-followup",
  name: "Post-Storm Follow-up",
  description:
    "Storm response briefing with live weather, damage timeline, and insurance filing deadlines.",
  audience: "internal",
  usageMoment: "Post-Storm",
  icon: "CloudLightning",
  modules: [
    { module: findModule("storm-timeline"), enabled: true, required: true },
    { module: findModule("live-weather"), enabled: true, required: false },
    { module: findModule("neighborhood-context"), enabled: true, required: false },
    { module: findModule("insurance-status"), enabled: true, required: false },
    { module: findModule("next-steps"), enabled: true, required: false },
  ] satisfies TopicModuleConfig[],
};
