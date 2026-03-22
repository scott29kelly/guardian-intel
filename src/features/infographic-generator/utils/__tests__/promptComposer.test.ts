/**
 * Tests for Prompt Composer Service
 *
 * Validates prompt generation for NB2 (web search), NB Pro (visual fidelity),
 * and chain (accuracy + refinement) strategies. Checks branding interpolation,
 * module data inclusion, and model-specific template differences.
 */

import { describe, it, expect, vi } from "vitest";
import type {
  TopicModule,
  ScoringResult,
  InfographicAudience,
  ModelCapabilities,
  ModelChainStrategy,
} from "../../types/infographic.types";

// Mock brandingAssets to avoid importing deck-generator types at runtime
vi.mock("../../utils/brandingAssets", () => ({
  getBrandingForInfographic: (audience: string) => {
    if (audience === "customer-facing") {
      return {
        colors: {
          primary: "#1E3A5F",
          secondary: "#D4A656",
          accent: "#4A90A4",
          background: "#FFFFFF",
          backgroundAlt: "#F8FAFC",
          text: "#1E3A5F",
          textMuted: "#64748B",
          success: "#10B981",
          warning: "#F59E0B",
          danger: "#EF4444",
        },
        fonts: {
          heading: "Inter",
          body: "Inter",
          mono: "JetBrains Mono",
        },
        logo: "/tradepulse-logo.svg",
        logoAlt: "/tradepulse-logo-light.svg",
        footer: "Guardian Roofing & Siding | Protecting What Matters Most",
        borderRadius: "8px",
      };
    }
    return {
      colors: {
        primary: "#1E3A5F",
        secondary: "#D4A656",
        accent: "#4A90A4",
        background: "#0F1419",
        backgroundAlt: "#1A2332",
        text: "#FFFFFF",
        textMuted: "#9CA3AF",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      fonts: {
        heading: "Inter",
        body: "Inter",
        mono: "JetBrains Mono",
      },
      logo: "/tradepulse-logo.svg",
      logoAlt: "/tradepulse-logo-light.svg",
      footer: "Guardian Intel | Confidential \u2014 Internal Use Only",
      borderRadius: "8px",
    };
  },
}));

// Import AFTER mocks
import {
  composePrompt,
  composeChainPrompts,
  buildBrandingInstructions,
} from "../../services/promptComposer";

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function makeModule(overrides: Partial<TopicModule> = {}): TopicModule {
  return {
    id: "test-module",
    label: "Test Module",
    dataSource: "testSource",
    requiresWebSearch: false,
    visualElement: "gauge",
    ...overrides,
  };
}

const NB2_MODEL: ModelCapabilities = {
  id: "gemini-3.1-flash-image-preview" as any,
  costPerImage1K: 0.067,
  maxResolution: "1K",
  webSearchGrounding: true,
  maxReferenceImages: 14,
  fidelityScore: 7,
  textRenderingScore: 7,
  complexCompositionScore: 6,
  chainable: "source",
};

const NB_PRO_MODEL: ModelCapabilities = {
  id: "gemini-3-pro-image" as any,
  costPerImage1K: 0.27,
  maxResolution: "4K",
  webSearchGrounding: false,
  maxReferenceImages: 10,
  fidelityScore: 9,
  textRenderingScore: 9,
  complexCompositionScore: 9,
  chainable: "finisher",
};

const CHAIN_A: ModelChainStrategy = {
  id: "chain-a-web-grounded-quality",
  name: "Web-Grounded Quality",
  trigger: "test",
  steps: [
    {
      model: "gemini-3.1-flash-image-preview" as any,
      role: "generate",
      resolution: "1K",
      searchEnabled: true,
    },
    {
      model: "gemini-3-pro-image" as any,
      role: "refine",
      resolution: "2K",
      searchEnabled: false,
    },
  ],
};

function nb2ScoringResult(): ScoringResult {
  return {
    selectedModel: NB2_MODEL,
    scores: { audience: 0.5, complexity: 0.3, webSearch: 1.0 },
    reasoning: "NB2 selected",
  };
}

function nbProScoringResult(): ScoringResult {
  return {
    selectedModel: NB_PRO_MODEL,
    scores: { audience: 1.0, complexity: 0.3, webSearch: 0.0 },
    reasoning: "NB Pro selected",
  };
}

function chainScoringResult(): ScoringResult {
  return {
    selectedChain: CHAIN_A,
    scores: { audience: 1.0, complexity: 0.6, webSearch: 1.0 },
    reasoning: "Chain A selected",
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("promptComposer", () => {
  // -------------------------------------------------------------------------
  // buildBrandingInstructions
  // -------------------------------------------------------------------------
  describe("buildBrandingInstructions", () => {
    it("includes brand colors in output", () => {
      const branding = {
        colors: {
          primary: "#1E3A5F",
          secondary: "#D4A656",
          accent: "#4A90A4",
          background: "#0F1419",
          text: "#FFFFFF",
        },
        fonts: { heading: "Inter", body: "Inter", mono: "JetBrains Mono" },
        logo: "/logo.svg",
        footer: "Test Footer",
        borderRadius: "8px",
      } as any;

      const result = buildBrandingInstructions(branding, "internal");
      expect(result).toContain("#1E3A5F");
      expect(result).toContain("#D4A656");
      expect(result).toContain("#4A90A4");
    });

    it("internal audience uses data-dense dark theme style", () => {
      const branding = {
        colors: {
          primary: "#1E3A5F",
          secondary: "#D4A656",
          accent: "#4A90A4",
          background: "#0F1419",
          text: "#FFFFFF",
        },
        fonts: { heading: "Inter", body: "Inter", mono: "JetBrains Mono" },
        logo: "/logo.svg",
        footer: "Internal Footer",
        borderRadius: "8px",
      } as any;

      const result = buildBrandingInstructions(branding, "internal");
      expect(result).toContain("Data-dense dark theme");
    });

    it("customer-facing audience uses professional clean layout style", () => {
      const branding = {
        colors: {
          primary: "#1E3A5F",
          secondary: "#D4A656",
          accent: "#4A90A4",
          background: "#FFFFFF",
          text: "#1E3A5F",
        },
        fonts: { heading: "Inter", body: "Inter", mono: "JetBrains Mono" },
        logo: "/logo.svg",
        footer: "Customer Footer",
        borderRadius: "8px",
      } as any;

      const result = buildBrandingInstructions(branding, "customer-facing");
      expect(result).toContain("Professional, clean layout");
    });

    it("customer-facing logo placement is centered", () => {
      const branding = {
        colors: {
          primary: "#1E3A5F",
          secondary: "#D4A656",
          accent: "#4A90A4",
          background: "#FFFFFF",
          text: "#1E3A5F",
        },
        fonts: { heading: "Inter", body: "Inter", mono: "JetBrains Mono" },
        logo: "/logo.svg",
        footer: "Footer",
        borderRadius: "8px",
      } as any;

      const result = buildBrandingInstructions(branding, "customer-facing");
      expect(result).toContain("centered at top");
    });

    it("internal logo placement is top-left", () => {
      const branding = {
        colors: {
          primary: "#1E3A5F",
          secondary: "#D4A656",
          accent: "#4A90A4",
          background: "#0F1419",
          text: "#FFFFFF",
        },
        fonts: { heading: "Inter", body: "Inter", mono: "JetBrains Mono" },
        logo: "/logo.svg",
        footer: "Footer",
        borderRadius: "8px",
      } as any;

      const result = buildBrandingInstructions(branding, "internal");
      expect(result).toContain("top-left");
    });

    it("includes footer text from branding config", () => {
      const branding = {
        colors: {
          primary: "#1E3A5F",
          secondary: "#D4A656",
          accent: "#4A90A4",
          background: "#0F1419",
          text: "#FFFFFF",
        },
        fonts: { heading: "Inter", body: "Inter", mono: "JetBrains Mono" },
        logo: "/logo.svg",
        footer: "Custom Footer Text Here",
        borderRadius: "8px",
      } as any;

      const result = buildBrandingInstructions(branding, "internal");
      expect(result).toContain("Custom Footer Text Here");
    });
  });

  // -------------------------------------------------------------------------
  // NB2 prompts
  // -------------------------------------------------------------------------
  describe("NB2 prompts", () => {
    it("includes web search instructions when modules require it", () => {
      const modules = [
        makeModule({ id: "weather", label: "Live Weather", requiresWebSearch: true }),
        makeModule({ id: "overview", label: "Property Overview", requiresWebSearch: false }),
      ];

      const prompt = composePrompt({
        data: { weather: { temp: 72 }, overview: { sqft: 2400 } },
        modules,
        audience: "internal",
        scoringResult: nb2ScoringResult(),
      });

      expect(prompt).toContain("search_types");
      expect(prompt).toContain("Live Weather");
    });

    it("does not include web search when no modules require it", () => {
      const modules = [makeModule({ id: "overview", requiresWebSearch: false })];

      const prompt = composePrompt({
        data: { overview: { sqft: 2400 } },
        modules,
        audience: "internal",
        scoringResult: nb2ScoringResult(),
      });

      // The NB2 prompt template only adds WEB SEARCH section when modules need it
      expect(prompt).not.toContain("search_types");
    });

    it("includes layout requirements with module count", () => {
      const modules = [
        makeModule({ id: "m1" }),
        makeModule({ id: "m2" }),
        makeModule({ id: "m3" }),
      ];

      const prompt = composePrompt({
        data: {},
        modules,
        audience: "internal",
        scoringResult: nb2ScoringResult(),
      });

      expect(prompt).toContain("3 data sections");
    });
  });

  // -------------------------------------------------------------------------
  // NB Pro prompts
  // -------------------------------------------------------------------------
  describe("NB Pro prompts", () => {
    it("includes composition emphasis", () => {
      const modules = [makeModule({ id: "m1" })];

      const prompt = composePrompt({
        data: {},
        modules,
        audience: "customer-facing",
        scoringResult: nbProScoringResult(),
      });

      expect(prompt).toContain("COMPOSITION PRIORITY");
      expect(prompt).toContain("magazine-quality");
    });

    it("does not include web search instructions", () => {
      const modules = [makeModule({ id: "m1" })];

      const prompt = composePrompt({
        data: {},
        modules,
        audience: "customer-facing",
        scoringResult: nbProScoringResult(),
      });

      expect(prompt).not.toContain("search_types");
    });
  });

  // -------------------------------------------------------------------------
  // Chain prompts
  // -------------------------------------------------------------------------
  describe("chain prompts", () => {
    it("composeChainPrompts returns accuracy and refinement prompts", () => {
      const modules = [
        makeModule({ id: "weather", label: "Live Weather", requiresWebSearch: true }),
      ];

      const { accuracyPrompt, refinementPrompt } = composeChainPrompts({
        modules,
        data: { weather: { temp: 72 } },
        audience: "customer-facing",
        scoringResult: chainScoringResult(),
      });

      expect(accuracyPrompt).toContain("accurate data representation");
      expect(refinementPrompt).toContain("Refine the attached reference image");
    });

    it("accuracy prompt includes web search instructions for web modules", () => {
      const modules = [
        makeModule({ id: "weather", label: "Live Weather", requiresWebSearch: true }),
      ];

      const { accuracyPrompt } = composeChainPrompts({
        modules,
        data: {},
        audience: "customer-facing",
        scoringResult: chainScoringResult(),
      });

      expect(accuracyPrompt).toContain("search_types");
      expect(accuracyPrompt).toContain("Live Weather");
    });

    it("refinement prompt includes branding instructions", () => {
      const modules = [makeModule({ id: "m1" })];

      const { refinementPrompt } = composeChainPrompts({
        modules,
        data: {},
        audience: "customer-facing",
        scoringResult: chainScoringResult(),
      });

      expect(refinementPrompt).toContain("BRANDING");
      expect(refinementPrompt).toContain("#1E3A5F");
    });

    it("composePrompt returns accuracy prompt when chain is selected", () => {
      const modules = [
        makeModule({ id: "weather", requiresWebSearch: true }),
      ];

      const prompt = composePrompt({
        data: {},
        modules,
        audience: "customer-facing",
        scoringResult: chainScoringResult(),
      });

      // Should return the accuracy prompt (first step)
      expect(prompt).toContain("accurate data representation");
    });
  });

  // -------------------------------------------------------------------------
  // Prompt content — data interpolation
  // -------------------------------------------------------------------------
  describe("prompt content", () => {
    it("includes module labels in the prompt", () => {
      const modules = [
        makeModule({ id: "storm", label: "Storm History" }),
        makeModule({ id: "insurance", label: "Insurance Status" }),
      ];

      const prompt = composePrompt({
        data: { storm: { count: 5 }, insurance: { status: "pending" } },
        modules,
        audience: "internal",
        scoringResult: nb2ScoringResult(),
      });

      expect(prompt).toContain("Storm History");
      expect(prompt).toContain("Insurance Status");
    });

    it("includes module data as JSON in the prompt", () => {
      const modules = [makeModule({ id: "lead", label: "Lead Score" })];

      const prompt = composePrompt({
        data: { lead: { score: 85, trend: "up" } },
        modules,
        audience: "internal",
        scoringResult: nb2ScoringResult(),
      });

      expect(prompt).toContain('"score": 85');
      expect(prompt).toContain('"trend": "up"');
    });

    it("handles missing data gracefully", () => {
      const modules = [makeModule({ id: "missing", label: "Missing Data" })];

      const prompt = composePrompt({
        data: {},
        modules,
        audience: "internal",
        scoringResult: nb2ScoringResult(),
      });

      expect(prompt).toContain("No data available");
    });

    it("includes visual element description for each module", () => {
      const modules = [
        makeModule({
          id: "gauge-mod",
          label: "Test Gauge",
          visualElement: "radar chart with overlay",
        }),
      ];

      const prompt = composePrompt({
        data: { "gauge-mod": 42 },
        modules,
        audience: "internal",
        scoringResult: nb2ScoringResult(),
      });

      expect(prompt).toContain("radar chart with overlay");
    });
  });

  // -------------------------------------------------------------------------
  // Branding in prompts
  // -------------------------------------------------------------------------
  describe("branding in prompts", () => {
    it("NB2 prompt includes brand colors", () => {
      const modules = [makeModule({ id: "m1" })];

      const prompt = composePrompt({
        data: {},
        modules,
        audience: "internal",
        scoringResult: nb2ScoringResult(),
      });

      expect(prompt).toContain("#1E3A5F"); // Navy
      expect(prompt).toContain("#D4A656"); // Gold
      expect(prompt).toContain("#4A90A4"); // Teal
    });

    it("NB Pro prompt includes brand colors", () => {
      const modules = [makeModule({ id: "m1" })];

      const prompt = composePrompt({
        data: {},
        modules,
        audience: "customer-facing",
        scoringResult: nbProScoringResult(),
      });

      expect(prompt).toContain("#1E3A5F");
    });

    it("internal prompt includes internal footer", () => {
      const modules = [makeModule({ id: "m1" })];

      const prompt = composePrompt({
        data: {},
        modules,
        audience: "internal",
        scoringResult: nb2ScoringResult(),
      });

      expect(prompt).toContain("Internal Use Only");
    });

    it("customer-facing prompt includes customer footer", () => {
      const modules = [makeModule({ id: "m1" })];

      const prompt = composePrompt({
        data: {},
        modules,
        audience: "customer-facing",
        scoringResult: nbProScoringResult(),
      });

      expect(prompt).toContain("Protecting What Matters Most");
    });
  });
});
