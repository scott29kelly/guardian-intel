import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCanvassingAdapter } from "@/lib/services/canvassing";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const assignedRepId = searchParams.get("assignedRepId");

    const adapter = getCanvassingAdapter();
    const routes = await adapter.getRoutes({ status: status as any, assignedRepId: assignedRepId || undefined });
    const dbRoutes = await prisma.canvassingRoute.findMany({ where: { ...(status && { status }), ...(assignedRepId && { assignedRepId }) }, orderBy: { scheduledDate: "asc" } });

    return NextResponse.json({ success: true, routes, dbRoutes: dbRoutes.map(r => ({ ...r, pinIds: JSON.parse(r.pinIds || "[]") })) });
  } catch (error) {
    console.error("[API] GET /api/canvassing/routes error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch routes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    if (!body.pinIds?.length) return NextResponse.json({ success: false, error: "pinIds required" }, { status: 400 });

    const adapter = getCanvassingAdapter();
    const route = await adapter.createRoute({ pinIds: body.pinIds, routeName: body.routeName, assignedRepId: body.assignedRepId, scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : undefined, optimizeFor: body.optimizeFor || "distance" });

    const dbRoute = await prisma.canvassingRoute.create({ data: { name: route.name, externalId: route.externalId, pinIds: JSON.stringify(route.pins.map(p => p.id)), optimizedOrder: route.optimizedOrder ? JSON.stringify(route.optimizedOrder) : null, assignedRepId: route.assignedRepId, scheduledDate: route.scheduledDate, status: route.status, totalPins: route.totalPins, estimatedDurationMinutes: route.estimatedDurationMinutes, estimatedDistanceMiles: route.estimatedDistanceMiles } });

    return NextResponse.json({ success: true, route: { ...route, dbId: dbRoute.id } });
  } catch (error) {
    console.error("[API] POST /api/canvassing/routes error:", error);
    return NextResponse.json({ success: false, error: "Failed to create route" }, { status: 500 });
  }
}
