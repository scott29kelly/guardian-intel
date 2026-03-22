/**
 * Competitive Edge Preset
 *
 * Competitive positioning analysis with market landscape and differentiation
 * points for internal meeting preparation.
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
    throw new Error(`[Competitive Edge] Module "${id}" not found in AVAILABLE_MODULES`);
  }
  return mod;
}

export const competitiveEdgePreset: InfographicPreset = {
  id: "competitive-edge",
  name: "Competitive Edge",
  description:
    "Competitive positioning analysis with market landscape and differentiation points.",
  audience: "internal",
  usageMoment: "Meeting Prep",
  icon: "Swords",
  modules: [
    { module: findModule("competitor-landscape"), enabled: true, required: true },
    { module: findModule("lead-scoring"), enabled: true, required: false },
    { module: findModule("property-overview"), enabled: true, required: false },
    { module: findModule("neighborhood-context"), enabled: true, required: false },
    { module: findModule("next-steps"), enabled: true, required: false },
  ] satisfies TopicModuleConfig[],
};
