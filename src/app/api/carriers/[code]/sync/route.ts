/**
 * Carrier Sync API
 * 
 * POST /api/carriers/[code]/sync - Sync all claims for a carrier
 * POST /api/carriers/[code]/sync?claimId=xxx - Sync single claim
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { carrierService, carrierNames } from "@/lib/services/carriers";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code: carrierCode } = await params;
    const { searchParams } = new URL(request.url);
    const claimId = searchParams.get("claimId");

    // Check if carrier is available
    const isAvailable = await carrierService.isCarrierAvailable(carrierCode);
    if (!isAvailable && carrierCode !== "mock") {
      return NextResponse.json(
        { error: `Carrier ${carrierCode} is not configured` },
        { status: 400 }
      );
    }

    if (claimId) {
      // Sync single claim
      const result = await carrierService.syncClaimStatus(claimId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error?.message || "Sync failed" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        message: "Claim synced successfully",
      });
    } else {
      // Sync all claims for carrier
      const result = await carrierService.syncAllClaims(carrierCode);

      // Log activity
      await prisma.activity.create({
        data: {
          userId: session.user.id,
          type: "sync",
          entityType: "carrier",
          entityId: carrierCode,
          description: `Synced ${result.synced} claims with ${carrierNames[carrierCode] || carrierCode}. ${result.failed} failed.`,
          metadata: JSON.stringify({
            synced: result.synced,
            failed: result.failed,
            errors: result.errors.slice(0, 10), // Only store first 10 errors
          }),
        },
      });

      return NextResponse.json({
        success: true,
        data: result,
        message: `Synced ${result.synced} claims, ${result.failed} failed`,
      });
    }
  } catch (error) {
    console.error("[Carrier Sync API] Error:", error);
    return NextResponse.json(
      { error: "Sync operation failed" },
      { status: 500 }
    );
  }
}
