/**
 * Storm Exposure Signal Extractor (LG-05)
 *
 * Source: WeatherEvent rows joined to a TrackedProperty by
 * (latitude, longitude) radius OR by existing customerId -> trackedPropertyId.
 * Produces one PropertySignalEvent per storm event.
 */

import { getSignalConfig, getReliability } from "../../scoring/weights";
import type { SignalEventDraft } from "./roof-age";

export interface StormExtractorInput {
  trackedPropertyId: string;
  ingestionRunId: string;
  weatherEventId: string;
  eventDate: Date;
  severity: string; // "minor" | "moderate" | "severe" | "catastrophic"
  eventType: string;
  hailSize?: number | null;
  windSpeed?: number | null;
}

const SEVERITY_MULTIPLIER: Record<string, number> = {
  minor: 0.5,
  moderate: 1.0,
  severe: 1.5,
  catastrophic: 2.0,
};

export function extractStormExposure(input: StormExtractorInput): SignalEventDraft {
  const cfg = getSignalConfig("storm-exposure");
  const severityMult = SEVERITY_MULTIPLIER[input.severity] ?? 1.0;
  return {
    trackedPropertyId: input.trackedPropertyId,
    ingestionRunId: input.ingestionRunId,
    signalType: "storm-exposure",
    eventTimestamp: input.eventDate,
    baseWeight: cfg.baseWeight * severityMult,
    reliabilityWeight: getReliability("weather-event"),
    halfLifeDays: cfg.halfLifeDays,
    value: input.hailSize ?? input.windSpeed ?? null,
    metadata: {
      weatherEventId: input.weatherEventId,
      eventType: input.eventType,
      severity: input.severity,
    },
  };
}
