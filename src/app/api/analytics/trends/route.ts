import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "daily";
    const months = parseInt(searchParams.get("months") || "6");

    const now = new Date();
    const startDate = new Date();
    startDate.setMonth(now.getMonth() - months);

    // Get all closed-won customers in the period
    const closedDeals = await prisma.customer.findMany({
      where: {
        status: "closed-won",
        updatedAt: { gte: startDate },
      },
      select: {
        estimatedJobValue: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "asc" },
    });

    // Group by period
    const trends: { date: string; revenue: number; deals: number }[] = [];

    if (period === "daily") {
      // Last 30 days
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const dayDeals = closedDeals.filter(
          (d) => d.updatedAt >= dayStart && d.updatedAt <= dayEnd
        );

        trends.push({
          date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          revenue: dayDeals.reduce((sum, d) => sum + (d.estimatedJobValue || 0), 0),
          deals: dayDeals.length,
        });
      }
    } else if (period === "weekly") {
      // Last 12 weeks
      for (let i = 11; i >= 0; i--) {
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - i * 7);
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekStart.getDate() - 6);

        const weekDeals = closedDeals.filter(
          (d) => d.updatedAt >= weekStart && d.updatedAt <= weekEnd
        );

        trends.push({
          date: `Week ${12 - i}`,
          revenue: weekDeals.reduce((sum, d) => sum + (d.estimatedJobValue || 0), 0),
          deals: weekDeals.length,
        });
      }
    } else {
      // Monthly
      for (let i = months - 1; i >= 0; i--) {
        const monthStart = new Date();
        monthStart.setMonth(monthStart.getMonth() - i);
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        monthEnd.setDate(0);
        monthEnd.setHours(23, 59, 59, 999);

        const monthDeals = closedDeals.filter(
          (d) => d.updatedAt >= monthStart && d.updatedAt <= monthEnd
        );

        trends.push({
          date: monthStart.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
          revenue: monthDeals.reduce((sum, d) => sum + (d.estimatedJobValue || 0), 0),
          deals: monthDeals.length,
        });
      }
    }

    // Calculate cumulative revenue
    let cumulative = 0;
    const cumulativeTrends = trends.map((t) => {
      cumulative += t.revenue;
      return { ...t, cumulative };
    });

    return NextResponse.json({
      trends: cumulativeTrends,
      summary: {
        totalRevenue: cumulative,
        totalDeals: closedDeals.length,
        avgDealSize: closedDeals.length > 0 ? Math.round(cumulative / closedDeals.length) : 0,
      },
    });
  } catch (error) {
    console.error("Trends API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch trends" },
      { status: 500 }
    );
  }
}
