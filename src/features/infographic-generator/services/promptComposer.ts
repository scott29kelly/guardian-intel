/**
 * Prompt Composer Service
 *
 * Generates NotebookLM instructions for infographic generation.
 * Builds audience-aware branding + module data sections into a single
 * instruction string consumed by the NotebookLM pipeline.
 */

import type { BrandingConfig } from "@/features/deck-generator/types/deck.types";
import type {
  TopicModule,
  InfographicAudience,
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
export function buildModuleDataSection(
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
// NotebookLM Instructions
// -----------------------------------------------------------------------------

/**
 * Composes a complete instruction string for NotebookLM infographic generation.
 * Combines branding, module data, and layout requirements into a single prompt.
 */
export function composeNotebookLMInstructions(
  modules: TopicModule[],
  data: Record<string, unknown>,
  audience: InfographicAudience,
): string {
  const branding = getBrandingForInfographic(audience);
  const brandingText = buildBrandingInstructions(branding, audience);
  const moduleData = buildModuleDataSection(modules, data);

  return `Generate a single-page infographic briefing for a roofing sales representative.

BRANDING:
${brandingText}

DATA TO VISUALIZE:
${moduleData}

LAYOUT REQUIREMENTS:
- Single cohesive infographic image
- ${modules.length} data sections arranged in a clear visual hierarchy
- Use icons and visual indicators for key metrics
- All text must be readable at mobile viewing size
- Professional finish suitable for ${audience === "customer-facing" ? "sharing with homeowners" : "internal team use"}`;
}
