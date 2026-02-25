/**
 * Single Competitor API
 *
 * GET    /api/competitors/[id] - Get competitor details with recent activity
 * PUT    /api/competitors/[id] - Update competitor fields
 * DELETE /api/competitors/[id] - Soft-delete (set isActive = false)
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// GET /api/competitors/[id]
// ---------------------------------------------------------------------------

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const competitor = await prisma.competitor.findUnique({
      where: { id },
      include: {
        activities: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            competitor: { select: { name: true } },
            customer: { select: { firstName: true, lastName: true } },
            reportedBy: { select: { name: true } },
          },
        },
        _count: {
          select: { activities: true },
        },
      },
    });

    if (!competitor) {
      return NextResponse.json(
        { success: false, error: "Competitor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, competitor });
  } catch (error) {
    console.error("[API] GET /api/competitors/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch competitor" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/competitors/[id]
// ---------------------------------------------------------------------------

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Verify the competitor exists
    const existing = await prisma.competitor.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Competitor not found" },
        { status: 404 }
      );
    }

    // If name is being changed, check for duplicate
    if (body.name !== undefined) {
      const trimmedName = body.name.trim();
      if (trimmedName === "") {
        return NextResponse.json(
          { success: false, error: "name cannot be empty" },
          { status: 400 }
        );
      }

      const duplicate = await prisma.competitor.findFirst({
        where: {
          name: { equals: trimmedName, mode: "insensitive" },
          id: { not: id },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { success: false, error: "A competitor with that name already exists" },
          { status: 409 }
        );
      }
    }

    // Build the update data -- only include fields that are present in the body
    const serializeJsonArray = (val: unknown): string | null | undefined => {
      if (val === undefined) return undefined; // field not sent, skip
      if (val === null) return null;
      if (Array.isArray(val)) return JSON.stringify(val);
      if (typeof val === "string") return val;
      return undefined;
    };

    const toNullableString = (val: unknown): string | null | undefined => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      return String(val).trim() || null;
    };

    const toNullableNumber = (val: unknown): number | null | undefined => {
      if (val === undefined) return undefined;
      if (val === null) return null;
      const n = Number(val);
      return Number.isFinite(n) ? n : null;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {};

    // String fields
    const stringFields = [
      "name",
      "displayName",
      "website",
      "phone",
      "headquarters",
      "pricingTier",
      "strengths",
      "weaknesses",
      "salesTactics",
      "pricingNotes",
    ] as const;

    for (const field of stringFields) {
      const val = toNullableString(body[field]);
      if (val !== undefined) data[field] = val;
    }

    // JSON-stringified array fields
    const jsonFields = ["serviceAreas", "specialties", "certifications"] as const;
    for (const field of jsonFields) {
      const val = serializeJsonArray(body[field]);
      if (val !== undefined) data[field] = val;
    }

    // Integer fields
    const intFields = ["yearFounded", "employeeCount", "reviewCount"] as const;
    for (const field of intFields) {
      const val = toNullableNumber(body[field]);
      if (val !== undefined) data[field] = val !== null ? Math.round(val) : null;
    }

    // Float fields
    const floatFields = [
      "marketShare",
      "reputation",
      "avgReviewScore",
    ] as const;
    for (const field of floatFields) {
      const val = toNullableNumber(body[field]);
      if (val !== undefined) data[field] = val;
    }

    // Boolean fields
    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const competitor = await prisma.competitor.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, competitor });
  } catch (error) {
    console.error("[API] PUT /api/competitors/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update competitor" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/competitors/[id]  (soft-delete)
// ---------------------------------------------------------------------------

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const existing = await prisma.competitor.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Competitor not found" },
        { status: 404 }
      );
    }

    await prisma.competitor.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] DELETE /api/competitors/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete competitor" },
      { status: 500 }
    );
  }
}
