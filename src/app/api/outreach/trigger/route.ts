/**
 * Storm Outreach Trigger API
 *
 * POST /api/outreach/trigger - Trigger automated outreach for a storm event
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { outreachService } from "@/lib/services/outreach";
import type { StormTriggerData } from "@/lib/services/outreach/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/outreach/trigger
 *
 * Body: StormTriggerData
 * - stormId: string
 * - stormType: "hail" | "wind" | "tornado" | "flood" | "hurricane" | "general"
 * - severity: string
 * - affectedZipCodes: string[]
 * - stormDate: Date (ISO string)
 * - description?: string
 *
 * Finds all active storm-triggered campaigns that match the storm criteria
 * and executes them. Returns the number of triggered campaigns and their
 * execution IDs.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required StormTriggerData fields
    if (!body.stormId || typeof body.stormId !== "string") {
      return NextResponse.json(
        { error: "stormId is required" },
        { status: 400 }
      );
    }

    const validStormTypes = ["hail", "wind", "tornado", "flood", "hurricane", "general"];
    if (!body.stormType || !validStormTypes.includes(body.stormType)) {
      return NextResponse.json(
        { error: "stormType is required and must be one of: hail, wind, tornado, flood, hurricane, general" },
        { status: 400 }
      );
    }

    if (!body.severity || typeof body.severity !== "string") {
      return NextResponse.json(
        { error: "severity is required" },
        { status: 400 }
      );
    }

    if (!body.affectedZipCodes || !Array.isArray(body.affectedZipCodes) || body.affectedZipCodes.length === 0) {
      return NextResponse.json(
        { error: "affectedZipCodes must be a non-empty array of strings" },
        { status: 400 }
      );
    }

    if (!body.stormDate) {
      return NextResponse.json(
        { error: "stormDate is required" },
        { status: 400 }
      );
    }

    const stormData: StormTriggerData = {
      stormId: body.stormId,
      stormType: body.stormType,
      severity: body.severity,
      affectedZipCodes: body.affectedZipCodes,
      stormDate: new Date(body.stormDate),
      description: body.description,
    };

    const result = await outreachService.triggerStormOutreach(stormData);

    return NextResponse.json({
      triggered: result.triggered,
      executions: result.executions,
    });
  } catch (error) {
    console.error("[API] POST /api/outreach/trigger error:", error);
    return NextResponse.json(
      { error: "Failed to trigger storm outreach" },
      { status: 500 }
    );
  }
}
