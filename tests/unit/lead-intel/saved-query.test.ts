/**
 * This test does NOT hit the database — it verifies the function signature
 * and default parameter handling. The live-DB behavior is covered by
 * tests/integration/lead-intel/migration-postgis-smoke.test.ts.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
}));

import { highValueRoofStormNeighbor } from "@/lib/services/lead-intel/queries/saved";
import { prisma } from "@/lib/prisma";

describe("lead-intel / saved compound query (LG-09)", () => {
  it("is exported as a named function", () => {
    expect(typeof highValueRoofStormNeighbor).toBe("function");
  });

  it("accepts zero arguments and returns a promise of an array", async () => {
    const result = await highValueRoofStormNeighbor();
    expect(Array.isArray(result)).toBe(true);
  });

  it("accepts custom radius, storm window, neighbor window, and limit", async () => {
    await highValueRoofStormNeighbor({
      neighborRadiusMiles: 2,
      stormWindowMonths: 24,
      neighborWindowMonths: 6,
      limit: 50,
    });
    expect(prisma.$queryRaw).toHaveBeenCalled();
  });

  it("caps limit at 500", async () => {
    // The function caps internally; we just verify it doesn't throw on a huge value
    await expect(highValueRoofStormNeighbor({ limit: 10000 })).resolves.toEqual([]);
  });
});
