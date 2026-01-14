/**
 * Contract Signing API
 * 
 * POST /api/contracts/[id]/sign - Sign a contract
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { contractService } from "@/lib/services/contracts";
import { z } from "zod";

const signSchema = z.object({
  signature: z.string().min(1, "Signature is required"),
  initials: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Note: This endpoint can be accessed without session for customer signing
    // but we still track the session if available
    const session = await getServerSession(authOptions);
    
    const { id } = await params;
    const body = await request.json();
    const validated = signSchema.parse(body);

    // Get client IP
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() || 
               request.headers.get("x-real-ip") || 
               "unknown";

    await contractService.signContract(id, {
      signature: validated.signature,
      initials: validated.initials,
      signedAt: new Date(),
      ip,
      latitude: validated.latitude,
      longitude: validated.longitude,
      address: validated.address,
    });

    return NextResponse.json({
      success: true,
      message: "Contract signed successfully",
    });
  } catch (error) {
    console.error("[Contract Sign API] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Signing failed" },
      { status: 500 }
    );
  }
}
