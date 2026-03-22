/**
 * Pre-Knock Briefing Preset
 *
 * Quick 60-second prep before knocking on a door. Composes property intel,
 * storm history, and talking points into a single-glance internal briefing.
 *
 * Audience: internal (rep-facing)
 * Usage Moment: Parking Lot
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
    throw new Error(`[Pre-Knock Briefing] Module "${id}" not found in AVAILABLE_MODULES`);
  }
  return mod;
}

export const preKnockBriefingPreset: InfographicPreset = {
  id: "pre-knock-briefing",
  name: "Pre-Knock Briefing",
  description:
    "Quick 60-second prep before knocking on a door. Property intel, storm history, and talking points at a glance.",
  audience: "internal",
  usageMoment: "Parking Lot",
  icon: "DoorOpen",
  modules: [
    { module: findModule("property-overview"), enabled: true, required: true },
    { module: findModule("roof-assessment"), enabled: true, required: false },
    { module: findModule("storm-timeline"), enabled: true, required: false },
    { module: findModule("lead-scoring"), enabled: true, required: false },
    { module: findModule("interaction-history"), enabled: true, required: false },
    { module: findModule("next-steps"), enabled: true, required: false },
  ] satisfies TopicModuleConfig[],
};
