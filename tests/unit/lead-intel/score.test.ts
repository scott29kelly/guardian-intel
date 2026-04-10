import { describe, it, expect } from "vitest";
import { buildSnapshotDraft, type SignalEventForScoring } from "@/lib/services/lead-intel/scoring/score";
import { FORMULA_VERSION } from "@/lib/services/lead-intel/scoring/weights";

describe("lead-intel / score snapshot builder (LG-04)", () => {
  const now = new Date("2026-04-09T00:00:00.000Z");

  const mkSignal = (
    id: string,
    signalType: string,
    daysAgo: number,
    base: number,
    rel: number,
    halfLife: number,
  ): SignalEventForScoring => {
    const ts = new Date(now);
    ts.setDate(ts.getDate() - daysAgo);
    return {
      id,
      signalType,
      eventTimestamp: ts,
      baseWeight: base,
      reliabilityWeight: rel,
      halfLifeDays: halfLife,
    };
  };

  it("produces a snapshot with formulaVersion === FORMULA_VERSION", () => {
    const draft = buildSnapshotDraft("prop-1", [mkSignal("s1", "roof-age", 0, 10, 1, 365)], now);
    expect(draft.formulaVersion).toBe(FORMULA_VERSION);
  });

  it("sums effective weights across signals", () => {
    const draft = buildSnapshotDraft(
      "prop-1",
      [
        mkSignal("s1", "roof-age", 0, 10, 1, 365), // 10 * 1 * 1 = 10
        mkSignal("s2", "storm-exposure", 365, 10, 1, 365), // 10 * 1 * 0.5 = 5
      ],
      now,
    );
    expect(draft.totalScore).toBeCloseTo(15, 6);
    expect(draft.signalCount).toBe(2);
    expect(draft.contributions).toHaveLength(2);
  });

  it("is reproducible — two runs with the same input produce the same totalScore and contributions", () => {
    const signals = [
      mkSignal("s1", "roof-age", 100, 30, 0.9, 1825),
      mkSignal("s2", "storm-exposure", 30, 25, 0.95, 365),
      mkSignal("s3", "canvassing-recency", 10, 10, 0.85, 90),
    ];
    const a = buildSnapshotDraft("prop-1", signals, now);
    const b = buildSnapshotDraft("prop-1", signals, now);
    expect(a.totalScore).toBe(b.totalScore);
    expect(a.contributions.map((c) => c.effectiveWeight)).toEqual(
      b.contributions.map((c) => c.effectiveWeight),
    );
  });

  it("each contribution carries the full explainability breakdown", () => {
    const draft = buildSnapshotDraft("prop-1", [mkSignal("s1", "roof-age", 365, 30, 0.9, 365)], now);
    const c = draft.contributions[0];
    expect(c.signalEventId).toBe("s1");
    expect(c.signalType).toBe("roof-age");
    expect(c.baseWeight).toBe(30);
    expect(c.reliabilityWeight).toBe(0.9);
    expect(c.halfLifeDays).toBe(365);
    expect(c.ageDays).toBeCloseTo(365, 0);
    expect(c.decayFactor).toBeCloseTo(0.5, 6);
    expect(c.effectiveWeight).toBeCloseTo(13.5, 6); // 30 * 0.9 * 0.5
  });
});
