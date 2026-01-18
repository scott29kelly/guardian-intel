/**
 * Recently Used Playbooks API
 * 
 * GET /api/playbooks/recent - Get user's recently used playbooks
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/playbooks/recent
 * 
 * Get playbooks recently used by the current user
 * 
 * Query params:
 * - limit: number (optional) - Max results (default 5)
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

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 20);

    // Get recent usages with distinct playbooks
    const recentUsages = await prisma.playbookUsage.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50, // Fetch more to get distinct playbooks
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

    // Deduplicate by playbook ID, keeping most recent
    const seen = new Set<string>();
    const uniquePlaybooks = [];

    for (const usage of recentUsages) {
      if (!seen.has(usage.playbookId) && usage.playbook.isPublished) {
        seen.add(usage.playbookId);
        uniquePlaybooks.push({
          ...usage.playbook,
          tags: usage.playbook.tags ? JSON.parse(usage.playbook.tags) : [],
          lastUsedAt: usage.createdAt,
          lastContext: usage.context,
        });

        if (uniquePlaybooks.length >= limit) break;
      }
    }

    return NextResponse.json({
      success: true,
      data: uniquePlaybooks,
      total: uniquePlaybooks.length,
    });
  } catch (error) {
    console.error("[API] GET /api/playbooks/recent error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch recent playbooks" },
      { status: 500 }
    );
  }
}
