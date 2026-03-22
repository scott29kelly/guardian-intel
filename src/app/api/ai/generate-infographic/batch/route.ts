/**
 * Batch Infographic Generation API
 *
 * POST /api/ai/generate-infographic/batch - Initiate batch generation for
 * multiple customers. Returns a jobId immediately (202) and runs generation
 * in the background.
 *
 * In-memory job store is sufficient for v1 since batch jobs are short-lived
 * and the API runs on a single server instance. Production should use Redis.
 *
 * Security: Requires NextAuth session (401 if unauthenticated)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateInfographic } from "@/features/infographic-generator/services/infographicGenerator";
import { cacheResult } from "@/features/infographic-generator/services/infographicCache";
import { getPresetsForBatch } from "@/features/infographic-generator/templates/index";
import type { InfographicResponse } from "@/features/infographic-generator/types/infographic.types";

// -----------------------------------------------------------------------------
// Batch Job Types
// -----------------------------------------------------------------------------

export interface BatchJobCustomer {
  customerId: string;
  status: "pending" | "generating" | "complete" | "error";
  result?: InfographicResponse;
  error?: string;
}

export interface BatchJob {
  jobId: string;
  customers: BatchJobCustomer[];
  startedAt: Date;
  completedAt?: Date;
}

// -----------------------------------------------------------------------------
// In-Memory Job Store
// -----------------------------------------------------------------------------

/** Module-level batch job store. Exported for status polling route. */
export const batchJobs = new Map<string, BatchJob>();

// -----------------------------------------------------------------------------
// Route Handler
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (
      !body.customerIds ||
      !Array.isArray(body.customerIds) ||
      body.customerIds.length === 0
    ) {
      return NextResponse.json(
        { error: "customerIds is required and must be a non-empty string array" },
        { status: 400 },
      );
    }

    if (typeof body.autoSelectPresets !== "boolean") {
      return NextResponse.json(
        { error: "autoSelectPresets is required and must be a boolean" },
        { status: 400 },
      );
    }

    const customerIds: string[] = body.customerIds;
    const jobId = crypto.randomUUID();

    // Initialize job with all customers as pending
    const job: BatchJob = {
      jobId,
      customers: customerIds.map((customerId) => ({
        customerId,
        status: "pending" as const,
      })),
      startedAt: new Date(),
    };

    batchJobs.set(jobId, job);

    // Fire and forget: run generation in background
    (async () => {
      const batchPresets = getPresetsForBatch();
      const batchPresetId = batchPresets[0]?.id || "pre-knock-briefing";

      for (const entry of job.customers) {
        entry.status = "generating";
        try {
          const response = await generateInfographic({
            customerId: entry.customerId,
            mode: "preset",
            presetId: batchPresetId,
            audience: "internal",
          });
          entry.status = "complete";
          entry.result = response;

          // Cache each result
          await cacheResult(
            {
              customerId: entry.customerId,
              presetId: batchPresetId,
              imageData: response.imageData,
              generatedAt: new Date(),
              expiresAt: new Date(Date.now() + 86400000),
              modelStrategy: response.model,
            },
            "internal",
          );
        } catch (err) {
          entry.status = "error";
          entry.error = err instanceof Error ? err.message : "Unknown error";
        }
      }

      job.completedAt = new Date();
    })();

    return NextResponse.json(
      { jobId, customerCount: customerIds.length },
      { status: 202 },
    );
  } catch (error) {
    console.error("[API] POST /api/ai/generate-infographic/batch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Batch initiation failed" },
      { status: 500 },
    );
  }
}
