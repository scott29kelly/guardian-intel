/**
 * Infographic Module Resolution
 *
 * Resolves the set of topic modules and audience from an infographic request.
 * Supports three modes: preset lookup, custom selection, and conversational AI parsing.
 *
 * The actual generation is handled by the NotebookLM pipeline via ScheduledDeck.
 */

import type {
  InfographicRequest,
  TopicModule,
  InfographicAudience,
} from "../types/infographic.types";
import { parseIntent } from "./intentParser";
import { getPresetById } from "../templates/index";

/**
 * Resolves the set of topic modules and audience based on the request mode.
 * - preset: looks up preset by ID, extracts enabled modules
 * - custom: uses directly provided modules
 * - conversational: parses natural language via AI intent parser
 */
export async function resolveModules(
  request: InfographicRequest,
): Promise<{ modules: TopicModule[]; audience: InfographicAudience }> {
  if (request.mode === "preset") {
    const preset = getPresetById(request.presetId!);
    if (!preset) {
      throw new Error(`Preset not found: ${request.presetId}`);
    }
    const modules = preset.modules
      .filter((m) => m.enabled)
      .map((m) => m.module);
    if (modules.length === 0) {
      throw new Error(`Preset "${preset.name}" has no enabled modules`);
    }
    return { modules, audience: preset.audience };
  }

  if (request.mode === "custom") {
    if (!request.selectedModules || request.selectedModules.length === 0) {
      throw new Error("Custom mode requires at least one selected module");
    }
    return {
      modules: request.selectedModules,
      audience: request.audience || "internal",
    };
  }

  if (request.mode === "conversational") {
    if (!request.conversationalPrompt) {
      throw new Error("Conversational mode requires a prompt");
    }
    const result = await parseIntent(request.conversationalPrompt);
    if (result.modules.length === 0) {
      throw new Error("No modules could be resolved from the prompt");
    }
    return { modules: result.modules, audience: result.audience };
  }

  throw new Error(`Unknown generation mode: ${request.mode}`);
}
