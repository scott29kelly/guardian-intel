import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCanvassingAdapter } from "@/lib/services/canvassing";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const adapter = getCanvassingAdapter();
    const isConnected = await adapter.testConnection();
    const syncStatus = adapter.getSyncStatus();
    const lastSync = await prisma.canvassingSyncLog.findFirst({ where: { direction: "inbound", status: "success" }, orderBy: { createdAt: "desc" } });

    return NextResponse.json({ success: true, status: { connected: isConnected, ...syncStatus, lastSync: lastSync?.createdAt || null } });
  } catch (error) {
    console.error("[API] GET /api/canvassing/sync error:", error);
    return NextResponse.json({ success: false, error: "Failed to get canvassing status" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const adapter = getCanvassingAdapter();
    const leads = await adapter.getLeads();

    let recordsCreated = 0, recordsUpdated = 0, recordsFailed = 0;
    for (const lead of leads) {
      try {
        const existing = lead.externalId ? await prisma.canvassingPin.findUnique({ where: { externalId: lead.externalId } }) : null;
        if (existing) {
          await prisma.canvassingPin.update({ where: { id: existing.id }, data: { firstName: lead.firstName, lastName: lead.lastName, status: lead.status, lastSyncedAt: new Date() } });
          recordsUpdated++;
        } else {
          await prisma.canvassingPin.create({ data: { externalId: lead.externalId, externalSource: "salesrabbit", firstName: lead.firstName, lastName: lead.lastName, address: lead.address, city: lead.city, state: lead.state, zipCode: lead.zipCode, latitude: lead.latitude, longitude: lead.longitude, status: lead.status, priority: lead.priority, lastSyncedAt: new Date() } });
          recordsCreated++;
        }
      } catch { recordsFailed++; }
    }

    await prisma.canvassingSyncLog.create({ data: { source: "salesrabbit", syncType: "incremental", direction: "inbound", status: recordsFailed === 0 ? "success" : "partial", recordsProcessed: leads.length, recordsCreated, recordsUpdated, recordsFailed } });

    return NextResponse.json({ success: true, result: { direction: "pull", recordsProcessed: leads.length, recordsCreated, recordsUpdated, recordsFailed } });
  } catch (error) {
    console.error("[API] POST /api/canvassing/sync error:", error);
    return NextResponse.json({ success: false, error: "Canvassing sync failed" }, { status: 500 });
  }
}
