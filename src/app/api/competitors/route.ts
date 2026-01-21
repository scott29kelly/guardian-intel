/**
 * Competitors API
 *
 * GET /api/competitors - List all competitors
 * POST /api/competitors - Create a new competitor
 *
 * Note: Competitor model not yet implemented in schema
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/competitors
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Return empty list - competitor tracking not yet implemented
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
      message: "Competitor tracking coming soon",
    });
  } catch (error) {
    console.error("[API] GET /api/competitors error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch competitors" }, { status: 500 });
  }
}

/**
 * POST /api/competitors
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
      success: false,
      error: "Competitor tracking not yet implemented",
    }, { status: 501 });
  } catch (error) {
    console.error("[API] POST /api/competitors error:", error);
    return NextResponse.json({ success: false, error: "Failed to create competitor" }, { status: 500 });
  }
}
