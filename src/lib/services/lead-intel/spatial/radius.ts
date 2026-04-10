/**
 * PostGIS Radius Queries
 *
 * Thin wrappers around ST_DWithin for the radius lookups the resolver and
 * the neighbor-win extractor need. Uses Prisma `$queryRaw` because the
 * `location` column is declared as Unsupported in schema.prisma (see LG-01).
 *
 * All distances are in meters. Callers converting miles should use
 * metersFromMiles below.
 */

import { prisma } from "@/lib/prisma";

export function metersFromMiles(miles: number): number {
  return miles * 1609.344;
}

export interface NearbyProperty {
  id: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  distanceMeters: number;
}

/**
 * Find TrackedProperty rows within `radiusMeters` of (lat, lng), ordered
 * by distance ascending. Uses ST_DWithin on the GIST index created in
 * migration 08_lead_intel_postgis.
 */
export async function findPropertiesWithinRadius(params: {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  limit?: number;
}): Promise<NearbyProperty[]> {
  const { latitude, longitude, radiusMeters, limit = 100 } = params;

  // Parameterized raw query — never concatenate user input into the SQL.
  const rows = await prisma.$queryRaw<NearbyProperty[]>`
    SELECT
      "id",
      "address",
      "city",
      "state",
      "zipCode",
      ST_Distance(
        "location",
        ST_SetSRID(ST_MakePoint(${longitude}::double precision, ${latitude}::double precision), 4326)::geography
      ) AS "distanceMeters"
    FROM "TrackedProperty"
    WHERE "location" IS NOT NULL
      AND ST_DWithin(
        "location",
        ST_SetSRID(ST_MakePoint(${longitude}::double precision, ${latitude}::double precision), 4326)::geography,
        ${radiusMeters}::double precision
      )
    ORDER BY "distanceMeters" ASC
    LIMIT ${limit}::int;
  `;
  return rows;
}
