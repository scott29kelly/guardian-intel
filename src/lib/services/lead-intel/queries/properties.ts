/**
 * Property Query Layer — feeds the Pipeline Inspector list and detail views.
 *
 * Lazy recomputation of score snapshots: on detail reads, if the latest
 * snapshot is older than the latest signal event, recompute. This avoids
 * a background worker (LG-08 locked a cron out of scope).
 */

import { prisma } from "@/lib/prisma";
import { computeScoreSnapshot } from "../scoring/score";

export interface PropertyListFilters {
  minScore?: number;
  maxScore?: number;
  signalTypes?: string[];
  hasPendingResolution?: boolean;
  zipCode?: string;
  state?: string;
  limit?: number;
  offset?: number;
}

export interface PropertyListRow {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latestScore: number | null;
  signalCount: number;
  lastSignalAt: Date | null;
  lastScoreAt: Date | null;
  resolutionStatus: string;
}

export async function listTrackedProperties(
  filters: PropertyListFilters,
): Promise<{ rows: PropertyListRow[]; total: number }> {
  const where: any = {};
  if (filters.zipCode) where.zipCode = filters.zipCode;
  if (filters.state) where.state = filters.state;
  if (filters.hasPendingResolution) where.resolutionStatus = "pending_review";
  if (filters.minScore !== undefined || filters.maxScore !== undefined) {
    where.latestScore = {};
    if (filters.minScore !== undefined) where.latestScore.gte = filters.minScore;
    if (filters.maxScore !== undefined) where.latestScore.lte = filters.maxScore;
  }
  if (filters.signalTypes && filters.signalTypes.length > 0) {
    where.signalEvents = {
      some: { signalType: { in: filters.signalTypes } },
    };
  }

  const limit = Math.min(filters.limit ?? 50, 200);
  const offset = filters.offset ?? 0;

  const [rows, total] = await Promise.all([
    prisma.trackedProperty.findMany({
      where,
      select: {
        id: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        latestScore: true,
        signalCount: true,
        lastSignalAt: true,
        lastScoreAt: true,
        resolutionStatus: true,
      },
      orderBy: [{ latestScore: "desc" }, { lastSignalAt: "desc" }],
      take: limit,
      skip: offset,
    }),
    prisma.trackedProperty.count({ where }),
  ]);

  return { rows, total };
}

export interface PropertyDetail {
  property: {
    id: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    county: string | null;
    latitude: number | null;
    longitude: number | null;
    parcelNumber: string | null;
    normalizedAddress: string;
    normalizedKey: string;
    resolutionStatus: string;
    latestScore: number | null;
    signalCount: number;
    lastSignalAt: Date | null;
    lastScoreAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  sourceRecords: Array<{
    id: string;
    sourceType: string;
    sourceId: string;
    sourceRecordedAt: Date;
    reliabilityWeight: number;
    ingestionRunId: string;
  }>;
  signalEvents: Array<{
    id: string;
    signalType: string;
    eventTimestamp: Date;
    baseWeight: number;
    reliabilityWeight: number;
    halfLifeDays: number;
    value: number | null;
    metadata: string | null;
  }>;
  latestSnapshot: {
    id: string;
    totalScore: number;
    formulaVersion: string;
    evaluatedAt: Date;
    contributions: string; // JSON
    signalCount: number;
  } | null;
  outcomeEvents: Array<{
    id: string;
    eventType: string;
    eventTimestamp: Date;
    payload: string;
  }>;
}

export async function getPropertyDetail(id: string, _recomputed = false): Promise<PropertyDetail | null> {
  const property = await prisma.trackedProperty.findUnique({
    where: { id },
    include: {
      sourceRecords: {
        orderBy: { sourceRecordedAt: "desc" },
        take: 50,
      },
      signalEvents: {
        orderBy: { eventTimestamp: "desc" },
        take: 200,
      },
      scoreSnapshots: {
        orderBy: { evaluatedAt: "desc" },
        take: 1,
      },
      outcomeEvents: {
        orderBy: { eventTimestamp: "desc" },
        take: 50,
      },
    },
  });
  if (!property) return null;

  // Lazy recomputation: if the latest signal is newer than the latest
  // snapshot (or no snapshot exists), recompute on read.
  // Guard: only recurse once to prevent infinite loops from clock skew
  // or computeScoreSnapshot failing to advance the evaluatedAt timestamp.
  const latestSnapshot = property.scoreSnapshots[0] ?? null;
  const latestSignalAt =
    property.signalEvents[0]?.eventTimestamp ?? property.lastSignalAt ?? null;
  const shouldRecompute =
    !_recomputed &&
    (!latestSnapshot ||
      (latestSignalAt && latestSignalAt > latestSnapshot.evaluatedAt));

  if (shouldRecompute) {
    await computeScoreSnapshot(id);
    // Re-read the property so the caller gets the fresh snapshot (guard: only one retry)
    return getPropertyDetail(id, true);
  }

  return {
    property: {
      id: property.id,
      address: property.address,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode,
      county: property.county,
      latitude: property.latitude,
      longitude: property.longitude,
      parcelNumber: property.parcelNumber,
      normalizedAddress: property.normalizedAddress,
      normalizedKey: property.normalizedKey,
      resolutionStatus: property.resolutionStatus,
      latestScore: property.latestScore,
      signalCount: property.signalCount,
      lastSignalAt: property.lastSignalAt,
      lastScoreAt: property.lastScoreAt,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
    },
    sourceRecords: property.sourceRecords.map((r) => ({
      id: r.id,
      sourceType: r.sourceType,
      sourceId: r.sourceId,
      sourceRecordedAt: r.sourceRecordedAt,
      reliabilityWeight: r.reliabilityWeight,
      ingestionRunId: r.ingestionRunId,
    })),
    signalEvents: property.signalEvents.map((s) => ({
      id: s.id,
      signalType: s.signalType,
      eventTimestamp: s.eventTimestamp,
      baseWeight: s.baseWeight,
      reliabilityWeight: s.reliabilityWeight,
      halfLifeDays: s.halfLifeDays,
      value: s.value,
      metadata: s.metadata,
    })),
    latestSnapshot: latestSnapshot
      ? {
          id: latestSnapshot.id,
          totalScore: latestSnapshot.totalScore,
          formulaVersion: latestSnapshot.formulaVersion,
          evaluatedAt: latestSnapshot.evaluatedAt,
          contributions: latestSnapshot.contributions,
          signalCount: latestSnapshot.signalCount,
        }
      : null,
    outcomeEvents: property.outcomeEvents.map((o) => ({
      id: o.id,
      eventType: o.eventType,
      eventTimestamp: o.eventTimestamp,
      payload: o.payload,
    })),
  };
}
