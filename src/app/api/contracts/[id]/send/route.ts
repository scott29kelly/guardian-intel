/**
 * Contract Send API
 * 
 * POST /api/contracts/[id]/send - Send contract to customer
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { contractService } from "@/lib/services/contracts";
import { z } from "zod";

const sendSchema = z.object({
  via: z.enum(["email", "sms", "in-person"]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = sendSchema.parse(body);

    await contractService.sendContract(id, validated.via, session.user.id);

    return NextResponse.json({
      success: true,
      message: `Contract sent via ${validated.via}`,
    });
  } catch (error) {
    console.error("[Contract Send API] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Send failed" },
      { status: 500 }
    );
  }
}
