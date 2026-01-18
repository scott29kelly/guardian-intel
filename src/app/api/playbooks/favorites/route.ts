/**
 * User's Favorite Playbooks API
 * 
 * GET /api/playbooks/favorites - Get all favorited playbooks for the current user
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/playbooks/favorites
 * 
 * Get all playbooks favorited by the current user
 */
export async function GET(request: Request) {
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

    const favorites = await prisma.playbookFavorite.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        playbook: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            type: true,
            stage: true,
            usageCount: true,
            rating: true,
            tags: true,
            isPublished: true,
          },
        },
      },
    });

    const playbooks = favorites.map((f) => ({
      ...f.playbook,
      tags: f.playbook.tags ? JSON.parse(f.playbook.tags) : [],
      favoritedAt: f.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: playbooks,
      total: playbooks.length,
    });
  } catch (error) {
    console.error("[API] GET /api/playbooks/favorites error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch favorites" },
      { status: 500 }
    );
  }
}
