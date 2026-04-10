-- Phase 8 Lead-Intel migration
-- Enables PostGIS, adds the geography column on TrackedProperty, and creates
-- the GIST spatial index that ST_DWithin queries will use.
--
-- NO RLS POLICIES in this migration -- deferred per LG-02. The new lead_intel_*
-- tables ship with the same loose posture as Customer/WeatherEvent/CanvassingPin
-- and will be hardened in a future security-hardening phase alongside the
-- Phase 7 D-06 Supabase bucket lockdown TODO.

-- ============================================
-- NEW TABLES: Lead Intel (Phase 8)
-- ============================================

-- TrackedProperty
CREATE TABLE "TrackedProperty" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "county" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "parcelNumber" TEXT,
    "normalizedAddress" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "resolutionStatus" TEXT NOT NULL DEFAULT 'resolved',
    "lastSignalAt" TIMESTAMP(3),
    "lastScoreAt" TIMESTAMP(3),
    "latestScore" DOUBLE PRECISION,
    "signalCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TrackedProperty_pkey" PRIMARY KEY ("id")
);

-- SourceIngestionRun
CREATE TABLE "SourceIngestionRun" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "sourceVersion" TEXT,
    "trigger" TEXT NOT NULL,
    "triggeredByUserId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "recordsRead" INTEGER NOT NULL DEFAULT 0,
    "recordsWritten" INTEGER NOT NULL DEFAULT 0,
    "recordsSkipped" INTEGER NOT NULL DEFAULT 0,
    "signalsWritten" INTEGER NOT NULL DEFAULT 0,
    "propertiesCreated" INTEGER NOT NULL DEFAULT 0,
    "propertiesMatched" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "SourceIngestionRun_pkey" PRIMARY KEY ("id")
);

-- PropertySourceRecord
CREATE TABLE "PropertySourceRecord" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trackedPropertyId" TEXT NOT NULL,
    "ingestionRunId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceRecordedAt" TIMESTAMP(3) NOT NULL,
    "reliabilityWeight" DOUBLE PRECISION NOT NULL,
    "payload" TEXT NOT NULL,

    CONSTRAINT "PropertySourceRecord_pkey" PRIMARY KEY ("id")
);

-- PropertyResolution
CREATE TABLE "PropertyResolution" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "intoPropertyId" TEXT NOT NULL,
    "fromPropertyId" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "PropertyResolution_pkey" PRIMARY KEY ("id")
);

-- PropertySignalEvent
CREATE TABLE "PropertySignalEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trackedPropertyId" TEXT NOT NULL,
    "ingestionRunId" TEXT NOT NULL,
    "sourceRecordId" TEXT,
    "signalType" TEXT NOT NULL,
    "eventTimestamp" TIMESTAMP(3) NOT NULL,
    "baseWeight" DOUBLE PRECISION NOT NULL,
    "reliabilityWeight" DOUBLE PRECISION NOT NULL,
    "halfLifeDays" INTEGER NOT NULL,
    "value" DOUBLE PRECISION,
    "metadata" TEXT,

    CONSTRAINT "PropertySignalEvent_pkey" PRIMARY KEY ("id")
);

-- PropertyScoreSnapshot
CREATE TABLE "PropertyScoreSnapshot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trackedPropertyId" TEXT NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "formulaVersion" TEXT NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contributions" TEXT NOT NULL,
    "signalCount" INTEGER NOT NULL,

    CONSTRAINT "PropertyScoreSnapshot_pkey" PRIMARY KEY ("id")
);

-- PropertyOutcomeEvent
CREATE TABLE "PropertyOutcomeEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trackedPropertyId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceMutationId" TEXT NOT NULL,
    "payload" TEXT NOT NULL,

    CONSTRAINT "PropertyOutcomeEvent_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- BRIDGE FK COLUMNS on existing tables
-- ============================================

ALTER TABLE "Customer" ADD COLUMN "trackedPropertyId" TEXT;
ALTER TABLE "WeatherEvent" ADD COLUMN "trackedPropertyId" TEXT;
ALTER TABLE "CanvassingPin" ADD COLUMN "trackedPropertyId" TEXT;
ALTER TABLE "PropertyData" ADD COLUMN "trackedPropertyId" TEXT;

-- ============================================
-- UNIQUE CONSTRAINTS
-- ============================================

CREATE UNIQUE INDEX "PropertySourceRecord_sourceType_sourceId_key"
    ON "PropertySourceRecord"("sourceType", "sourceId");

CREATE UNIQUE INDEX "PropertyOutcomeEvent_trackedPropertyId_eventType_sourceMutationId_key"
    ON "PropertyOutcomeEvent"("trackedPropertyId", "eventType", "sourceMutationId");

-- ============================================
-- INDEXES: TrackedProperty
-- ============================================

CREATE INDEX "TrackedProperty_normalizedKey_idx" ON "TrackedProperty"("normalizedKey");
CREATE INDEX "TrackedProperty_parcelNumber_idx" ON "TrackedProperty"("parcelNumber");
CREATE INDEX "TrackedProperty_zipCode_idx" ON "TrackedProperty"("zipCode");
CREATE INDEX "TrackedProperty_state_zipCode_idx" ON "TrackedProperty"("state", "zipCode");
CREATE INDEX "TrackedProperty_latestScore_idx" ON "TrackedProperty"("latestScore");
CREATE INDEX "TrackedProperty_resolutionStatus_idx" ON "TrackedProperty"("resolutionStatus");
CREATE INDEX "TrackedProperty_lastSignalAt_idx" ON "TrackedProperty"("lastSignalAt");

-- ============================================
-- INDEXES: SourceIngestionRun
-- ============================================

CREATE INDEX "SourceIngestionRun_source_idx" ON "SourceIngestionRun"("source");
CREATE INDEX "SourceIngestionRun_status_idx" ON "SourceIngestionRun"("status");
CREATE INDEX "SourceIngestionRun_createdAt_idx" ON "SourceIngestionRun"("createdAt");

-- ============================================
-- INDEXES: PropertySourceRecord
-- ============================================

CREATE INDEX "PropertySourceRecord_trackedPropertyId_idx" ON "PropertySourceRecord"("trackedPropertyId");
CREATE INDEX "PropertySourceRecord_ingestionRunId_idx" ON "PropertySourceRecord"("ingestionRunId");
CREATE INDEX "PropertySourceRecord_sourceRecordedAt_idx" ON "PropertySourceRecord"("sourceRecordedAt");

-- ============================================
-- INDEXES: PropertyResolution
-- ============================================

CREATE INDEX "PropertyResolution_intoPropertyId_idx" ON "PropertyResolution"("intoPropertyId");
CREATE INDEX "PropertyResolution_fromPropertyId_idx" ON "PropertyResolution"("fromPropertyId");
CREATE INDEX "PropertyResolution_status_idx" ON "PropertyResolution"("status");

-- ============================================
-- INDEXES: PropertySignalEvent
-- ============================================

CREATE INDEX "PropertySignalEvent_trackedPropertyId_signalType_idx" ON "PropertySignalEvent"("trackedPropertyId", "signalType");
CREATE INDEX "PropertySignalEvent_signalType_eventTimestamp_idx" ON "PropertySignalEvent"("signalType", "eventTimestamp");
CREATE INDEX "PropertySignalEvent_ingestionRunId_idx" ON "PropertySignalEvent"("ingestionRunId");
CREATE INDEX "PropertySignalEvent_eventTimestamp_idx" ON "PropertySignalEvent"("eventTimestamp");

-- ============================================
-- INDEXES: PropertyScoreSnapshot
-- ============================================

CREATE INDEX "PropertyScoreSnapshot_trackedPropertyId_evaluatedAt_idx" ON "PropertyScoreSnapshot"("trackedPropertyId", "evaluatedAt");
CREATE INDEX "PropertyScoreSnapshot_totalScore_idx" ON "PropertyScoreSnapshot"("totalScore");

-- ============================================
-- INDEXES: PropertyOutcomeEvent
-- ============================================

CREATE INDEX "PropertyOutcomeEvent_trackedPropertyId_eventTimestamp_idx" ON "PropertyOutcomeEvent"("trackedPropertyId", "eventTimestamp");
CREATE INDEX "PropertyOutcomeEvent_eventType_idx" ON "PropertyOutcomeEvent"("eventType");

-- ============================================
-- INDEXES: Bridge FK indexes on existing tables
-- ============================================

CREATE INDEX "Customer_trackedPropertyId_idx" ON "Customer"("trackedPropertyId");
CREATE INDEX "WeatherEvent_trackedPropertyId_idx" ON "WeatherEvent"("trackedPropertyId");
CREATE INDEX "CanvassingPin_trackedPropertyId_idx" ON "CanvassingPin"("trackedPropertyId");
CREATE INDEX "PropertyData_trackedPropertyId_idx" ON "PropertyData"("trackedPropertyId");

-- ============================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================

-- Bridge FKs (SetNull on delete)
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_trackedPropertyId_fkey"
    FOREIGN KEY ("trackedPropertyId") REFERENCES "TrackedProperty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WeatherEvent" ADD CONSTRAINT "WeatherEvent_trackedPropertyId_fkey"
    FOREIGN KEY ("trackedPropertyId") REFERENCES "TrackedProperty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CanvassingPin" ADD CONSTRAINT "CanvassingPin_trackedPropertyId_fkey"
    FOREIGN KEY ("trackedPropertyId") REFERENCES "TrackedProperty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PropertyData" ADD CONSTRAINT "PropertyData_trackedPropertyId_fkey"
    FOREIGN KEY ("trackedPropertyId") REFERENCES "TrackedProperty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- New model FKs (Cascade on delete)
ALTER TABLE "PropertySourceRecord" ADD CONSTRAINT "PropertySourceRecord_trackedPropertyId_fkey"
    FOREIGN KEY ("trackedPropertyId") REFERENCES "TrackedProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertySourceRecord" ADD CONSTRAINT "PropertySourceRecord_ingestionRunId_fkey"
    FOREIGN KEY ("ingestionRunId") REFERENCES "SourceIngestionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyResolution" ADD CONSTRAINT "PropertyResolution_intoPropertyId_fkey"
    FOREIGN KEY ("intoPropertyId") REFERENCES "TrackedProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyResolution" ADD CONSTRAINT "PropertyResolution_fromPropertyId_fkey"
    FOREIGN KEY ("fromPropertyId") REFERENCES "TrackedProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertySignalEvent" ADD CONSTRAINT "PropertySignalEvent_trackedPropertyId_fkey"
    FOREIGN KEY ("trackedPropertyId") REFERENCES "TrackedProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertySignalEvent" ADD CONSTRAINT "PropertySignalEvent_ingestionRunId_fkey"
    FOREIGN KEY ("ingestionRunId") REFERENCES "SourceIngestionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyScoreSnapshot" ADD CONSTRAINT "PropertyScoreSnapshot_trackedPropertyId_fkey"
    FOREIGN KEY ("trackedPropertyId") REFERENCES "TrackedProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PropertyOutcomeEvent" ADD CONSTRAINT "PropertyOutcomeEvent_trackedPropertyId_fkey"
    FOREIGN KEY ("trackedPropertyId") REFERENCES "TrackedProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- PostGIS: Extension + Geography Column + GIST Index
-- ============================================

-- 1. Enable PostGIS (idempotent)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add the geography column to TrackedProperty.
--    Prisma declares this as Unsupported("geography(Point,4326)")?
--    but cannot actually DDL it -- we do that here.
--    Guarded with IF NOT EXISTS so re-running the migration is safe.
ALTER TABLE "TrackedProperty"
  ADD COLUMN IF NOT EXISTS "location" geography(Point, 4326);

-- 3. Backfill: if latitude/longitude are set on a row, populate location
--    (on a fresh install there are no rows; this is a no-op. On a subsequent
--    backfill run the writeTrackedProperty service will set it directly.)
UPDATE "TrackedProperty"
  SET "location" = ST_SetSRID(ST_MakePoint("longitude", "latitude"), 4326)::geography
  WHERE "location" IS NULL
    AND "latitude" IS NOT NULL
    AND "longitude" IS NOT NULL;

-- 4. GIST spatial index -- ST_DWithin requires this to be fast
CREATE INDEX IF NOT EXISTS "idx_tracked_property_location"
  ON "TrackedProperty"
  USING GIST ("location");
