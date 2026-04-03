/**
 * Contract Signing API
 *
 * POST /api/contracts/[id]/sign - Sign a contract (customer or rep)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { contractService } from "@/lib/services/contracts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId, role } = session.user;
    const isAdmin = role === "admin" || role === "manager";
    const { id } = await params;

    // Verify ownership
    const contract = await prisma.contract.findUnique({
      where: { id },
      select: { createdById: true },
    });
    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }
    if (!isAdmin && contract.createdById !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Validate signature
    if (!body.signature || typeof body.signature !== "string") {
      return NextResponse.json(
        { error: "signature is required and must be a base64 string" },
        { status: 400 }
      );
    }

    // Validate type
    if (!body.type || !["customer", "rep"].includes(body.type)) {
      return NextResponse.json(
        { error: 'type is required and must be "customer" or "rep"' },
        { status: 400 }
      );
    }

    // Extract client IP from request headers
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded
      ? forwarded.split(",")[0].trim()
      : request.headers.get("x-real-ip") || undefined;

    if (body.type === "customer") {
      await contractService.signContract(id, {
        signature: body.signature,
        signedAt: new Date(),
        ip,
      });
    } else {
      // rep signature
      await contractService.addRepSignature(id, userId, body.signature);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Contract Sign API] Error:", error);

    const message = error instanceof Error ? error.message : "Failed to sign contract";

    if (message === "Contract not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    // Business logic errors from the service (already signed, cancelled, etc.)
    if (
      message.includes("already signed") ||
      message.includes("cancelled")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
