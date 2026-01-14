/**
 * Storm Outreach Trigger API
 * 
 * POST /api/outreach/trigger - Trigger outreach based on storm event
 * 
 * Called by weather service when storm is detected.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { outreachService, type StormTriggerData } from "@/lib/services/outreach";
import { z } from "zod";

const triggerSchema = z.object({
  stormId: z.string(),
  stormType: z.enum(["hail", "wind", "tornado", "flood", "hurricane", "general"]),
  severity: z.string(),
  affectedZipCodes: z.array(z.string()),
  stormDate: z.string().transform((s) => new Date(s)),
  description: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const stormData = triggerSchema.parse(body) as StormTriggerData;

    // Find and execute matching campaigns
    const result = await outreachService.triggerStormOutreach(stormData);

    // Log activity
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        type: "trigger",
        entityType: "outreach",
        entityId: stormData.stormId,
        description: `Storm outreach triggered: ${result.triggered} campaigns, ${stormData.affectedZipCodes.length} ZIP codes`,
        metadata: JSON.stringify({
          stormType: stormData.stormType,
          severity: stormData.severity,
          campaignsTriggered: result.triggered,
          executions: result.executions,
        }),
      },
    });

    // Create intel item for visibility
    if (result.triggered > 0) {
      const customers = await prisma.customer.findMany({
        where: { zipCode: { in: stormData.affectedZipCodes } },
        select: { id: true },
        take: 1,
      });

      if (customers.length > 0) {
        await prisma.intelItem.create({
          data: {
            customerId: customers[0].id,
            source: "outreach",
            sourceId: stormData.stormId,
            category: "weather",
            title: `Post-storm outreach triggered for ${stormData.stormType}`,
            content: `${result.triggered} campaign(s) automatically triggered for ${stormData.affectedZipCodes.length} affected ZIP codes.`,
            priority: "high",
            actionable: false,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        stormId: stormData.stormId,
        campaignsTriggered: result.triggered,
        executionIds: result.executions,
        affectedZipCodes: stormData.affectedZipCodes.length,
      },
    });
  } catch (error) {
    console.error("[Outreach Trigger API] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Trigger failed" },
      { status: 500 }
    );
  }
}
