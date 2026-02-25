/**
 * Template Preview API
 *
 * POST /api/outreach/preview - Preview a message template with sample data
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { outreachService } from "@/lib/services/outreach";

export const dynamic = "force-dynamic";

/**
 * POST /api/outreach/preview
 *
 * Body:
 * - template: string (the template text with {{variables}})
 * - channel: "sms" | "email"
 *
 * Returns the template rendered with sample personalization data.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.template || typeof body.template !== "string") {
      return NextResponse.json(
        { error: "template is required and must be a string" },
        { status: 400 }
      );
    }

    const validChannels = ["sms", "email"];
    if (!body.channel || !validChannels.includes(body.channel)) {
      return NextResponse.json(
        { error: "channel is required and must be 'sms' or 'email'" },
        { status: 400 }
      );
    }

    const preview = outreachService.previewTemplate(body.template, body.channel);

    return NextResponse.json({ preview });
  } catch (error) {
    console.error("[API] POST /api/outreach/preview error:", error);
    return NextResponse.json(
      { error: "Failed to preview template" },
      { status: 500 }
    );
  }
}
