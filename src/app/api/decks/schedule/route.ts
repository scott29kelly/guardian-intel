/**
 * Scheduled Decks API
 *
 * POST /api/decks/schedule - Schedule a deck for overnight batch processing
 * GET /api/decks/schedule - Get scheduled decks for current user
 *
 * Batch processing runs at 2 AM daily, decks ready by 6 AM.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Validation schema for scheduling a deck
const scheduleDeckSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  customerName: z.string().min(1, "Customer name is required"),
  templateId: z.string().min(1, "Template ID is required"),
  templateName: z.string().min(1, "Template name is required"),
  options: z.object({
    enabledSections: z.array(z.string()),
    includeAiContent: z.boolean().optional().default(true),
    exportFormat: z.enum(["pdf", "pptx", "zip"]).optional().default("zip"),
    customBranding: z.record(z.unknown()).optional(),
  }),
  assignedToId: z.string().optional(), // For manager bulk scheduling
});

/**
 * POST /api/decks/schedule
 *
 * Schedule a deck for batch processing
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = (session.user as { id: string }).id;

    // Parse and validate body
    const body = await request.json();
    const validation = scheduleDeckSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Calculate next batch window (2 AM tomorrow)
    const now = new Date();
    const scheduledFor = new Date(now);
    scheduledFor.setDate(scheduledFor.getDate() + 1);
    scheduledFor.setHours(2, 0, 0, 0);

    // Estimate ready time (6 AM)
    const estimatedReady = new Date(scheduledFor);
    estimatedReady.setHours(6, 0, 0, 0);

    // Create scheduled deck record
    const scheduledDeck = await prisma.scheduledDeck.create({
      data: {
        customerId: data.customerId,
        customerName: data.customerName,
        templateId: data.templateId,
        templateName: data.templateName,
        requestedById: userId,
        assignedToId: data.assignedToId || userId,
        status: "pending",
        requestPayload: JSON.stringify(data),
        scheduledFor,
        estimatedSlides: data.options.enabledSections.length,
      },
    });

    console.log(`[Scheduled Deck] Created ${scheduledDeck.id} for ${data.customerName}, batch at ${scheduledFor.toISOString()}`);

    return NextResponse.json({
      success: true,
      scheduledDeck: {
        id: scheduledDeck.id,
        customerId: scheduledDeck.customerId,
        customerName: scheduledDeck.customerName,
        templateName: scheduledDeck.templateName,
        status: scheduledDeck.status,
        scheduledFor: scheduledDeck.scheduledFor.toISOString(),
        estimatedReady: estimatedReady.toISOString(),
        estimatedSlides: scheduledDeck.estimatedSlides,
      },
      message: `Deck scheduled for batch processing. Will be ready by ${estimatedReady.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} tomorrow.`,
    });
  } catch (error) {
    console.error("[API] POST /api/decks/schedule error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to schedule deck" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/decks/schedule
 *
 * Get all scheduled decks for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = (session.user as { id: string }).id;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // pending, completed, all

    // Build where clause
    const whereClause: {
      OR: Array<{ requestedById: string } | { assignedToId: string }>;
      status?: string;
    } = {
      OR: [{ requestedById: userId }, { assignedToId: userId }],
    };

    if (status && status !== "all") {
      whereClause.status = status;
    }

    // Fetch scheduled decks
    const scheduledDecks = await prisma.scheduledDeck.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      scheduledDecks: scheduledDecks.map((deck) => ({
        id: deck.id,
        customerId: deck.customerId,
        customerName: deck.customerName,
        templateId: deck.templateId,
        templateName: deck.templateName,
        status: deck.status,
        scheduledFor: deck.scheduledFor.toISOString(),
        completedAt: deck.completedAt?.toISOString() || null,
        estimatedSlides: deck.estimatedSlides,
        actualSlides: deck.actualSlides,
        errorMessage: deck.errorMessage,
        createdAt: deck.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[API] GET /api/decks/schedule error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch scheduled decks" },
      { status: 500 }
    );
  }
}
