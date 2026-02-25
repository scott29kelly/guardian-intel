/**
 * Contract Send API
 *
 * POST /api/contracts/[id]/send - Send a contract via email, SMS, or in-person
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { contractService } from "@/lib/services/contracts";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_SEND_METHODS = ["email", "sms", "in-person"] as const;
type SendMethod = (typeof VALID_SEND_METHODS)[number];

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { id } = await params;
    const body = await request.json();

    // Validate send method
    if (!body.via || !VALID_SEND_METHODS.includes(body.via)) {
      return NextResponse.json(
        { error: `Invalid send method. Must be one of: ${VALID_SEND_METHODS.join(", ")}` },
        { status: 400 }
      );
    }

    const via = body.via as SendMethod;

    await contractService.sendContract(id, via, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Contract Send API] Error:", error);

    const message = error instanceof Error ? error.message : "Failed to send contract";

    // Return 404 for "not found" errors from the service
    if (message === "Contract not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
