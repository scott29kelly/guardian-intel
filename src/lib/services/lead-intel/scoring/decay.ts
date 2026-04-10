/**
 * Decay math (LG-04).
 *
 * effectiveWeight = baseWeight * reliabilityWeight * exp(-ln(2) * ageDays / halfLifeDays)
 *
 * Pure function. No I/O. Given the same inputs, always returns the same output.
 * The half-life interpretation: a signal contributes half its weight after
 * `halfLifeDays` have elapsed since the event timestamp.
 */

export interface DecayInput {
  baseWeight: number;
  reliabilityWeight: number;
  halfLifeDays: number;
  ageDays: number;
}

export interface DecayBreakdown {
  baseWeight: number;
  reliabilityWeight: number;
  halfLifeDays: number;
  ageDays: number;
  decayFactor: number; // exp(-ln(2) * ageDays / halfLifeDays)
  effectiveWeight: number; // baseWeight * reliabilityWeight * decayFactor
}

const LN2 = Math.log(2);

export function computeDecayFactor(ageDays: number, halfLifeDays: number): number {
  if (halfLifeDays <= 0) return 0;
  if (ageDays <= 0) return 1;
  return Math.exp(-LN2 * (ageDays / halfLifeDays));
}

export function computeEffectiveWeight(input: DecayInput): DecayBreakdown {
  const decayFactor = computeDecayFactor(input.ageDays, input.halfLifeDays);
  const effectiveWeight = input.baseWeight * input.reliabilityWeight * decayFactor;
  return {
    baseWeight: input.baseWeight,
    reliabilityWeight: input.reliabilityWeight,
    halfLifeDays: input.halfLifeDays,
    ageDays: input.ageDays,
    decayFactor,
    effectiveWeight,
  };
}

/** Days between two Date-like values. Always returns a non-negative number. */
export function ageInDays(eventTimestamp: Date | string, now: Date = new Date()): number {
  const eventMs =
    typeof eventTimestamp === "string" ? Date.parse(eventTimestamp) : eventTimestamp.getTime();
  const diffMs = now.getTime() - eventMs;
  return Math.max(0, diffMs / (1000 * 60 * 60 * 24));
}
