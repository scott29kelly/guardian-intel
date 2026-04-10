/**
 * GET /api/lead-intel/properties/:id
 *
 * Full property detail including provenance, signal history, latest score
 * snapshot, and outcome events. Lazy-recomputes the snapshot if any signal
 * is newer than the latest snapshot (handled inside getPropertyDetail).
 *
 * NextAuth required (any authenticated user). Same IDOR-accept posture as
 * the list endpoint — see LG-02 deferral.
 *
 * Security: NextAuth session required, Input validated (T-08-03-04)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPropertyDetail } from "@/lib/services/lead-intel";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await context.params;
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "Validation error", details: "id is required" },
        { status: 400 },
      );
    }

    const detail = await getPropertyDetail(id);
    if (!detail) {
      return NextResponse.json(
        { success: false, error: "Property not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true, ...detail });
  } catch (error) {
    console.error("[API] GET /api/lead-intel/properties/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Detail failed" },
      { status: 500 },
    );
  }
}
