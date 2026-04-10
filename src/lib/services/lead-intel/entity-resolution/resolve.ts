/**
 * Entity Resolution (LG-03)
 *
 * Attempts to match an incoming address to an existing TrackedProperty
 * using three strategies in strict priority order. Stops at the first
 * non-empty result. When multiple candidates tie at the same priority
 * level, the result is marked `pending_review` and NOT auto-merged.
 *
 * Strategies:
 *   1. exact-normalized  — normalizedKey equality (address + ZIP)
 *   2. parcel            — both records have a parcelNumber and it matches
 *   3. geo-near-street-zip — within 100m via ST_DWithin AND street number matches AND ZIP matches
 */

import { prisma } from "@/lib/prisma";
import { buildNormalizedKey, normalizeAddress, extractStreetNumber } from "../normalization/address";
import { findPropertiesWithinRadius } from "../spatial/radius";
import type { ResolutionInput, ResolutionResult, ResolutionStrategy } from "./types";

const GEO_RADIUS_METERS = 100;
const STRATEGY_CONFIDENCE: Record<ResolutionStrategy, number> = {
  "exact-normalized": 0.98,
  parcel: 1.0,
  "geo-near-street-zip": 0.85,
  none: 0,
};

export async function resolveEntity(input: ResolutionInput): Promise<ResolutionResult> {
  // --- Strategy 1: exact normalized address match ---
  const normalizedKey = buildNormalizedKey(input.address, input.zipCode);
  if (normalizedKey.split("|")[0].length > 0) {
    const exactMatches = await prisma.trackedProperty.findMany({
      where: { normalizedKey },
      select: { id: true },
      take: 5,
    });
    if (exactMatches.length === 1) {
      return {
        status: "resolved",
        strategy: "exact-normalized",
        matchedPropertyId: exactMatches[0].id,
        candidateIds: [],
        confidence: STRATEGY_CONFIDENCE["exact-normalized"],
      };
    }
    if (exactMatches.length > 1) {
      return {
        status: "pending_review",
        strategy: "exact-normalized",
        matchedPropertyId: null,
        candidateIds: exactMatches.map((m) => m.id),
        confidence: STRATEGY_CONFIDENCE["exact-normalized"],
      };
    }
  }

  // --- Strategy 2: parcel number match ---
  if (input.parcelNumber && input.parcelNumber.trim().length > 0) {
    const parcel = input.parcelNumber.trim();
    const parcelMatches = await prisma.trackedProperty.findMany({
      where: { parcelNumber: parcel },
      select: { id: true },
      take: 5,
    });
    if (parcelMatches.length === 1) {
      return {
        status: "resolved",
        strategy: "parcel",
        matchedPropertyId: parcelMatches[0].id,
        candidateIds: [],
        confidence: STRATEGY_CONFIDENCE.parcel,
      };
    }
    if (parcelMatches.length > 1) {
      return {
        status: "pending_review",
        strategy: "parcel",
        matchedPropertyId: null,
        candidateIds: parcelMatches.map((m) => m.id),
        confidence: STRATEGY_CONFIDENCE.parcel,
      };
    }
  }

  // --- Strategy 3: geo-near + street number + ZIP ---
  if (
    typeof input.latitude === "number" &&
    typeof input.longitude === "number" &&
    input.zipCode
  ) {
    const neighbors = await findPropertiesWithinRadius({
      latitude: input.latitude,
      longitude: input.longitude,
      radiusMeters: GEO_RADIUS_METERS,
      limit: 20,
    });
    if (neighbors.length > 0) {
      const inputStreetNumber = extractStreetNumber(normalizeAddress(input.address));
      const candidates = neighbors.filter((n) => {
        if (n.zipCode !== input.zipCode) return false;
        const candidateStreetNum = extractStreetNumber(normalizeAddress(n.address));
        return inputStreetNumber && candidateStreetNum === inputStreetNumber;
      });
      if (candidates.length === 1) {
        return {
          status: "resolved",
          strategy: "geo-near-street-zip",
          matchedPropertyId: candidates[0].id,
          candidateIds: [],
          confidence: STRATEGY_CONFIDENCE["geo-near-street-zip"],
        };
      }
      if (candidates.length > 1) {
        return {
          status: "pending_review",
          strategy: "geo-near-street-zip",
          matchedPropertyId: null,
          candidateIds: candidates.map((c) => c.id),
          confidence: STRATEGY_CONFIDENCE["geo-near-street-zip"],
        };
      }
    }
  }

  // No match at any strategy level — the caller will create a new TrackedProperty
  return {
    status: "new",
    strategy: "none",
    matchedPropertyId: null,
    candidateIds: [],
    confidence: 0,
  };
}
