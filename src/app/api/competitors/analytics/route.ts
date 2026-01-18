/**
 * Competitor Analytics API
 * 
 * GET /api/competitors/analytics - Get comprehensive competitor analytics
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getCompetitorAnalytics } from "@/lib/services/competitors";
import { z } from "zod";

export const dynamic = "force-dynamic";

const analyticsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  state: z.string().optional(),
  competitorId: z.string().optional(),
});

/**
 * GET /api/competitors/analytics
 */
export async function GET(request: Request) {
  try {
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validation = analyticsQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json({ success: false, error: "Invalid query parameters" }, { status: 400 });
    }

    const analytics = await getCompetitorAnalytics(validation.data);

    return NextResponse.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("[API] GET /api/competitors/analytics error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch analytics" }, { status: 500 });
  }
}
