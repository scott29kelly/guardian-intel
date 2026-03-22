/**
 * Tests for Infographic Data Assembler
 *
 * Validates the 4 derived metrics and the module-based assembly orchestrator.
 * Deck-generator re-exports are tested via import verification only.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TopicModule } from "../../types/infographic.types";

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import after mocking
import {
  cumulativeStormExposure,
  daysSinceLastContact,
  neighborhoodConversionRate,
  insuranceDeadlineCountdown,
  assembleDataForModules,
  getCustomerTitleData,
  getCustomerOverviewStats,
  getPropertyIntelData,
  getStormHistoryTimeline,
} from "../infographicDataAssembler";

describe("infographicDataAssembler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Re-export verification
  // -------------------------------------------------------------------------
  describe("re-exports from deck-generator", () => {
    it("exports getCustomerTitleData", () => {
      expect(typeof getCustomerTitleData).toBe("function");
    });

    it("exports getCustomerOverviewStats", () => {
      expect(typeof getCustomerOverviewStats).toBe("function");
    });

    it("exports getPropertyIntelData", () => {
      expect(typeof getPropertyIntelData).toBe("function");
    });

    it("exports getStormHistoryTimeline", () => {
      expect(typeof getStormHistoryTimeline).toBe("function");
    });
  });

  // -------------------------------------------------------------------------
  // cumulativeStormExposure
  // -------------------------------------------------------------------------
  describe("cumulativeStormExposure", () => {
    it("returns weighted sum of storm events by severity", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          customer: {
            weatherEvents: [
              { severity: "minor" },
              { severity: "moderate" },
              { severity: "severe" },
              { severity: "catastrophic" },
            ],
          },
        }),
      });

      const result = await cumulativeStormExposure("cust-1");
      // minor=1 + moderate=2 + severe=3 + catastrophic=5 = 11
      expect(result).toBe(11);
    });

    it("returns 0 when no weather events", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          customer: { weatherEvents: [] },
        }),
      });

      const result = await cumulativeStormExposure("cust-1");
      expect(result).toBe(0);
    });

    it("defaults unknown severity to weight 1", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          customer: {
            weatherEvents: [{ severity: "unknown-type" }],
          },
        }),
      });

      const result = await cumulativeStormExposure("cust-1");
      expect(result).toBe(1);
    });

    it("returns 0 on fetch error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await cumulativeStormExposure("cust-1");
      expect(result).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // daysSinceLastContact
  // -------------------------------------------------------------------------
  describe("daysSinceLastContact", () => {
    it("returns days since most recent interaction", async () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          customer: {
            interactions: [
              { createdAt: threeDaysAgo },
              { createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
            ],
          },
        }),
      });

      const result = await daysSinceLastContact("cust-1");
      expect(result).toBe(3);
    });

    it("returns -1 when no interactions", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          customer: { interactions: [] },
        }),
      });

      const result = await daysSinceLastContact("cust-1");
      expect(result).toBe(-1);
    });

    it("returns -1 on fetch error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await daysSinceLastContact("cust-1");
      expect(result).toBe(-1);
    });
  });

  // -------------------------------------------------------------------------
  // neighborhoodConversionRate
  // -------------------------------------------------------------------------
  describe("neighborhoodConversionRate", () => {
    it("returns percentage of closed-won pins in same zip", async () => {
      // First fetch: customer data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          customer: { zipCode: "15213" },
        }),
      });
      // Second fetch: canvassing pins
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          pins: [
            { outcome: "closed-won" },
            { outcome: "closed-won" },
            { outcome: "no-answer" },
            { outcome: "not-interested" },
          ],
        }),
      });

      const result = await neighborhoodConversionRate("cust-1");
      // 2/4 = 50%
      expect(result).toBe(50);
    });

    it("returns 0 when no pins exist", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          customer: { zipCode: "15213" },
        }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ pins: [] }),
      });

      const result = await neighborhoodConversionRate("cust-1");
      expect(result).toBe(0);
    });

    it("returns 0 on fetch error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await neighborhoodConversionRate("cust-1");
      expect(result).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // insuranceDeadlineCountdown
  // -------------------------------------------------------------------------
  describe("insuranceDeadlineCountdown", () => {
    it("returns minimum days remaining across active claims", async () => {
      const now = Date.now();
      // dateOfLoss 300 days ago => deadline at 730 days => 430 days remaining
      const loss1 = new Date(now - 300 * 86400000).toISOString();
      // dateOfLoss 600 days ago => deadline at 730 days => 130 days remaining
      const loss2 = new Date(now - 600 * 86400000).toISOString();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          customer: {
            state: "OH",
            claims: [
              { dateOfLoss: loss1, status: "pending" },
              { dateOfLoss: loss2, status: "approved" },
            ],
          },
        }),
      });

      const result = await insuranceDeadlineCountdown("cust-1");
      // Minimum is ~130 days (the closer deadline)
      expect(result).toBeGreaterThanOrEqual(129);
      expect(result).toBeLessThanOrEqual(131);
    });

    it("uses 365 day window for PA claims", async () => {
      const now = Date.now();
      // dateOfLoss 200 days ago in PA => deadline at 365 days => 165 days remaining
      const lossDate = new Date(now - 200 * 86400000).toISOString();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          customer: {
            state: "PA",
            claims: [
              { dateOfLoss: lossDate, status: "pending" },
            ],
          },
        }),
      });

      const result = await insuranceDeadlineCountdown("cust-1");
      expect(result).toBeGreaterThanOrEqual(164);
      expect(result).toBeLessThanOrEqual(166);
    });

    it("returns -1 when no active claims", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          customer: {
            state: "OH",
            claims: [
              { dateOfLoss: new Date().toISOString(), status: "denied" },
            ],
          },
        }),
      });

      const result = await insuranceDeadlineCountdown("cust-1");
      expect(result).toBe(-1);
    });

    it("returns -1 on fetch error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await insuranceDeadlineCountdown("cust-1");
      expect(result).toBe(-1);
    });
  });

  // -------------------------------------------------------------------------
  // assembleDataForModules
  // -------------------------------------------------------------------------
  describe("assembleDataForModules", () => {
    it("maps module dataSource to function and returns results keyed by module.id", async () => {
      // Mock for cumulativeStormExposure
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          customer: {
            weatherEvents: [{ severity: "severe" }],
          },
        }),
      });
      // Mock for daysSinceLastContact
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          customer: {
            interactions: [
              { createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
            ],
          },
        }),
      });

      const modules: TopicModule[] = [
        {
          id: "storm-exposure",
          label: "Storm Exposure",
          dataSource: "cumulativeStormExposure",
          requiresWebSearch: false,
          visualElement: "gauge",
        },
        {
          id: "last-contact",
          label: "Last Contact",
          dataSource: "daysSinceLastContact",
          requiresWebSearch: false,
          visualElement: "number",
        },
      ];

      const result = await assembleDataForModules("cust-1", modules);
      expect(result["storm-exposure"]).toBe(3); // severe=3
      expect(result["last-contact"]).toBe(5);
    });

    it("returns error object for unknown dataSource", async () => {
      const modules: TopicModule[] = [
        {
          id: "unknown-mod",
          label: "Unknown",
          dataSource: "nonexistentFunction",
          requiresWebSearch: false,
          visualElement: "text",
        },
      ];

      const result = await assembleDataForModules("cust-1", modules);
      expect(result["unknown-mod"]).toEqual({
        error: expect.stringContaining("Unknown data source"),
      });
    });

    it("handles mixed success and failure", async () => {
      // First call succeeds (cumulativeStormExposure)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          customer: { weatherEvents: [{ severity: "minor" }] },
        }),
      });
      // Second call fails (daysSinceLastContact)
      mockFetch.mockRejectedValueOnce(new Error("Server down"));

      const modules: TopicModule[] = [
        {
          id: "storms",
          label: "Storms",
          dataSource: "cumulativeStormExposure",
          requiresWebSearch: false,
          visualElement: "gauge",
        },
        {
          id: "contact",
          label: "Contact",
          dataSource: "daysSinceLastContact",
          requiresWebSearch: false,
          visualElement: "number",
        },
      ];

      const result = await assembleDataForModules("cust-1", modules);
      expect(result["storms"]).toBe(1); // minor=1
      // daysSinceLastContact returns -1 on error (graceful fallback)
      expect(result["contact"]).toBe(-1);
    });
  });
});
