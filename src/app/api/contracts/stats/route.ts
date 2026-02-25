/**
 * Contract Stats API
 *
 * GET /api/contracts/stats - Get contract statistics
 * Optional query param: ?userId=xxx to scope stats to a specific user
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { contractService } from "@/lib/services/contracts";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || undefined;

    const stats = await contractService.getContractStats(userId);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("[Contract Stats API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contract stats" },
      { status: 500 }
    );
  }
}
