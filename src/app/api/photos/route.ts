/**
 * Photos API
 *
 * GET  /api/photos - List photos with pagination and filtering
 * POST /api/photos - Create a new photo record
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/photos
 *
 * Query params:
 * - page: number (default 1)
 * - limit: number (default 20, max 100)
 * - customerId: filter by customer
 * - category: filter by category (before, after, damage, signature, inspection)
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const customerId = searchParams.get("customerId");
    const category = searchParams.get("category");

    // Build where clause
    const where: Prisma.PhotoWhereInput = {};

    if (customerId) {
      where.customerId = customerId;
    }

    if (category) {
      where.category = category;
    }

    const skip = (page - 1) * limit;

    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        where,
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.photo.count({ where }),
    ]);

    return NextResponse.json({
      photos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[API] GET /api/photos error:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/photos
 *
 * Body:
 * - customerId: string (required)
 * - url: string (required)
 * - thumbnailUrl?: string
 * - category: string (required)
 * - description?: string
 * - mimeType?: string
 * - size?: number (bytes)
 * - metadata?: object (stored as JSON string)
 * - latitude?: number
 * - longitude?: number
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as unknown as { id: string }).id;
    if (!userId) {
      return NextResponse.json(
        { error: "Could not determine user ID from session" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      customerId,
      url,
      thumbnailUrl,
      category,
      description,
      mimeType,
      size,
      metadata,
      latitude,
      longitude,
    } = body;

    // Validate required fields
    if (!customerId || typeof customerId !== "string") {
      return NextResponse.json(
        { error: "customerId is required and must be a string" },
        { status: 400 }
      );
    }

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "url is required and must be a string" },
        { status: 400 }
      );
    }

    if (!category || typeof category !== "string") {
      return NextResponse.json(
        { error: "category is required and must be a string" },
        { status: 400 }
      );
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Validate optional numeric fields
    if (size !== undefined && (typeof size !== "number" || size < 0)) {
      return NextResponse.json(
        { error: "size must be a non-negative number" },
        { status: 400 }
      );
    }

    if (latitude !== undefined && (typeof latitude !== "number" || latitude < -90 || latitude > 90)) {
      return NextResponse.json(
        { error: "latitude must be a number between -90 and 90" },
        { status: 400 }
      );
    }

    if (longitude !== undefined && (typeof longitude !== "number" || longitude < -180 || longitude > 180)) {
      return NextResponse.json(
        { error: "longitude must be a number between -180 and 180" },
        { status: 400 }
      );
    }

    const photo = await prisma.photo.create({
      data: {
        customerId,
        userId,
        url,
        thumbnailUrl: thumbnailUrl || null,
        category,
        description: description || null,
        mimeType: mimeType || null,
        size: size ?? null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      },
    });

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/photos error:", error);
    return NextResponse.json(
      { error: "Failed to create photo" },
      { status: 500 }
    );
  }
}
