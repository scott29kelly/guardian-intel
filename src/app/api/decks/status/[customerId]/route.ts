/**
 * GET /api/decks/status/[customerId]
 * 
 * Check the deck generation status for a specific customer.
 * Returns the most recent deck job for this customer.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    return NextResponse.json({
      hasDeck: true,
      deck: {
        ...latestDeck,
        ageMinutes,
        isStale,
      },
      // Convenience flags for UI
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
 * Cancel a pending deck job or delete a completed deck.
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

    // Find the deck to delete
    const deck = await prisma.scheduledDeck.findFirst({
      where: deckId 
        ? { id: deckId, customerId }
        : { customerId, status: { in: ["pending", "failed"] } },
      orderBy: { createdAt: "desc" },
    });

    if (!deck) {
      return NextResponse.json(
        { error: "No cancellable deck found" },
        { status: 404 }
      );
    }

    // Don't allow canceling jobs that are actively processing
    if (deck.status === "processing") {
      return NextResponse.json(
        { error: "Cannot cancel a deck that is currently processing" },
        { status: 409 }
      );
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
