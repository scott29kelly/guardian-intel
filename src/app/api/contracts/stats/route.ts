/**
 * Contract Stats API
 * 
 * GET /api/contracts/stats - Get contract statistics
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { contractService } from "@/lib/services/contracts";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId") || undefined;

    // Non-admin/manager users only see their own stats
    const targetUserId = 
      session.user.role === "admin" || session.user.role === "manager"
        ? userId
        : session.user.id;

    const stats = await contractService.getContractStats(targetUserId);

    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error("[Contract Stats API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
