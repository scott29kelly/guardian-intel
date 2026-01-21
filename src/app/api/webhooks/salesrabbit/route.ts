import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(`sha256=${expected}`));
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-salesrabbit-signature") || "";
    const webhookSecret = process.env.SALESRABBIT_WEBHOOK_SECRET || "";

    if (webhookSecret && !verifySignature(rawBody, signature, webhookSecret)) {
      await prisma.canvassingSyncLog.create({ data: { source: "salesrabbit", syncType: "webhook", direction: "inbound", status: "failed", errorMessage: "Invalid signature" } });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const { event, data } = payload;
    let recordsProcessed = 0, status = "success";

    switch (event) {
      case "lead.created":
      case "lead.updated": {
        const existing = await prisma.canvassingPin.findUnique({ where: { externalId: data.id } });
        if (existing) {
          await prisma.canvassingPin.update({ where: { id: existing.id }, data: { firstName: data.first_name, lastName: data.last_name, status: data.status, outcome: data.disposition, lastSyncedAt: new Date() } });
        } else if (data.address && data.lat && data.lon) {
          await prisma.canvassingPin.create({ data: { externalId: data.id, externalSource: "salesrabbit", firstName: data.first_name || "Unknown", lastName: data.last_name || "", address: data.address, city: data.city, state: data.state, zipCode: data.zip, latitude: data.lat, longitude: data.lon, status: data.status || "new", priority: "medium", lastSyncedAt: new Date() } });
        }
        recordsProcessed = 1;
        break;
      }
      case "lead.knocked": {
        const pin = await prisma.canvassingPin.findUnique({ where: { externalId: data.id } });
        if (pin) {
          await prisma.canvassingPin.update({ where: { id: pin.id }, data: { status: "knocked", outcome: data.disposition, knockedAt: new Date(), notes: data.notes, lastSyncedAt: new Date() } });
          if (pin.customerId) {
            await prisma.customer.update({ where: { id: pin.customerId }, data: { stage: data.disposition === "interested" ? "qualified" : "contacted" } });
            await prisma.interaction.create({ data: { customerId: pin.customerId, type: "visit", direction: "outbound", subject: "Door Knock", content: `Outcome: ${data.disposition}`, outcome: data.disposition } });
          }
          recordsProcessed = 1;
        }
        break;
      }
      case "appointment.set": {
        const pin = await prisma.canvassingPin.findUnique({ where: { externalId: data.id } });
        if (pin) {
          await prisma.canvassingPin.update({ where: { id: pin.id }, data: { status: "converted", outcome: "appointment_set", appointmentDate: data.appointment_date ? new Date(data.appointment_date) : undefined, lastSyncedAt: new Date() } });
          if (pin.customerId) await prisma.customer.update({ where: { id: pin.customerId }, data: { stage: "qualified", leadScore: { increment: 30 } } });
          recordsProcessed = 1;
        }
        break;
      }
    }

    await prisma.canvassingSyncLog.create({ data: { source: "salesrabbit", syncType: "webhook", direction: "inbound", status, recordsProcessed, recordsCreated: event === "lead.created" ? recordsProcessed : 0, recordsUpdated: event !== "lead.created" ? recordsProcessed : 0, rawPayload: rawBody.substring(0, 5000) } });

    return NextResponse.json({ success: true, event, recordsProcessed });
  } catch (error) {
    console.error("[Sales Rabbit Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get("challenge");
  if (challenge) return NextResponse.json({ challenge });
  return NextResponse.json({ status: "ok", message: "Sales Rabbit webhook endpoint active" });
}
