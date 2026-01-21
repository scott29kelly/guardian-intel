/**
 * Competitor Activity API
 *
 * GET /api/competitors/activity - List activities
 * POST /api/competitors/activity - Log new activity
 *
 * Note: Competitor model not yet implemented in schema
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
      message: "Competitor activity tracking coming soon",
    });
  } catch (error) {
    console.error("[API] GET /api/competitors/activity error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch activities" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: "Competitor activity tracking not yet implemented",
    }, { status: 501 });
  } catch (error) {
    console.error("[API] POST /api/competitors/activity error:", error);
    return NextResponse.json({ success: false, error: "Failed to log activity" }, { status: 500 });
  }
}
