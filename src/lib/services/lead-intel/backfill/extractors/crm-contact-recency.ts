/**
 * CRM Contact Recency Signal Extractor (LG-05)
 *
 * Source: Interaction rows — the MOST RECENT interaction per customer
 * is the signal. Older interactions are ignored (only the freshest
 * contact date matters for recency).
 */

import { getSignalConfig, getReliability } from "../../scoring/weights";
import type { SignalEventDraft } from "./roof-age";

export interface ContactRecencyExtractorInput {
  trackedPropertyId: string;
  ingestionRunId: string;
  customerId: string;
  latestInteractionId: string;
  latestInteractionAt: Date;
}

export function extractContactRecency(
  input: ContactRecencyExtractorInput,
): SignalEventDraft {
  const cfg = getSignalConfig("crm-contact-recency");
  return {
    trackedPropertyId: input.trackedPropertyId,
    ingestionRunId: input.ingestionRunId,
    signalType: "crm-contact-recency",
    eventTimestamp: input.latestInteractionAt,
    baseWeight: cfg.baseWeight,
    reliabilityWeight: getReliability("interaction"),
    halfLifeDays: cfg.halfLifeDays,
    value: null,
    metadata: {
      customerId: input.customerId,
      interactionId: input.latestInteractionId,
    },
  };
}
