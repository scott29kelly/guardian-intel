/**
 * Playbook Analytics API
 * 
 * GET /api/playbooks/[id]/analytics - Get effectiveness metrics for a playbook
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { cuidSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/playbooks/[id]/analytics
 * 
 * Get analytics and effectiveness metrics for a playbook
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const { id } = await params;

    const idValidation = cuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: "Invalid playbook ID" },
        { status: 400 }
      );
    }

    // Fetch playbook with aggregated data
    const playbook = await prisma.playbook.findUnique({
      where: { id },
      include: {
        ratings: {
          select: { rating: true, feedback: true, createdAt: true },
        },
        usages: {
          select: {
            context: true,
            outcome: true,
            completed: true,
            duration: true,
            createdAt: true,
            customerId: true,
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            favorites: true,
            usages: true,
            ratings: true,
          },
        },
      },
    });

    if (!playbook) {
      return NextResponse.json(
        { success: false, error: "Playbook not found" },
        { status: 404 }
      );
    }

    // Calculate metrics
    const totalUsages = playbook._count.usages;
    const completedUsages = playbook.usages.filter((u) => u.completed).length;
    const completionRate = totalUsages > 0 ? (completedUsages / totalUsages) * 100 : 0;

    // Outcome distribution
    const outcomes = playbook.usages.reduce((acc, u) => {
      if (u.outcome) {
        acc[u.outcome] = (acc[u.outcome] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Context distribution
    const contexts = playbook.usages.reduce((acc, u) => {
      acc[u.context] = (acc[u.context] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Average duration (excluding nulls)
    const durationsWithValues = playbook.usages
      .filter((u) => u.duration !== null)
      .map((u) => u.duration!);
    const avgDuration =
      durationsWithValues.length > 0
        ? durationsWithValues.reduce((a, b) => a + b, 0) / durationsWithValues.length
        : null;

    // Rating stats
    const ratings = playbook.ratings.map((r) => r.rating);
    const avgRating =
      ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : null;

    const ratingDistribution = ratings.reduce((acc, r) => {
      acc[r] = (acc[r] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Usage over time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUsages = playbook.usages.filter(
      (u) => new Date(u.createdAt) >= thirtyDaysAgo
    );

    const usageByDay = recentUsages.reduce((acc, u) => {
      const date = new Date(u.createdAt).toISOString().split("T")[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Conversion rate (usages with customers that led to closed_won)
    const usagesWithCustomers = playbook.usages.filter((u) => u.customerId);
    const closedWonUsages = usagesWithCustomers.filter(
      (u) => u.outcome === "closed_won"
    );
    const conversionRate =
      usagesWithCustomers.length > 0
        ? (closedWonUsages.length / usagesWithCustomers.length) * 100
        : null;

    // Recent feedback
    const recentFeedback = playbook.ratings
      .filter((r) => r.feedback)
      .slice(0, 5)
      .map((r) => ({
        rating: r.rating,
        feedback: r.feedback,
        date: r.createdAt,
      }));

    return NextResponse.json({
      success: true,
      analytics: {
        playbookId: playbook.id,
        title: playbook.title,
        category: playbook.category,
        
        // Usage metrics
        totalUsages,
        completedUsages,
        completionRate: Math.round(completionRate * 10) / 10,
        avgDurationSeconds: avgDuration ? Math.round(avgDuration) : null,
        
        // Favorites
        favoritesCount: playbook._count.favorites,
        
        // Ratings
        avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        totalRatings: playbook._count.ratings,
        ratingDistribution,
        
        // Conversion
        usagesWithCustomers: usagesWithCustomers.length,
        closedWonCount: closedWonUsages.length,
        conversionRate: conversionRate ? Math.round(conversionRate * 10) / 10 : null,
        
        // Distributions
        outcomeDistribution: outcomes,
        contextDistribution: contexts,
        
        // Trends
        usageByDay,
        recentFeedback,
        
        // Time range
        periodStart: thirtyDaysAgo.toISOString(),
        periodEnd: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[API] GET /api/playbooks/[id]/analytics error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
