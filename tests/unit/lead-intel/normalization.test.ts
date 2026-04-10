import { describe, it, expect } from "vitest";
import {
  normalizeAddress,
  buildNormalizedKey,
  extractStreetNumber,
} from "@/lib/services/lead-intel/normalization/address";

describe("lead-intel / normalization (LG-03)", () => {
  describe("normalizeAddress — determinism", () => {
    it("lowercases and trims", () => {
      expect(normalizeAddress("  123 MAIN ST  ")).toBe("123 main street");
    });

    it("collapses multiple spaces", () => {
      expect(normalizeAddress("123   Main    St")).toBe("123 main street");
    });

    it("expands common street-type abbreviations", () => {
      expect(normalizeAddress("123 Main Rd")).toBe("123 main road");
      expect(normalizeAddress("45 Oak Ave")).toBe("45 oak avenue");
      expect(normalizeAddress("7 Hill Blvd")).toBe("7 hill boulevard");
      expect(normalizeAddress("9 Pine Ln")).toBe("9 pine lane");
    });

    it("expands directional abbreviations only after the leading street number", () => {
      expect(normalizeAddress("123 N Main St")).toBe("123 north main street");
      expect(normalizeAddress("500 NW Pine St")).toBe("500 northwest pine street");
    });

    it("produces identical output for 3 variants of the same address", () => {
      const a = normalizeAddress("123 MAIN ST");
      const b = normalizeAddress("  123 main st  ");
      const c = normalizeAddress("123   Main  Street");
      expect(a).toBe(b);
      expect(b).toBe(c);
    });

    it("strips periods, commas, and quotes but keeps # for unit numbers", () => {
      expect(normalizeAddress("123 Main St., Apt #4")).toBe("123 main street apt #4");
    });

    it("returns empty string for null/undefined/empty input", () => {
      expect(normalizeAddress(null)).toBe("");
      expect(normalizeAddress(undefined)).toBe("");
      expect(normalizeAddress("")).toBe("");
    });
  });

  describe("buildNormalizedKey", () => {
    it("combines normalized address and ZIP with a pipe separator", () => {
      expect(buildNormalizedKey("123 Main St", "19103")).toBe("123 main street|19103");
    });

    it("distinguishes identical street addresses in different ZIPs", () => {
      const a = buildNormalizedKey("123 Main St", "19103");
      const b = buildNormalizedKey("123 Main St", "07030");
      expect(a).not.toBe(b);
    });
  });

  describe("extractStreetNumber", () => {
    it("extracts the leading numeric token", () => {
      expect(extractStreetNumber("123 main street")).toBe("123");
      expect(extractStreetNumber("45 oak avenue")).toBe("45");
    });

    it("returns null when no leading number is present", () => {
      expect(extractStreetNumber("main street")).toBeNull();
    });
  });
});
