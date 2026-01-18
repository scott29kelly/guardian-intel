/**
 * Single Campaign API
 * 
 * GET    /api/outreach/campaigns/[id] - Get campaign details
 * PUT    /api/outreach/campaigns/[id] - Update campaign
 * DELETE /api/outreach/campaigns/[id] - Archive campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  stormTypes: z.array(z.string()).optional(),
  minSeverity: z.string().optional(),
  targetZipCodes: z.array(z.string()).optional(),
  targetStates: z.array(z.string()).optional(),
  excludeRecent: z.number().optional(),
  enableSms: z.boolean().optional(),
  enableEmail: z.boolean().optional(),
  smsTemplate: z.string().optional(),
  emailSubject: z.string().optional(),
  emailTemplate: z.string().optional(),
  delayMinutes: z.number().optional(),
  isActive: z.boolean().optional(),
});

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

    const campaign = await prisma.outreachCampaign.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        executions: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            createdAt: true,
            status: true,
            triggerType: true,
            affectedCustomers: true,
            smsSent: true,
            emailSent: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        ...campaign,
        stormTypes: campaign.stormTypes ? JSON.parse(campaign.stormTypes) : [],
        targetZipCodes: campaign.targetZipCodes ? JSON.parse(campaign.targetZipCodes) : [],
        targetStates: campaign.targetStates ? JSON.parse(campaign.targetStates) : [],
        sendWindow: campaign.sendWindow ? JSON.parse(campaign.sendWindow) : null,
      },
    });
  } catch (error) {
    console.error("[Campaign API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    );
  }
}

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
    const validated = updateCampaignSchema.parse(body);

    const existing = await prisma.outreachCampaign.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const updateData: any = {};
    
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.stormTypes !== undefined) updateData.stormTypes = JSON.stringify(validated.stormTypes);
    if (validated.minSeverity !== undefined) updateData.minSeverity = validated.minSeverity;
    if (validated.targetZipCodes !== undefined) updateData.targetZipCodes = JSON.stringify(validated.targetZipCodes);
    if (validated.targetStates !== undefined) updateData.targetStates = JSON.stringify(validated.targetStates);
    if (validated.excludeRecent !== undefined) updateData.excludeRecent = validated.excludeRecent;
    if (validated.enableSms !== undefined) updateData.enableSms = validated.enableSms;
    if (validated.enableEmail !== undefined) updateData.enableEmail = validated.enableEmail;
    if (validated.smsTemplate !== undefined) updateData.smsTemplate = validated.smsTemplate;
    if (validated.emailSubject !== undefined) updateData.emailSubject = validated.emailSubject;
    if (validated.emailTemplate !== undefined) updateData.emailTemplate = validated.emailTemplate;
    if (validated.delayMinutes !== undefined) updateData.delayMinutes = validated.delayMinutes;
    if (validated.isActive !== undefined) updateData.isActive = validated.isActive;

    const campaign = await prisma.outreachCampaign.update({
      where: { id },
      data: updateData,
    });

    await prisma.activity.create({
      data: {
        userId: session.user.id,
        type: "update",
        entityType: "campaign",
        entityId: campaign.id,
        description: `Updated campaign: ${campaign.name}`,
      },
    });

    return NextResponse.json({ data: campaign });
  } catch (error) {
    console.error("[Campaign API] PUT error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update campaign" },
      { status: 500 }
    );
  }
}

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

    const campaign = await prisma.outreachCampaign.update({
      where: { id },
      data: { isArchived: true, isActive: false },
    });

    await prisma.activity.create({
      data: {
        userId: session.user.id,
        type: "delete",
        entityType: "campaign",
        entityId: campaign.id,
        description: `Archived campaign: ${campaign.name}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Campaign API] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to archive campaign" },
      { status: 500 }
    );
  }
}
