/**
 * runInternalBackfill smoke test.
 *
 * Runs the backfill orchestrator directly against the dev DB and asserts
 * the returned IngestStats has sensible shape. Does NOT assert specific
 * record counts because the dev DB contents are not fixed.
 */

import { describe, it, expect, afterAll } from "vitest";
import { runInternalBackfill } from "@/lib/services/lead-intel";
import { prisma } from "@/lib/prisma";

describe("lead-intel / backfill (LG-05)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("runInternalBackfill returns IngestStats with numeric fields", async () => {
    const stats = await runInternalBackfill({ rescoreAll: false });
    expect(typeof stats.recordsRead).toBe("number");
    expect(typeof stats.recordsWritten).toBe("number");
    expect(typeof stats.propertiesCreated).toBe("number");
    expect(typeof stats.propertiesMatched).toBe("number");
    expect(typeof stats.signalsWritten).toBe("number");
    expect(Array.isArray(stats.errors)).toBe(true);
  });

  it("is idempotent — second run produces propertiesCreated === 0 (all matched)", async () => {
    await runInternalBackfill({ rescoreAll: false }); // first run (warms DB)
    const stats = await runInternalBackfill({ rescoreAll: false });
    expect(stats.propertiesCreated).toBe(0);
  });
});
