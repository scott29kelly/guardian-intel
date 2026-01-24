/**
 * Bulk Schedule Decks API (Manager Feature)
 *
 * POST /api/decks/schedule/bulk - Schedule multiple decks at once
 *
 * Allows managers to prep decks for their entire team's next-day meetings.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Validation schema for bulk scheduling
const bulkScheduleSchema = z.object({
  schedules: z
    .array(
      z.object({
        customerId: z.string().min(1),
        customerName: z.string().min(1),
        templateId: z.string().min(1),
        templateName: z.string().min(1),
        assignedToId: z.string().min(1), // Rep who will use this deck
        enabledSections: z.array(z.string()),
      })
    )
    .min(1, "At least one schedule is required")
    .max(50, "Maximum 50 decks per bulk request"),
});

/**
 * POST /api/decks/schedule/bulk
 *
 * Bulk schedule decks for batch processing (manager feature)
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting (stricter for bulk)
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

    const user = session.user as { id: string; role?: string };

    // Check if user is manager or admin
    if (user.role !== "manager" && user.role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Manager or admin role required for bulk scheduling" },
        { status: 403 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validation = bulkScheduleSchema.safeParse(body);

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

    const { schedules } = validation.data;

    // Calculate next batch window (2 AM tomorrow)
    const now = new Date();
    const scheduledFor = new Date(now);
    scheduledFor.setDate(scheduledFor.getDate() + 1);
    scheduledFor.setHours(2, 0, 0, 0);

    const estimatedReady = new Date(scheduledFor);
    estimatedReady.setHours(6, 0, 0, 0);

    // Create all scheduled decks in a transaction
    const createdDecks = await prisma.$transaction(
      schedules.map((schedule) =>
        prisma.scheduledDeck.create({
          data: {
            customerId: schedule.customerId,
            customerName: schedule.customerName,
            templateId: schedule.templateId,
            templateName: schedule.templateName,
            requestedById: user.id,
            assignedToId: schedule.assignedToId,
            status: "pending",
            requestPayload: JSON.stringify({
              customerId: schedule.customerId,
              customerName: schedule.customerName,
              templateId: schedule.templateId,
              templateName: schedule.templateName,
              options: {
                enabledSections: schedule.enabledSections,
                includeAiContent: true,
                exportFormat: "zip",
              },
            }),
            scheduledFor,
            estimatedSlides: schedule.enabledSections.length,
          },
        })
      )
    );

    console.log(
      `[Bulk Schedule] Manager ${user.id} scheduled ${createdDecks.length} decks for batch at ${scheduledFor.toISOString()}`
    );

    // Group by assignee for response
    const byAssignee = createdDecks.reduce(
      (acc, deck) => {
        const assignee = deck.assignedToId || "unassigned";
        if (!acc[assignee]) acc[assignee] = [];
        acc[assignee].push(deck.id);
        return acc;
      },
      {} as Record<string, string[]>
    );

    return NextResponse.json({
      success: true,
      totalScheduled: createdDecks.length,
      scheduledFor: scheduledFor.toISOString(),
      estimatedReady: estimatedReady.toISOString(),
      byAssignee,
      message: `${createdDecks.length} decks scheduled for batch processing. Will be ready by ${estimatedReady.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} tomorrow.`,
    });
  } catch (error) {
    console.error("[API] POST /api/decks/schedule/bulk error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to bulk schedule decks" },
      { status: 500 }
    );
  }
}
