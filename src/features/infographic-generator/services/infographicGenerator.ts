/**
 * Infographic Generator Service
 *
 * Central orchestrator for the infographic generation pipeline.
 * Wires all Phase 1-3 components into a single entry point:
 *   resolve modules -> assemble data -> score model -> compose prompt -> generate image
 *
 * Supports three generation modes (preset, custom, conversational) and
 * two execution paths (single model, chain). Emits contextual progress
 * callbacks at each pipeline stage -- no model names are ever exposed.
 *
 * Caching and retry are handled externally (API route layer and AI Router
 * adapter, respectively). This service focuses purely on orchestration.
 */

import type {
  InfographicRequest,
  InfographicResponse,
  GenerationProgress,
  TopicModule,
  InfographicAudience,
  ScoringResult,
} from "../types/infographic.types";
import type {
  AIModel,
  ImageGenerationRequest,
  ImageGenerationResponse,
} from "@/lib/services/ai/types";
import { assembleDataForModules } from "../utils/infographicDataAssembler";
import { scoreRequest } from "./modelIntelligence";
import { composePrompt, composeChainPrompts } from "./promptComposer";
import { parseIntent } from "./intentParser";
import { getPresetById } from "../templates/index";
import { getAIRouter } from "@/lib/services/ai/router";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type ProgressCallback = (progress: GenerationProgress) => void;

// -----------------------------------------------------------------------------
// Module Resolution (Private)
// -----------------------------------------------------------------------------

/**
 * Resolves the set of topic modules and audience based on the request mode.
 * - preset: looks up preset by ID, extracts enabled modules
 * - custom: uses directly provided modules
 * - conversational: parses natural language via AI intent parser
 */
async function resolveModules(
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

// -----------------------------------------------------------------------------
// Single Model Generation (Private)
// -----------------------------------------------------------------------------

/**
 * Executes single-model image generation via the AI Router.
 * Configures web search grounding and resolution based on the scoring result.
 */
async function generateSingle(
  prompt: string,
  scoringResult: ScoringResult,
  _onProgress: ProgressCallback,
): Promise<ImageGenerationResponse> {
  const imageRequest: ImageGenerationRequest = {
    prompt,
  };

  if (scoringResult.selectedModel?.webSearchGrounding) {
    imageRequest.searchTypes = ["web", "image"];
  }

  if (scoringResult.selectedModel?.maxResolution) {
    imageRequest.resolution = scoringResult.selectedModel.maxResolution as "1K" | "2K" | "4K";
  }

  return getAIRouter().generateImage(
    imageRequest,
    scoringResult.selectedModel!.id,
  );
}

// -----------------------------------------------------------------------------
// Chain Generation (Private)
// -----------------------------------------------------------------------------

/**
 * Executes two-step chain generation: accuracy step (NB2) then refinement step (NB Pro).
 * The first step's output becomes the reference image for the second step.
 */
async function generateChain(
  modules: TopicModule[],
  data: Record<string, unknown>,
  audience: InfographicAudience,
  scoringResult: ScoringResult,
  onProgress: ProgressCallback,
): Promise<ImageGenerationResponse> {
  const chain = scoringResult.selectedChain!;
  const { accuracyPrompt, refinementPrompt } = composeChainPrompts({
    modules,
    data,
    audience,
    scoringResult,
  });

  // Step 1: Accuracy generation
  onProgress({
    phase: "generating",
    percent: 40,
    statusMessage: "Generating your briefing...",
  });

  const step1Request: ImageGenerationRequest = {
    prompt: accuracyPrompt,
  };

  if (chain.steps[0].searchEnabled) {
    step1Request.searchTypes = ["web", "image"];
  }

  step1Request.resolution = chain.steps[0].resolution as "1K" | "2K" | "4K";

  const step1Response = await getAIRouter().generateImage(
    step1Request,
    chain.steps[0].model as AIModel,
  );

  // Step 2: Refinement with reference image
  onProgress({
    phase: "refining",
    percent: 70,
    statusMessage: "Polishing final output...",
  });

  const step2Request: ImageGenerationRequest = {
    prompt: refinementPrompt,
    referenceImages: [
      {
        data: step1Response.imageData,
        mimeType: "image/png",
      },
    ],
  };

  step2Request.resolution = chain.steps[1].resolution as "1K" | "2K" | "4K";

  const step2Response = await getAIRouter().generateImage(
    step2Request,
    chain.steps[1].model as AIModel,
  );

  return step2Response;
}

// -----------------------------------------------------------------------------
// Main Entry Point
// -----------------------------------------------------------------------------

/**
 * Generates an infographic by orchestrating the full pipeline:
 * resolve modules -> assemble data -> score model -> compose prompt -> generate image.
 *
 * Supports three modes (preset, custom, conversational) and two execution
 * paths (single model, chain). Emits contextual progress callbacks at each stage.
 *
 * @param request - The infographic generation request
 * @param onProgress - Optional callback for progress updates
 * @returns The generated infographic response
 */
export async function generateInfographic(
  request: InfographicRequest,
  onProgress?: ProgressCallback,
): Promise<InfographicResponse> {
  const progress = onProgress || (() => {});
  const startTime = Date.now();

  try {
    // Step 1: Resolve modules from request mode
    progress({
      phase: "data",
      percent: 5,
      statusMessage: "Assembling customer data...",
    });

    const { modules, audience } = await resolveModules(request);

    // Step 2: Assemble data for resolved modules
    const hasWebSearchModules = modules.some((m) => m.requiresWebSearch);
    progress({
      phase: "data",
      percent: 15,
      statusMessage: hasWebSearchModules
        ? "Pulling live weather conditions..."
        : "Assembling customer data...",
    });

    const data = await assembleDataForModules(request.customerId, modules);

    // Step 3: Score model selection (sync)
    progress({
      phase: "scoring",
      percent: 25,
      statusMessage: "Preparing generation...",
    });

    const scoringResult = scoreRequest(request, modules);

    // Step 4: Compose prompt
    const prompt = composePrompt({ data, modules, audience, scoringResult });

    // Step 5: Generate image (single or chain)
    let generationResult: ImageGenerationResponse;

    if (scoringResult.selectedChain) {
      generationResult = await generateChain(
        modules,
        data,
        audience,
        scoringResult,
        progress,
      );
    } else {
      progress({
        phase: "generating",
        percent: 40,
        statusMessage: "Generating your briefing...",
      });

      generationResult = await generateSingle(prompt, scoringResult, progress);
    }

    // Step 6: Complete
    progress({
      phase: "complete",
      percent: 100,
      statusMessage: "Your briefing is ready!",
    });

    return {
      imageData: generationResult.imageData,
      model: generationResult.model,
      chainUsed: !!scoringResult.selectedChain,
      generationTimeMs: Date.now() - startTime,
      cached: false,
    };
  } catch (error) {
    progress({
      phase: "complete",
      percent: 0,
      statusMessage: "Generation failed",
    });
    throw error;
  }
}
