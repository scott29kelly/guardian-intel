import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the prisma client before importing the resolver
vi.mock("@/lib/prisma", () => ({
  prisma: {
    trackedProperty: {
      findMany: vi.fn(),
    },
  },
}));

// Mock the spatial helper before importing the resolver
vi.mock("@/lib/services/lead-intel/spatial/radius", () => ({
  findPropertiesWithinRadius: vi.fn(),
}));

import { resolveEntity } from "@/lib/services/lead-intel/entity-resolution/resolve";
import { prisma } from "@/lib/prisma";
import { findPropertiesWithinRadius } from "@/lib/services/lead-intel/spatial/radius";

const findMany = prisma.trackedProperty.findMany as unknown as ReturnType<typeof vi.fn>;
const findWithin = findPropertiesWithinRadius as unknown as ReturnType<typeof vi.fn>;

describe("lead-intel / entity resolution (LG-03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("strategy 1: exact normalized", () => {
    it("returns resolved when exactly one match exists", async () => {
      findMany.mockResolvedValueOnce([{ id: "tp-1" }]);
      const result = await resolveEntity({
        address: "123 Main St",
        city: "Philadelphia",
        state: "PA",
        zipCode: "19103",
      });
      expect(result.status).toBe("resolved");
      expect(result.strategy).toBe("exact-normalized");
      expect(result.matchedPropertyId).toBe("tp-1");
    });

    it("returns pending_review when multiple matches exist at the same normalized key", async () => {
      findMany.mockResolvedValueOnce([{ id: "tp-1" }, { id: "tp-2" }]);
      const result = await resolveEntity({
        address: "123 Main St",
        city: "Philadelphia",
        state: "PA",
        zipCode: "19103",
      });
      expect(result.status).toBe("pending_review");
      expect(result.candidateIds).toEqual(["tp-1", "tp-2"]);
    });
  });

  describe("strategy 2: parcel", () => {
    it("prefers exact-normalized over parcel — never reaches parcel when exact matches", async () => {
      findMany.mockResolvedValueOnce([{ id: "tp-exact" }]);
      const result = await resolveEntity({
        address: "123 Main St",
        city: "Philadelphia",
        state: "PA",
        zipCode: "19103",
        parcelNumber: "PARCEL-XYZ",
      });
      expect(result.strategy).toBe("exact-normalized");
      expect(findMany).toHaveBeenCalledTimes(1); // only the exact query was made
    });

    it("falls back to parcel when exact has no match", async () => {
      findMany.mockResolvedValueOnce([]); // exact miss
      findMany.mockResolvedValueOnce([{ id: "tp-parcel" }]); // parcel hit
      const result = await resolveEntity({
        address: "123 Main St",
        city: "Philadelphia",
        state: "PA",
        zipCode: "19103",
        parcelNumber: "PARCEL-XYZ",
      });
      expect(result.status).toBe("resolved");
      expect(result.strategy).toBe("parcel");
      expect(result.matchedPropertyId).toBe("tp-parcel");
    });
  });

  describe("strategy 3: geo-near + street-number + ZIP", () => {
    it("returns new when all strategies miss", async () => {
      findMany.mockResolvedValue([]);
      findWithin.mockResolvedValueOnce([]);
      const result = await resolveEntity({
        address: "999 Nowhere Rd",
        city: "Philadelphia",
        state: "PA",
        zipCode: "19103",
        latitude: 39.9526,
        longitude: -75.1652,
      });
      expect(result.status).toBe("new");
      expect(result.strategy).toBe("none");
    });

    it("resolves via geo-near when street number + ZIP match exactly one neighbor", async () => {
      findMany.mockResolvedValue([]); // exact + parcel miss
      findWithin.mockResolvedValueOnce([
        {
          id: "tp-geo",
          address: "123 Main Street",
          city: "Philadelphia",
          state: "PA",
          zipCode: "19103",
          distanceMeters: 50,
        },
      ]);
      const result = await resolveEntity({
        address: "123 Main St",
        city: "Philadelphia",
        state: "PA",
        zipCode: "19103",
        latitude: 39.9526,
        longitude: -75.1652,
      });
      expect(result.status).toBe("resolved");
      expect(result.strategy).toBe("geo-near-street-zip");
      expect(result.matchedPropertyId).toBe("tp-geo");
    });
  });
});
