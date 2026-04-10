/**
 * Backfill barrel — re-exports all 5 internal signal extractors.
 * The actual runBackfill orchestrator is created in Plan 08-03 (which owns
 * the API route that triggers backfill); Plan 08-02 only ships the extractors.
 */

export { extractRoofAge } from "./extractors/roof-age";
export type { RoofAgeExtractorInput, SignalEventDraft } from "./extractors/roof-age";
export { extractStormExposure } from "./extractors/storm-exposure";
export type { StormExtractorInput } from "./extractors/storm-exposure";
export { extractCanvassingRecency } from "./extractors/canvassing-recency";
export type { CanvassingExtractorInput } from "./extractors/canvassing-recency";
export { extractContactRecency } from "./extractors/crm-contact-recency";
export type { ContactRecencyExtractorInput } from "./extractors/crm-contact-recency";
export { extractNeighborWins } from "./extractors/neighbor-win";
export type { NeighborWinExtractorInput } from "./extractors/neighbor-win";
export { runInternalBackfill } from "./run";
