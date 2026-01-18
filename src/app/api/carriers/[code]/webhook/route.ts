/**
 * Carrier Webhook Handler
 * 
 * POST /api/carriers/[code]/webhook
 * Receives status updates from carrier APIs
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { carrierService } from "@/lib/services/carriers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const startTime = Date.now();
  const { code: carrierCode } = await params;
  
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("x-carrier-signature") 
      || request.headers.get("x-webhook-signature")
      || request.headers.get("x-signature")
      || "";

    // Get adapter for verification
    const adapter = await carrierService.getAdapter(carrierCode);
    if (!adapter) {
      await logWebhook(carrierCode, null, rawBody, "failed", "Carrier not configured");
      return NextResponse.json({ error: "Carrier not configured" }, { status: 400 });
    }

    // Verify webhook signature
    if (!adapter.verifyWebhook(rawBody, signature)) {
      await logWebhook(carrierCode, null, rawBody, "failed", "Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse webhook payload
    const payload = adapter.parseWebhook(rawBody);

    // Find associated claim
    const claim = await prisma.insuranceClaim.findFirst({
      where: {
        OR: [
          { carrierClaimId: payload.claimId },
          { claimNumber: payload.claimNumber },
        ],
      },
      include: {
        customer: { select: { id: true } },
      },
    });

    if (!claim) {
      await logWebhook(carrierCode, null, rawBody, "failed", "Claim not found");
      // Return 200 to prevent carrier from retrying
      return NextResponse.json({ 
        success: true, 
        message: "Claim not found in system" 
      });
    }

    // Process webhook based on event type
    const updateData: any = {
      carrierStatus: payload.data.status || undefined,
      carrierStatusCode: payload.data.statusCode || undefined,
      carrierLastSync: new Date(),
    };

    let intelContent = "";
    let intelPriority: "low" | "medium" | "high" | "critical" = "medium";
    let intelActionable = false;

    switch (payload.eventType) {
      case "claim.status_changed":
        updateData.status = adapter.mapStatusToInternal(
          adapter.mapStatus(payload.data.status)
        );
        intelContent = `Claim status changed to: ${payload.data.status}`;
        break;

      case "claim.adjuster_assigned":
        updateData.adjusterName = payload.data.adjusterName;
        updateData.adjusterPhone = payload.data.adjusterPhone;
        updateData.adjusterEmail = payload.data.adjusterEmail;
        updateData.adjusterCompany = payload.data.adjusterCompany;
        intelContent = `Adjuster assigned: ${payload.data.adjusterName}`;
        intelActionable = true;
        break;

      case "claim.inspection_scheduled":
        updateData.inspectionDate = payload.data.inspectionDate 
          ? new Date(payload.data.inspectionDate) 
          : undefined;
        intelContent = `Inspection scheduled for ${new Date(payload.data.inspectionDate).toLocaleDateString()}`;
        intelPriority = "high";
        intelActionable = true;
        break;

      case "claim.inspection_complete":
        intelContent = "Property inspection completed";
        if (payload.data.notes) {
          intelContent += `: ${payload.data.notes}`;
        }
        break;

      case "claim.approved":
        updateData.status = "approved";
        updateData.approvedValue = payload.data.approvedAmount;
        updateData.acv = payload.data.acv;
        updateData.rcv = payload.data.rcv;
        updateData.depreciation = payload.data.depreciation;
        intelContent = `Claim APPROVED for $${payload.data.approvedAmount?.toLocaleString() || "TBD"}`;
        intelPriority = "critical";
        intelActionable = true;
        break;

      case "claim.denied":
        updateData.status = "denied";
        intelContent = `Claim DENIED: ${payload.data.reason || "No reason provided"}`;
        intelPriority = "critical";
        intelActionable = true;
        break;

      case "claim.payment_issued":
        updateData.status = "paid";
        updateData.totalPaid = payload.data.paymentAmount;
        intelContent = `Payment issued: $${payload.data.paymentAmount?.toLocaleString()}`;
        intelPriority = "high";
        break;

      case "claim.document_requested":
        intelContent = `Document requested: ${payload.data.documentType || "Additional documentation needed"}`;
        intelPriority = "high";
        intelActionable = true;
        break;

      case "supplement.received":
      case "supplement.approved":
      case "supplement.denied":
        updateData.supplementCount = { increment: 1 };
        updateData.lastSupplementDate = new Date();
        if (payload.eventType === "supplement.approved") {
          updateData.supplementValue = payload.data.approvedAmount;
          intelContent = `Supplement approved: $${payload.data.approvedAmount?.toLocaleString()}`;
          intelPriority = "high";
        } else if (payload.eventType === "supplement.denied") {
          intelContent = `Supplement denied: ${payload.data.reason || "No reason provided"}`;
          intelPriority = "high";
          intelActionable = true;
        } else {
          intelContent = "Supplement request received by carrier";
        }
        break;

      default:
        intelContent = `Carrier update: ${payload.eventType}`;
    }

    // Update claim
    await prisma.insuranceClaim.update({
      where: { id: claim.id },
      data: updateData,
    });

    // Create intel item for customer
    if (claim.customer && intelContent) {
      await prisma.intelItem.create({
        data: {
          customerId: claim.customer.id,
          source: "carrier-webhook",
          sourceId: claim.id,
          category: "insurance",
          title: `${carrierCode} Update: ${payload.eventType.replace(".", " ").replace(/_/g, " ")}`,
          content: intelContent,
          priority: intelPriority,
          actionable: intelActionable,
        },
      });
    }

    // Log successful webhook
    await logWebhook(carrierCode, claim.id, rawBody, "success", undefined, Date.now() - startTime);

    return NextResponse.json({
      success: true,
      processed: true,
      claimId: claim.id,
    });
  } catch (error: any) {
    console.error("[Carrier Webhook] Error:", error);
    await logWebhook(carrierCode, null, "", "failed", error.message, Date.now() - startTime);
    
    // Return 200 to prevent infinite retries, but indicate failure
    return NextResponse.json({
      success: false,
      error: error.message,
    });
  }
}

async function logWebhook(
  carrierCode: string,
  claimId: string | null,
  payload: string,
  status: string,
  errorMessage?: string,
  _durationMs?: number
) {
  try {
    await prisma.carrierSyncLog.create({
      data: {
        carrierCode,
        claimId,
        syncType: "webhook",
        direction: "inbound",
        requestData: payload.substring(0, 10000), // Limit size
        status,
        errorMessage,
      },
    });
  } catch (e) {
    console.error("[Carrier Webhook] Failed to log:", e);
  }
}
