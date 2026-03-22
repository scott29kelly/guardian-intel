/**
 * Prep My Day Batch Preset
 *
 * Batch preset for morning preparation workflow. Provides a broad candidate pool
 * of modules; in batch mode, the orchestrator (Phase 4) will customize module
 * selection per customer based on their pipeline stage and recent activity signals.
 *
 * All modules are enabled but none are required -- the batch system auto-selects
 * per customer via Model Intelligence scoring. This preset provides the candidate
 * pool, not a fixed layout.
 *
 * Audience: internal (rep-facing)
 * Usage Moment: Batch
 */

import type { InfographicPreset, TopicModuleConfig } from "../types/infographic.types";
import { AVAILABLE_MODULES } from "../services/intentParser";

/**
 * Looks up a TopicModule by ID from the shared AVAILABLE_MODULES registry.
 * Throws at startup if the module ID is missing -- indicates a schema drift.
 */
function findModule(id: string) {
  const mod = AVAILABLE_MODULES.find((m) => m.id === id);
  if (!mod) {
    throw new Error(`[Prep My Day] Module "${id}" not found in AVAILABLE_MODULES`);
  }
  return mod;
}

export const prepMyDayPreset: InfographicPreset = {
  id: "prep-my-day",
  name: "Prep My Day",
  description:
    "Batch preset for morning preparation. Auto-selects modules per customer based on pipeline stage and recent signals. Each customer scored independently by Model Intelligence.",
  audience: "internal",
  usageMoment: "Batch",
  icon: "Calendar",
  modules: [
    { module: findModule("property-overview"), enabled: true, required: false },
    { module: findModule("storm-timeline"), enabled: true, required: false },
    { module: findModule("lead-scoring"), enabled: true, required: false },
    { module: findModule("interaction-history"), enabled: true, required: false },
    { module: findModule("insurance-status"), enabled: true, required: false },
    { module: findModule("next-steps"), enabled: true, required: false },
  ] satisfies TopicModuleConfig[],
};
