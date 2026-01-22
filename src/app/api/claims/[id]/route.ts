/**
 * Claims API - Single Claim Operations
 * 
 * GET /api/claims/[id] - Get claim details
 * PUT /api/claims/[id] - Update claim
 * DELETE /api/claims/[id] - Delete claim
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { claimUpdateSchema } from "@/lib/validations";

// =============================================================================
// GET - Get Claim Details
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const claim = await prisma.insuranceClaim.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
            propertyType: true,
            yearBuilt: true,
            squareFootage: true,
            roofType: true,
            roofAge: true,
            propertyValue: true,
            insuranceCarrier: true,
            policyNumber: true,
            assignedRep: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Get status history from intel items
    const statusHistory = await prisma.intelItem.findMany({
      where: {
        customerId: claim.customerId,
        category: "insurance",
        OR: [
          { title: { contains: "Claim" } },
          { title: { contains: "Insurance" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...claim,
        statusHistory,
      },
    });
  } catch (error) {
    console.error("[Claims API] Get error:", error);
    return NextResponse.json(
      { error: "Failed to fetch claim" },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT - Update Claim
// =============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = claimUpdateSchema.parse(body);

    // Get current claim for comparison
    const currentClaim = await prisma.insuranceClaim.findUnique({
      where: { id },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!currentClaim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Track status change for timeline
    const statusChanged = validated.status && validated.status !== currentClaim.status;
    const previousStatus = currentClaim.status;

    // Update the claim
    const claim = await prisma.insuranceClaim.update({
      where: { id },
      data: validated,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            address: true,
            city: true,
            state: true,
          },
        },
      },
    });

    // Log status change as intel item
    if (statusChanged) {
      await prisma.intelItem.create({
        data: {
          customerId: claim.customerId,
          source: "system",
          category: "insurance",
          title: `Claim Status: ${formatStatus(validated.status!)}`,
          content: `Insurance claim status changed from "${formatStatus(previousStatus)}" to "${formatStatus(validated.status!)}".`,
          actionable: ["approved", "denied", "paid"].includes(validated.status!) ? true : false,
          priority: validated.status === "denied" ? "critical" : validated.status === "approved" ? "high" : "medium",
        },
      });
    }

    // Log the activity
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        type: "edit",
        entityType: "claim",
        entityId: claim.id,
        description: statusChanged
          ? `Updated claim status to "${formatStatus(validated.status!)}" for ${currentClaim.customer.firstName} ${currentClaim.customer.lastName}`
          : `Updated claim for ${currentClaim.customer.firstName} ${currentClaim.customer.lastName}`,
        metadata: JSON.stringify({
          previousStatus,
          newStatus: validated.status,
          changes: Object.keys(validated),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: claim,
    });
  } catch (error) {
    console.error("[Claims API] Update error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update claim" },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Delete Claim
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const claim = await prisma.insuranceClaim.findUnique({
      where: { id },
      include: {
        customer: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    await prisma.insuranceClaim.delete({
      where: { id },
    });

    // Log the activity
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        type: "delete",
        entityType: "claim",
        entityId: id,
        description: `Deleted claim for ${claim.customer.firstName} ${claim.customer.lastName}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Claim deleted",
    });
  } catch (error) {
    console.error("[Claims API] Delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete claim" },
      { status: 500 }
    );
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending: "Pending",
    filed: "Filed",
    "adjuster-assigned": "Adjuster Assigned",
    "inspection-scheduled": "Inspection Scheduled",
    approved: "Approved",
    denied: "Denied",
    supplement: "Supplement Filed",
    paid: "Paid",
    closed: "Closed",
  };
  return statusMap[status] || status;
}
