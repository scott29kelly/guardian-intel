/**
 * Score Snapshot Builder (LG-04)
 *
 * Given a set of signal events for a TrackedProperty, computes the total
 * score and the per-signal `contributions` JSON that makes snapshots
 * explainable. Writes an immutable PropertyScoreSnapshot row — never
 * mutates an existing one.
 */

import { prisma } from "@/lib/prisma";
import { computeEffectiveWeight, ageInDays, type DecayBreakdown } from "./decay";
import { FORMULA_VERSION } from "./weights";

export interface SignalEventForScoring {
  id: string;
  signalType: string;
  eventTimestamp: Date;
  baseWeight: number;
  reliabilityWeight: number;
  halfLifeDays: number;
}

export interface ScoreContribution extends DecayBreakdown {
  signalEventId: string;
  signalType: string;
}

export interface ScoreSnapshotDraft {
  trackedPropertyId: string;
  totalScore: number;
  contributions: ScoreContribution[];
  formulaVersion: string;
  signalCount: number;
}

/** Pure: sum the effective weights of every signal. */
export function buildSnapshotDraft(
  trackedPropertyId: string,
  signals: SignalEventForScoring[],
  now: Date = new Date(),
): ScoreSnapshotDraft {
  const contributions: ScoreContribution[] = signals.map((s) => {
    const decay = computeEffectiveWeight({
      baseWeight: s.baseWeight,
      reliabilityWeight: s.reliabilityWeight,
      halfLifeDays: s.halfLifeDays,
      ageDays: ageInDays(s.eventTimestamp, now),
    });
    return {
      signalEventId: s.id,
      signalType: s.signalType,
      ...decay,
    };
  });
  const totalScore = contributions.reduce((sum, c) => sum + c.effectiveWeight, 0);
  return {
    trackedPropertyId,
    totalScore,
    contributions,
    formulaVersion: FORMULA_VERSION,
    signalCount: signals.length,
  };
}

/**
 * Read current signals for a property, build the snapshot, persist it,
 * and update the denormalized `latestScore`/`lastScoreAt` on TrackedProperty.
 */
export async function computeScoreSnapshot(trackedPropertyId: string): Promise<ScoreSnapshotDraft> {
  const signals = await prisma.propertySignalEvent.findMany({
    where: { trackedPropertyId },
    select: {
      id: true,
      signalType: true,
      eventTimestamp: true,
      baseWeight: true,
      reliabilityWeight: true,
      halfLifeDays: true,
    },
  });
  const draft = buildSnapshotDraft(trackedPropertyId, signals);
  await prisma.$transaction([
    prisma.propertyScoreSnapshot.create({
      data: {
        trackedPropertyId: draft.trackedPropertyId,
        totalScore: draft.totalScore,
        formulaVersion: draft.formulaVersion,
        contributions: JSON.stringify(draft.contributions),
        signalCount: draft.signalCount,
      },
    }),
    prisma.trackedProperty.update({
      where: { id: trackedPropertyId },
      data: {
        latestScore: draft.totalScore,
        lastScoreAt: new Date(),
      },
    }),
  ]);
  return draft;
}
