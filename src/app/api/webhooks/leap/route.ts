import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * Leap CRM Webhook Handler
 * 
 * Receives webhooks from Leap CRM for real-time sync:
 * - customer.created / customer.updated
 * - job.created / job.updated / job.status_changed
 * - activity.created (interactions)
 * 
 * Security: Validates HMAC signature from X-Leap-Signature header
 */

// Verify webhook signature
function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!secret || !signature) return false;
  
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

interface LeapWebhookPayload {
  event: string;
  timestamp: string;
  data: {
    id: number;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address?: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
    status?: string;
    lead_source?: string;
    customer_id?: number;
    name?: string;
    total?: number;
    stage?: string;
    type?: string;
    direction?: string;
    subject?: string;
    description?: string;
    outcome?: string;
    created_at?: string;
    updated_at?: string;
  };
}

export async function POST(request: Request) {
  const startTime = Date.now();
  
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("x-leap-signature") || "";
    const webhookSecret = process.env.LEAP_WEBHOOK_SECRET || "";
    
    // Verify signature (skip in demo mode if no secret configured)
    if (webhookSecret && !verifySignature(rawBody, signature, webhookSecret)) {
      console.error("[Leap Webhook] Invalid signature");
      
      await prisma.crmSyncLog.create({
        data: {
          crmSource: "leap",
          syncType: "webhook",
          direction: "inbound",
          entityType: "unknown",
          status: "failed",
          errorMessage: "Invalid webhook signature",
          rawPayload: rawBody.substring(0, 1000),
        },
      });
      
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }
    
    // Parse payload
    const payload: LeapWebhookPayload = JSON.parse(rawBody);
    const { event, data } = payload;
    
    console.log(`[Leap Webhook] Received: ${event}`, { id: data.id });
    
    let entityType = "unknown";
    let entityId: string | undefined;
    let recordsProcessed = 0;
    let status = "success";
    let errorMessage: string | undefined;
    
    try {
      // Handle different event types
      switch (event) {
        case "customer.created":
        case "customer.updated":
          entityType = "customer";
          entityId = String(data.id);
          
          // Use findFirst + create/update pattern for nullable unique field
          const existingCustomer = await prisma.customer.findFirst({
            where: { crmId: String(data.id) },
          });
          
          if (existingCustomer) {
            await prisma.customer.update({
              where: { id: existingCustomer.id },
              data: {
                firstName: data.first_name,
                lastName: data.last_name,
                email: data.email,
                phone: data.phone,
                status: data.status ? mapLeapStatus(data.status) : undefined,
                lastCrmSync: new Date(),
              },
            });
          } else {
            await prisma.customer.create({
              data: {
                crmId: String(data.id),
                crmSource: "leap",
                firstName: data.first_name || "Unknown",
                lastName: data.last_name || "",
                email: data.email,
                phone: data.phone,
                address: data.address?.street || "",
                city: data.address?.city || "",
                state: data.address?.state || "",
                zipCode: data.address?.zip || "",
                status: mapLeapStatus(data.status || "new"),
                stage: "new",
                leadSource: data.lead_source,
                leadScore: 50,
                lastCrmSync: new Date(),
              },
            });
          }
          
          recordsProcessed = 1;
          break;
          
        case "job.created":
        case "job.updated":
        case "job.status_changed":
          entityType = "deal";
          entityId = String(data.id);
          
          // Find the customer by CRM ID
          if (data.customer_id) {
            const customer = await prisma.customer.findFirst({
              where: { crmId: String(data.customer_id) },
            });
            
            if (customer) {
              await prisma.customer.update({
                where: { id: customer.id },
                data: {
                  estimatedJobValue: data.total,
                  stage: data.stage || customer.stage,
                  lastCrmSync: new Date(),
                },
              });
              recordsProcessed = 1;
            } else {
              errorMessage = `Customer not found for job: crmId=${data.customer_id}`;
              status = "partial";
            }
          }
          break;
          
        case "activity.created":
          entityType = "interaction";
          entityId = String(data.id);
          
          if (data.customer_id) {
            const customer = await prisma.customer.findFirst({
              where: { crmId: String(data.customer_id) },
            });
            
            if (customer) {
              await prisma.interaction.create({
                data: {
                  customerId: customer.id,
                  type: data.type || "note",
                  direction: (data.direction as "inbound" | "outbound") || "outbound",
                  subject: data.subject,
                  content: data.description,
                  outcome: data.outcome,
                  crmId: String(data.id),
                },
              });
              recordsProcessed = 1;
            } else {
              errorMessage = `Customer not found for activity: crmId=${data.customer_id}`;
              status = "partial";
            }
          }
          break;
          
        default:
          console.log(`[Leap Webhook] Unhandled event type: ${event}`);
          status = "partial";
          errorMessage = `Unhandled event type: ${event}`;
      }
    } catch (err) {
      console.error(`[Leap Webhook] Processing error:`, err);
      status = "failed";
      errorMessage = err instanceof Error ? err.message : String(err);
    }
    
    // Log the webhook
    await prisma.crmSyncLog.create({
      data: {
        crmSource: "leap",
        syncType: "webhook",
        direction: "inbound",
        entityType,
        entityId,
        crmEntityId: String(data.id),
        status,
        recordsProcessed,
        recordsFailed: status === "failed" ? 1 : 0,
        errorMessage,
        rawPayload: rawBody.substring(0, 5000), // Limit payload size
      },
    });
    
    const duration = Date.now() - startTime;
    console.log(`[Leap Webhook] ${event} processed in ${duration}ms - ${status}`);
    
    return NextResponse.json({
      success: status !== "failed",
      event,
      entityType,
      entityId,
      recordsProcessed,
      duration,
    });
    
  } catch (error) {
    console.error("[Leap Webhook] Fatal error:", error);
    
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Map Leap status to our status
function mapLeapStatus(leapStatus: string): string {
  const statusMap: Record<string, string> = {
    "new": "lead",
    "contacted": "prospect",
    "qualified": "prospect",
    "proposal": "prospect",
    "negotiation": "prospect",
    "won": "closed-won",
    "lost": "closed-lost",
    "customer": "customer",
  };
  return statusMap[leapStatus.toLowerCase()] || "lead";
}

// Handle GET for webhook verification (some providers do this)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get("challenge");
  
  if (challenge) {
    // Return the challenge for webhook verification
    return NextResponse.json({ challenge });
  }
  
  return NextResponse.json({
    status: "ok",
    message: "Leap CRM webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
