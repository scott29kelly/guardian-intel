/**
 * Campaign Execution API
 * 
 * POST /api/outreach/campaigns/[id]/execute - Execute a campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { outreachService, type StormTriggerData } from "@/lib/services/outreach";
import { z } from "zod";

const executeSchema = z.object({
  // For manual execution
  customerIds: z.array(z.string()).optional(),
  
  // For storm-triggered execution
  stormData: z.object({
    stormId: z.string(),
    stormType: z.enum(["hail", "wind", "tornado", "flood", "hurricane", "general"]),
    severity: z.string(),
    affectedZipCodes: z.array(z.string()),
    stormDate: z.string().transform((s) => new Date(s)),
    description: z.string().optional(),
  }).optional(),
});

export async function POST(
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
    const validated = executeSchema.parse(body);

    // Verify campaign exists
    const campaign = await prisma.outreachCampaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    let result;

    if (validated.stormData) {
      // Storm-triggered execution
      result = await outreachService.executeStormCampaign(
        id,
        validated.stormData as StormTriggerData
      );
    } else {
      // Manual execution
      result = await outreachService.executeManualCampaign(
        id,
        validated.customerIds
      );
    }

    // Log activity
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        type: "execute",
        entityType: "campaign",
        entityId: id,
        description: `Executed campaign: ${campaign.name} - ${result.targetedCustomers} customers targeted`,
        metadata: JSON.stringify({
          executionId: result.executionId,
          smsSent: result.smsSent,
          emailSent: result.emailSent,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[Campaign Execute API] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Execution failed" },
      { status: 500 }
    );
  }
}
