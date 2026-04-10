/**
 * Canvassing Recency Signal Extractor (LG-05)
 *
 * Source: CanvassingPin.knockedAt. Produces one PropertySignalEvent per
 * knock event. Fresh knocks are hot leads; the 90-day half-life makes
 * their contribution drop sharply.
 */

import { getSignalConfig, getReliability } from "../../scoring/weights";
import type { SignalEventDraft } from "./roof-age";

export interface CanvassingExtractorInput {
  trackedPropertyId: string;
  ingestionRunId: string;
  canvassingPinId: string;
  knockedAt: Date;
  outcome?: string | null;
  status?: string | null;
}

export function extractCanvassingRecency(
  input: CanvassingExtractorInput,
): SignalEventDraft | null {
  if (!input.knockedAt) return null;
  const cfg = getSignalConfig("canvassing-recency");
  return {
    trackedPropertyId: input.trackedPropertyId,
    ingestionRunId: input.ingestionRunId,
    signalType: "canvassing-recency",
    eventTimestamp: input.knockedAt,
    baseWeight: cfg.baseWeight,
    reliabilityWeight: getReliability("canvassing-pin"),
    halfLifeDays: cfg.halfLifeDays,
    value: null,
    metadata: {
      canvassingPinId: input.canvassingPinId,
      outcome: input.outcome,
      status: input.status,
    },
  };
}
