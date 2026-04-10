/**
 * listTrackedProperties filter behavior test.
 */

import { describe, it, expect, afterAll } from "vitest";
import { listTrackedProperties } from "@/lib/services/lead-intel";
import { prisma } from "@/lib/prisma";

describe("lead-intel / properties list filters", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns { rows, total } with default filters", async () => {
    const result = await listTrackedProperties({});
    expect(Array.isArray(result.rows)).toBe(true);
    expect(typeof result.total).toBe("number");
  });

  it("respects the limit cap (max 200)", async () => {
    const result = await listTrackedProperties({ limit: 10000 });
    expect(result.rows.length).toBeLessThanOrEqual(200);
  });

  it("honors minScore filter", async () => {
    const result = await listTrackedProperties({ minScore: 1e9 });
    // No property has a score >= 1 billion
    expect(result.rows).toHaveLength(0);
  });

  it("honors hasPendingResolution filter", async () => {
    const result = await listTrackedProperties({ hasPendingResolution: true });
    for (const r of result.rows) {
      expect(r.resolutionStatus).toBe("pending_review");
    }
  });
});
