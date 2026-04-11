/**
 * Internal Backfill Orchestrator (LG-05)
 *
 * Reads Customer, WeatherEvent, CanvassingPin, Interaction, and PropertyData
 * rows; ingests each as a source row; resolves to a TrackedProperty via
 * processSourceRow; then runs the 5 internal signal extractors to produce
 * PropertySignalEvent rows.
 *
 * Idempotent: re-running produces zero net change because
 *   - PropertySourceRecord has a unique (sourceType, sourceId) constraint
 *   - Signal events are only written when the source record is newly inserted
 *     (tracked via the `created` return from processSourceRow)
 *
 * Phase 8 internal-only scope per LG-05 — no external connectors.
 */

import { prisma } from "@/lib/prisma";
import { startIngestRun, finishIngestRun, processSourceRow } from "../ingest/run";
import type { IngestStats } from "../ingest/types";
import { extractRoofAge } from "./extractors/roof-age";
import { extractStormExposure } from "./extractors/storm-exposure";
import { extractCanvassingRecency } from "./extractors/canvassing-recency";
import { extractContactRecency } from "./extractors/crm-contact-recency";
import { extractNeighborWins } from "./extractors/neighbor-win";
import { getReliability } from "../scoring/weights";
import { computeScoreSnapshot } from "../scoring/score";
import type { SignalEventDraft } from "./extractors/roof-age";

const emptyStats = (): IngestStats => ({
  recordsRead: 0,
  recordsWritten: 0,
  recordsSkipped: 0,
  signalsWritten: 0,
  propertiesCreated: 0,
  propertiesMatched: 0,
  errors: [],
});

async function writeSignals(drafts: Array<SignalEventDraft | null>, runId: string, stats: IngestStats) {
  for (const draft of drafts) {
    if (!draft) continue;
    await prisma.propertySignalEvent.create({
      data: {
        trackedPropertyId: draft.trackedPropertyId,
        ingestionRunId: runId,
        signalType: draft.signalType,
        eventTimestamp: draft.eventTimestamp,
        baseWeight: draft.baseWeight,
        reliabilityWeight: draft.reliabilityWeight,
        halfLifeDays: draft.halfLifeDays,
        value: draft.value,
        metadata: JSON.stringify(draft.metadata),
      },
    });
    stats.signalsWritten += 1;
  }
}

/**
 * One-shot internal backfill. Admin-triggered via POST /api/lead-intel/backfill.
 * Returns the IngestStats for the UI to display.
 */
export async function runInternalBackfill(params: {
  triggeredByUserId?: string;
  rescoreAll?: boolean;
}): Promise<IngestStats> {
  const ctx = await startIngestRun({
    source: "internal-backfill:all",
    trigger: "backfill",
    triggeredByUserId: params.triggeredByUserId,
  });
  const stats = emptyStats();

  try {
    // --- Customers ---
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        latitude: true,
        longitude: true,
        roofAge: true,
        yearBuilt: true,
        updatedAt: true,
        status: true,
        stage: true,
      },
    });
    for (const c of customers) {
      stats.recordsRead += 1;
      const resolution = await processSourceRow(ctx.runId, {
        sourceType: "customer",
        sourceId: c.id,
        sourceRecordedAt: c.updatedAt,
        reliabilityWeight: getReliability("customer"),
        payload: { status: c.status, stage: c.stage },
        address: c.address,
        city: c.city,
        state: c.state,
        zipCode: c.zipCode,
        latitude: c.latitude,
        longitude: c.longitude,
      });
      stats.recordsWritten += 1;
      if (resolution.created) stats.propertiesCreated += 1;
      else stats.propertiesMatched += 1;

      // Link Customer.trackedPropertyId for bridge FK
      await prisma.customer.update({
        where: { id: c.id },
        data: { trackedPropertyId: resolution.trackedPropertyId },
      });

      // Only write signals when the source record was newly created
      // to prevent duplicate signal rows on backfill re-runs
      if (resolution.created) {
        // Roof age signal
        await writeSignals(
          [
            extractRoofAge({
              trackedPropertyId: resolution.trackedPropertyId,
              sourceType: "customer",
              sourceRecordedAt: c.updatedAt,
              ingestionRunId: ctx.runId,
              roofAge: c.roofAge,
              yearBuilt: c.yearBuilt,
            }),
          ],
          ctx.runId,
          stats,
        );

        // Nearby Guardian wins signal (needs coordinates)
        if (c.latitude != null && c.longitude != null) {
          const winDrafts = await extractNeighborWins({
            trackedPropertyId: resolution.trackedPropertyId,
            ingestionRunId: ctx.runId,
            latitude: c.latitude,
            longitude: c.longitude,
          });
          await writeSignals(winDrafts, ctx.runId, stats);
        }
      }
    }

    // --- WeatherEvents ---
    const weatherEvents = await prisma.weatherEvent.findMany({
      select: {
        id: true,
        customerId: true,
        latitude: true,
        longitude: true,
        eventDate: true,
        severity: true,
        eventType: true,
        hailSize: true,
        windSpeed: true,
        zipCode: true,
        city: true,
        state: true,
      },
    });
    for (const w of weatherEvents) {
      stats.recordsRead += 1;
      // Build a pseudo-address for resolution when there's no customer link
      const address = w.customerId
        ? null
        : `${w.latitude?.toFixed(5) ?? "?"},${w.longitude?.toFixed(5) ?? "?"}`;
      let trackedPropertyId: string | null = null;
      let sourceRecordCreated = false;

      if (w.customerId) {
        // Short-circuit via the Customer bridge FK (set above)
        const cust = await prisma.customer.findUnique({
          where: { id: w.customerId },
          select: { trackedPropertyId: true },
        });
        trackedPropertyId = cust?.trackedPropertyId ?? null;
        // Customer bridge path: property already existed, no new source record
      }

      if (!trackedPropertyId && address) {
        const resolution = await processSourceRow(ctx.runId, {
          sourceType: "weather-event",
          sourceId: w.id,
          sourceRecordedAt: w.eventDate,
          reliabilityWeight: getReliability("weather-event"),
          payload: {
            eventType: w.eventType,
            severity: w.severity,
            hailSize: w.hailSize,
            windSpeed: w.windSpeed,
          },
          address,
          city: w.city ?? "",
          state: w.state ?? "",
          zipCode: w.zipCode ?? "",
          latitude: w.latitude,
          longitude: w.longitude,
        });
        trackedPropertyId = resolution.trackedPropertyId;
        sourceRecordCreated = resolution.created;
        if (resolution.created) stats.propertiesCreated += 1;
        else stats.propertiesMatched += 1;
      }

      if (trackedPropertyId) {
        stats.recordsWritten += 1;
        // Link WeatherEvent.trackedPropertyId bridge FK
        await prisma.weatherEvent.update({
          where: { id: w.id },
          data: { trackedPropertyId },
        });
        // Only write signals when the source record was newly created
        // to prevent duplicate signal rows on backfill re-runs
        if (sourceRecordCreated) {
          await writeSignals(
            [
              extractStormExposure({
                trackedPropertyId,
                ingestionRunId: ctx.runId,
                weatherEventId: w.id,
                eventDate: w.eventDate,
                severity: w.severity,
                eventType: w.eventType,
                hailSize: w.hailSize,
                windSpeed: w.windSpeed,
              }),
            ],
            ctx.runId,
            stats,
          );
        }
      } else {
        stats.recordsSkipped += 1;
      }
    }

    // --- CanvassingPins ---
    const pins = await prisma.canvassingPin.findMany({
      select: {
        id: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        latitude: true,
        longitude: true,
        knockedAt: true,
        outcome: true,
        status: true,
        roofAge: true,
        yearBuilt: true,
        updatedAt: true,
      },
    });
    for (const p of pins) {
      stats.recordsRead += 1;
      const resolution = await processSourceRow(ctx.runId, {
        sourceType: "canvassing-pin",
        sourceId: p.id,
        sourceRecordedAt: p.knockedAt ?? p.updatedAt,
        reliabilityWeight: getReliability("canvassing-pin"),
        payload: { outcome: p.outcome, status: p.status },
        address: p.address,
        city: p.city,
        state: p.state,
        zipCode: p.zipCode,
        latitude: p.latitude,
        longitude: p.longitude,
      });
      stats.recordsWritten += 1;
      if (resolution.created) stats.propertiesCreated += 1;
      else stats.propertiesMatched += 1;

      await prisma.canvassingPin.update({
        where: { id: p.id },
        data: { trackedPropertyId: resolution.trackedPropertyId },
      });

      // Only write signals when the source record was newly created
      // to prevent duplicate signal rows on backfill re-runs
      if (resolution.created) {
        // Canvassing recency signal
        if (p.knockedAt) {
          await writeSignals(
            [
              extractCanvassingRecency({
                trackedPropertyId: resolution.trackedPropertyId,
                ingestionRunId: ctx.runId,
                canvassingPinId: p.id,
                knockedAt: p.knockedAt,
                outcome: p.outcome,
                status: p.status,
              }),
            ],
            ctx.runId,
            stats,
          );
        }

        // Roof age from canvassing observation
        await writeSignals(
          [
            extractRoofAge({
              trackedPropertyId: resolution.trackedPropertyId,
              sourceType: "canvassing-pin",
              sourceRecordedAt: p.updatedAt,
              ingestionRunId: ctx.runId,
              roofAge: p.roofAge,
              yearBuilt: p.yearBuilt,
            }),
          ],
          ctx.runId,
          stats,
        );
      }
    }

    // --- Interactions (MOST RECENT per customer only) ---
    // Group by customerId, take max createdAt
    const latestInteractions = await prisma.$queryRaw<
      Array<{ id: string; customerId: string; createdAt: Date }>
    >`
      SELECT DISTINCT ON ("customerId")
        "id", "customerId", "createdAt"
      FROM "Interaction"
      ORDER BY "customerId", "createdAt" DESC;
    `;
    for (const i of latestInteractions) {
      stats.recordsRead += 1;
      const cust = await prisma.customer.findUnique({
        where: { id: i.customerId },
        select: { trackedPropertyId: true },
      });
      if (!cust?.trackedPropertyId) {
        stats.recordsSkipped += 1;
        continue;
      }
      stats.recordsWritten += 1;
      // Guard against duplicate signals on re-runs: only write if no
      // crm-contact-recency signal exists yet for this tracked property
      const existingSignal = await prisma.propertySignalEvent.findFirst({
        where: {
          trackedPropertyId: cust.trackedPropertyId,
          signalType: "crm-contact-recency",
        },
        select: { id: true },
      });
      if (!existingSignal) {
        await writeSignals(
          [
            extractContactRecency({
              trackedPropertyId: cust.trackedPropertyId,
              ingestionRunId: ctx.runId,
              customerId: i.customerId,
              latestInteractionId: i.id,
              latestInteractionAt: i.createdAt,
            }),
          ],
          ctx.runId,
          stats,
        );
      }
    }

    // --- PropertyData (bridge FK + roof-age signal) ---
    const propertyDataRows = await prisma.propertyData.findMany({
      select: {
        id: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        yearBuilt: true,
        parcelNumber: true,
        updatedAt: true,
      },
    });
    for (const pd of propertyDataRows) {
      stats.recordsRead += 1;
      const resolution = await processSourceRow(ctx.runId, {
        sourceType: "property-data",
        sourceId: pd.id,
        sourceRecordedAt: pd.updatedAt,
        reliabilityWeight: getReliability("property-data"),
        payload: { yearBuilt: pd.yearBuilt },
        address: pd.address,
        city: pd.city,
        state: pd.state,
        zipCode: pd.zipCode,
        parcelNumber: pd.parcelNumber,
      });
      stats.recordsWritten += 1;
      if (resolution.created) stats.propertiesCreated += 1;
      else stats.propertiesMatched += 1;

      await prisma.propertyData.update({
        where: { id: pd.id },
        data: { trackedPropertyId: resolution.trackedPropertyId },
      });

      // Only write signals when the source record was newly created
      // to prevent duplicate signal rows on backfill re-runs
      if (resolution.created) {
        await writeSignals(
          [
            extractRoofAge({
              trackedPropertyId: resolution.trackedPropertyId,
              sourceType: "property-data",
              sourceRecordedAt: pd.updatedAt,
              ingestionRunId: ctx.runId,
              yearBuilt: pd.yearBuilt,
            }),
          ],
          ctx.runId,
          stats,
        );
      }
    }

    // --- Refresh denormalized aggregates on TrackedProperty ---
    await prisma.$executeRaw`
      UPDATE "TrackedProperty" tp
      SET
        "signalCount" = (SELECT COUNT(*) FROM "PropertySignalEvent" se WHERE se."trackedPropertyId" = tp."id"),
        "lastSignalAt" = (SELECT MAX("eventTimestamp") FROM "PropertySignalEvent" se WHERE se."trackedPropertyId" = tp."id");
    `;

    // --- Optional: recompute snapshots for all touched properties ---
    if (params.rescoreAll !== false) {
      const touched = await prisma.trackedProperty.findMany({
        where: { signalCount: { gt: 0 } },
        select: { id: true },
      });
      for (const t of touched) {
        await computeScoreSnapshot(t.id);
      }
    }

    await finishIngestRun(ctx.runId, stats, "completed");
    return stats;
  } catch (err) {
    stats.errors.push(err instanceof Error ? err.message : String(err));
    await finishIngestRun(
      ctx.runId,
      stats,
      "failed",
      err instanceof Error ? err.message : String(err),
    );
    throw err;
  }
}
