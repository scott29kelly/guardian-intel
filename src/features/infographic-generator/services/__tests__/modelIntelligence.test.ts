/**
 * Tests for Model Intelligence Layer
 *
 * Validates scoring dimensions (audience, complexity, web search),
 * model selection (NB2 vs NB Pro), and chain strategy routing.
 */

import { describe, it, expect } from "vitest";
import { scoreRequest, ModelRegistry, getModelIntelligence } from "../modelIntelligence";
import type {
  InfographicRequest,
  TopicModule,
} from "../../types/infographic.types";

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

function makeRequest(
  overrides: Partial<InfographicRequest> = {},
): InfographicRequest {
  return {
    customerId: "cust-1",
    mode: "preset",
    audience: "internal",
    ...overrides,
  };
}

function makeModule(
  overrides: Partial<TopicModule> = {},
): TopicModule {
  return {
    id: "test-module",
    label: "Test Module",
    dataSource: "testSource",
    requiresWebSearch: false,
    visualElement: "gauge",
    ...overrides,
  };
}

function makeModules(count: number, requiresWebSearch = false): TopicModule[] {
  return Array.from({ length: count }, (_, i) =>
    makeModule({
      id: `module-${i}`,
      label: `Module ${i}`,
      requiresWebSearch,
    }),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("modelIntelligence", () => {
  // -------------------------------------------------------------------------
  // ModelRegistry
  // -------------------------------------------------------------------------
  describe("ModelRegistry", () => {
    it("registers and retrieves a model", () => {
      const registry = new ModelRegistry();
      const caps = {
        id: "test-model" as any,
        costPerImage1K: 0.1,
        maxResolution: "1K",
        webSearchGrounding: false,
        maxReferenceImages: 10,
        fidelityScore: 8,
        textRenderingScore: 8,
        complexCompositionScore: 8,
        chainable: "standalone" as const,
      };

      registry.register(caps);
      expect(registry.get("test-model" as any)).toEqual(caps);
    });

    it("returns undefined for unregistered model", () => {
      const registry = new ModelRegistry();
      expect(registry.get("nonexistent" as any)).toBeUndefined();
    });

    it("getAll returns all registered models", () => {
      const registry = new ModelRegistry();
      const caps1 = {
        id: "model-a" as any,
        costPerImage1K: 0.1,
        maxResolution: "1K",
        webSearchGrounding: false,
        maxReferenceImages: 10,
        fidelityScore: 7,
        textRenderingScore: 7,
        complexCompositionScore: 7,
        chainable: "source" as const,
      };
      const caps2 = {
        id: "model-b" as any,
        costPerImage1K: 0.2,
        maxResolution: "2K",
        webSearchGrounding: true,
        maxReferenceImages: 14,
        fidelityScore: 9,
        textRenderingScore: 9,
        complexCompositionScore: 9,
        chainable: "finisher" as const,
      };

      registry.register(caps1);
      registry.register(caps2);
      expect(registry.getAll()).toHaveLength(2);
    });
  });

  // -------------------------------------------------------------------------
  // getModelIntelligence singleton
  // -------------------------------------------------------------------------
  describe("getModelIntelligence", () => {
    it("returns a singleton with pre-registered models", () => {
      const mi = getModelIntelligence();
      const allModels = mi.registry.getAll();
      expect(allModels.length).toBeGreaterThanOrEqual(2);
    });

    it("scoreRequest method delegates to module-level function", () => {
      const mi = getModelIntelligence();
      const request = makeRequest({ audience: "internal" });
      const modules = makeModules(2);
      const result = mi.scoreRequest(request, modules);
      expect(result.scores).toBeDefined();
      expect(result.reasoning).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // scoreRequest — scoring dimensions
  // -------------------------------------------------------------------------
  describe("scoreRequest — scoring dimensions", () => {
    it("internal audience with few modules produces low scores", () => {
      const request = makeRequest({ audience: "internal" });
      const modules = makeModules(2);

      const result = scoreRequest(request, modules);
      expect(result.scores.audience).toBe(0.5);
      expect(result.scores.complexity).toBe(0.3);
      expect(result.scores.webSearch).toBe(0.0);
    });

    it("customer-facing audience produces audience score 1.0", () => {
      const request = makeRequest({ audience: "customer-facing" });
      const modules = makeModules(2);

      const result = scoreRequest(request, modules);
      expect(result.scores.audience).toBe(1.0);
    });

    it("4-6 modules produce medium complexity (0.6)", () => {
      const request = makeRequest({ audience: "internal" });
      const modules = makeModules(5);

      const result = scoreRequest(request, modules);
      expect(result.scores.complexity).toBe(0.6);
    });

    it("7+ modules produce high complexity (1.0)", () => {
      const request = makeRequest({ audience: "internal" });
      const modules = makeModules(8);

      const result = scoreRequest(request, modules);
      expect(result.scores.complexity).toBe(1.0);
    });

    it("modules requiring web search set webSearch to 1.0", () => {
      const request = makeRequest({ audience: "internal" });
      const modules = [
        makeModule({ id: "m1", requiresWebSearch: false }),
        makeModule({ id: "m2", requiresWebSearch: true }),
      ];

      const result = scoreRequest(request, modules);
      expect(result.scores.webSearch).toBe(1.0);
    });

    it("no web search modules set webSearch to 0.0", () => {
      const request = makeRequest({ audience: "internal" });
      const modules = makeModules(3, false);

      const result = scoreRequest(request, modules);
      expect(result.scores.webSearch).toBe(0.0);
    });
  });

  // -------------------------------------------------------------------------
  // scoreRequest — model selection
  // -------------------------------------------------------------------------
  describe("scoreRequest — model selection", () => {
    it("internal + simple request selects NB2 (cost-efficient)", () => {
      const request = makeRequest({ audience: "internal" });
      const modules = makeModules(2);

      const result = scoreRequest(request, modules);
      expect(result.selectedModel).toBeDefined();
      expect(result.selectedModel!.webSearchGrounding).toBe(true); // NB2
      expect(result.selectedChain).toBeUndefined();
    });

    it("customer-facing + no web search selects NB Pro directly", () => {
      const request = makeRequest({ audience: "customer-facing" });
      const modules = makeModules(3, false);

      const result = scoreRequest(request, modules);
      expect(result.selectedModel).toBeDefined();
      expect(result.selectedModel!.chainable).toBe("finisher"); // NB Pro
      expect(result.selectedChain).toBeUndefined();
    });

    it("internal + web search selects NB2 (web grounding)", () => {
      const request = makeRequest({ audience: "internal" });
      const modules = makeModules(2, true);

      const result = scoreRequest(request, modules);
      expect(result.selectedModel).toBeDefined();
      expect(result.selectedModel!.webSearchGrounding).toBe(true); // NB2
    });
  });

  // -------------------------------------------------------------------------
  // scoreRequest — chain strategies
  // -------------------------------------------------------------------------
  describe("scoreRequest — chain strategies", () => {
    it("customer-facing + web search triggers Chain A", () => {
      const request = makeRequest({ audience: "customer-facing" });
      const modules = makeModules(3, true); // requiresWebSearch

      const result = scoreRequest(request, modules);
      expect(result.selectedChain).toBeDefined();
      expect(result.selectedChain!.id).toBe("chain-a-web-grounded-quality");
      expect(result.selectedModel).toBeUndefined();
    });

    it("high complexity + web search triggers Chain A", () => {
      const request = makeRequest({ audience: "internal" });
      const modules = makeModules(8, true);

      const result = scoreRequest(request, modules);
      expect(result.selectedChain).toBeDefined();
      expect(result.selectedChain!.id).toBe("chain-a-web-grounded-quality");
    });

    it("high complexity + no web search triggers Chain B", () => {
      const request = makeRequest({ audience: "internal" });
      const modules = makeModules(8, false);

      const result = scoreRequest(request, modules);
      expect(result.selectedChain).toBeDefined();
      expect(result.selectedChain!.id).toBe("chain-b-complexity-upgrade");
    });

    it("Chain A with >6 modules uses 4K refinement resolution", () => {
      const request = makeRequest({ audience: "customer-facing" });
      const modules = makeModules(7, true);

      const result = scoreRequest(request, modules);
      expect(result.selectedChain).toBeDefined();
      const refineStep = result.selectedChain!.steps.find(
        (s) => s.role === "refine",
      );
      expect(refineStep?.resolution).toBe("4K");
    });

    it("Chain A with <=6 modules uses 2K refinement resolution", () => {
      const request = makeRequest({ audience: "customer-facing" });
      const modules = makeModules(3, true);

      const result = scoreRequest(request, modules);
      expect(result.selectedChain).toBeDefined();
      const refineStep = result.selectedChain!.steps.find(
        (s) => s.role === "refine",
      );
      expect(refineStep?.resolution).toBe("2K");
    });

    it("chain steps include generate and refine roles", () => {
      const request = makeRequest({ audience: "customer-facing" });
      const modules = makeModules(3, true);

      const result = scoreRequest(request, modules);
      expect(result.selectedChain!.steps).toHaveLength(2);
      expect(result.selectedChain!.steps[0].role).toBe("generate");
      expect(result.selectedChain!.steps[1].role).toBe("refine");
    });
  });

  // -------------------------------------------------------------------------
  // scoreRequest — reasoning string
  // -------------------------------------------------------------------------
  describe("scoreRequest — reasoning", () => {
    it("includes module count in reasoning", () => {
      const request = makeRequest({ audience: "internal" });
      const modules = makeModules(4);

      const result = scoreRequest(request, modules);
      expect(result.reasoning).toContain("4 modules");
    });

    it("reasoning mentions NB2 for internal simple request", () => {
      const request = makeRequest({ audience: "internal" });
      const modules = makeModules(2);

      const result = scoreRequest(request, modules);
      expect(result.reasoning).toContain("NB2");
    });
  });
});
