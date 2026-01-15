/**
 * Competitor Activity API
 * 
 * GET /api/competitors/activity - List activities
 * POST /api/competitors/activity - Log new activity
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const activityQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  competitorId: z.string().optional(),
  customerId: z.string().optional(),
  activityType: z.enum([
    "sighting", "quote", "won_deal", "lost_deal", 
    "canvassing", "marketing", "price_intel"
  ]).optional(),
  state: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(["createdAt", "dealValue"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const createActivitySchema = z.object({
  competitorId: z.string().min(1, "Competitor ID is required"),
  customerId: z.string().optional(),
  activityType: z.enum([
    "sighting", "quote", "won_deal", "lost_deal",
    "canvassing", "marketing", "price_intel"
  ]),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().optional(),
  quotedPrice: z.number().positive().optional(),
  priceComparison: z.enum(["lower", "similar", "higher"]).optional(),
  outcome: z.string().optional(),
  outcomeReason: z.string().optional(),
  dealValue: z.number().positive().optional(),
  photoUrl: z.string().url().optional(),
});

/**
 * GET /api/competitors/activity
 */
export async function GET(request: Request) {
  try {
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validation = activityQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json({ success: false, error: "Invalid query parameters" }, { status: 400 });
    }

    const { 
      page, limit, competitorId, customerId, activityType,
      state, startDate, endDate, sortBy, sortOrder 
    } = validation.data;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (competitorId) where.competitorId = competitorId;
    if (customerId) where.customerId = customerId;
    if (activityType) where.activityType = activityType;
    if (state) where.state = state;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) (where.createdAt as Record<string, Date>).gte = new Date(startDate);
      if (endDate) (where.createdAt as Record<string, Date>).lte = new Date(endDate);
    }

    const [activities, total] = await Promise.all([
      prisma.competitorActivity.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          competitor: {
            select: {
              id: true,
              name: true,
              displayName: true,
              pricingTier: true,
            },
          },
        },
      }),
      prisma.competitorActivity.count({ where }),
    ]);

    // Enrich with customer names if needed
    const customerIds = activities
      .filter(a => a.customerId)
      .map(a => a.customerId as string);
    
    const customers = customerIds.length > 0 
      ? await prisma.customer.findMany({
          where: { id: { in: customerIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];
    
    const customerMap = new Map(customers.map(c => [c.id, `${c.firstName} ${c.lastName}`]));

    const enriched = activities.map(a => ({
      ...a,
      competitorName: a.competitor.displayName || a.competitor.name,
      customerName: a.customerId ? customerMap.get(a.customerId) || null : null,
    }));

    return NextResponse.json({
      success: true,
      data: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("[API] GET /api/competitors/activity error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch activities" }, { status: 500 });
  }
}

/**
 * POST /api/competitors/activity
 */
export async function POST(request: Request) {
  try {
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ success: false, error: "User ID not found" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createActivitySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: "Invalid activity data",
        details: validation.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    const data = validation.data;

    // Verify competitor exists
    const competitor = await prisma.competitor.findUnique({
      where: { id: data.competitorId },
      select: { id: true, name: true },
    });

    if (!competitor) {
      return NextResponse.json({ success: false, error: "Competitor not found" }, { status: 404 });
    }

    // Verify customer exists if provided
    if (data.customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: data.customerId },
      });
      if (!customer) {
        return NextResponse.json({ success: false, error: "Customer not found" }, { status: 404 });
      }
    }

    const activity = await prisma.competitorActivity.create({
      data: {
        competitorId: data.competitorId,
        customerId: data.customerId,
        reportedById: userId,
        activityType: data.activityType,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        latitude: data.latitude,
        longitude: data.longitude,
        description: data.description,
        quotedPrice: data.quotedPrice,
        priceComparison: data.priceComparison,
        outcome: data.outcome,
        outcomeReason: data.outcomeReason,
        dealValue: data.dealValue,
        hasPhoto: !!data.photoUrl,
        photoUrl: data.photoUrl,
      },
      include: {
        competitor: {
          select: { name: true, displayName: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...activity,
        competitorName: activity.competitor.displayName || activity.competitor.name,
      },
      message: `${data.activityType} logged for ${competitor.name}`,
    });
  } catch (error) {
    console.error("[API] POST /api/competitors/activity error:", error);
    return NextResponse.json({ success: false, error: "Failed to log activity" }, { status: 500 });
  }
}
