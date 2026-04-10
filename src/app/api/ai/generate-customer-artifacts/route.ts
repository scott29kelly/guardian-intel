/**
 * POST /api/ai/generate-customer-artifacts
 *
 * Fires a multi-artifact generation job for a customer. Creates a ScheduledDeck
 * row with requestedArtifacts populated, marks it as 'processing', and fires
 * background generation via processDeckWithNotebookLM (which delegates to
 * generateCustomerArtifacts internally per Plan 05).
 *
 * Security (Phase 8):
 * - D-12: assertCustomerAccess wraps the route — reps can only fire jobs for
 *         their own customers; admins/managers bypass.
 * - D-13: Inline manual validation (no Zod) — consistent with /api/decks/process-now.
 * - D-14: Returns 202 with { success, jobId, status: 'processing', customerId,
 *         requestedArtifacts }.
 *
 * Does NOT replace /api/decks/process-now — that route stays untouched so existing
 * deck-only UI flows keep working during Phase 9 cutover.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions, assertCustomerAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { processDeckWithNotebookLM } from "@/lib/services/deck-processing";
import type { ArtifactType } from "@/lib/services/notebooklm/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600; // 10 minutes — matches NotebookLM's 12-min poll window with buffer

const ALLOWED_ARTIFACTS: readonly ArtifactType[] = [
  "deck",
  "infographic",
  "audio",
  "report",
] as const;

export async function POST(request: NextRequest) {
  try {
    // --- Step 1: Auth ---
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Step 2: Inline body parsing + validation (D-13) ---
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
    }

    const { customerId, artifacts } = body as { customerId?: unknown; artifacts?: unknown };

    if (typeof customerId !== "string" || customerId.trim().length === 0) {
      return NextResponse.json(
        { error: "customerId is required and must be a non-empty string" },
        { status: 400 },
      );
    }

    if (!Array.isArray(artifacts)) {
      return NextResponse.json(
        { error: "artifacts must be an array" },
        { status: 400 },
      );
    }

    if (artifacts.length === 0) {
      return NextResponse.json(
        { error: "artifacts array must not be empty" },
        { status: 400 },
      );
    }

    // Validate each entry is a known ArtifactType and dedupe
    const seen = new Set<ArtifactType>();
    for (const entry of artifacts) {
      if (typeof entry !== "string" || !ALLOWED_ARTIFACTS.includes(entry as ArtifactType)) {
        return NextResponse.json(
          {
            error: `Unknown artifact type: ${String(entry)}`,
            allowed: ALLOWED_ARTIFACTS,
          },
          { status: 400 },
        );
      }
      seen.add(entry as ArtifactType);
    }
    const requestedArtifacts: ArtifactType[] = Array.from(seen);

    // --- Step 3: Rep-ownership check (D-12) ---
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, assignedRepId: true, firstName: true, lastName: true },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    if (
      !assertCustomerAccess(
        session as { user: { id: string; role: string } },
        customer,
      )
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // --- Step 4: Create the ScheduledDeck row ---
    const customerName = `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || "Unknown Customer";

    // Initialize per-artifact status: requested artifacts start 'pending',
    // unrequested artifacts are 'skipped' (D-03). Top-level status is 'processing'
    // because we fire background generation immediately.
    //
    // Typed as Partial<Prisma.ScheduledDeckCreateInput> so TypeScript validates the
    // computed per-artifact status keys against the real Prisma schema instead of
    // letting a generic Record<string, string> mask drift.
    const perArtifactInit: Partial<Prisma.ScheduledDeckCreateInput> = {};
    for (const type of ALLOWED_ARTIFACTS) {
      (perArtifactInit as Record<string, string>)[`${type}Status`] = requestedArtifacts.includes(type) ? "pending" : "skipped";
    }

    // Compose the create data using the UncheckedCreateInput shape (consistent with
    // the established pattern in /api/decks/schedule/route.ts — `requestedById` is
    // passed directly rather than via the `requestedBy: { connect: ... }` relation).
    // `perArtifactInit` is spread as a Record<string, string> so TypeScript does
    // not collapse the create into the checked (relation-based) variant.
    const createData: Prisma.ScheduledDeckUncheckedCreateInput = {
      customerId: customer.id,
      customerName,
      templateId: "multi-artifact",
      templateName: "Multi-Artifact Generation",
      requestedById: session.user.id,
      status: "processing",
      requestPayload: JSON.stringify({
        customer: { id: customer.id, firstName: customer.firstName, lastName: customer.lastName },
        requestedArtifacts,
        source: "generate-customer-artifacts",
      }),
      requestedArtifacts,
      ...(perArtifactInit as Record<string, string>),
    };

    const job = await prisma.scheduledDeck.create({
      data: createData,
      select: { id: true },
    });

    console.log(`[GenerateArtifacts] Created job ${job.id} for customer ${customer.id} — artifacts: ${requestedArtifacts.join(", ")}`);

    // --- Step 5: Fire-and-forget background processing ---
    // Plan 05 refactors processDeckWithNotebookLM to delegate to generateCustomerArtifacts
    // when the job's templateId === 'multi-artifact' OR when requestedArtifacts spans
    // multiple types. Until Plan 05 lands, the legacy function still runs the old loop —
    // the route contract is unchanged.
    processDeckWithNotebookLM(job.id)
      .then((result) => {
        if (result.success) {
          console.log(`[GenerateArtifacts] Background processing completed for job ${job.id} in ${result.processingTimeMs}ms`);
        } else {
          console.error(`[GenerateArtifacts] Background processing failed for job ${job.id}: ${result.error}`);
        }
      })
      .catch((err) => {
        console.error(`[GenerateArtifacts] Unhandled error processing job ${job.id}:`, err);
      });

    // --- Step 6: 202 response (D-14) ---
    return NextResponse.json(
      {
        success: true,
        jobId: job.id,
        status: "processing" as const,
        customerId: customer.id,
        requestedArtifacts,
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("[GenerateArtifacts] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start generation" },
      { status: 500 },
    );
  }
}
