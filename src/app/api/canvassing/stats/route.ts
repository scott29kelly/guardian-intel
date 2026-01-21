import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCanvassingAdapter } from "@/lib/services/canvassing";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const repId = searchParams.get("repId");
    const territoryId = searchParams.get("territoryId");

    const adapter = getCanvassingAdapter();
    const stats = await adapter.getStats({ repId: repId || undefined, territoryId: territoryId || undefined });

    const dbStats = await prisma.canvassingPin.groupBy({ by: ["status"], _count: { id: true }, where: { ...(repId && { assignedRepId: repId }), ...(territoryId && { territoryId }) } });
    const syncLogs = await prisma.canvassingSyncLog.findMany({ where: { status: "success" }, orderBy: { createdAt: "desc" }, take: 10, select: { createdAt: true, syncType: true, direction: true, recordsProcessed: true } });

    return NextResponse.json({ success: true, stats, dbStats: { byStatus: dbStats.reduce((acc, s) => { acc[s.status] = s._count.id; return acc; }, {} as Record<string, number>) }, recentSyncs: syncLogs });
  } catch (error) {
    console.error("[API] GET /api/canvassing/stats error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch stats" }, { status: 500 });
  }
}
