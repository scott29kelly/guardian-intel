/**
 * POST /api/lead-intel/backfill
 *
 * Internal-data backfill trigger (LG-05, LG-06). Requires NextAuth session
 * AND session.user.role === "admin". Invokes runInternalBackfill which
 * reads Customer + WeatherEvent + CanvassingPin + Interaction + PropertyData,
 * resolves them into TrackedProperty rows, and produces PropertySignalEvent
 * + PropertyScoreSnapshot outputs.
 *
 * Response (200): { success: true, stats: IngestStats }
 * Response (401): no session or user not found
 * Response (403): session.user.role !== "admin"
 *
 * Security: NextAuth session + admin role gate (T-08-03-03)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runInternalBackfill } from "@/lib/services/lead-intel";

export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    const role = (session.user as { role?: string }).role;
    if (role !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden — admin role required" },
        { status: 403 },
      );
    }

    const userId = (session.user as { id?: string }).id;
    const stats = await runInternalBackfill({
      triggeredByUserId: userId,
      rescoreAll: true,
    });
    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("[API] POST /api/lead-intel/backfill error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Backfill failed" },
      { status: 500 },
    );
  }
}
