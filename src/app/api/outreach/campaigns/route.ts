/**
 * Outreach Campaigns API
 * 
 * GET  /api/outreach/campaigns - List campaigns
 * POST /api/outreach/campaigns - Create campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  triggerType: z.enum(["storm", "manual", "scheduled"]),
  stormTypes: z.array(z.string()).optional(),
  minSeverity: z.string().optional(),
  targetZipCodes: z.array(z.string()).optional(),
  targetStates: z.array(z.string()).optional(),
  excludeRecent: z.number().default(30),
  enableSms: z.boolean().default(true),
  enableEmail: z.boolean().default(true),
  smsTemplate: z.string().optional(),
  emailSubject: z.string().optional(),
  emailTemplate: z.string().optional(),
  delayMinutes: z.number().default(0),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const triggerType = searchParams.get("triggerType");
    const isActive = searchParams.get("isActive");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = {
      isArchived: false,
    };

    if (triggerType) where.triggerType = triggerType;
    if (isActive !== null) where.isActive = isActive === "true";

    const [campaigns, total] = await Promise.all([
      prisma.outreachCampaign.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
          _count: {
            select: { executions: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.outreachCampaign.count({ where }),
    ]);

    return NextResponse.json({
      data: campaigns.map((c) => ({
        ...c,
        stormTypes: c.stormTypes ? JSON.parse(c.stormTypes) : [],
        targetZipCodes: c.targetZipCodes ? JSON.parse(c.targetZipCodes) : [],
        targetStates: c.targetStates ? JSON.parse(c.targetStates) : [],
        sendWindow: c.sendWindow ? JSON.parse(c.sendWindow) : null,
        executionCount: c._count.executions,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[Campaigns API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createCampaignSchema.parse(body);

    const campaign = await prisma.outreachCampaign.create({
      data: {
        name: validated.name,
        description: validated.description,
        triggerType: validated.triggerType,
        stormTypes: validated.stormTypes ? JSON.stringify(validated.stormTypes) : null,
        minSeverity: validated.minSeverity,
        targetZipCodes: validated.targetZipCodes ? JSON.stringify(validated.targetZipCodes) : null,
        targetStates: validated.targetStates ? JSON.stringify(validated.targetStates) : null,
        excludeRecent: validated.excludeRecent,
        enableSms: validated.enableSms,
        enableEmail: validated.enableEmail,
        smsTemplate: validated.smsTemplate,
        emailSubject: validated.emailSubject,
        emailTemplate: validated.emailTemplate,
        delayMinutes: validated.delayMinutes,
        createdById: session.user.id,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        type: "create",
        entityType: "campaign",
        entityId: campaign.id,
        description: `Created outreach campaign: ${campaign.name}`,
      },
    });

    return NextResponse.json({ data: campaign }, { status: 201 });
  } catch (error) {
    console.error("[Campaigns API] POST error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
