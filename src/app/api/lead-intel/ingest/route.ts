/**
 * POST /api/lead-intel/ingest
 *
 * n8n entry point for lead-intel source rows. Authenticated via a shared-secret
 * header `X-Lead-Intel-Ingest-Key` that MUST match env.LEAD_INTEL_INGEST_SECRET.
 *
 * Phase 8 LG-06: shared-secret only. No NextAuth. The endpoint receives a
 * batch of IngestedSourceRow-shaped objects and routes each through
 * processSourceRow, which resolves entities and upserts provenance records.
 *
 * Request body:
 *   {
 *     source: string,                           // e.g. "n8n:permits"
 *     rows: IngestedSourceRow[]
 *   }
 *
 * Response (200):
 *   { success: true, runId, stats }
 *
 * Response (401): missing or wrong shared-secret header
 * Response (400): invalid body shape
 * Response (500): ingest run failed
 *
 * Security: Shared-secret header + constant-time comparison (T-08-03-01)
 */

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import {
  startIngestRun,
  finishIngestRun,
  processSourceRow,
} from "@/lib/services/lead-intel";
import type {
  IngestStats,
  IngestedSourceRow,
} from "@/lib/services/lead-intel";
import { createHmac, timingSafeEqual } from "crypto";

const emptyStats = (): IngestStats => ({
  recordsRead: 0,
  recordsWritten: 0,
  recordsSkipped: 0,
  signalsWritten: 0,
  propertiesCreated: 0,
  propertiesMatched: 0,
  errors: [],
});

/**
 * Constant-time string comparison that does not leak input lengths.
 * Both values are HMAC'd to produce fixed-length digests before comparing,
 * so the comparison time is independent of the original string lengths.
 */
function constantTimeEqual(a: string, b: string): boolean {
  const hmacA = createHmac("sha256", "lead-intel-compare").update(a).digest();
  const hmacB = createHmac("sha256", "lead-intel-compare").update(b).digest();
  return timingSafeEqual(hmacA, hmacB);
}

export async function POST(request: NextRequest) {
  try {
    // --- Shared-secret auth gate ---
    const secret = env.LEAD_INTEL_INGEST_SECRET;
    if (!secret) {
      console.error("[API] POST /api/lead-intel/ingest error: LEAD_INTEL_INGEST_SECRET not configured");
      return NextResponse.json(
        { success: false, error: "Ingest endpoint not configured" },
        { status: 503 },
      );
    }
    const provided = request.headers.get("x-lead-intel-ingest-key");
    if (!provided || !constantTimeEqual(provided, secret)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    if (
      !body ||
      typeof body.source !== "string" ||
      !Array.isArray(body.rows)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: "Body must be { source: string, rows: IngestedSourceRow[] }",
        },
        { status: 400 },
      );
    }

    const ctx = await startIngestRun({
      source: body.source,
      trigger: "ingest",
    });
    const stats = emptyStats();

    try {
      for (const row of body.rows as IngestedSourceRow[]) {
        stats.recordsRead += 1;
        // Basic row shape validation — reject malformed rows but continue the batch
        if (
          !row.sourceType ||
          !row.sourceId ||
          !row.address ||
          !row.zipCode ||
          !row.sourceRecordedAt
        ) {
          stats.recordsSkipped += 1;
          stats.errors.push(`invalid row: sourceId=${row.sourceId ?? "?"}`);
          continue;
        }
        const resolution = await processSourceRow(ctx.runId, {
          ...row,
          sourceRecordedAt: new Date(row.sourceRecordedAt),
        });
        stats.recordsWritten += 1;
        if (resolution.created) stats.propertiesCreated += 1;
        else stats.propertiesMatched += 1;
      }
      await finishIngestRun(ctx.runId, stats, "completed");
      return NextResponse.json({ success: true, runId: ctx.runId, stats });
    } catch (innerErr) {
      stats.errors.push(innerErr instanceof Error ? innerErr.message : String(innerErr));
      await finishIngestRun(
        ctx.runId,
        stats,
        "failed",
        innerErr instanceof Error ? innerErr.message : String(innerErr),
      );
      throw innerErr;
    }
  } catch (error) {
    console.error("[API] POST /api/lead-intel/ingest error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Ingest failed" },
      { status: 500 },
    );
  }
}
