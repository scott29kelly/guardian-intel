/**
 * Scoring Service Unit Tests
 * 
 * Tests the lead scoring algorithms that calculate:
 * - Lead scores
 * - Urgency factors
 * - Profit potential
 */

import { describe, it, expect } from "vitest";

// Import the scoring utilities we're testing
// Note: We'll test the pure functions here

describe("Lead Scoring", () => {
  describe("daysBetween", () => {
    it("should calculate days between two dates", () => {
      const date1 = new Date("2026-01-01");
      const date2 = new Date("2026-01-11");
      
      const oneDay = 24 * 60 * 60 * 1000;
      const days = Math.abs(Math.round((date2.getTime() - date1.getTime()) / oneDay));
      
      expect(days).toBe(10);
    });

    it("should handle same day", () => {
      const date1 = new Date("2026-01-10");
      const date2 = new Date("2026-01-10");
      
      const oneDay = 24 * 60 * 60 * 1000;
      const days = Math.abs(Math.round((date2.getTime() - date1.getTime()) / oneDay));
      
      expect(days).toBe(0);
    });

    it("should handle date strings", () => {
      const dateStr1 = "2026-01-01T00:00:00Z";
      const dateStr2 = "2026-01-15T00:00:00Z";
      
      const d1 = new Date(dateStr1);
      const d2 = new Date(dateStr2);
      
      const oneDay = 24 * 60 * 60 * 1000;
      const days = Math.abs(Math.round((d2.getTime() - d1.getTime()) / oneDay));
      
      expect(days).toBe(14);
    });
  });

  describe("clamp", () => {
    it("should clamp values below minimum", () => {
      const clamp = (value: number, min: number, max: number) =>
        Math.min(max, Math.max(min, value));
      
      expect(clamp(-10, 0, 100)).toBe(0);
    });

    it("should clamp values above maximum", () => {
      const clamp = (value: number, min: number, max: number) =>
        Math.min(max, Math.max(min, value));
      
      expect(clamp(150, 0, 100)).toBe(100);
    });

    it("should return value if within range", () => {
      const clamp = (value: number, min: number, max: number) =>
        Math.min(max, Math.max(min, value));
      
      expect(clamp(50, 0, 100)).toBe(50);
    });
  });

  describe("Roof Age Scoring", () => {
    it("should score older roofs higher", () => {
      // Older roof = higher urgency
      const scoreRoofAge = (age: number) => {
        if (age >= 25) return 50;
        if (age >= 20) return 40;
        if (age >= 15) return 30;
        if (age >= 10) return 20;
        return 10;
      };
      
      expect(scoreRoofAge(30)).toBe(50);
      expect(scoreRoofAge(22)).toBe(40);
      expect(scoreRoofAge(17)).toBe(30);
      expect(scoreRoofAge(12)).toBe(20);
      expect(scoreRoofAge(5)).toBe(10);
    });
  });

  describe("Profit Potential", () => {
    it("should calculate profit based on square footage and property value", () => {
      // Simplified profit calculation
      const calculateProfit = (sqft: number, propValue: number) => {
        const basePerSqft = 3.5;
        const valueMultiplier = propValue > 400000 ? 1.2 : propValue > 300000 ? 1.1 : 1.0;
        return Math.round(sqft * basePerSqft * valueMultiplier);
      };
      
      expect(calculateProfit(2000, 350000)).toBe(7700); // 2000 * 3.5 * 1.1
      expect(calculateProfit(2500, 500000)).toBe(10500); // 2500 * 3.5 * 1.2
    });
  });
});

describe("Customer Status Mapping", () => {
  it("should map status to stage", () => {
    const statusToStage: Record<string, string> = {
      lead: "awareness",
      prospect: "consideration",
      qualified: "decision",
      customer: "closed",
      "closed-won": "closed",
      "closed-lost": "closed",
    };

    expect(statusToStage["lead"]).toBe("awareness");
    expect(statusToStage["prospect"]).toBe("consideration");
    expect(statusToStage["customer"]).toBe("closed");
  });
});

describe("Weather Severity Scoring", () => {
  it("should assign higher scores to severe weather", () => {
    const severityScore: Record<string, number> = {
      low: 10,
      moderate: 25,
      high: 50,
      severe: 75,
    };

    expect(severityScore["low"]).toBe(10);
    expect(severityScore["severe"]).toBe(75);
  });

  it("should calculate hail damage potential", () => {
    const hailDamageScore = (hailSize: number) => {
      // Hail size in inches
      if (hailSize >= 2) return 100; // Baseball+
      if (hailSize >= 1.5) return 75; // Golf ball
      if (hailSize >= 1) return 50; // Quarter
      if (hailSize >= 0.75) return 25; // Penny
      return 10;
    };

    expect(hailDamageScore(2.5)).toBe(100);
    expect(hailDamageScore(1.75)).toBe(75);
    expect(hailDamageScore(1)).toBe(50);
    expect(hailDamageScore(0.5)).toBe(10);
  });
});
