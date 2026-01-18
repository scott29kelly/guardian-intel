/**
 * Individual Competitor API
 * 
 * GET /api/competitors/[id] - Get competitor details
 * PUT /api/competitors/[id] - Update competitor
 * DELETE /api/competitors/[id] - Delete competitor
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateCompetitorSchema = z.object({
  name: z.string().min(1).optional(),
  displayName: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  phone: z.string().optional(),
  headquarters: z.string().optional(),
  serviceAreas: z.array(z.string()).optional(),
  yearFounded: z.number().int().positive().optional(),
  employeeCount: z.number().int().positive().optional(),
  pricingTier: z.enum(["budget", "mid", "premium", "luxury"]).optional(),
  specialties: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  strengths: z.string().optional(),
  weaknesses: z.string().optional(),
  salesTactics: z.string().optional(),
  pricingNotes: z.string().optional(),
  marketShare: z.number().min(0).max(100).optional(),
  reputation: z.number().int().min(1).max(5).optional(),
  avgReviewScore: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/competitors/[id]
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const { id } = await params;

    const competitor = await prisma.competitor.findUnique({
      where: { id },
      include: {
        activities: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        _count: {
          select: {
            activities: true,
          },
        },
      },
    });

    if (!competitor) {
      return NextResponse.json({ success: false, error: "Competitor not found" }, { status: 404 });
    }

    // Calculate win/loss stats
    const wonAgainst = competitor.activities.filter((a: { activityType: string }) => a.activityType === "won_deal").length;
    const lostTo = competitor.activities.filter((a: { activityType: string }) => a.activityType === "lost_deal").length;
    const totalDeals = wonAgainst + lostTo;
    const winRate = totalDeals > 0 ? (wonAgainst / totalDeals) * 100 : null;

    // Last activity date
    const lastActivity = competitor.activities[0]?.createdAt || null;

    return NextResponse.json({
      success: true,
      data: {
        ...competitor,
        serviceAreas: competitor.serviceAreas ? JSON.parse(competitor.serviceAreas) : [],
        specialties: competitor.specialties ? JSON.parse(competitor.specialties) : [],
        certifications: competitor.certifications ? JSON.parse(competitor.certifications) : [],
        stats: {
          activityCount: competitor._count.activities,
          mentionCount: 0, // Mentions not tracked in current schema
          wonAgainst,
          lostTo,
          winRate: winRate ? Math.round(winRate * 10) / 10 : null,
          lastActivity,
        },
      },
    });
  } catch (error) {
    console.error("[API] GET /api/competitors/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch competitor" }, { status: 500 });
  }
}

/**
 * PUT /api/competitors/[id]
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.competitor.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Competitor not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = updateCompetitorSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: "Invalid update data",
        details: validation.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    const data = validation.data;

    // Check name uniqueness if changing name
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.competitor.findUnique({
        where: { name: data.name },
      });
      if (duplicate) {
        return NextResponse.json({
          success: false,
          error: "A competitor with this name already exists",
        }, { status: 400 });
      }
    }

    const updated = await prisma.competitor.update({
      where: { id },
      data: {
        ...data,
        serviceAreas: data.serviceAreas ? JSON.stringify(data.serviceAreas) : undefined,
        specialties: data.specialties ? JSON.stringify(data.specialties) : undefined,
        certifications: data.certifications ? JSON.stringify(data.certifications) : undefined,
        website: data.website === "" ? null : data.website,
        // updatedAt is auto-updated by Prisma @updatedAt
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        serviceAreas: updated.serviceAreas ? JSON.parse(updated.serviceAreas) : [],
        specialties: updated.specialties ? JSON.parse(updated.specialties) : [],
        certifications: updated.certifications ? JSON.parse(updated.certifications) : [],
      },
      message: "Competitor updated successfully",
    });
  } catch (error) {
    console.error("[API] PUT /api/competitors/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to update competitor" }, { status: 500 });
  }
}

/**
 * DELETE /api/competitors/[id]
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.competitor.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Competitor not found" }, { status: 404 });
    }

    // Soft delete by setting isActive = false, or hard delete
    // Using soft delete to preserve historical data
    await prisma.competitor.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: `Competitor "${existing.name}" has been deactivated`,
    });
  } catch (error) {
    console.error("[API] DELETE /api/competitors/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete competitor" }, { status: 500 });
  }
}
