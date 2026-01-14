/**
 * Customer Timeline API
 * 
 * GET /api/customers/[id]/timeline - Get merged activity timeline
 * 
 * Returns a chronological list of:
 * - Interactions (calls, emails, visits)
 * - Weather events affecting property
 * - Intel items discovered
 * - Notes added
 * - Stage changes (via activity tracking)
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { cuidSchema } from "@/lib/validations";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Timeline item types for frontend
export type TimelineItemType = 
  | "interaction" 
  | "weather_event" 
  | "intel" 
  | "note" 
  | "stage_change"
  | "claim";

export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  date: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  priority?: "low" | "medium" | "high" | "critical";
  user?: string | null;
}

interface TimelineResponse {
  success: boolean;
  items: TimelineItem[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total: number;
  };
}

/**
 * GET /api/customers/[id]/timeline
 * 
 * Query params:
 * - cursor: string - Pagination cursor (last item date)
 * - limit: number - Items per page (default 20, max 50)
 * - types: string - Comma-separated list of types to include
 */
export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse<TimelineResponse | { success: false; error: string }>> {
  try {
    // Require authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const { id } = await params;

    // Validate ID
    const idValidation = cuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: "Invalid customer ID" },
        { status: 400 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const typesParam = searchParams.get("types");
    const allowedTypes = typesParam
      ? typesParam.split(",").filter(t =>
          ["interaction", "weather_event", "intel", "note", "stage_change", "claim"].includes(t)
        ) as TimelineItemType[]
      : null;

    // Check customer exists and verify access
    // Reps can only access their assigned customers; managers/admins can access all
    const userRole = (session.user as { role?: string }).role;
    const whereClause: { id: string; assignedRepId?: string } = { id };

    if (userRole === "rep") {
      whereClause.assignedRepId = session.user.id;
    }

    const customer = await prisma.customer.findFirst({
      where: whereClause,
      select: { id: true },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    const cursorDate = cursor ? new Date(cursor) : new Date();

    // Fetch all timeline data in parallel
    const [interactions, weatherEvents, intelItems, notes, claims] = await Promise.all([
      // Interactions
      (!allowedTypes || allowedTypes.includes("interaction"))
        ? prisma.interaction.findMany({
            where: {
              customerId: id,
              createdAt: { lt: cursorDate },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            include: {
              user: { select: { name: true } },
            },
          })
        : [],

      // Weather Events
      (!allowedTypes || allowedTypes.includes("weather_event"))
        ? prisma.weatherEvent.findMany({
            where: {
              customerId: id,
              createdAt: { lt: cursorDate },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
          })
        : [],

      // Intel Items
      (!allowedTypes || allowedTypes.includes("intel"))
        ? prisma.intelItem.findMany({
            where: {
              customerId: id,
              createdAt: { lt: cursorDate },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
          })
        : [],

      // Notes
      (!allowedTypes || allowedTypes.includes("note"))
        ? prisma.note.findMany({
            where: {
              customerId: id,
              createdAt: { lt: cursorDate },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
            include: {
              user: { select: { name: true } },
            },
          })
        : [],

      // Insurance Claims
      (!allowedTypes || allowedTypes.includes("claim"))
        ? prisma.insuranceClaim.findMany({
            where: {
              customerId: id,
              createdAt: { lt: cursorDate },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
          })
        : [],
    ]);

    // Transform and merge into unified timeline items
    const items: TimelineItem[] = [];

    // Transform interactions
    interactions.forEach((interaction) => {
      const typeLabel = {
        call: "Phone Call",
        email: "Email",
        text: "Text Message",
        visit: "Site Visit",
        meeting: "Meeting",
        "video-call": "Video Call",
      }[interaction.type] || interaction.type;

      items.push({
        id: interaction.id,
        type: "interaction",
        date: interaction.createdAt.toISOString(),
        title: `${typeLabel}${interaction.direction === "inbound" ? " (Inbound)" : ""}`,
        description: interaction.subject || interaction.content || interaction.outcome,
        metadata: {
          interactionType: interaction.type,
          direction: interaction.direction,
          outcome: interaction.outcome,
          duration: interaction.duration,
          sentiment: interaction.sentiment,
          nextAction: interaction.nextAction,
          nextActionDate: interaction.nextActionDate?.toISOString(),
        },
        user: interaction.user?.name,
      });
    });

    // Transform weather events
    weatherEvents.forEach((event) => {
      const severityPriority: Record<string, TimelineItem["priority"]> = {
        minor: "low",
        moderate: "medium",
        severe: "high",
        catastrophic: "critical",
      };

      items.push({
        id: event.id,
        type: "weather_event",
        date: event.eventDate.toISOString(),
        title: `${event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)} Event`,
        description: [
          event.hailSize && `${event.hailSize}" hail`,
          event.windSpeed && `${event.windSpeed} mph winds`,
          event.severity && `Severity: ${event.severity}`,
        ].filter(Boolean).join(" • ") || null,
        priority: severityPriority[event.severity] || "medium",
        metadata: {
          eventType: event.eventType,
          severity: event.severity,
          hailSize: event.hailSize,
          windSpeed: event.windSpeed,
          damageReported: event.damageReported,
          claimFiled: event.claimFiled,
          estimatedDamage: event.estimatedDamage,
          source: event.source,
        },
      });
    });

    // Transform intel items
    intelItems.forEach((intel) => {
      items.push({
        id: intel.id,
        type: "intel",
        date: intel.createdAt.toISOString(),
        title: intel.title,
        description: intel.content,
        priority: intel.priority as TimelineItem["priority"],
        metadata: {
          category: intel.category,
          source: intel.source,
          confidence: intel.confidence,
          actionable: intel.actionable,
          isRead: intel.isRead,
        },
      });
    });

    // Transform notes
    notes.forEach((note) => {
      items.push({
        id: note.id,
        type: "note",
        date: note.createdAt.toISOString(),
        title: note.isPinned ? "📌 Pinned Note" : "Note Added",
        description: note.content,
        metadata: {
          category: note.category,
          isPinned: note.isPinned,
        },
        user: note.user?.name,
      });
    });

    // Transform claims
    claims.forEach((claim) => {
      const statusPriority: Record<string, TimelineItem["priority"]> = {
        pending: "medium",
        approved: "high",
        denied: "critical",
        supplement: "high",
        paid: "low",
        closed: "low",
      };

      items.push({
        id: claim.id,
        type: "claim",
        date: claim.createdAt.toISOString(),
        title: `Insurance Claim - ${claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}`,
        description: [
          claim.carrier,
          claim.claimType,
          claim.approvedValue && `Approved: $${claim.approvedValue.toLocaleString()}`,
        ].filter(Boolean).join(" • ") || null,
        priority: statusPriority[claim.status] || "medium",
        metadata: {
          claimNumber: claim.claimNumber,
          carrier: claim.carrier,
          claimType: claim.claimType,
          status: claim.status,
          dateOfLoss: claim.dateOfLoss.toISOString(),
          initialEstimate: claim.initialEstimate,
          approvedValue: claim.approvedValue,
          deductible: claim.deductible,
        },
      });
    });

    // Sort by date descending
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Take only the limit
    const paginatedItems = items.slice(0, limit);
    const hasMore = items.length > limit;
    const nextCursor = paginatedItems.length > 0 
      ? paginatedItems[paginatedItems.length - 1].date 
      : null;

    // Get total count for display
    const [interactionCount, weatherCount, intelCount, noteCount, claimCount] = await Promise.all([
      prisma.interaction.count({ where: { customerId: id } }),
      prisma.weatherEvent.count({ where: { customerId: id } }),
      prisma.intelItem.count({ where: { customerId: id } }),
      prisma.note.count({ where: { customerId: id } }),
      prisma.insuranceClaim.count({ where: { customerId: id } }),
    ]);

    const totalCount = interactionCount + weatherCount + intelCount + noteCount + claimCount;

    return NextResponse.json({
      success: true,
      items: paginatedItems,
      pagination: {
        cursor: nextCursor,
        hasMore,
        total: totalCount,
      },
    });
  } catch (error) {
    console.error("[API] GET /api/customers/[id]/timeline error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch timeline" },
      { status: 500 }
    );
  }
}
