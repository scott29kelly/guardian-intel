import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCanvassingAdapter, type CanvassingLead } from "@/lib/services/canvassing";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const where: Prisma.CustomerWhereInput = {};
    const conditions: Prisma.CustomerWhereInput[] = [];

    if (body.customerIds?.length > 0) {
      where.id = { in: body.customerIds };
    } else {
      if (body.zipCodes?.length > 0) conditions.push({ zipCode: { in: body.zipCodes } });
      if (body.state) conditions.push({ state: body.state });
      conditions.push({ status: { in: ["lead", "prospect"] }, latitude: { not: null }, longitude: { not: null } });
      if (conditions.length > 0) where.AND = conditions;
    }

    const customers = await prisma.customer.findMany({ where, take: body.limit || 100, orderBy: [{ leadScore: "desc" }] });
    if (customers.length === 0) return NextResponse.json({ success: true, result: { recordsProcessed: 0 } });

    const leads: Omit<CanvassingLead, "id" | "createdAt" | "updatedAt">[] = customers.map(c => ({
      firstName: c.firstName, lastName: c.lastName, email: c.email || undefined, phone: c.phone || undefined,
      address: c.address, city: c.city, state: c.state, zipCode: c.zipCode, latitude: c.latitude!, longitude: c.longitude!,
      status: "new", priority: body.priority || "medium", customerId: c.id, territoryId: body.territoryId
    }));

    const adapter = getCanvassingAdapter();
    const result = await adapter.pushLeads(leads);

    await prisma.canvassingSyncLog.create({ data: { source: "salesrabbit", syncType: "push", direction: "outbound", status: result.recordsFailed === 0 ? "success" : "partial", recordsProcessed: result.recordsProcessed, recordsCreated: result.recordsCreated, recordsUpdated: result.recordsUpdated, recordsFailed: result.recordsFailed } });

    for (const customer of customers) {
      try {
        const existing = await prisma.canvassingPin.findFirst({ where: { customerId: customer.id } });
        if (!existing) {
          await prisma.canvassingPin.create({ data: { customerId: customer.id, externalSource: "salesrabbit", firstName: customer.firstName, lastName: customer.lastName, address: customer.address, city: customer.city, state: customer.state, zipCode: customer.zipCode, latitude: customer.latitude!, longitude: customer.longitude!, status: "new", priority: body.priority || "medium", territoryId: body.territoryId, lastSyncedAt: new Date() } });
        }
      } catch {}
    }

    return NextResponse.json({ success: result.success, result: { ...result, customersMatched: customers.length } });
  } catch (error) {
    console.error("[API] POST /api/canvassing/push-leads error:", error);
    return NextResponse.json({ success: false, error: "Failed to push leads" }, { status: 500 });
  }
}
