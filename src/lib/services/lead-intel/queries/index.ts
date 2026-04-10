/**
 * Queries barrel.
 *
 * The saved compound query (LG-09, "high-value roof+storm+neighbor") is
 * implemented in Plan 08-03 under this same directory as `saved.ts`.
 * Plan 08-02 ships the list/detail readers; Plan 08-03 adds the saved query.
 */

export { listTrackedProperties, getPropertyDetail } from "./properties";
export type { PropertyListFilters, PropertyListRow, PropertyDetail } from "./properties";
export { highValueRoofStormNeighbor } from "./saved";
export type { HighValueMatch } from "./saved";
