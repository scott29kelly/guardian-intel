/**
 * Prompt Composer Service
 *
 * Generates model-specific prompt templates for infographic generation.
 * Supports three model scenarios:
 * - NB2 (Gemini Flash): Web search grounding + cost efficiency
 * - NB Pro (Gemini Pro): Visual fidelity + complex composition
 * - Chain (NB2 -> NB Pro): Accuracy step then refinement step
 *
 * All prompts include audience-aware branding instructions (colors, fonts, logo, footer).
 */

import type { BrandingConfig } from "@/features/deck-generator/types/deck.types";
import type {
  TopicModule,
  ModelCapabilities,
  InfographicAudience,
  ScoringResult,
} from "../types/infographic.types";
import { getBrandingForInfographic } from "../utils/brandingAssets";

// -----------------------------------------------------------------------------
// Branding Instructions
// -----------------------------------------------------------------------------

/**
 * Builds a prompt section with audience-specific branding instructions.
 * Internal: data-dense dark theme. Customer-facing: clean professional light theme.
 */
export function buildBrandingInstructions(
  branding: BrandingConfig,
  audience: InfographicAudience,
): string {
  const colorPalette = `Color Palette:
- Primary: ${branding.colors.primary}
- Secondary: ${branding.colors.secondary}
- Accent: ${branding.colors.accent}
- Background: ${branding.colors.background}
- Text: ${branding.colors.text}`;

  const fontInstructions =
    "Typography: Use clean sans-serif typography (Inter family). Clear hierarchy between headings and body text.";

  const logoPlacement =
    audience === "customer-facing"
      ? "Logo: Place company logo centered at top of the infographic."
      : "Logo: Place company logo in top-left corner of the infographic.";

  const footer = `Footer: Include "${branding.footer}" at the bottom of the infographic.`;

  const audienceStyle =
    audience === "customer-facing"
      ? "Style: Professional, clean layout suitable for sharing with homeowners. White background, navy text. Emphasize trust and professionalism."
      : "Style: Data-dense dark theme layout. Navy background with gold/teal accents. Optimize for information density and quick scanning.";

  return [colorPalette, fontInstructions, logoPlacement, footer, audienceStyle].join("\n\n");
}

// -----------------------------------------------------------------------------
// Module Data Section
// -----------------------------------------------------------------------------

/**
 * Formats module data into a structured prompt section.
 * Each module gets a labeled section with its data and visual element description.
 */
function buildModuleDataSection(
  modules: TopicModule[],
  data: Record<string, unknown>,
): string {
  return modules
    .map((module) => {
      const moduleData = data[module.id];
      const dataStr = moduleData
        ? JSON.stringify(moduleData, null, 2)
        : "No data available";
      return `## ${module.label}\n${dataStr}\nVisual element: ${module.visualElement}`;
    })
    .join("\n\n");
}

// -----------------------------------------------------------------------------
// NB2 Prompt (Web Search Grounding)
// -----------------------------------------------------------------------------

/**
 * Composes a prompt optimized for NB2 (Gemini Flash) with web search grounding.
 * Includes search_types instructions when modules require web search.
 */
function composeNB2Prompt(
  modules: TopicModule[],
  data: Record<string, unknown>,
  branding: BrandingConfig,
  audience: InfographicAudience,
): string {
  const brandingInstructions = buildBrandingInstructions(branding, audience);
  const moduleDataSection = buildModuleDataSection(modules, data);
  const webSearchModules = modules.filter((m) => m.requiresWebSearch);

  const webSearchInstructions =
    webSearchModules.length > 0
      ? `\nWEB SEARCH: Use search_types ["web", "image"] to ground the following modules with live data: ${webSearchModules.map((m) => m.label).join(", ")}`
      : "";

  return `Generate a single-page infographic briefing for a roofing sales representative.

BRANDING:
${brandingInstructions}

DATA TO VISUALIZE:
${moduleDataSection}

LAYOUT REQUIREMENTS:
- Single cohesive infographic image, portrait orientation (1024x1792 or similar)
- ${modules.length} data sections arranged in a clear visual hierarchy
- Use icons and visual indicators for key metrics
- All text must be readable at mobile viewing size
${webSearchInstructions}`;
}

// -----------------------------------------------------------------------------
// NB Pro Prompt (Visual Fidelity)
// -----------------------------------------------------------------------------

/**
 * Composes a prompt optimized for NB Pro (Gemini Pro) emphasizing visual composition.
 * No search_types instructions -- NB Pro cannot perform web search.
 */
function composeNBProPrompt(
  modules: TopicModule[],
  data: Record<string, unknown>,
  branding: BrandingConfig,
  audience: InfographicAudience,
): string {
  const brandingInstructions = buildBrandingInstructions(branding, audience);
  const moduleDataSection = buildModuleDataSection(modules, data);

  return `Generate a single-page infographic briefing for a roofing sales representative.

COMPOSITION PRIORITY: Create a visually striking, magazine-quality layout with meticulous attention to design.

BRANDING:
${brandingInstructions}

DATA TO VISUALIZE:
${moduleDataSection}

LAYOUT REQUIREMENTS:
- Single cohesive infographic image, portrait orientation (1024x1792 or similar)
- ${modules.length} data sections arranged in a clear visual hierarchy
- Use advanced typography hierarchy with clear section delineation
- Emphasize visual polish and professional design over raw data density
- Use icons, illustrations, and visual metaphors for key metrics
- All text must be crisp and readable with generous whitespace
- Magazine-quality finish suitable for professional presentation`;
}

// -----------------------------------------------------------------------------
// Chain Prompts (NB2 accuracy + NB Pro refinement)
// -----------------------------------------------------------------------------

/**
 * Composes two prompts for chain mode: accuracy step (NB2) and refinement step (NB Pro).
 * The accuracy prompt focuses on data correctness with web grounding.
 * The refinement prompt takes the NB2 output and polishes it to publication quality.
 */
export function composeChainPrompts(params: {
  modules: TopicModule[];
  data: Record<string, unknown>;
  audience: InfographicAudience;
  scoringResult: ScoringResult;
}): { accuracyPrompt: string; refinementPrompt: string } {
  const { modules, data, audience } = params;
  const branding = getBrandingForInfographic(audience);
  const moduleDataSection = buildModuleDataSection(modules, data);
  const webSearchModules = modules.filter((m) => m.requiresWebSearch);

  const webSearchInstructions =
    webSearchModules.length > 0
      ? `\nWEB SEARCH: Use search_types ["web", "image"] to ground the following modules with live data: ${webSearchModules.map((m) => m.label).join(", ")}`
      : "";

  const accuracyPrompt = `Generate a single-page infographic briefing for a roofing sales representative.

Focus on accurate data representation. Layout clarity is secondary -- the output will be refined.

DATA TO VISUALIZE:
${moduleDataSection}

LAYOUT REQUIREMENTS:
- Single cohesive infographic image, portrait orientation (1024x1792 or similar)
- ${modules.length} data sections with accurate data rendering
- Prioritize data correctness and completeness over visual polish
- All text must be legible
${webSearchInstructions}`;

  const brandingInstructions = buildBrandingInstructions(branding, audience);

  const refinementPrompt = `Refine the attached reference image into a polished, publication-quality infographic.

Maintain all data accuracy from the reference. Improve: typography, spacing, visual hierarchy, color consistency, professional finish.

BRANDING:
${brandingInstructions}

REFINEMENT REQUIREMENTS:
- Preserve all data values and text content exactly from the reference image
- Apply professional typography hierarchy with consistent font sizing
- Ensure color consistency with the branding palette above
- Add visual polish: shadows, gradients, rounded corners, icon refinement
- Improve whitespace and section spacing for readability
- Magazine-quality finish suitable for professional presentation`;

  return { accuracyPrompt, refinementPrompt };
}

// -----------------------------------------------------------------------------
// Main Entry Point
// -----------------------------------------------------------------------------

/**
 * Composes a model-appropriate prompt based on the scoring result.
 * Dispatches to NB2, NB Pro, or chain prompt templates based on model selection.
 */
export function composePrompt(params: {
  data: Record<string, unknown>;
  modules: TopicModule[];
  audience: InfographicAudience;
  scoringResult: ScoringResult;
}): string {
  const { data, modules, audience, scoringResult } = params;
  const branding = getBrandingForInfographic(audience);

  // Chain mode: return the first step (accuracy) prompt
  if (scoringResult.selectedChain) {
    const { accuracyPrompt } = composeChainPrompts({
      modules,
      data,
      audience,
      scoringResult,
    });
    return accuracyPrompt;
  }

  // NB2: web search grounding model
  if (scoringResult.selectedModel?.webSearchGrounding === true) {
    return composeNB2Prompt(modules, data, branding, audience);
  }

  // NB Pro: visual fidelity model (chainable as finisher)
  if (scoringResult.selectedModel?.chainable === "finisher") {
    return composeNBProPrompt(modules, data, branding, audience);
  }

  // Fallback: use NB2 prompt template
  return composeNB2Prompt(modules, data, branding, audience);
}
