/**
 * Entity Resolution types — shared between the resolver and its callers.
 */

export interface ResolutionInput {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number | null;
  longitude?: number | null;
  parcelNumber?: string | null;
}

export type ResolutionStrategy =
  | "exact-normalized"
  | "parcel"
  | "geo-near-street-zip"
  | "none";

export interface ResolutionResult {
  status: "resolved" | "pending_review" | "new";
  strategy: ResolutionStrategy;
  matchedPropertyId: string | null;
  candidateIds: string[]; // populated when status === "pending_review"
  confidence: number; // 0.0-1.0
}
