/**
 * Claims Stats API
 * 
 * GET /api/claims/stats - Get claim statistics for dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const repId = searchParams.get("repId");

    // Build where clause for rep filtering
    const where: Record<string, unknown> = {};
    if (repId) {
      where.customer = { assignedRepId: repId };
    }

    // Get counts by status
    const statusCounts = await prisma.insuranceClaim.groupBy({
      by: ["status"],
      where,
      _count: { id: true },
      _sum: { 
        initialEstimate: true, 
        approvedValue: true, 
        totalPaid: true,
        supplementValue: true,
      },
    });

    // Get total claims
    const totalClaims = await prisma.insuranceClaim.count({ where });

    // Get claims by carrier
    const carrierCounts = await prisma.insuranceClaim.groupBy({
      by: ["carrier"],
      where,
      _count: { id: true },
      _sum: { approvedValue: true },
    });

    // Get claims by type
    const typeCounts = await prisma.insuranceClaim.groupBy({
      by: ["claimType"],
      where,
      _count: { id: true },
    });

    // Get recent claims (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentClaims = await prisma.insuranceClaim.count({
      where: {
        ...where,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    // Get claims needing action (pending inspection, supplement needed)
    const needsAction = await prisma.insuranceClaim.count({
      where: {
        ...where,
        status: { in: ["pending", "filed", "adjuster-assigned", "supplement"] },
      },
    });

    // Get at-risk claims (approved but not paid after 30 days)
    const atRiskClaims = await prisma.insuranceClaim.findMany({
      where: {
        ...where,
        status: "approved",
        updatedAt: { lt: thirtyDaysAgo },
      },
      include: {
        customer: {
          select: { firstName: true, lastName: true },
        },
      },
      take: 10,
    });

    // Calculate financial summaries
    const financials = {
      totalEstimated: statusCounts.reduce((sum, s) => sum + (s._sum.initialEstimate || 0), 0),
      totalApproved: statusCounts.reduce((sum, s) => sum + (s._sum.approvedValue || 0), 0),
      totalPaid: statusCounts.reduce((sum, s) => sum + (s._sum.totalPaid || 0), 0),
      totalSupplements: statusCounts.reduce((sum, s) => sum + (s._sum.supplementValue || 0), 0),
    };

    // Calculate pending revenue (approved but not paid)
    const pendingRevenue = financials.totalApproved - financials.totalPaid;

    // Build status breakdown for kanban
    const statusBreakdown = {
      pending: statusCounts.find((s) => s.status === "pending")?._count.id || 0,
      filed: statusCounts.find((s) => s.status === "filed")?._count.id || 0,
      "adjuster-assigned": statusCounts.find((s) => s.status === "adjuster-assigned")?._count.id || 0,
      "inspection-scheduled": statusCounts.find((s) => s.status === "inspection-scheduled")?._count.id || 0,
      approved: statusCounts.find((s) => s.status === "approved")?._count.id || 0,
      denied: statusCounts.find((s) => s.status === "denied")?._count.id || 0,
      supplement: statusCounts.find((s) => s.status === "supplement")?._count.id || 0,
      paid: statusCounts.find((s) => s.status === "paid")?._count.id || 0,
      closed: statusCounts.find((s) => s.status === "closed")?._count.id || 0,
    };

    // Approval rate
    const decidedClaims = (statusBreakdown.approved + statusBreakdown.denied + statusBreakdown.paid + statusBreakdown.closed);
    const approvalRate = decidedClaims > 0 
      ? Math.round(((statusBreakdown.approved + statusBreakdown.paid + statusBreakdown.closed) / decidedClaims) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalClaims,
        recentClaims,
        needsAction,
        approvalRate,
        statusBreakdown,
        financials: {
          ...financials,
          pendingRevenue,
        },
        byCarrier: carrierCounts.map((c) => ({
          carrier: c.carrier,
          count: c._count.id,
          approvedValue: c._sum.approvedValue || 0,
        })).sort((a, b) => b.count - a.count),
        byType: typeCounts.map((t) => ({
          type: t.claimType,
          count: t._count.id,
        })),
        atRiskClaims: atRiskClaims.map((c) => ({
          id: c.id,
          customer: `${c.customer.firstName} ${c.customer.lastName}`,
          carrier: c.carrier,
          approvedValue: c.approvedValue,
          daysSinceApproval: Math.floor((Date.now() - c.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
        })),
      },
    });
  } catch (error) {
    console.error("[Claims Stats API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch claim stats" },
      { status: 500 }
    );
  }
}
