/**
 * Competitor Activity API
 *
 * GET  /api/competitors/activity - List activities with pagination and filtering
 * POST /api/competitors/activity - Log a new competitor activity sighting
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// Valid activity types for input validation
const VALID_ACTIVITY_TYPES = [
  "sighting",
  "quote",
  "won_deal",
  "lost_deal",
  "canvassing",
  "marketing",
  "price_intel",
] as const;

// ---------------------------------------------------------------------------
// GET /api/competitors/activity
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10))
    );
    const competitorId = searchParams.get("competitorId") || undefined;
    const customerId = searchParams.get("customerId") || undefined;
    const activityType = searchParams.get("activityType") || undefined;
    const state = searchParams.get("state") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    // Build where clause
    const where: Prisma.CompetitorActivityWhereInput = {};

    if (competitorId) {
      where.competitorId = competitorId;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (activityType) {
      where.activityType = activityType;
    }

    if (state) {
      where.state = { equals: state, mode: "insensitive" };
    }

    // Date range filtering
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        // Include the entire end date by setting to end-of-day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        where.createdAt.lte = endOfDay;
      }
    }

    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      prisma.competitorActivity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          competitor: { select: { id: true, name: true, displayName: true } },
          customer: {
            select: { id: true, firstName: true, lastName: true },
          },
          reportedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.competitorActivity.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      activities,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("[API] GET /api/competitors/activity error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/competitors/activity
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = (session.user as { id: string }).id;
    const body = await request.json();

    // --- Validation -----------------------------------------------------------

    if (!body.competitorId || typeof body.competitorId !== "string") {
      return NextResponse.json(
        { success: false, error: "competitorId is required" },
        { status: 400 }
      );
    }

    if (
      !body.activityType ||
      !VALID_ACTIVITY_TYPES.includes(body.activityType)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `activityType must be one of: ${VALID_ACTIVITY_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Verify the competitor exists
    const competitor = await prisma.competitor.findUnique({
      where: { id: body.competitorId },
    });

    if (!competitor) {
      return NextResponse.json(
        { success: false, error: "Competitor not found" },
        { status: 404 }
      );
    }

    // If customerId is provided, verify the customer exists
    if (body.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: body.customerId },
      });
      if (!customer) {
        return NextResponse.json(
          { success: false, error: "Customer not found" },
          { status: 404 }
        );
      }
    }

    // --- Create the activity --------------------------------------------------

    const activity = await prisma.competitorActivity.create({
      data: {
        competitorId: body.competitorId,
        customerId: body.customerId || null,
        reportedById: userId,
        activityType: body.activityType,
        address: body.address?.trim() || null,
        city: body.city?.trim() || null,
        state: body.state?.trim() || null,
        zipCode: body.zipCode?.trim() || null,
        description: body.description?.trim() || null,
        quotedPrice:
          body.quotedPrice != null ? Number(body.quotedPrice) : null,
        priceComparison: body.priceComparison || null,
        outcome: body.outcome?.trim() || null,
        outcomeReason: body.outcomeReason?.trim() || null,
        dealValue: body.dealValue != null ? Number(body.dealValue) : null,
        hasPhoto: Boolean(body.photoUrl),
        photoUrl: body.photoUrl?.trim() || null,
        isVerified: false,
      },
      include: {
        competitor: { select: { id: true, name: true, displayName: true } },
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
        reportedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, activity }, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/competitors/activity error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to log activity" },
      { status: 500 }
    );
  }
}
