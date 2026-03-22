/**
 * Batch Job Status Polling API
 *
 * GET /api/ai/generate-infographic/batch/[jobId] - Returns the current status
 * of a batch generation job with per-customer progress.
 *
 * Security: Requires NextAuth session (401 if unauthenticated)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { batchJobs } from "../route";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId } = await params;

    const job = batchJobs.get(jobId);
    if (!job) {
      return NextResponse.json(
        { error: "Batch job not found" },
        { status: 404 },
      );
    }

    // Compute summary stats
    const total = job.customers.length;
    const completed = job.customers.filter((c) => c.status === "complete").length;
    const failed = job.customers.filter((c) => c.status === "error").length;
    const pending = job.customers.filter((c) => c.status === "pending").length;
    const generating = job.customers.filter((c) => c.status === "generating").length;

    const allDone = job.customers.every(
      (c) => c.status === "complete" || c.status === "error",
    );

    return NextResponse.json({
      jobId,
      status: allDone ? "complete" : "in_progress",
      total,
      completed,
      failed,
      pending,
      generating,
      customers: job.customers.map((c) => ({
        customerId: c.customerId,
        status: c.status,
        result: c.result,
        error: c.error,
      })),
    });
  } catch (error) {
    console.error("[API] GET /api/ai/generate-infographic/batch/[jobId] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Status check failed" },
      { status: 500 },
    );
  }
}
