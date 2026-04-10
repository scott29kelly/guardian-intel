/**
 * Ingest Run Orchestrator
 *
 * Handles the "open a run -> process N rows -> close the run" lifecycle.
 * Each row goes through:
 *   1. resolveEntity (find or create TrackedProperty)
 *   2. upsert PropertySourceRecord via (sourceType, sourceId) unique key
 *   3. extractor(s) produce PropertySignalEvent rows
 *
 * Runs are append-only — if the same row is ingested twice, the second
 * write is a no-op thanks to the unique constraints.
 */

import { prisma } from "@/lib/prisma";
import { resolveEntity } from "../entity-resolution/resolve";
import { buildNormalizedKey, normalizeAddress } from "../normalization/address";
import type { IngestRunContext, IngestedSourceRow, IngestStats } from "./types";

export async function startIngestRun(params: {
  source: string;
  sourceVersion?: string;
  trigger: IngestRunContext["trigger"];
  triggeredByUserId?: string;
}): Promise<IngestRunContext> {
  const now = new Date();
  const row = await prisma.sourceIngestionRun.create({
    data: {
      source: params.source,
      sourceVersion: params.sourceVersion,
      trigger: params.trigger,
      triggeredByUserId: params.triggeredByUserId,
      startedAt: now,
      status: "running",
    },
  });
  return {
    runId: row.id,
    source: row.source,
    sourceVersion: row.sourceVersion ?? undefined,
    trigger: row.trigger as IngestRunContext["trigger"],
    triggeredByUserId: row.triggeredByUserId ?? undefined,
    startedAt: row.startedAt,
  };
}

export async function finishIngestRun(
  runId: string,
  stats: IngestStats,
  status: "completed" | "failed" = "completed",
  errorMessage?: string,
): Promise<void> {
  await prisma.sourceIngestionRun.update({
    where: { id: runId },
    data: {
      finishedAt: new Date(),
      status,
      errorMessage,
      recordsRead: stats.recordsRead,
      recordsWritten: stats.recordsWritten,
      recordsSkipped: stats.recordsSkipped,
      signalsWritten: stats.signalsWritten,
      propertiesCreated: stats.propertiesCreated,
      propertiesMatched: stats.propertiesMatched,
    },
  });
}

/**
 * Process one source row. Returns the resolved TrackedProperty id and
 * whether the property was newly created.
 */
export async function processSourceRow(
  runId: string,
  row: IngestedSourceRow,
): Promise<{ trackedPropertyId: string; created: boolean; pendingReview: boolean }> {
  const resolution = await resolveEntity({
    address: row.address,
    city: row.city,
    state: row.state,
    zipCode: row.zipCode,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    parcelNumber: row.parcelNumber ?? null,
  });

  let trackedPropertyId: string;
  let created = false;
  let pendingReview = false;

  if (resolution.status === "resolved" && resolution.matchedPropertyId) {
    trackedPropertyId = resolution.matchedPropertyId;
  } else if (resolution.status === "pending_review") {
    // Create a new row but mark it pending_review so humans can merge it later.
    const normalizedAddr = normalizeAddress(row.address);
    const newProp = await prisma.trackedProperty.create({
      data: {
        address: row.address,
        city: row.city,
        state: row.state,
        zipCode: row.zipCode,
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
        parcelNumber: row.parcelNumber ?? null,
        normalizedAddress: normalizedAddr,
        normalizedKey: buildNormalizedKey(row.address, row.zipCode),
        resolutionStatus: "pending_review",
      },
    });
    trackedPropertyId = newProp.id;
    created = true;
    pendingReview = true;
    // Audit trail: one PropertyResolution row per candidate
    for (const candidateId of resolution.candidateIds) {
      await prisma.propertyResolution.create({
        data: {
          intoPropertyId: candidateId,
          fromPropertyId: newProp.id,
          strategy: resolution.strategy,
          confidence: resolution.confidence,
          status: "pending_review",
        },
      });
    }
    // Set location on the new row via raw SQL (Prisma can't write Unsupported)
    if (row.latitude != null && row.longitude != null) {
      await prisma.$executeRaw`
        UPDATE "TrackedProperty"
        SET "location" = ST_SetSRID(ST_MakePoint(${row.longitude}::double precision, ${row.latitude}::double precision), 4326)::geography
        WHERE "id" = ${newProp.id};
      `;
    }
  } else {
    // status === "new" — create it
    const normalizedAddr = normalizeAddress(row.address);
    const newProp = await prisma.trackedProperty.create({
      data: {
        address: row.address,
        city: row.city,
        state: row.state,
        zipCode: row.zipCode,
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
        parcelNumber: row.parcelNumber ?? null,
        normalizedAddress: normalizedAddr,
        normalizedKey: buildNormalizedKey(row.address, row.zipCode),
        resolutionStatus: "resolved",
      },
    });
    trackedPropertyId = newProp.id;
    created = true;
    if (row.latitude != null && row.longitude != null) {
      await prisma.$executeRaw`
        UPDATE "TrackedProperty"
        SET "location" = ST_SetSRID(ST_MakePoint(${row.longitude}::double precision, ${row.latitude}::double precision), 4326)::geography
        WHERE "id" = ${newProp.id};
      `;
    }
  }

  // Upsert the source record (backfill idempotency)
  await prisma.propertySourceRecord.upsert({
    where: {
      sourceType_sourceId: {
        sourceType: row.sourceType,
        sourceId: row.sourceId,
      },
    },
    create: {
      trackedPropertyId,
      ingestionRunId: runId,
      sourceType: row.sourceType,
      sourceId: row.sourceId,
      sourceRecordedAt: row.sourceRecordedAt,
      reliabilityWeight: row.reliabilityWeight,
      payload: JSON.stringify(row.payload),
    },
    update: {
      // Re-link the source record to the most recent ingestion run,
      // but keep the original reliabilityWeight and sourceRecordedAt.
      ingestionRunId: runId,
    },
  });

  return { trackedPropertyId, created, pendingReview };
}
