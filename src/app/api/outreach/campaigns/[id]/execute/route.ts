/**
 * Campaign Execution API
 *
 * POST /api/outreach/campaigns/:id/execute - Manually execute a campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { outreachService } from "@/lib/services/outreach";

export const dynamic = "force-dynamic";

/**
 * POST /api/outreach/campaigns/:id/execute
 *
 * Manually triggers execution of a campaign.
 *
 * Body (optional):
 * - customerIds?: string[] - Specific customer IDs to target.
 *   If omitted, the campaign's targeting rules determine the audience.
 */
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

    // Parse optional body (may be empty)
    let customerIds: string[] | undefined;
    try {
      const body = await request.json();
      if (body.customerIds && Array.isArray(body.customerIds)) {
        customerIds = body.customerIds;
      }
    } catch {
      // Empty body is fine for this endpoint
    }

    const result = await outreachService.executeManualCampaign(id, customerIds);

    // If the service reported a failure (campaign not found / inactive), return 404
    if (result.status === "failed" && result.executionId === "") {
      return NextResponse.json(
        { error: result.errors[0] || "Campaign execution failed" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] POST /api/outreach/campaigns/:id/execute error:", error);
    return NextResponse.json(
      { error: "Failed to execute campaign" },
      { status: 500 }
    );
  }
}
