/**
 * Dashboard Data API
 * 
 * GET /api/dashboard - Get aggregated dashboard data
 * 
 * Returns:
 * - Priority customers (top 3 by lead score)
 * - Recent weather events
 * - Intel items for priority customers
 * - Aggregated metrics
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    // Fetch priority customers (top 3 by lead score)
    const priorityCustomers = await prisma.customer.findMany({
      where: {
        status: { in: ["lead", "prospect", "customer"] },
      },
      orderBy: { leadScore: "desc" },
      take: 3,
      include: {
        assignedRep: {
          select: { id: true, name: true },
        },
      },
    });

    // Get intel items for priority customers
    const customerIds = priorityCustomers.map((c) => c.id);
    const intelItems = await prisma.intelItem.findMany({
      where: {
        customerId: { in: customerIds },
        isDismissed: false,
      },
      orderBy: { createdAt: "desc" },
    });

    // Get weather events for priority customers
    const weatherEvents = await prisma.weatherEvent.findMany({
      where: {
        customerId: { in: customerIds },
      },
      orderBy: { eventDate: "desc" },
    });

    // Get recent storm events (for alerts)
    const recentStorms = await prisma.weatherEvent.findMany({
      where: {
        eventDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      },
      orderBy: { eventDate: "desc" },
      take: 5,
    });

    // Aggregate metrics
    const [
      totalCustomers,
      hotLeads,
      closedWonThisMonth,
      stormAffectedCount,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({
        where: { leadScore: { gte: 80 }, status: { in: ["lead", "prospect"] } },
      }),
      prisma.customer.count({
        where: {
          status: "closed-won",
          updatedAt: { gte: new Date(new Date().setDate(1)) }, // This month
        },
      }),
      prisma.customer.count({
        where: { weatherEvents: { some: {} } },
      }),
    ]);

    // Calculate pipeline value
    const pipelineData = await prisma.customer.aggregate({
      where: { status: { in: ["lead", "prospect"] } },
      _sum: { profitPotential: true },
      _count: true,
    });

    // Calculate revenue from closed-won
    const revenueData = await prisma.customer.aggregate({
      where: { status: "closed-won" },
      _sum: { profitPotential: true },
    });

    const metrics = {
      revenue: {
        value: revenueData._sum.profitPotential || 0,
        change: 23.4, // Would calculate from historical data
        target: 500000,
      },
      pipeline: {
        value: pipelineData._sum.profitPotential || 0,
        deals: pipelineData._count,
      },
      stormOpportunity: {
        value: stormAffectedCount * 15000, // Avg deal value estimate
        affected: stormAffectedCount,
      },
      activeAlerts: recentStorms.length,
      hotLeads,
    };

    // Build alerts from recent activity
    const alerts = recentStorms.slice(0, 3).map((storm, i) => ({
      id: storm.id,
      type: "storm",
      message: `${storm.severity} ${storm.eventType} - ${storm.city || storm.county}, ${storm.state}`,
      time: getRelativeTime(storm.eventDate),
      severity: storm.severity === "severe" || storm.severity === "catastrophic" ? "critical" : 
                storm.severity === "moderate" ? "high" : "warning",
    }));

    return NextResponse.json({
      success: true,
      priorityCustomers: priorityCustomers.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        address: c.address,
        city: c.city,
        state: c.state,
        zipCode: c.zipCode,
        propertyType: c.propertyType,
        yearBuilt: c.yearBuilt,
        squareFootage: c.squareFootage,
        roofType: c.roofType,
        roofAge: c.roofAge,
        propertyValue: c.propertyValue,
        insuranceCarrier: c.insuranceCarrier,
        policyType: c.policyType,
        deductible: c.deductible,
        leadScore: c.leadScore,
        urgencyScore: c.urgencyScore,
        profitPotential: c.profitPotential,
        churnRisk: c.churnRisk,
        status: c.status,
        stage: c.stage,
        assignedRep: c.assignedRep?.name || "Unassigned",
        lastContact: c.updatedAt,
        nextAction: "Follow up", // Would come from tasks
        nextActionDate: new Date(),
      })),
      intelItems: intelItems.map((i) => ({
        id: i.id,
        customerId: i.customerId,
        source: i.source,
        category: i.category,
        title: i.title,
        content: i.content,
        confidence: i.confidence,
        actionable: i.actionable,
        priority: i.priority,
        createdAt: i.createdAt,
      })),
      weatherEvents: weatherEvents.map((w) => ({
        id: w.id,
        customerId: w.customerId,
        eventType: w.eventType,
        eventDate: w.eventDate,
        severity: w.severity,
        hailSize: w.hailSize,
        windSpeed: w.windSpeed,
        damageReported: w.damageReported,
        claimFiled: w.claimFiled,
      })),
      metrics,
      alerts,
    });
  } catch (error) {
    console.error("[API] GET /api/dashboard error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}
