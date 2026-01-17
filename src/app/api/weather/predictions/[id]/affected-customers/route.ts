/**
 * Affected Customers by Prediction API
 * 
 * GET /api/weather/predictions/[id]/affected-customers
 * Returns customers who will be affected by a predicted storm
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { predictiveStormService } from "@/lib/services/weather/predictive-storm-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: predictionId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");

    const customers = await predictiveStormService.getAffectedCustomers(predictionId);

    return NextResponse.json({
      success: true,
      data: customers.slice(0, limit),
      meta: {
        total: customers.length,
        predictionId,
        limit,
      },
    });
  } catch (error) {
    console.error("[Affected Customers API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch affected customers" },
      { status: 500 }
    );
  }
}
