/**
 * GET/DELETE /api/decks/status/[customerId]
 *
 * Check or cancel the deck generation status for a specific customer.
 *
 * Security:
 * - Requires NextAuth session (401 if missing).
 * - Rep-ownership enforced via assertCustomerAccess (D-05): the customer record is
 *   fetched BEFORE the deck record so the ownership check runs against a known
 *   assignedRepId. Reps see only their own customers; admins and managers may
 *   access any customer. Returns 403 on unauthorized access.
 *
 * Fixed 2026-04-07 (Phase 7 Tier 2):
 * - D-05: rep-ownership authorization on GET and DELETE via assertCustomerAccess
 *
 * Fixed 2026-04-07 (Phase 7 Tier 4):
 * - D-07: every GET poll triggers recoverStuckDecks() before reading the deck row,
 *   so any "processing" job whose updatedAt is older than 15 minutes is transitioned
 *   to "failed" automatically. Self-healing without a separate cron.
 * - D-08: DELETE on a "processing" deck now soft-deletes (marks as failed with
 *   errorMessage="Cancelled by user") instead of returning 409. Pending/failed/
 *   completed paths still hard-delete.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, assertCustomerAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recoverStuckDecks } from "@/lib/services/deck-processing";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { customerId } = await params;

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer ID is required" },
        { status: 400 }
      );
    }

    // D-07: Sweep stuck "processing" jobs on every status poll. Single updateMany,
    // cheap, idempotent, self-healing without a separate cron. Errors are logged
    // but never block the status response — recovery is best-effort. Must run
    // BEFORE the deck fetch so a recovered row returns its new "failed" status
    // on this same request instead of forcing the user to poll again.
    try {
      await recoverStuckDecks();
    } catch (sweepErr) {
      console.warn("[API] recoverStuckDecks failed during status poll:", sweepErr);
    }

    // D-05: Verify the caller is allowed to access this customer's decks BEFORE
    // returning any deck data. Fetch only the assignedRepId column — cheap.
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, assignedRepId: true },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    if (!assertCustomerAccess(session as { user: { id: string; role: string } }, customer)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If deckId is provided, look up that specific deck (for async job polling)
    const { searchParams } = new URL(request.url);
    const deckId = searchParams.get("deckId");

    // Get the most recent deck for this customer (or a specific one)
    const latestDeck = await prisma.scheduledDeck.findFirst({
      where: deckId
        ? { id: deckId, customerId }
        : { customerId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        customerId: true,
        customerName: true,
        templateName: true,
        status: true,
        scheduledFor: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
        errorMessage: true,
        retryCount: true,
        estimatedSlides: true,
        actualSlides: true,
        processingTimeMs: true,
        requestedBy: {
          select: { id: true, name: true },
        },
        pdfUrl: true,
        pdfStoragePath: true,
        resultPayload: true,
        // Multi-artifact fields
        requestedArtifacts: true,
        audioUrl: true,
        audioStoragePath: true,
        infographicUrl: true,
        infographicStoragePath: true,
        reportMarkdown: true,
        // Phase 8: per-artifact status columns (D-15, D-16)
        deckStatus: true,
        deckError: true,
        deckCompletedAt: true,
        infographicStatus: true,
        infographicError: true,
        infographicCompletedAt: true,
        audioStatus: true,
        audioError: true,
        audioCompletedAt: true,
        reportStatus: true,
        reportError: true,
        reportCompletedAt: true,
        notebookId: true,
      },
    });

    if (!latestDeck) {
      return NextResponse.json({
        hasDeck: false,
        message: "No deck has been generated for this customer",
      });
    }

    // Calculate time since creation for pending/processing jobs
    const ageMs = Date.now() - new Date(latestDeck.createdAt).getTime();
    const ageMinutes = Math.floor(ageMs / 60000);

    // Determine if job might be stale (stuck in processing > 10 min)
    const isStale = 
      latestDeck.status === "processing" && 
      ageMinutes > 10;

    // Phase 8 (D-15, D-16, D-17): build the per-artifact block. Existing top-level
    // fields (pdfUrl, status, hasDeck, isPending, etc.) are preserved unchanged so
    // legacy callers (deck generator UI) keep working. New callers read the
    // `artifacts` block for per-type state.
    //
    // Report block (D-17) adds an inline `markdown` field from the reportMarkdown
    // column; reports are NOT uploaded to Supabase.
    const artifacts = {
      deck: {
        status: (latestDeck.deckStatus as string | null) ?? null,
        url: latestDeck.pdfUrl ?? null,
        error: latestDeck.deckError ?? null,
        completedAt: latestDeck.deckCompletedAt ?? null,
      },
      infographic: {
        status: (latestDeck.infographicStatus as string | null) ?? null,
        url: latestDeck.infographicUrl ?? null,
        error: latestDeck.infographicError ?? null,
        completedAt: latestDeck.infographicCompletedAt ?? null,
      },
      audio: {
        status: (latestDeck.audioStatus as string | null) ?? null,
        url: latestDeck.audioUrl ?? null,
        error: latestDeck.audioError ?? null,
        completedAt: latestDeck.audioCompletedAt ?? null,
      },
      report: {
        status: (latestDeck.reportStatus as string | null) ?? null,
        url: null,
        error: latestDeck.reportError ?? null,
        completedAt: latestDeck.reportCompletedAt ?? null,
        markdown: latestDeck.reportMarkdown ?? null,
      },
    };

    return NextResponse.json({
      hasDeck: true,
      deck: {
        ...latestDeck,
        ageMinutes,
        isStale,
      },
      // Phase 8: per-artifact block (D-15, D-16)
      artifacts,
      // Convenience flags for UI (unchanged)
      isPending: latestDeck.status === "pending",
      isProcessing: latestDeck.status === "processing",
      isCompleted: latestDeck.status === "completed",
      isFailed: latestDeck.status === "failed",
      isReady: latestDeck.status === "completed",
      pdfUrl: latestDeck.pdfUrl || null,
    });

  } catch (error) {
    console.error("[API] Error checking deck status:", error);
    return NextResponse.json(
      { error: "Failed to check deck status" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/decks/status/[customerId]
 *
 * Cancel or delete a deck job.
 * - status="pending" or "failed": hard-delete the row.
 * - status="completed": delete the row and the Supabase artifacts.
 * - status="processing": SOFT-delete — mark as failed with errorMessage="Cancelled by user"
 *   to preserve the audit trail (D-08, Phase 7). Background NotebookLM work may
 *   still complete after this point — the row is flagged failed and the resulting
 *   artifacts will be ignored by the UI.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { customerId } = await params;
    const { searchParams } = new URL(request.url);
    const deckId = searchParams.get("deckId");

    // D-05: Same rep-ownership check as GET. Fetch the customer first and verify
    // the caller is allowed to cancel/delete decks for this customer.
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, assignedRepId: true },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    if (!assertCustomerAccess(session as { user: { id: string; role: string } }, customer)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find the deck to delete. D-08: include "processing" so the no-deckId path
    // can find an in-flight deck and soft-delete it below.
    const deck = await prisma.scheduledDeck.findFirst({
      where: deckId
        ? { id: deckId, customerId }
        : { customerId, status: { in: ["pending", "failed", "processing"] } },
      orderBy: { createdAt: "desc" },
    });

    if (!deck) {
      return NextResponse.json(
        { error: "No cancellable deck found" },
        { status: 404 }
      );
    }

    // D-08: Allow cancelling processing jobs via SOFT-delete. Mark as failed
    // with a known errorMessage so the audit trail is preserved (background
    // NotebookLM work may still complete after this point — that is acceptable;
    // the user wanted out, the row is now flagged failed, and the resulting
    // artifacts will be ignored by the UI).
    if (deck.status === "processing") {
      await prisma.scheduledDeck.update({
        where: { id: deck.id },
        data: {
          status: "failed",
          errorMessage: "Cancelled by user",
          completedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Processing deck cancelled (marked as failed for audit)",
        cancelledId: deck.id,
      });
    }

    // If completed, delete the PDF from Supabase Storage
    if (deck.status === "completed" && (deck as { pdfStoragePath?: string }).pdfStoragePath) {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const bucket = process.env.SUPABASE_STORAGE_BUCKET || "deck-pdfs";
          await supabase.storage.from(bucket).remove([(deck as { pdfStoragePath: string }).pdfStoragePath]);
        }
      } catch (storageErr) {
        console.warn("[API] Failed to delete PDF from storage:", storageErr);
        // Continue with DB deletion even if storage cleanup fails
      }
    }

    await prisma.scheduledDeck.delete({
      where: { id: deck.id },
    });

    return NextResponse.json({
      success: true,
      message: "Deck job cancelled",
      deletedId: deck.id,
    });

  } catch (error) {
    console.error("[API] Error cancelling deck:", error);
    return NextResponse.json(
      { error: "Failed to cancel deck" },
      { status: 500 }
    );
  }
}
