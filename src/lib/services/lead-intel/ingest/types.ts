/**
 * Ingest run types — describe a single batch-write operation that produces
 * one SourceIngestionRun row and N PropertySourceRecord + PropertySignalEvent rows.
 */

export interface IngestRunContext {
  runId: string;
  source: string; // e.g. "internal-backfill:customer"
  sourceVersion?: string;
  trigger: "manual" | "backfill" | "ingest" | "test";
  triggeredByUserId?: string;
  startedAt: Date;
}

export interface IngestedSourceRow {
  sourceType: string;
  sourceId: string;
  sourceRecordedAt: Date;
  reliabilityWeight: number;
  payload: Record<string, unknown>;
  // The canonical address for entity resolution
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number | null;
  longitude?: number | null;
  parcelNumber?: string | null;
}

export interface IngestStats {
  recordsRead: number;
  recordsWritten: number;
  recordsSkipped: number;
  signalsWritten: number;
  propertiesCreated: number;
  propertiesMatched: number;
  errors: string[];
}
