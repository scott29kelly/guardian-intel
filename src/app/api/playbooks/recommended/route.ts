/**
 * Recommended Playbooks API
 * 
 * GET /api/playbooks/recommended - Get context-aware playbook recommendations
 * 
 * Recommendations based on:
 * - Customer stage (if customerId provided)
 * - User's recent usage patterns
 * - Team's most effective playbooks
 * - Category/scenario matching
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { cuidSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

/**
 * GET /api/playbooks/recommended
 * 
 * Query params:
 * - customerId: string (optional) - Get recommendations for a specific customer
 * - category: string (optional) - Filter by category
 * - limit: number (optional) - Max results (default 6)
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
    const customerId = searchParams.get("customerId");
    const category = searchParams.get("category");
    const limit = Math.min(parseInt(searchParams.get("limit") || "6"), 20);

    let customerStage: string | null = null;
    let customerContext: {
      hasInsurance: boolean;
      hasStormDamage: boolean;
      leadScore: number;
    } | null = null;

    // Get customer context if provided
    if (customerId) {
      const validation = cuidSchema.safeParse(customerId);
      if (validation.success) {
        const customer = await prisma.customer.findUnique({
          where: { id: customerId },
          select: {
            stage: true,
            status: true,
            leadScore: true,
            insuranceCarrier: true,
            weatherEvents: {
              take: 1,
              orderBy: { eventDate: "desc" },
            },
          },
        });

        if (customer) {
          customerStage = customer.stage;
          customerContext = {
            hasInsurance: !!customer.insuranceCarrier,
            hasStormDamage: customer.weatherEvents.length > 0,
            leadScore: customer.leadScore,
          };
        }
      }
    }

    // Build recommendation query
    const recommendations: Array<{
      playbook: rawPlaybook;
      score: number;
      reason: string;
    }> = [];

    // 1. Stage-matched playbooks (highest priority)
    if (customerStage) {
      const stagePlaybooks = await prisma.playbook.findMany({
        where: {
          isPublished: true,
          stage: customerStage,
          ...(category && { category }),
        },
        orderBy: [{ rating: "desc" }, { usageCount: "desc" }],
        take: 3,
      });

      stagePlaybooks.forEach((p) => {
        recommendations.push({
          playbook: p,
          score: 100,
          reason: `Perfect for ${customerStage} stage customers`,
        });
      });
    }

    // 2. Context-based recommendations
    if (customerContext?.hasStormDamage) {
      const stormPlaybooks = await prisma.playbook.findMany({
        where: {
          isPublished: true,
          category: "storm",
          id: { notIn: recommendations.map((r) => r.playbook.id) },
        },
        orderBy: { usageCount: "desc" },
        take: 2,
      });

      stormPlaybooks.forEach((p) => {
        recommendations.push({
          playbook: p,
          score: 90,
          reason: "Storm damage detected in customer area",
        });
      });
    }

    if (customerContext?.hasInsurance) {
      const insurancePlaybooks = await prisma.playbook.findMany({
        where: {
          isPublished: true,
          OR: [
            { scenario: { contains: "insurance", mode: "insensitive" } },
            { tags: { contains: "insurance" } },
          ],
          id: { notIn: recommendations.map((r) => r.playbook.id) },
        },
        orderBy: { usageCount: "desc" },
        take: 2,
      });

      insurancePlaybooks.forEach((p) => {
        recommendations.push({
          playbook: p,
          score: 85,
          reason: "Customer has insurance on file",
        });
      });
    }

    // 3. User's recently effective playbooks
    const recentSuccessful = await prisma.playbookUsage.findMany({
      where: {
        userId: session.user.id,
        outcome: { in: ["closed_won", "objection_handled"] },
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      include: {
        playbook: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const recentPlaybookIds = new Set(recentSuccessful.map((u) => u.playbookId));
    for (const usage of recentSuccessful) {
      if (!recommendations.some((r) => r.playbook.id === usage.playbookId)) {
        if (usage.playbook.isPublished) {
          recommendations.push({
            playbook: usage.playbook,
            score: 75,
            reason: "Worked well for you recently",
          });
        }
      }
    }

    // 4. Team's top-rated playbooks
    const topRated = await prisma.playbook.findMany({
      where: {
        isPublished: true,
        rating: { gte: 4 },
        id: { notIn: recommendations.map((r) => r.playbook.id) },
        ...(category && { category }),
      },
      orderBy: [{ rating: "desc" }, { usageCount: "desc" }],
      take: 3,
    });

    topRated.forEach((p) => {
      recommendations.push({
        playbook: p,
        score: 70,
        reason: "Highly rated by your team",
      });
    });

    // 5. Most used playbooks (fallback)
    if (recommendations.length < limit) {
      const mostUsed = await prisma.playbook.findMany({
        where: {
          isPublished: true,
          id: { notIn: recommendations.map((r) => r.playbook.id) },
          ...(category && { category }),
        },
        orderBy: { usageCount: "desc" },
        take: limit - recommendations.length,
      });

      mostUsed.forEach((p) => {
        recommendations.push({
          playbook: p,
          score: 50,
          reason: "Popular with your team",
        });
      });
    }

    // Sort by score and limit
    const sorted = recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Format response
    const data = sorted.map((r) => ({
      ...r.playbook,
      tags: r.playbook.tags ? JSON.parse(r.playbook.tags) : [],
      recommendationScore: r.score,
      recommendationReason: r.reason,
    }));

    return NextResponse.json({
      success: true,
      data,
      context: customerContext
        ? {
            customerId,
            stage: customerStage,
            hasInsurance: customerContext.hasInsurance,
            hasStormDamage: customerContext.hasStormDamage,
          }
        : null,
    });
  } catch (error) {
    console.error("[API] GET /api/playbooks/recommended error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}

// Type helper for the playbook query result (non-null)
type rawPlaybook = NonNullable<Awaited<ReturnType<typeof prisma.playbook.findFirst>>>;
