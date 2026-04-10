/**
 * Outcome Write-Back Helper (LG-08)
 *
 * Called inline from Customer/Canvassing mutation handlers (Plan 08-03
 * adds the call sites). Idempotent: the `(trackedPropertyId, eventType,
 * sourceMutationId)` unique constraint prevents duplicate rows on repeated
 * toggles.
 *
 * Does NOT trigger score recomputation — recomputation happens lazily on
 * the next list/detail read in queries/properties.ts.
 */

import { prisma } from "@/lib/prisma";

export interface OutcomeWriteInput {
  trackedPropertyId: string;
  eventType:
    | "customer-stage-changed"
    | "customer-status-changed"
    | "canvassing-appointment-set"
    | "canvassing-outcome-recorded";
  sourceMutationId: string;
  payload: Record<string, unknown>;
  eventTimestamp?: Date;
}

export async function writeOutcomeEvent(input: OutcomeWriteInput): Promise<void> {
  try {
    await prisma.propertyOutcomeEvent.upsert({
      where: {
        trackedPropertyId_eventType_sourceMutationId: {
          trackedPropertyId: input.trackedPropertyId,
          eventType: input.eventType,
          sourceMutationId: input.sourceMutationId,
        },
      },
      create: {
        trackedPropertyId: input.trackedPropertyId,
        eventType: input.eventType,
        sourceMutationId: input.sourceMutationId,
        payload: JSON.stringify(input.payload),
        eventTimestamp: input.eventTimestamp ?? new Date(),
      },
      update: {
        // idempotent — no update body; the row already exists
        payload: JSON.stringify(input.payload),
      },
    });
  } catch (err) {
    // Outcome writes are best-effort: the parent mutation must NOT fail
    // because the lead-intel write-back fails. Log and move on.
    console.error("[LeadIntel] writeOutcomeEvent failed:", err);
  }
}
