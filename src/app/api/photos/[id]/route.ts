/**
 * Single Photo API
 * 
 * GET /api/photos/[id] - Get photo details
 * PUT /api/photos/[id] - Update photo metadata
 * DELETE /api/photos/[id] - Delete photo
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { unlink } from "fs/promises";
import { join } from "path";

const updateSchema = z.object({
  customerId: z.string().optional(),
  claimId: z.string().optional(),
  category: z.enum([
    "general", "damage", "before", "after", "roof", "siding",
    "gutter", "interior", "signature", "adjuster-meeting", "other"
  ]).optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  damageType: z.enum(["hail", "wind", "water", "wear", "impact"]).optional().nullable(),
  damageSeverity: z.enum(["minor", "moderate", "severe"]).optional().nullable(),
  isVerified: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
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
            id: true,
            firstName: true,
            lastName: true,
            address: true,
            city: true,
            state: true,
          },
        },
      },
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Parse tags if stored as JSON
    const photoWithParsedTags = {
      ...photo,
      tags: photo.tags ? JSON.parse(photo.tags) : [],
    };

    return NextResponse.json({
      success: true,
      data: photoWithParsedTags,
    });
  } catch (error) {
    console.error("[Photo API] Get error:", error);
    return NextResponse.json(
      { error: "Failed to fetch photo" },
      { status: 500 }
    );
  }
}

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

    const existing = await prisma.photo.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateSchema.parse(body);

    const updateData: any = {};

    if (validated.customerId !== undefined) updateData.customerId = validated.customerId;
    if (validated.claimId !== undefined) updateData.claimId = validated.claimId;
    if (validated.category !== undefined) updateData.category = validated.category;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.damageType !== undefined) updateData.damageType = validated.damageType;
    if (validated.damageSeverity !== undefined) updateData.damageSeverity = validated.damageSeverity;
    if (validated.tags !== undefined) updateData.tags = JSON.stringify(validated.tags);
    
    if (validated.isVerified !== undefined) {
      updateData.isVerified = validated.isVerified;
      if (validated.isVerified) {
        updateData.verifiedAt = new Date();
        updateData.verifiedById = session.user.id;
      } else {
        updateData.verifiedAt = null;
        updateData.verifiedById = null;
      }
    }

    const photo = await prisma.photo.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        type: "edit",
        entityType: "photo",
        entityId: photo.id,
        description: `Updated photo metadata`,
        metadata: JSON.stringify({ changes: Object.keys(validated) }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...photo,
        tags: photo.tags ? JSON.parse(photo.tags) : [],
      },
    });
  } catch (error) {
    console.error("[Photo API] Update error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update photo" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
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
    });

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    // Delete file from disk
    try {
      const filePath = join(process.cwd(), "public", photo.url);
      await unlink(filePath);
    } catch (fileError) {
      console.warn("[Photo API] Could not delete file:", fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await prisma.photo.delete({
      where: { id },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        type: "delete",
        entityType: "photo",
        entityId: id,
        description: `Deleted photo`,
        metadata: JSON.stringify({
          filename: photo.filename,
          customerId: photo.customerId,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Photo deleted successfully",
    });
  } catch (error) {
    console.error("[Photo API] Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete photo" },
      { status: 500 }
    );
  }
}
