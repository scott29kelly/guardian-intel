/**
 * Template Preview API
 * 
 * POST /api/outreach/preview - Preview personalized template
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { outreachService } from "@/lib/services/outreach";
import { z } from "zod";

const previewSchema = z.object({
  template: z.string(),
  channel: z.enum(["sms", "email"]),
  subject: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = previewSchema.parse(body);

    const previewBody = outreachService.previewTemplate(validated.template, validated.channel);
    const previewSubject = validated.subject 
      ? outreachService.previewTemplate(validated.subject, validated.channel)
      : undefined;

    return NextResponse.json({
      data: {
        body: previewBody,
        subject: previewSubject,
        characterCount: previewBody.length,
        smsSegments: validated.channel === "sms" ? Math.ceil(previewBody.length / 160) : undefined,
      },
    });
  } catch (error) {
    console.error("[Preview API] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Preview failed" },
      { status: 500 }
    );
  }
}
