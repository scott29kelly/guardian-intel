/**
 * Customer Leave-Behind Preset
 *
 * Professional customer-facing handout with property assessment, storm history,
 * and company credentials. Uses the light brand theme automatically via
 * getBrandingForInfographic().
 *
 * The `customer-facing` audience value causes Model Intelligence to select
 * NB Pro or an NB2-to-NB Pro chain for maximum visual fidelity. The template
 * itself does NOT reference any model — model selection is fully autonomous.
 *
 * Audience: customer-facing
 * Usage Moment: Leave-Behind
 */

import type { InfographicPreset, TopicModuleConfig } from "../types/infographic.types";
import { AVAILABLE_MODULES } from "../services/intentParser";
import { getBrandingForInfographic } from "../utils/brandingAssets";

/**
 * Looks up a TopicModule by ID from the shared AVAILABLE_MODULES registry.
 * Throws at startup if the module ID is missing — indicates a schema drift.
 */
function findModule(id: string) {
  const mod = AVAILABLE_MODULES.find((m) => m.id === id);
  if (!mod) {
    throw new Error(`[Customer Leave-Behind] Module "${id}" not found in AVAILABLE_MODULES`);
  }
  return mod;
}

/** Light brand theme for customer-facing output — resolved at module load time. */
const _brandConfig = getBrandingForInfographic("customer-facing");

export const customerLeaveBehindPreset: InfographicPreset = {
  id: "customer-leave-behind",
  name: "Customer Leave-Behind",
  description:
    "Professional customer-facing handout with property assessment, storm history, and company credentials. Light brand theme applied automatically.",
  audience: "customer-facing",
  usageMoment: "Leave-Behind",
  icon: "FileOutput",
  modules: [
    { module: findModule("property-overview"), enabled: true, required: true },
    { module: findModule("storm-timeline"), enabled: true, required: false },
    { module: findModule("insurance-status"), enabled: true, required: false },
    { module: findModule("next-steps"), enabled: true, required: false },
    { module: findModule("company-credentials"), enabled: true, required: true },
    { module: findModule("contact-info"), enabled: true, required: true },
  ] satisfies TopicModuleConfig[],
};
