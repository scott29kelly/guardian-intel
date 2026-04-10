/**
 * Scoring barrel — decay math, score builder, outcome helper, weights.
 */
export { FORMULA_VERSION, SIGNAL_WEIGHTS, RELIABILITY_WEIGHTS, getSignalConfig, getReliability } from "./weights";
export { computeDecayFactor, computeEffectiveWeight, ageInDays } from "./decay";
export type { DecayInput, DecayBreakdown } from "./decay";
export { buildSnapshotDraft, computeScoreSnapshot } from "./score";
export type { SignalEventForScoring, ScoreContribution, ScoreSnapshotDraft } from "./score";
export { writeOutcomeEvent } from "./outcomes";
export type { OutcomeWriteInput } from "./outcomes";
