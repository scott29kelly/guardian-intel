import { describe, it, expect } from "vitest";
import {
  computeDecayFactor,
  computeEffectiveWeight,
  ageInDays,
} from "@/lib/services/lead-intel/scoring/decay";

describe("lead-intel / decay math (LG-04)", () => {
  describe("computeDecayFactor", () => {
    it("returns 1 at age 0", () => {
      expect(computeDecayFactor(0, 365)).toBeCloseTo(1, 6);
    });

    it("returns 0.5 at age === halfLifeDays", () => {
      expect(computeDecayFactor(365, 365)).toBeCloseTo(0.5, 6);
    });

    it("returns 0.25 at age === 2 * halfLifeDays", () => {
      expect(computeDecayFactor(730, 365)).toBeCloseTo(0.25, 6);
    });

    it("returns 0 for halfLifeDays <= 0", () => {
      expect(computeDecayFactor(100, 0)).toBe(0);
    });

    it("clamps negative ageDays to 1 (no amplification)", () => {
      expect(computeDecayFactor(-10, 365)).toBe(1);
    });
  });

  describe("computeEffectiveWeight — full formula", () => {
    it("implements baseWeight * reliabilityWeight * exp(-ln(2) * age / halfLife)", () => {
      const breakdown = computeEffectiveWeight({
        baseWeight: 30,
        reliabilityWeight: 0.9,
        halfLifeDays: 365,
        ageDays: 365, // exactly one half-life
      });
      // 30 * 0.9 * 0.5 = 13.5
      expect(breakdown.effectiveWeight).toBeCloseTo(13.5, 6);
      expect(breakdown.decayFactor).toBeCloseTo(0.5, 6);
      expect(breakdown.baseWeight).toBe(30);
      expect(breakdown.reliabilityWeight).toBe(0.9);
      expect(breakdown.halfLifeDays).toBe(365);
      expect(breakdown.ageDays).toBe(365);
    });

    it("is deterministic — same inputs always give same output", () => {
      const a = computeEffectiveWeight({ baseWeight: 10, reliabilityWeight: 0.8, halfLifeDays: 90, ageDays: 45 });
      const b = computeEffectiveWeight({ baseWeight: 10, reliabilityWeight: 0.8, halfLifeDays: 90, ageDays: 45 });
      expect(a.effectiveWeight).toBe(b.effectiveWeight);
    });

    it("a storm 10 days ago contributes more than a storm 10 months ago (DOCX quote)", () => {
      const recent = computeEffectiveWeight({
        baseWeight: 25,
        reliabilityWeight: 0.95,
        halfLifeDays: 365,
        ageDays: 10,
      });
      const old = computeEffectiveWeight({
        baseWeight: 25,
        reliabilityWeight: 0.95,
        halfLifeDays: 365,
        ageDays: 300,
      });
      expect(recent.effectiveWeight).toBeGreaterThan(old.effectiveWeight);
    });
  });

  describe("ageInDays", () => {
    it("returns 0 for now", () => {
      const now = new Date();
      expect(ageInDays(now, now)).toBe(0);
    });

    it("returns 7 for a week ago", () => {
      const now = new Date("2026-04-09");
      const weekAgo = new Date("2026-04-02");
      expect(ageInDays(weekAgo, now)).toBeCloseTo(7, 3);
    });

    it("clamps negative to 0 (future events don't count)", () => {
      const now = new Date("2026-04-09");
      const future = new Date("2026-04-16");
      expect(ageInDays(future, now)).toBe(0);
    });

    it("accepts ISO string input", () => {
      const now = new Date("2026-04-09");
      expect(ageInDays("2026-04-02", now)).toBeCloseTo(7, 3);
    });
  });
});
