/**
 * writeOutcomeEvent idempotency test.
 *
 * Tests the LG-08 unique constraint: (trackedPropertyId, eventType,
 * sourceMutationId). Writes the same event twice and asserts only one
 * row exists.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { writeOutcomeEvent } from "@/lib/services/lead-intel";
import { prisma } from "@/lib/prisma";

const TEST_ADDR = `__outcome-test__${Date.now()}`;
let tpId: string | null = null;

describe("lead-intel / outcome write-back idempotency (LG-08)", () => {
  beforeAll(async () => {
    const prop = await prisma.trackedProperty.create({
      data: {
        address: TEST_ADDR,
        city: "Philadelphia",
        state: "PA",
        zipCode: "19103",
        normalizedAddress: TEST_ADDR.toLowerCase(),
        normalizedKey: `${TEST_ADDR.toLowerCase()}|19103`,
        resolutionStatus: "resolved",
      },
    });
    tpId = prop.id;
  });

  afterAll(async () => {
    if (tpId) {
      await prisma.propertyOutcomeEvent
        .deleteMany({ where: { trackedPropertyId: tpId } })
        .catch(() => {});
      await prisma.trackedProperty.delete({ where: { id: tpId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  it("writing the same outcome event twice produces one row", async () => {
    const input = {
      trackedPropertyId: tpId!,
      eventType: "customer-stage-changed" as const,
      sourceMutationId: `test-mut-${Date.now()}`,
      payload: { customerId: "test-cust", fromStage: "new", toStage: "contacted" },
    };
    await writeOutcomeEvent(input);
    await writeOutcomeEvent(input); // same mutation id — idempotent
    const rows = await prisma.propertyOutcomeEvent.findMany({
      where: {
        trackedPropertyId: tpId!,
        sourceMutationId: input.sourceMutationId,
      },
    });
    expect(rows).toHaveLength(1);
  });
});
