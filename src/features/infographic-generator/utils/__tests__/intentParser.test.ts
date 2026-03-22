/**
 * Tests for Intent Parser Service
 *
 * Validates natural language classification into TopicModule selections,
 * audience inference, confidence scoring, and keyword fallback behavior.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the AI router before importing intentParser
const mockClassify = vi.fn();
vi.mock("@/lib/services/ai/router", () => ({
  getAIRouter: () => ({
    classify: mockClassify,
  }),
}));

// Import after mocks
import { parseIntent, AVAILABLE_MODULES } from "../../services/intentParser";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("intentParser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // AVAILABLE_MODULES export
  // -------------------------------------------------------------------------
  describe("AVAILABLE_MODULES", () => {
    it("exports a non-empty array of topic modules", () => {
      expect(AVAILABLE_MODULES.length).toBeGreaterThan(0);
    });

    it("each module has required fields", () => {
      for (const mod of AVAILABLE_MODULES) {
        expect(mod.id).toBeDefined();
        expect(mod.label).toBeDefined();
        expect(mod.dataSource).toBeDefined();
        expect(typeof mod.requiresWebSearch).toBe("boolean");
        expect(mod.visualElement).toBeDefined();
      }
    });
  });

  // -------------------------------------------------------------------------
  // Intent classification via AI router
  // -------------------------------------------------------------------------
  describe("intent classification", () => {
    it("maps AI classification results to modules", async () => {
      mockClassify.mockResolvedValueOnce({
        categories: [
          { label: "storm-timeline", confidence: 0.9 },
          { label: "property-overview", confidence: 0.8 },
        ],
      });

      const result = await parseIntent("show me storm damage for this area");
      expect(result.modules.some((m) => m.id === "storm-timeline")).toBe(true);
      expect(result.modules.some((m) => m.id === "property-overview")).toBe(true);
    });

    it("filters out categories below 0.3 confidence threshold", async () => {
      mockClassify.mockResolvedValueOnce({
        categories: [
          { label: "storm-timeline", confidence: 0.9 },
          { label: "contact-info", confidence: 0.1 }, // Below threshold
        ],
      });

      const result = await parseIntent("storm damage assessment");
      expect(result.modules.some((m) => m.id === "storm-timeline")).toBe(true);
      expect(result.modules.some((m) => m.id === "contact-info")).toBe(false);
    });

    it("returns default modules when no categories above threshold", async () => {
      mockClassify.mockResolvedValueOnce({
        categories: [
          { label: "storm-timeline", confidence: 0.1 },
          { label: "property-overview", confidence: 0.2 },
        ],
      });

      const result = await parseIntent("something vague");
      expect(result.confidence).toBe(0.3);
      // Default modules are property-overview, storm-timeline, lead-scoring, next-steps
      expect(result.modules.length).toBe(4);
    });
  });

  // -------------------------------------------------------------------------
  // Audience detection
  // -------------------------------------------------------------------------
  describe("audience detection", () => {
    it("detects internal audience for meeting-related prompts", async () => {
      mockClassify.mockResolvedValueOnce({
        categories: [
          { label: "insurance-status", confidence: 0.8 },
          { label: "carrier-intel", confidence: 0.7 },
        ],
      });

      const result = await parseIntent("prep me for the Johnson meeting");
      expect(result.audience).toBe("internal");
    });

    it("detects customer-facing audience for leave-behind prompts", async () => {
      mockClassify.mockResolvedValueOnce({
        categories: [
          { label: "company-credentials", confidence: 0.9 },
          { label: "contact-info", confidence: 0.8 },
        ],
      });

      const result = await parseIntent("create a leave-behind for the customer");
      expect(result.audience).toBe("customer-facing");
    });

    it("detects customer-facing for 'send to' prompts", async () => {
      mockClassify.mockResolvedValueOnce({
        categories: [{ label: "property-overview", confidence: 0.8 }],
      });

      const result = await parseIntent("send to the homeowner a summary");
      expect(result.audience).toBe("customer-facing");
    });

    it("detects customer-facing for 'share with' prompts", async () => {
      mockClassify.mockResolvedValueOnce({
        categories: [{ label: "property-overview", confidence: 0.8 }],
      });

      const result = await parseIntent("share with the customer our assessment");
      expect(result.audience).toBe("customer-facing");
    });

    it("defaults to internal for neutral prompts", async () => {
      mockClassify.mockResolvedValueOnce({
        categories: [{ label: "lead-scoring", confidence: 0.8 }],
      });

      const result = await parseIntent("analyze the lead scoring data");
      expect(result.audience).toBe("internal");
    });
  });

  // -------------------------------------------------------------------------
  // Confidence scoring
  // -------------------------------------------------------------------------
  describe("confidence scoring", () => {
    it("returns average confidence across matched categories", async () => {
      mockClassify.mockResolvedValueOnce({
        categories: [
          { label: "storm-timeline", confidence: 0.9 },
          { label: "property-overview", confidence: 0.7 },
        ],
      });

      const result = await parseIntent("storm and property details");
      expect(result.confidence).toBe(0.8); // (0.9 + 0.7) / 2
    });

    it("returns 0.3 confidence for default module fallback", async () => {
      mockClassify.mockResolvedValueOnce({
        categories: [], // No matches
      });

      const result = await parseIntent("something completely unrelated");
      expect(result.confidence).toBe(0.3);
    });

    it("returns 0.5 confidence when using keyword fallback (AI error)", async () => {
      mockClassify.mockRejectedValueOnce(new Error("AI service unavailable"));

      const result = await parseIntent("check the storm damage");
      expect(result.confidence).toBe(0.5);
    });
  });

  // -------------------------------------------------------------------------
  // Keyword fallback
  // -------------------------------------------------------------------------
  describe("keyword fallback", () => {
    it("falls back to keyword matching when AI fails", async () => {
      mockClassify.mockRejectedValueOnce(new Error("API error"));

      const result = await parseIntent("storm damage assessment");
      expect(result.modules.some((m) => m.id === "storm-timeline")).toBe(true);
    });

    it("matches weather keyword to live-weather module", async () => {
      mockClassify.mockRejectedValueOnce(new Error("API error"));

      const result = await parseIntent("what is the weather forecast");
      expect(result.modules.some((m) => m.id === "live-weather")).toBe(true);
    });

    it("matches insurance keyword to insurance-status module", async () => {
      mockClassify.mockRejectedValueOnce(new Error("API error"));

      const result = await parseIntent("insurance claim status");
      expect(result.modules.some((m) => m.id === "insurance-status")).toBe(true);
    });

    it("matches competitor keyword to competitor-landscape module", async () => {
      mockClassify.mockRejectedValueOnce(new Error("API error"));

      const result = await parseIntent("competitor analysis in the area");
      expect(result.modules.some((m) => m.id === "competitor-landscape")).toBe(true);
    });

    it("returns default modules when no keywords match", async () => {
      mockClassify.mockRejectedValueOnce(new Error("API error"));

      const result = await parseIntent("something completely unrelated xyz");
      // Default modules: property-overview, storm-timeline, lead-scoring, next-steps
      expect(result.modules.length).toBe(4);
      expect(result.modules.some((m) => m.id === "property-overview")).toBe(true);
      expect(result.modules.some((m) => m.id === "lead-scoring")).toBe(true);
    });

    it("matches multiple keywords to multiple modules", async () => {
      mockClassify.mockRejectedValueOnce(new Error("API error"));

      const result = await parseIntent("roof condition and neighborhood data");
      expect(result.modules.some((m) => m.id === "roof-assessment")).toBe(true);
      expect(result.modules.some((m) => m.id === "neighborhood-context")).toBe(true);
    });

    it("maintains audience detection during keyword fallback", async () => {
      mockClassify.mockRejectedValueOnce(new Error("API error"));

      const result = await parseIntent("create a leave-behind with property info");
      expect(result.audience).toBe("customer-facing");
      expect(result.modules.some((m) => m.id === "property-overview")).toBe(true);
    });
  });
});
