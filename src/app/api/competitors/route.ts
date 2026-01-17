/**
 * Competitors API
 * 
 * GET /api/competitors - List all competitors
 * POST /api/competitors - Create a new competitor
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Validation schemas
const competitorQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  pricingTier: z.enum(["budget", "mid", "premium", "luxury"]).optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(["name", "createdAt", "pricingTier"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

const createCompetitorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  displayName: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  phone: z.string().optional(),
  headquarters: z.string().optional(),
  serviceAreas: z.array(z.string()).optional(),
  yearFounded: z.number().int().positive().optional(),
  employeeCount: z.number().int().positive().optional(),
  pricingTier: z.enum(["budget", "mid", "premium", "luxury"]).default("mid"),
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
});

/**
 * GET /api/competitors
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
    const validation = competitorQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json({ success: false, error: "Invalid query parameters" }, { status: 400 });
    }

    const { page, limit, search, pricingTier, isActive, sortBy, sortOrder } = validation.data;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
      ];
    }
    if (pricingTier) where.pricingTier = pricingTier;
    if (isActive !== undefined) where.isActive = isActive;

    const [competitors, total] = await Promise.all([
      prisma.competitor.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          _count: {
            select: { activities: true },
          },
        },
      }),
      prisma.competitor.count({ where }),
    ]);

    // Parse JSON fields and add activity count
    const parsed = competitors.map(c => ({
      ...c,
      serviceAreas: c.serviceAreas ? JSON.parse(c.serviceAreas) : [],
      specialties: c.specialties ? JSON.parse(c.specialties) : [],
      certifications: c.certifications ? JSON.parse(c.certifications) : [],
      activityCount: c._count.activities,
    }));

    return NextResponse.json({
      success: true,
      data: parsed,
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
    console.error("[API] GET /api/competitors error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch competitors" }, { status: 500 });
  }
}

/**
 * POST /api/competitors
 */
export async function POST(request: Request) {
  try {
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createCompetitorSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: "Invalid competitor data",
        details: validation.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    const data = validation.data;

    // Check for duplicate name
    const existing = await prisma.competitor.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      return NextResponse.json({
        success: false,
        error: "A competitor with this name already exists",
      }, { status: 400 });
    }

    const competitor = await prisma.competitor.create({
      data: {
        name: data.name,
        displayName: data.displayName,
        website: data.website || null,
        phone: data.phone,
        headquarters: data.headquarters,
        serviceAreas: data.serviceAreas ? JSON.stringify(data.serviceAreas) : null,
        yearFounded: data.yearFounded,
        employeeCount: data.employeeCount,
        pricingTier: data.pricingTier,
        specialties: data.specialties ? JSON.stringify(data.specialties) : null,
        certifications: data.certifications ? JSON.stringify(data.certifications) : null,
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        salesTactics: data.salesTactics,
        pricingNotes: data.pricingNotes,
        marketShare: data.marketShare,
        reputation: data.reputation,
        avgReviewScore: data.avgReviewScore,
        reviewCount: data.reviewCount,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...competitor,
        serviceAreas: data.serviceAreas || [],
        specialties: data.specialties || [],
        certifications: data.certifications || [],
      },
      message: `Competitor "${data.name}" created successfully`,
    });
  } catch (error) {
    console.error("[API] POST /api/competitors error:", error);
    return NextResponse.json({ success: false, error: "Failed to create competitor" }, { status: 500 });
  }
}
