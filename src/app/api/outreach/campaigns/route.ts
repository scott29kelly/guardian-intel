/**
 * Outreach Campaigns API
 *
 * GET  /api/outreach/campaigns - List campaigns with pagination & filters
 * POST /api/outreach/campaigns - Create a new campaign
 */

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/outreach/campaigns
 *
 * Query params:
 * - page: number (default 1)
 * - limit: number (default 20, max 100)
 * - triggerType: "storm" | "manual" | "scheduled"
 * - isActive: "true" | "false"
 */
export async function GET(request: Request) {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId, role } = session.user;
    const isAdmin = role === "admin" || role === "manager";
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const triggerType = searchParams.get("triggerType");
    const isActiveParam = searchParams.get("isActive");

    // Build where clause - reps see only their own
    const where: Record<string, unknown> = {};
    if (!isAdmin) {
      where.createdById = userId;
    }

    if (triggerType) {
      where.triggerType = triggerType;
    }

    if (isActiveParam !== null && isActiveParam !== undefined && isActiveParam !== "") {
      where.isActive = isActiveParam === "true";
    }

    const [campaigns, total] = await Promise.all([
      prisma.outreachCampaign.findMany({
        where,
        include: {
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
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[API] GET /api/outreach/campaigns error:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/outreach/campaigns
 *
 * Body:
 * - name: string (required)
 * - triggerType: "storm" | "manual" | "scheduled" (required)
 * - stormTypes?: string[] (JSON)
 * - minSeverity?: string
 * - targetZipCodes?: string[] (JSON)
 * - targetStates?: string[] (JSON)
 * - excludeRecentDays?: number (default 30)
 * - enableSms?: boolean
 * - enableEmail?: boolean
 * - smsTemplate?: string
 * - emailSubject?: string
 * - emailTemplate?: string
 * - delayMinutes?: number (default 0)
 * - isActive?: boolean (default true)
 */
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: "Campaign name is required" },
        { status: 400 }
      );
    }

    const validTriggerTypes = ["storm", "manual", "scheduled"];
    if (!body.triggerType || !validTriggerTypes.includes(body.triggerType)) {
      return NextResponse.json(
        { error: "Valid triggerType is required (storm, manual, scheduled)" },
        { status: 400 }
      );
    }

    const campaign = await prisma.outreachCampaign.create({
      data: {
        name: body.name.trim(),
        createdById: userId,
        triggerType: body.triggerType,
        stormTypes: body.stormTypes ? JSON.stringify(body.stormTypes) : null,
        minSeverity: body.minSeverity || null,
        targetZipCodes: body.targetZipCodes ? JSON.stringify(body.targetZipCodes) : null,
        targetStates: body.targetStates ? JSON.stringify(body.targetStates) : null,
        excludeRecentDays: body.excludeRecentDays ?? 30,
        enableSms: body.enableSms ?? false,
        enableEmail: body.enableEmail ?? false,
        smsTemplate: body.smsTemplate || null,
        emailSubject: body.emailSubject || null,
        emailTemplate: body.emailTemplate || null,
        delayMinutes: body.delayMinutes ?? 0,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/outreach/campaigns error:", error);
    return NextResponse.json(
      { error: "Failed to create campaign" },
      { status: 500 }
    );
  }
}
