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
    const timeRange = searchParams.get("timeRange") || "month";

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (timeRange) {
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "quarter":
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Get all reps
    const reps = await prisma.user.findMany({
      where: {
        role: { in: ["rep", "manager"] },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        totalDeals: true,
        totalRevenue: true,
        avgDealSize: true,
        closeRate: true,
        monthlyTarget: true,
      },
    });

    // Get stats for each rep in the time period
    type Rep = typeof reps[number];
    const leaderboard = await Promise.all(
      reps.map(async (rep: Rep) => {
        // Closed deals in period
        const closedDeals = await prisma.customer.aggregate({
          _count: { id: true },
          _sum: { estimatedJobValue: true },
          where: {
            assignedRepId: rep.id,
            status: "closed-won",
            updatedAt: { gte: startDate },
          },
        });

        // Total leads contacted
        const leadsContacted = await prisma.interaction.groupBy({
          by: ["customerId"],
          where: {
            userId: rep.id,
            createdAt: { gte: startDate },
          },
        });

        // Interactions in period
        const interactions = await prisma.interaction.findMany({
          where: {
            userId: rep.id,
            createdAt: { gte: startDate },
          },
          select: {
            type: true,
            createdAt: true,
          },
        });

        // Calculate calls per day
        const daysInPeriod = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const totalCalls = interactions.filter((i) => i.type === "call").length;
        const callsPerDay = daysInPeriod > 0 ? Math.round((totalCalls / daysInPeriod) * 10) / 10 : 0;

        // Appointments set
        const appointmentsSet = interactions.filter((i) => 
          i.type === "meeting" || i.type === "visit"
        ).length;

        const dealsClosed = closedDeals._count.id || 0;
        const revenue = closedDeals._sum.estimatedJobValue || 0;
        const avgDealSize = dealsClosed > 0 ? Math.round(revenue / dealsClosed) : 0;
        const conversionRate = leadsContacted.length > 0 
          ? Math.round((dealsClosed / leadsContacted.length) * 1000) / 10 
          : 0;

        // Calculate trend based on previous period
        const prevStart = new Date(startDate);
        prevStart.setTime(startDate.getTime() - (now.getTime() - startDate.getTime()));
        
        const prevDeals = await prisma.customer.aggregate({
          _sum: { estimatedJobValue: true },
          where: {
            assignedRepId: rep.id,
            status: "closed-won",
            updatedAt: { gte: prevStart, lt: startDate },
          },
        });

        const prevRevenue = prevDeals._sum.estimatedJobValue || 0;
        let trend: "up" | "down" | "stable" = "stable";
        if (revenue > prevRevenue * 1.1) trend = "up";
        else if (revenue < prevRevenue * 0.9) trend = "down";

        return {
          id: rep.id,
          name: rep.name,
          role: rep.role === "manager" ? "Manager" : "Sales Rep",
          avatar: rep.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
          phone: rep.phone || "",
          email: rep.email,
          stats: {
            leadsContacted: leadsContacted.length,
            appointmentsSet,
            dealsClosed,
            revenue,
            conversionRate,
            avgDealSize,
            callsPerDay,
            responseTime: "2.1 hrs", // Would need actual tracking
          },
          trend,
          coachingNotes: [], // Would come from a separate notes system
        };
      })
    );

    // Sort by revenue and add rank
    const sorted = leaderboard
      .sort((a, b) => b.stats.revenue - a.stats.revenue)
      .map((rep, index) => ({ ...rep, rank: index + 1 }));

    // Calculate team totals
    const teamTotals = {
      totalRevenue: sorted.reduce((sum, r) => sum + r.stats.revenue, 0),
      totalDeals: sorted.reduce((sum, r) => sum + r.stats.dealsClosed, 0),
      avgConversion: sorted.length > 0 
        ? Math.round(sorted.reduce((sum, r) => sum + r.stats.conversionRate, 0) / sorted.length * 10) / 10
        : 0,
      activeReps: sorted.length,
    };

    return NextResponse.json({
      leaderboard: sorted,
      teamTotals,
    });
  } catch (error) {
    console.error("Leaderboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
