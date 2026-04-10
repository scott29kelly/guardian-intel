/**
 * Saved Compound Query (LG-09)
 *
 * Ships exactly one saved query in Phase 8: the doc-aligned high-value
 * compound from "Compound Signal Approach" of the Lead Generation Machine
 * overview. Returns TrackedProperty rows where:
 *   - roof age is 15-25 years (via roof-age signal value)
 *   - 3+ storm-exposure signal events in the last 36 months
 *   - at least one Guardian closed-won Customer within 1 mile in the last 12 months
 *
 * Shipped as explicit Prisma + raw SQL, NOT a generic query builder.
 * Generic compound queries are Phase 2 work per LG-09.
 */

import { prisma } from "@/lib/prisma";

export interface HighValueMatch {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
  latestScore: number | null;
  roofAge: number;
  stormCount: number;
  neighborWinCount: number;
  nearestWinMeters: number | null;
}

export async function highValueRoofStormNeighbor(params?: {
  neighborRadiusMiles?: number;
  stormWindowMonths?: number;
  neighborWindowMonths?: number;
  limit?: number;
}): Promise<HighValueMatch[]> {
  const neighborRadiusMeters = (params?.neighborRadiusMiles ?? 1) * 1609.344;
  const stormWindowMonths = params?.stormWindowMonths ?? 36;
  const neighborWindowMonths = params?.neighborWindowMonths ?? 12;
  const limit = Math.min(params?.limit ?? 100, 500);

  const now = new Date();
  const stormWindowStart = new Date(now);
  stormWindowStart.setMonth(stormWindowStart.getMonth() - stormWindowMonths);
  const neighborWindowStart = new Date(now);
  neighborWindowStart.setMonth(neighborWindowStart.getMonth() - neighborWindowMonths);

  // One raw query — keeps the compound logic in a single place the tests can
  // point at. Uses the GIST index from Plan 08-01.
  //
  // Filter order (matches query planner expectations):
  //   1. roof-age signal with value between 15 and 25
  //   2. count(distinct storm-exposure signals in 36mo) >= 3
  //   3. EXISTS a closed-won Customer within 1mi in 12mo
  const rows = await prisma.$queryRaw<HighValueMatch[]>`
    WITH roof_ages AS (
      SELECT DISTINCT ON ("trackedPropertyId")
        "trackedPropertyId",
        "value" AS "roofAge"
      FROM "PropertySignalEvent"
      WHERE "signalType" = 'roof-age'
        AND "value" BETWEEN 15 AND 25
      ORDER BY "trackedPropertyId", "eventTimestamp" DESC
    ),
    storm_counts AS (
      SELECT
        "trackedPropertyId",
        COUNT(*)::int AS "stormCount"
      FROM "PropertySignalEvent"
      WHERE "signalType" = 'storm-exposure'
        AND "eventTimestamp" >= ${stormWindowStart}
      GROUP BY "trackedPropertyId"
      HAVING COUNT(*) >= 3
    ),
    neighbor_wins AS (
      SELECT
        tp."id" AS "trackedPropertyId",
        COUNT(c."id")::int AS "neighborWinCount",
        MIN(
          ST_Distance(
            tp."location",
            ST_SetSRID(ST_MakePoint(c."longitude", c."latitude"), 4326)::geography
          )
        ) AS "nearestWinMeters"
      FROM "TrackedProperty" tp
      JOIN "Customer" c
        ON c."status" = 'closed-won'
        AND c."latitude" IS NOT NULL
        AND c."longitude" IS NOT NULL
        AND c."updatedAt" >= ${neighborWindowStart}
        AND ST_DWithin(
          tp."location",
          ST_SetSRID(ST_MakePoint(c."longitude", c."latitude"), 4326)::geography,
          ${neighborRadiusMeters}::double precision
        )
      WHERE tp."location" IS NOT NULL
      GROUP BY tp."id"
      HAVING COUNT(c."id") >= 1
    )
    SELECT
      tp."id",
      tp."address",
      tp."city",
      tp."state",
      tp."zipCode",
      tp."latitude",
      tp."longitude",
      tp."latestScore",
      ra."roofAge",
      sc."stormCount",
      nw."neighborWinCount",
      nw."nearestWinMeters"
    FROM "TrackedProperty" tp
    JOIN roof_ages ra ON ra."trackedPropertyId" = tp."id"
    JOIN storm_counts sc ON sc."trackedPropertyId" = tp."id"
    JOIN neighbor_wins nw ON nw."trackedPropertyId" = tp."id"
    ORDER BY tp."latestScore" DESC NULLS LAST, sc."stormCount" DESC
    LIMIT ${limit}::int;
  `;

  return rows;
}
