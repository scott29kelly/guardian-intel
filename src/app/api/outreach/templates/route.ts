/**
 * Outreach Templates API
 *
 * GET /api/outreach/templates - Return built-in default templates
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DEFAULT_TEMPLATES } from "@/lib/services/outreach/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/outreach/templates
 *
 * Returns the set of built-in default message templates for outreach campaigns.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ templates: DEFAULT_TEMPLATES });
  } catch (error) {
    console.error("[API] GET /api/outreach/templates error:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}
