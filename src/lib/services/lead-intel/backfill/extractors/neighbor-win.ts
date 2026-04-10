/**
 * Nearby Guardian Wins Signal Extractor (LG-05)
 *
 * Source: Customer rows where status === "closed-won" within a configurable
 * radius (default 1 mile) and time window (default 12 months). Uses
 * PostGIS ST_DWithin via the spatial helper.
 *
 * Produces one PropertySignalEvent per nearby win. The event timestamp
 * is the nearby customer's updatedAt (proxy for "when the job was won").
 */

import { prisma } from "@/lib/prisma";
import { getSignalConfig, getReliability } from "../../scoring/weights";
import { metersFromMiles } from "../../spatial/radius";
import type { SignalEventDraft } from "./roof-age";

export interface NeighborWinExtractorInput {
  trackedPropertyId: string;
  ingestionRunId: string;
  latitude: number;
  longitude: number;
  radiusMiles?: number;
  windowMonths?: number;
  now?: Date;
}

interface NeighborWinRow {
  id: string;
  updatedAt: Date;
  distanceMeters: number;
}

export async function extractNeighborWins(
  input: NeighborWinExtractorInput,
): Promise<SignalEventDraft[]> {
  const radiusMiles = input.radiusMiles ?? 1;
  const windowMonths = input.windowMonths ?? 12;
  const now = input.now ?? new Date();
  const windowStart = new Date(now);
  windowStart.setMonth(windowStart.getMonth() - windowMonths);

  const radiusMeters = metersFromMiles(radiusMiles);
  const lng = input.longitude;
  const lat = input.latitude;

  // Customers don't have `location` geography — we do the radius check with
  // ST_DWithin on a point built from latitude/longitude columns.
  const neighbors = await prisma.$queryRaw<NeighborWinRow[]>`
    SELECT
      c."id",
      c."updatedAt",
      ST_Distance(
        ST_SetSRID(ST_MakePoint(c."longitude", c."latitude"), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${lng}::double precision, ${lat}::double precision), 4326)::geography
      ) AS "distanceMeters"
    FROM "Customer" c
    WHERE c."status" = 'closed-won'
      AND c."latitude" IS NOT NULL
      AND c."longitude" IS NOT NULL
      AND c."updatedAt" >= ${windowStart}
      AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(c."longitude", c."latitude"), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${lng}::double precision, ${lat}::double precision), 4326)::geography,
        ${radiusMeters}::double precision
      );
  `;

  const cfg = getSignalConfig("neighbor-win");
  return neighbors.map((n) => ({
    trackedPropertyId: input.trackedPropertyId,
    ingestionRunId: input.ingestionRunId,
    signalType: "neighbor-win",
    eventTimestamp: n.updatedAt,
    // Closer wins count more: 1.0 at 0m, 0.5 at radiusMeters/2, 0 at radiusMeters
    baseWeight: cfg.baseWeight * Math.max(0, 1 - n.distanceMeters / radiusMeters),
    reliabilityWeight: getReliability("customer"),
    halfLifeDays: cfg.halfLifeDays,
    value: n.distanceMeters,
    metadata: {
      neighborCustomerId: n.id,
      distanceMeters: n.distanceMeters,
    },
  }));
}
