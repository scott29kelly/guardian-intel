/**
 * Playbook Favorites API
 * 
 * POST /api/playbooks/[id]/favorite - Toggle favorite status
 * GET /api/playbooks/[id]/favorite - Check if favorited
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { cuidSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/playbooks/[id]/favorite
 * 
 * Toggle favorite status for a playbook
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const idValidation = cuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: "Invalid playbook ID" },
        { status: 400 }
      );
    }

    // Check if playbook exists
    const playbook = await prisma.playbook.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!playbook) {
      return NextResponse.json(
        { success: false, error: "Playbook not found" },
        { status: 404 }
      );
    }

    // Check existing favorite
    const existingFavorite = await prisma.playbookFavorite.findUnique({
      where: {
        playbookId_userId: {
          playbookId: id,
          userId: session.user.id,
        },
      },
    });

    if (existingFavorite) {
      // Remove favorite
      await prisma.playbookFavorite.delete({
        where: { id: existingFavorite.id },
      });

      return NextResponse.json({
        success: true,
        isFavorited: false,
        message: "Removed from favorites",
      });
    } else {
      // Add favorite
      await prisma.playbookFavorite.create({
        data: {
          playbookId: id,
          userId: session.user.id,
        },
      });

      return NextResponse.json({
        success: true,
        isFavorited: true,
        message: "Added to favorites",
      });
    }
  } catch (error) {
    console.error("[API] POST /api/playbooks/[id]/favorite error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update favorite" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/playbooks/[id]/favorite
 * 
 * Check if playbook is favorited by current user
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const idValidation = cuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: "Invalid playbook ID" },
        { status: 400 }
      );
    }

    const favorite = await prisma.playbookFavorite.findUnique({
      where: {
        playbookId_userId: {
          playbookId: id,
          userId: session.user.id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      isFavorited: !!favorite,
    });
  } catch (error) {
    console.error("[API] GET /api/playbooks/[id]/favorite error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check favorite status" },
      { status: 500 }
    );
  }
}
