/**
 * Roof Age Signal Extractor (LG-05)
 *
 * Sources: Customer.roofAge, Customer.yearBuilt, PropertyData.yearBuilt,
 * CanvassingPin.roofAge. Produces PropertySignalEvent rows with signalType
 * "roof-age".
 *
 * The eventTimestamp is the source row's updatedAt (or createdAt) — roof
 * age isn't a discrete event, so we use "last time we learned about it"
 * as the timestamp for decay purposes.
 */

import { getSignalConfig, getReliability } from "../../scoring/weights";

export interface RoofAgeExtractorInput {
  trackedPropertyId: string;
  sourceType: string; // "customer" | "property-data" | "canvassing-pin"
  sourceRecordedAt: Date;
  ingestionRunId: string;
  roofAge?: number | null;
  yearBuilt?: number | null;
}

export interface SignalEventDraft {
  trackedPropertyId: string;
  ingestionRunId: string;
  signalType: string;
  eventTimestamp: Date;
  baseWeight: number;
  reliabilityWeight: number;
  halfLifeDays: number;
  value: number | null;
  metadata: Record<string, unknown>;
}

export function extractRoofAge(input: RoofAgeExtractorInput): SignalEventDraft | null {
  // Derive an effective roof age: prefer explicit roofAge, fall back to
  // (currentYear - yearBuilt) only if the house is old enough to matter.
  let roofAge: number | null = input.roofAge ?? null;
  if (roofAge == null && typeof input.yearBuilt === "number" && input.yearBuilt > 1900) {
    roofAge = new Date().getFullYear() - input.yearBuilt;
  }
  if (roofAge == null || roofAge <= 0) return null;

  const cfg = getSignalConfig("roof-age");
  // Weight scales linearly with age: a 25-year-old roof contributes more than a 5-year-old roof
  const scaledBaseWeight = cfg.baseWeight * Math.min(1, roofAge / 25);

  return {
    trackedPropertyId: input.trackedPropertyId,
    ingestionRunId: input.ingestionRunId,
    signalType: "roof-age",
    eventTimestamp: input.sourceRecordedAt,
    baseWeight: scaledBaseWeight,
    reliabilityWeight: getReliability(input.sourceType),
    halfLifeDays: cfg.halfLifeDays,
    value: roofAge,
    metadata: { sourceType: input.sourceType },
  };
}
