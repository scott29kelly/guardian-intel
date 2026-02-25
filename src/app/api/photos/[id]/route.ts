/**
 * Individual Photo API
 *
 * GET    /api/photos/:id - Get photo by ID with customer details
 * PUT    /api/photos/:id - Update photo (description, category, aiAnalysis)
 * DELETE /api/photos/:id - Delete a photo
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Helper: safely parse a JSON string field
function safeParseJson(value: string | null | undefined): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * GET /api/photos/:id
 *
 * Returns the photo with customer details and parsed aiAnalysis.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const photo = await prisma.photo.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Parse aiAnalysis JSON if present
    const parsed = {
      ...photo,
      aiAnalysis: safeParseJson(photo.aiAnalysis),
      metadata: safeParseJson(photo.metadata),
    };

    return NextResponse.json({ photo: parsed });
  } catch (error) {
    console.error("[API] GET /api/photos/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch photo" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/photos/:id
 *
 * Updatable fields: description, category, aiAnalysis
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify photo exists
    const existing = await prisma.photo.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const body = await request.json();
    const { description, category, aiAnalysis } = body;

    // Build update data with only provided fields
    const updateData: Record<string, unknown> = {};

    if (description !== undefined) {
      if (description !== null && typeof description !== "string") {
        return NextResponse.json(
          { error: "description must be a string or null" },
          { status: 400 }
        );
      }
      updateData.description = description;
    }

    if (category !== undefined) {
      if (!category || typeof category !== "string") {
        return NextResponse.json(
          { error: "category must be a non-empty string" },
          { status: 400 }
        );
      }
      updateData.category = category;
    }

    if (aiAnalysis !== undefined) {
      // Accept null to clear, or an object to set
      if (aiAnalysis === null) {
        updateData.aiAnalysis = null;
      } else if (typeof aiAnalysis === "object") {
        updateData.aiAnalysis = JSON.stringify(aiAnalysis);
      } else {
        return NextResponse.json(
          { error: "aiAnalysis must be an object or null" },
          { status: 400 }
        );
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update" },
        { status: 400 }
      );
    }

    const photo = await prisma.photo.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ photo });
  } catch (error) {
    console.error("[API] PUT /api/photos/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update photo" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/photos/:id
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.photo.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    await prisma.photo.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] DELETE /api/photos/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete photo" },
      { status: 500 }
    );
  }
}
