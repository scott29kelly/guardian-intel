/**
 * Single Competitor API
 *
 * GET /api/competitors/[id] - Get competitor details
 * PUT /api/competitors/[id] - Update competitor
 * DELETE /api/competitors/[id] - Delete competitor
 *
 * Note: Competitor model not yet implemented in schema
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    return NextResponse.json({
      success: false,
      error: `Competitor ${id} not found - feature not yet implemented`,
    }, { status: 404 });
  } catch (error) {
    console.error("[API] GET /api/competitors/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch competitor" }, { status: 500 });
  }
}

export async function PUT(_request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    return NextResponse.json({
      success: false,
      error: `Cannot update competitor ${id} - feature not yet implemented`,
    }, { status: 501 });
  } catch (error) {
    console.error("[API] PUT /api/competitors/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to update competitor" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    return NextResponse.json({
      success: false,
      error: `Cannot delete competitor ${id} - feature not yet implemented`,
    }, { status: 501 });
  } catch (error) {
    console.error("[API] DELETE /api/competitors/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete competitor" }, { status: 500 });
  }
}
