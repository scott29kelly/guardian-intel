/**
 * Single Campaign API
 *
 * GET    /api/outreach/campaigns/:id - Get campaign with recent executions
 * PUT    /api/outreach/campaigns/:id - Update campaign fields
 * DELETE /api/outreach/campaigns/:id - Delete campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/outreach/campaigns/:id
 *
 * Returns the campaign with its last 10 executions.
 * Each execution includes a _count of its messages.
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

    const campaign = await prisma.outreachCampaign.findUnique({
      where: { id },
      include: {
        executions: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            _count: {
              select: { messages: true },
            },
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("[API] GET /api/outreach/campaigns/:id error:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/outreach/campaigns/:id
 *
 * Update mutable campaign fields. Only provided fields are updated.
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

    // Verify campaign exists
    const existing = await prisma.outreachCampaign.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Build the update data from allowed fields
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || body.name.trim().length === 0) {
        return NextResponse.json(
          { error: "Campaign name must be a non-empty string" },
          { status: 400 }
        );
      }
      updateData.name = body.name.trim();
    }

    if (body.triggerType !== undefined) {
      const validTriggerTypes = ["storm", "manual", "scheduled"];
      if (!validTriggerTypes.includes(body.triggerType)) {
        return NextResponse.json(
          { error: "Invalid triggerType (storm, manual, scheduled)" },
          { status: 400 }
        );
      }
      updateData.triggerType = body.triggerType;
    }

    if (body.stormTypes !== undefined) {
      updateData.stormTypes = body.stormTypes ? JSON.stringify(body.stormTypes) : null;
    }
    if (body.minSeverity !== undefined) {
      updateData.minSeverity = body.minSeverity || null;
    }
    if (body.targetZipCodes !== undefined) {
      updateData.targetZipCodes = body.targetZipCodes
        ? JSON.stringify(body.targetZipCodes)
        : null;
    }
    if (body.targetStates !== undefined) {
      updateData.targetStates = body.targetStates
        ? JSON.stringify(body.targetStates)
        : null;
    }
    if (body.excludeRecentDays !== undefined) {
      updateData.excludeRecentDays = body.excludeRecentDays;
    }
    if (body.enableSms !== undefined) {
      updateData.enableSms = body.enableSms;
    }
    if (body.enableEmail !== undefined) {
      updateData.enableEmail = body.enableEmail;
    }
    if (body.smsTemplate !== undefined) {
      updateData.smsTemplate = body.smsTemplate || null;
    }
    if (body.emailSubject !== undefined) {
      updateData.emailSubject = body.emailSubject || null;
    }
    if (body.emailTemplate !== undefined) {
      updateData.emailTemplate = body.emailTemplate || null;
    }
    if (body.delayMinutes !== undefined) {
      updateData.delayMinutes = body.delayMinutes;
    }
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update" },
        { status: 400 }
      );
    }

    const campaign = await prisma.outreachCampaign.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("[API] PUT /api/outreach/campaigns/:id error:", error);
    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/outreach/campaigns/:id
 *
 * Deletes the campaign and all associated executions/messages (via cascading).
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

    // Verify campaign exists
    const existing = await prisma.outreachCampaign.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    await prisma.outreachCampaign.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] DELETE /api/outreach/campaigns/:id error:", error);
    return NextResponse.json(
      { error: "Failed to delete campaign" },
      { status: 500 }
    );
  }
}
