/**
 * Individual Proposal API
 *
 * GET    /api/proposals/:id - Get proposal by ID with full details
 * PUT    /api/proposals/:id - Update proposal (status, notes, timestamps)
 * DELETE /api/proposals/:id - Delete a draft proposal
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Helper: safely parse a JSON string field, returning the parsed object or null
function safeParseJson(value: string | null | undefined): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * GET /api/proposals/:id
 *
 * Returns the proposal with customer details and parsed JSON fields.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // Parse JSON fields for the response
    const parsed = {
      ...proposal,
      customerSnapshot: safeParseJson(proposal.customerSnapshot),
      propertySnapshot: safeParseJson(proposal.propertySnapshot),
      weatherEvents: safeParseJson(proposal.weatherEvents),
      damageAssessment: safeParseJson(proposal.damageAssessment),
      pricingOptions: safeParseJson(proposal.pricingOptions),
      lineItems: safeParseJson(proposal.lineItems),
      aiContent: safeParseJson(proposal.aiContent),
      sourceDataSnapshot: safeParseJson(proposal.sourceDataSnapshot),
    };

    return NextResponse.json({ proposal: parsed });
  } catch (error) {
    console.error("[API] GET /api/proposals/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch proposal" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/proposals/:id
 *
 * Updatable fields: status, notes, sentAt, viewedAt, respondedAt
 */
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

    // Verify the proposal exists
    const existing = await prisma.proposal.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const body = await request.json();
    const { status, notes, sentAt, viewedAt, respondedAt } = body;

    // Build update data with only the fields that were provided
    const updateData: Record<string, unknown> = {};

    if (status !== undefined) {
      const validStatuses = ["draft", "sent", "viewed", "accepted", "rejected", "expired", "revised"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    if (notes !== undefined) {
      if (notes !== null && typeof notes !== "string") {
        return NextResponse.json(
          { error: "notes must be a string or null" },
          { status: 400 }
        );
      }
      updateData.notes = notes;
    }

    if (sentAt !== undefined) {
      updateData.sentAt = sentAt ? new Date(sentAt) : null;
    }

    if (viewedAt !== undefined) {
      updateData.viewedAt = viewedAt ? new Date(viewedAt) : null;
    }

    if (respondedAt !== undefined) {
      updateData.respondedAt = respondedAt ? new Date(respondedAt) : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update" },
        { status: 400 }
      );
    }

    const proposal = await prisma.proposal.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ proposal });
  } catch (error) {
    console.error("[API] PUT /api/proposals/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update proposal" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/proposals/:id
 *
 * Only draft proposals can be deleted.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.proposal.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    if (existing.status !== "draft") {
      return NextResponse.json(
        { error: `Cannot delete a proposal with status "${existing.status}". Only draft proposals can be deleted.` },
        { status: 409 }
      );
    }

    await prisma.proposal.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] DELETE /api/proposals/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete proposal" },
      { status: 500 }
    );
  }
}
