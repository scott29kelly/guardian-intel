/**
 * Competitors API
 *
 * GET  /api/competitors - List competitors with pagination, search, and filtering
 * POST /api/competitors - Create a new competitor
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/competitors
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
    const search = searchParams.get("search")?.trim() || undefined;
    const pricingTier = searchParams.get("pricingTier") || undefined;
    const isActiveParam = searchParams.get("isActive");
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    // Build the where clause
    const where: Prisma.CompetitorWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { displayName: { contains: search, mode: "insensitive" } },
        { headquarters: { contains: search, mode: "insensitive" } },
      ];
    }

    if (pricingTier) {
      where.pricingTier = pricingTier;
    }

    if (isActiveParam !== null && isActiveParam !== undefined) {
      where.isActive = isActiveParam === "true";
    }

    // Build orderBy
    const validSortFields: Record<string, Prisma.CompetitorOrderByWithRelationInput> = {
      name: { name: sortOrder },
      createdAt: { createdAt: sortOrder },
      marketShare: { marketShare: sortOrder },
      avgReviewScore: { avgReviewScore: sortOrder },
      reputation: { reputation: sortOrder },
    };

    const orderBy: Prisma.CompetitorOrderByWithRelationInput =
      validSortFields[sortBy] || { name: sortOrder };

    const skip = (page - 1) * limit;

    const [competitors, total] = await Promise.all([
      prisma.competitor.findMany({
        where,
        orderBy,
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

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      competitors,
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
    console.error("[API] GET /api/competitors error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch competitors" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/competitors
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

    const body = await request.json();

    // Validate required field
    if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
      return NextResponse.json(
        { success: false, error: "name is required" },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existing = await prisma.competitor.findFirst({
      where: { name: { equals: body.name.trim(), mode: "insensitive" } },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A competitor with that name already exists" },
        { status: 409 }
      );
    }

    // Serialize JSON array fields as strings if they arrive as arrays
    const serializeJsonArray = (val: unknown): string | undefined => {
      if (val === undefined || val === null) return undefined;
      if (Array.isArray(val)) return JSON.stringify(val);
      if (typeof val === "string") return val;
      return undefined;
    };

    const competitor = await prisma.competitor.create({
      data: {
        name: body.name.trim(),
        displayName: body.displayName?.trim() || null,
        website: body.website?.trim() || null,
        phone: body.phone?.trim() || null,
        headquarters: body.headquarters?.trim() || null,
        serviceAreas: serializeJsonArray(body.serviceAreas) ?? null,
        yearFounded: body.yearFounded != null ? Number(body.yearFounded) : null,
        employeeCount:
          body.employeeCount != null ? Number(body.employeeCount) : null,
        pricingTier: body.pricingTier || null,
        specialties: serializeJsonArray(body.specialties) ?? null,
        certifications: serializeJsonArray(body.certifications) ?? null,
        strengths: body.strengths?.trim() || null,
        weaknesses: body.weaknesses?.trim() || null,
        salesTactics: body.salesTactics?.trim() || null,
        pricingNotes: body.pricingNotes?.trim() || null,
        marketShare:
          body.marketShare != null ? Number(body.marketShare) : null,
        reputation:
          body.reputation != null ? Number(body.reputation) : null,
        avgReviewScore:
          body.avgReviewScore != null ? Number(body.avgReviewScore) : null,
        reviewCount:
          body.reviewCount != null ? Number(body.reviewCount) : null,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      },
    });

    return NextResponse.json({ success: true, competitor }, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/competitors error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create competitor" },
      { status: 500 }
    );
  }
}
