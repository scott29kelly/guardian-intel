/**
 * Infographic Intent Parsing API
 *
 * POST /api/ai/parse-infographic-intent - Parse conversational text into
 * structured infographic parameters (modules + audience).
 *
 * Security: Requires NextAuth session (401 if unauthenticated)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parseIntent } from "@/features/infographic-generator/services/intentParser";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.prompt || typeof body.prompt !== "string") {
      return NextResponse.json(
        { error: "prompt is required and must be a string" },
        { status: 400 },
      );
    }

    const result = await parseIntent(body.prompt);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] POST /api/ai/parse-infographic-intent error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Intent parsing failed" },
      { status: 500 },
    );
  }
}
