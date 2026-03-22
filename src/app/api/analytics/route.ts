import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cacheGet, cacheSet, buildCacheKey, CACHE_TTL } from "@/lib/cache";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "month";

    // Check cache first
    const cacheKey = buildCacheKey("analytics", "main", timeRange);
    const cached = await cacheGet<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "X-Cache": "HIT" },
      });
    }

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (timeRange) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        break;
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

    // Get customer stage counts for pipeline
    const customersByStage = await prisma.customer.groupBy({
      by: ["stage"],
      _count: { id: true },
      _sum: { estimatedJobValue: true },
      where: {
        createdAt: { gte: startDate },
      },
    });

    // Build pipeline data
    const stageOrder = ["new", "contacted", "qualified", "proposal", "negotiation", "closed"];
    const pipelineData = stageOrder.map((stage) => {
      const stageData = customersByStage.find((s) => s.stage === stage);
      return {
        stage: stage.charAt(0).toUpperCase() + stage.slice(1),
        count: stageData?._count?.id || 0,
        value: stageData?._sum?.estimatedJobValue || 0,
      };
    });

    // Get total revenue (closed-won customers)
    const closedWon = await prisma.customer.aggregate({
      _sum: { estimatedJobValue: true },
      _count: { id: true },
      where: {
        status: "closed-won",
        updatedAt: { gte: startDate },
      },
    });

    // Get total pipeline value (active prospects)
    const pipelineValue = await prisma.customer.aggregate({
      _sum: { estimatedJobValue: true },
      _count: { id: true },
      where: {
        status: { in: ["lead", "prospect"] },
      },
    });

    // Get at-risk deals (no interaction in 7+ days, not closed)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const atRiskDeals = await prisma.customer.findMany({
      where: {
        status: { in: ["lead", "prospect"] },
        updatedAt: { lt: sevenDaysAgo },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        estimatedJobValue: true,
        updatedAt: true,
        assignedRep: { select: { name: true } },
        stage: true,
      },
      orderBy: { updatedAt: "asc" },
      take: 10,
    });

    // Get weekly activity using grouped queries instead of N+1 loop (was 21 sequential queries)
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const [interactionsByDay, closuresByDay] = await Promise.all([
      // Single grouped query for all interaction types across 7 days
      prisma.interaction.groupBy({
        by: ["type"],
        where: {
          createdAt: { gte: weekStart },
          type: { in: ["call", "meeting", "visit"] },
        },
        _count: { id: true },
      }),
      // Single query for closures across 7 days — use raw to group by date
      prisma.$queryRaw<Array<{ d: string; count: bigint }>>`
        SELECT DATE("updatedAt") as d, COUNT(*)::bigint as count
        FROM "Customer"
        WHERE "status" = 'closed-won' AND "updatedAt" >= ${weekStart}
        GROUP BY DATE("updatedAt")
      `,
    ]);

    // For per-day breakdown, fetch interactions with dates via raw query
    const interactionDayBreakdown = await prisma.$queryRaw<
      Array<{ d: string; type: string; count: bigint }>
    >`
      SELECT DATE("createdAt") as d, "type", COUNT(*)::bigint as count
      FROM "Interaction"
      WHERE "createdAt" >= ${weekStart}
        AND "type" IN ('call', 'meeting', 'visit')
      GROUP BY DATE("createdAt"), "type"
    `;

    // Build weekly activity from grouped results
    const weeklyActivity: Array<{
      day: string;
      calls: number;
      appointments: number;
      closures: number;
    }> = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" });

      const calls = interactionDayBreakdown
        .filter((r) => String(r.d).startsWith(dateStr) && r.type === "call")
        .reduce((sum, r) => sum + Number(r.count), 0);

      const appointments = interactionDayBreakdown
        .filter((r) => String(r.d).startsWith(dateStr) && (r.type === "meeting" || r.type === "visit"))
        .reduce((sum, r) => sum + Number(r.count), 0);

      const closures = closuresByDay
        .filter((r) => String(r.d).startsWith(dateStr))
        .reduce((sum, r) => sum + Number(r.count), 0);

      weeklyActivity.push({ day: dayName, calls, appointments, closures });
    }

    // Get weather event stats
    const weatherEvents = await prisma.weatherEvent.aggregate({
      _count: { id: true },
      _sum: { affectedCustomers: true },
      where: {
        eventDate: { gte: startDate },
      },
    });

    // Calculate KPIs
    const totalRevenue = closedWon._sum.estimatedJobValue || 0;
    const totalDeals = closedWon._count.id || 0;
    const avgDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0;
    const revenueTarget = 500000; // This could come from settings

    // Get previous period for comparison
    const prevStart = new Date(startDate);
    const periodLength = now.getTime() - startDate.getTime();
    prevStart.setTime(startDate.getTime() - periodLength);

    const prevClosedWon = await prisma.customer.aggregate({
      _sum: { estimatedJobValue: true },
      where: {
        status: "closed-won",
        updatedAt: { gte: prevStart, lt: startDate },
      },
    });

    const prevRevenue = prevClosedWon._sum.estimatedJobValue || 0;
    const revenueGrowth = prevRevenue > 0
      ? ((totalRevenue - prevRevenue) / prevRevenue * 100)
      : 0;

    const responseData = {
      kpis: {
        totalRevenue,
        revenueTarget,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        totalDeals,
        dealsTarget: 30,
        avgDealSize: Math.round(avgDealSize),
        pipelineValue: pipelineValue._sum.estimatedJobValue || 0,
        pipelineCount: pipelineValue._count.id || 0,
        atRiskCount: atRiskDeals.length,
        weatherEvents: weatherEvents._count.id || 0,
        affectedCustomers: weatherEvents._sum.affectedCustomers || 0,
      },
      pipelineData,
      weeklyActivity,
      atRiskDeals: atRiskDeals.map((d) => ({
        id: d.id,
        customer: `${d.firstName} ${d.lastName}`,
        value: d.estimatedJobValue || 0,
        daysCold: Math.floor((now.getTime() - d.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
        assignedRep: d.assignedRep?.name || "Unassigned",
        stage: d.stage,
      })),
    };

    // Cache the response
    await cacheSet(cacheKey, responseData, CACHE_TTL.analytics);

    return NextResponse.json(responseData, {
      headers: { "X-Cache": "MISS" },
    });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
