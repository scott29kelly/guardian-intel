/**
 * PostGIS + GIST index + ST_DWithin smoke test.
 *
 * Confirms the migration from Plan 08-01 is actually applied in the dev DB.
 * Creates one test TrackedProperty with a known location, runs an
 * ST_DWithin query, cleans up.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEST_ADDRESS = `__test-08-05__${Date.now()}`;
let createdId: string | null = null;

describe("lead-intel / migration smoke (LG-01)", () => {
  beforeAll(async () => {
    // Create a test property and set its location via raw SQL
    const row = await prisma.trackedProperty.create({
      data: {
        address: TEST_ADDRESS,
        city: "Philadelphia",
        state: "PA",
        zipCode: "19103",
        latitude: 39.9526,
        longitude: -75.1652,
        normalizedAddress: TEST_ADDRESS.toLowerCase(),
        normalizedKey: `${TEST_ADDRESS.toLowerCase()}|19103`,
        resolutionStatus: "resolved",
      },
    });
    createdId = row.id;
    await prisma.$executeRaw`
      UPDATE "TrackedProperty"
      SET "location" = ST_SetSRID(ST_MakePoint(-75.1652::double precision, 39.9526::double precision), 4326)::geography
      WHERE "id" = ${row.id};
    `;
  });

  afterAll(async () => {
    if (createdId) {
      await prisma.trackedProperty.delete({ where: { id: createdId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it("postgis extension is installed", async () => {
    const rows = await prisma.$queryRaw<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension WHERE extname = 'postgis';
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0].extname).toBe("postgis");
  });

  it("idx_tracked_property_location GIST index exists", async () => {
    const rows = await prisma.$queryRaw<Array<{ indexname: string; indexdef: string }>>`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE tablename = 'TrackedProperty' AND indexname = 'idx_tracked_property_location';
    `;
    expect(rows).toHaveLength(1);
    expect(rows[0].indexdef.toLowerCase()).toContain("gist");
  });

  it("ST_DWithin finds the test property within 100m of itself", async () => {
    const rows = await prisma.$queryRaw<Array<{ id: string; dist: number }>>`
      SELECT
        "id",
        ST_Distance("location", ST_SetSRID(ST_MakePoint(-75.1652::double precision, 39.9526::double precision), 4326)::geography) AS dist
      FROM "TrackedProperty"
      WHERE "location" IS NOT NULL
        AND ST_DWithin("location", ST_SetSRID(ST_MakePoint(-75.1652::double precision, 39.9526::double precision), 4326)::geography, 100);
    `;
    const match = rows.find((r) => r.id === createdId);
    expect(match).toBeDefined();
    expect(match!.dist).toBeLessThan(1); // same point
  });

  it("ST_DWithin excludes a test property 1km away", async () => {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "TrackedProperty"
      WHERE "location" IS NOT NULL
        AND "id" = ${createdId!}
        AND ST_DWithin(
          "location",
          ST_SetSRID(ST_MakePoint(-75.180::double precision, 39.9526::double precision), 4326)::geography,
          100
        );
    `;
    expect(rows).toHaveLength(0);
  });
});
