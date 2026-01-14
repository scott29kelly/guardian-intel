/**
 * State Farm Carrier Adapter
 * 
 * Integration with State Farm's claims API.
 * Note: This is a template based on common insurance API patterns.
 * Actual implementation requires State Farm API documentation and credentials.
 */

import { BaseCarrierAdapter } from "../base-adapter";
import type {
  CarrierResponse,
  ClaimSubmission,
  ClaimFilingResult,
  ClaimStatusResult,
  SupplementSubmission,
  SupplementResult,
  DocumentUpload,
  DocumentUploadResult,
  CarrierDocument,
  CarrierWebhookPayload,
  CarrierClaimStatus,
} from "../types";
import crypto from "crypto";

export class StateFarmAdapter extends BaseCarrierAdapter {
  readonly carrierCode = "state-farm";
  readonly carrierName = "State Farm";
  
  protected getDefaultEndpoint(): string {
    // Production vs Test environment
    return this.config?.isTestMode
      ? "https://api-sandbox.statefarm.com/v1/claims"
      : "https://api.statefarm.com/v1/claims";
  }
  
  // ============================================================
  // OAuth Token Refresh
  // ============================================================
  
  async refreshToken(): Promise<void> {
    if (!this.config?.refreshToken || !this.config?.clientId || !this.config?.clientSecret) {
      throw new Error("Missing OAuth credentials for token refresh");
    }
    
    const tokenUrl = this.config.isTestMode
      ? "https://auth-sandbox.statefarm.com/oauth/token"
      : "https://auth.statefarm.com/oauth/token";
    
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.config.refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });
    
    if (!response.ok) {
      throw new Error("Failed to refresh State Farm access token");
    }
    
    const data = await response.json();
    
    // Update config with new tokens
    if (this.config) {
      this.config.accessToken = data.access_token;
      this.config.refreshToken = data.refresh_token || this.config.refreshToken;
      this.config.tokenExpiry = new Date(Date.now() + data.expires_in * 1000);
    }
  }
  
  // ============================================================
  // Claim Filing
  // ============================================================
  
  async fileClaim(claim: ClaimSubmission): Promise<CarrierResponse<ClaimFilingResult>> {
    // Transform to State Farm's expected format
    const payload = {
      claim: {
        policyInfo: {
          policyNumber: claim.policyNumber,
          insuredName: {
            firstName: claim.policyholderFirstName,
            lastName: claim.policyholderLastName,
          },
          contact: {
            email: claim.policyholderEmail,
            phone: this.sanitizePhone(claim.policyholderPhone || ""),
          },
        },
        lossInfo: {
          dateOfLoss: this.formatDate(claim.dateOfLoss),
          timeOfLoss: claim.timeOfLoss || "12:00",
          causeOfLoss: this.mapCauseOfLoss(claim.causeOfLoss),
          lossDescription: claim.lossDescription,
        },
        propertyInfo: {
          address: {
            street: claim.propertyAddress,
            city: claim.propertyCity,
            state: claim.propertyState,
            zipCode: claim.propertyZipCode,
          },
          propertyType: claim.propertyType || "single-family",
        },
        damageInfo: {
          areas: claim.damageAreas.map(area => ({
            type: this.mapDamageType(area.type),
            severity: area.severity,
            description: area.description,
          })),
          emergencyRepairs: claim.emergencyRepairsNeeded,
          emergencyRepairsCost: claim.temporaryRepairsCost,
        },
        estimate: claim.initialEstimate ? {
          amount: claim.initialEstimate,
          currency: "USD",
        } : undefined,
        externalReference: claim.internalClaimId,
      },
    };
    
    const response = await this.makeRequest<any>("POST", "/submit", payload);
    
    if (!response.success || !response.data) {
      return response as CarrierResponse<ClaimFilingResult>;
    }
    
    // Transform State Farm response to our format
    const result: ClaimFilingResult = {
      carrierClaimId: response.data.claimId,
      claimNumber: response.data.claimNumber,
      status: this.mapStatus(response.data.status),
      statusMessage: response.data.statusMessage,
      assignedAdjuster: response.data.adjuster ? {
        name: response.data.adjuster.name,
        phone: response.data.adjuster.phone,
        email: response.data.adjuster.email,
        company: "State Farm",
        assignedDate: response.data.adjuster.assignedDate ? new Date(response.data.adjuster.assignedDate) : undefined,
      } : undefined,
      nextSteps: response.data.nextSteps || [],
      estimatedResponseDate: response.data.estimatedResponseDate 
        ? new Date(response.data.estimatedResponseDate) 
        : undefined,
      trackingUrl: `https://www.statefarm.com/claims/track/${response.data.claimNumber}`,
    };
    
    return { success: true, data: result };
  }
  
  // ============================================================
  // Status Checks
  // ============================================================
  
  async getClaimStatus(carrierClaimId: string): Promise<CarrierResponse<ClaimStatusResult>> {
    const response = await this.makeRequest<any>("GET", `/claims/${carrierClaimId}/status`);
    
    if (!response.success || !response.data) {
      return response as CarrierResponse<ClaimStatusResult>;
    }
    
    return { success: true, data: this.transformStatusResponse(response.data) };
  }
  
  async getClaimByNumber(claimNumber: string): Promise<CarrierResponse<ClaimStatusResult>> {
    const response = await this.makeRequest<any>("GET", `/claims?claimNumber=${claimNumber}`);
    
    if (!response.success || !response.data) {
      return response as CarrierResponse<ClaimStatusResult>;
    }
    
    return { success: true, data: this.transformStatusResponse(response.data) };
  }
  
  private transformStatusResponse(data: any): ClaimStatusResult {
    return {
      carrierClaimId: data.claimId,
      claimNumber: data.claimNumber,
      status: this.mapStatus(data.status),
      statusCode: data.statusCode,
      statusMessage: data.statusMessage || this.getStatusMessage(this.mapStatus(data.status)),
      lastUpdated: new Date(data.lastUpdated || Date.now()),
      approvedAmount: this.parseAmount(data.approvedAmount),
      paidAmount: this.parseAmount(data.paidAmount),
      depreciation: this.parseAmount(data.depreciation),
      acv: this.parseAmount(data.acv),
      rcv: this.parseAmount(data.rcv),
      adjuster: data.adjuster ? {
        name: data.adjuster.name,
        phone: data.adjuster.phone,
        email: data.adjuster.email,
        company: data.adjuster.company || "State Farm",
        assignedDate: data.adjuster.assignedDate ? new Date(data.adjuster.assignedDate) : undefined,
      } : undefined,
      inspectionScheduled: !!data.inspection?.scheduled,
      inspectionDate: data.inspection?.date ? new Date(data.inspection.date) : undefined,
      inspectionNotes: data.inspection?.notes,
      documents: data.documents?.map((doc: any) => ({
        id: doc.id,
        type: doc.type,
        name: doc.name,
        url: doc.url,
        uploadedAt: new Date(doc.uploadedAt),
      })),
      timeline: data.timeline?.map((event: any) => ({
        date: new Date(event.date),
        event: event.event,
        description: event.description,
        actor: event.actor,
      })),
    };
  }
  
  // ============================================================
  // Supplements
  // ============================================================
  
  async fileSuplement(supplement: SupplementSubmission): Promise<CarrierResponse<SupplementResult>> {
    const payload = {
      claimId: supplement.carrierClaimId,
      supplement: {
        reason: supplement.reason,
        additionalDamage: supplement.additionalDamage.map(area => ({
          type: this.mapDamageType(area.type),
          severity: area.severity,
          description: area.description,
        })),
        requestedAmount: supplement.additionalAmount,
        scopeOfWork: supplement.scopeOfWork,
        externalReference: supplement.internalClaimId,
      },
    };
    
    const response = await this.makeRequest<any>("POST", `/claims/${supplement.carrierClaimId}/supplements`, payload);
    
    if (!response.success || !response.data) {
      return response as CarrierResponse<SupplementResult>;
    }
    
    return {
      success: true,
      data: {
        supplementId: response.data.supplementId,
        status: response.data.status || "submitted",
        submittedAt: new Date(response.data.submittedAt || Date.now()),
        approvedAmount: this.parseAmount(response.data.approvedAmount),
        notes: response.data.notes,
      },
    };
  }
  
  // ============================================================
  // Documents
  // ============================================================
  
  async uploadDocument(document: DocumentUpload): Promise<CarrierResponse<DocumentUploadResult>> {
    const payload = {
      document: {
        type: document.documentType,
        name: document.filename,
        contentType: document.contentType,
        content: document.content,
        description: document.description,
      },
    };
    
    const response = await this.makeRequest<any>(
      "POST", 
      `/claims/${document.carrierClaimId}/documents`,
      payload
    );
    
    if (!response.success || !response.data) {
      return response as CarrierResponse<DocumentUploadResult>;
    }
    
    return {
      success: true,
      data: {
        documentId: response.data.documentId,
        status: response.data.status || "uploaded",
        message: response.data.message,
      },
    };
  }
  
  async getDocuments(carrierClaimId: string): Promise<CarrierResponse<CarrierDocument[]>> {
    const response = await this.makeRequest<any>("GET", `/claims/${carrierClaimId}/documents`);
    
    if (!response.success || !response.data) {
      return response as CarrierResponse<CarrierDocument[]>;
    }
    
    const documents: CarrierDocument[] = (response.data.documents || []).map((doc: any) => ({
      id: doc.id,
      type: doc.type,
      name: doc.name,
      url: doc.url,
      uploadedAt: new Date(doc.uploadedAt),
    }));
    
    return { success: true, data: documents };
  }
  
  // ============================================================
  // Webhooks
  // ============================================================
  
  verifyWebhook(payload: string, signature: string): boolean {
    if (!this.config?.webhookSecret) return false;
    
    // State Farm uses HMAC-SHA256 for webhook verification
    const expectedSignature = crypto
      .createHmac("sha256", this.config.webhookSecret)
      .update(payload)
      .digest("hex");
    
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, "hex"),
        Buffer.from(expectedSignature, "hex")
      );
    } catch {
      return false;
    }
  }
  
  parseWebhook(payload: string): CarrierWebhookPayload {
    const data = JSON.parse(payload);
    
    return {
      eventType: this.mapWebhookEvent(data.eventType),
      carrierCode: this.carrierCode,
      claimId: data.claimId,
      claimNumber: data.claimNumber,
      timestamp: new Date(data.timestamp),
      data: data.payload || {},
    };
  }
  
  private mapWebhookEvent(sfEvent: string): CarrierWebhookPayload["eventType"] {
    const eventMap: Record<string, CarrierWebhookPayload["eventType"]> = {
      "CLAIM_STATUS_UPDATE": "claim.status_changed",
      "ADJUSTER_ASSIGNED": "claim.adjuster_assigned",
      "INSPECTION_SCHEDULED": "claim.inspection_scheduled",
      "INSPECTION_COMPLETE": "claim.inspection_complete",
      "CLAIM_APPROVED": "claim.approved",
      "CLAIM_DENIED": "claim.denied",
      "PAYMENT_ISSUED": "claim.payment_issued",
      "DOCUMENT_REQUESTED": "claim.document_requested",
      "SUPPLEMENT_RECEIVED": "supplement.received",
      "SUPPLEMENT_APPROVED": "supplement.approved",
      "SUPPLEMENT_DENIED": "supplement.denied",
    };
    
    return eventMap[sfEvent] || "claim.status_changed";
  }
  
  // ============================================================
  // Status Mapping
  // ============================================================
  
  mapStatus(carrierStatus: string): CarrierClaimStatus {
    const statusMap: Record<string, CarrierClaimStatus> = {
      "RECEIVED": "received",
      "PENDING": "received",
      "ASSIGNED": "assigned",
      "ADJUSTER_ASSIGNED": "assigned",
      "INSPECTION_SCHEDULED": "inspection-scheduled",
      "SCHEDULED": "inspection-scheduled",
      "INSPECTION_COMPLETE": "inspection-complete",
      "INSPECTED": "inspection-complete",
      "UNDER_REVIEW": "under-review",
      "IN_REVIEW": "under-review",
      "APPROVED": "approved",
      "PARTIALLY_APPROVED": "partially-approved",
      "DENIED": "denied",
      "REJECTED": "denied",
      "SUPPLEMENT_REQUESTED": "supplement-requested",
      "SUPPLEMENT_PENDING": "supplement-requested",
      "SUPPLEMENT_APPROVED": "supplement-approved",
      "PAYMENT_PENDING": "payment-processing",
      "PROCESSING_PAYMENT": "payment-processing",
      "PAYMENT_ISSUED": "payment-issued",
      "PAID": "payment-issued",
      "CLOSED": "closed",
      "COMPLETE": "closed",
    };
    
    return statusMap[carrierStatus.toUpperCase()] || "received";
  }
  
  mapStatusToInternal(carrierStatus: CarrierClaimStatus): string {
    const statusMap: Record<CarrierClaimStatus, string> = {
      "received": "pending",
      "assigned": "pending",
      "inspection-scheduled": "pending",
      "inspection-complete": "pending",
      "under-review": "pending",
      "approved": "approved",
      "partially-approved": "approved",
      "denied": "denied",
      "supplement-requested": "supplement",
      "supplement-approved": "supplement",
      "payment-processing": "approved",
      "payment-issued": "paid",
      "closed": "closed",
    };
    
    return statusMap[carrierStatus] || "pending";
  }
  
  // ============================================================
  // Field Mapping Helpers
  // ============================================================
  
  private mapCauseOfLoss(cause: string): string {
    const causeMap: Record<string, string> = {
      "hail": "HAIL",
      "wind": "WIND",
      "tornado": "TORNADO",
      "hurricane": "HURRICANE",
      "fire": "FIRE",
      "water": "WATER_DAMAGE",
      "lightning": "LIGHTNING",
      "fallen-tree": "FALLING_OBJECTS",
      "vandalism": "VANDALISM",
      "theft": "THEFT",
      "other": "OTHER",
    };
    return causeMap[cause] || "OTHER";
  }
  
  private mapDamageType(type: string): string {
    const typeMap: Record<string, string> = {
      "roof": "ROOF",
      "siding": "SIDING",
      "gutters": "GUTTERS",
      "windows": "WINDOWS",
      "doors": "DOORS",
      "interior": "INTERIOR",
      "hvac": "HVAC",
      "fence": "FENCE",
      "garage": "GARAGE",
      "deck": "DECK",
      "other": "OTHER",
    };
    return typeMap[type] || "OTHER";
  }
  
  private getStatusMessage(status: CarrierClaimStatus): string {
    const messages: Record<CarrierClaimStatus, string> = {
      "received": "Your claim has been received by State Farm.",
      "assigned": "An adjuster has been assigned to your claim.",
      "inspection-scheduled": "A property inspection has been scheduled.",
      "inspection-complete": "The inspection is complete. Your claim is under review.",
      "under-review": "Your claim is being reviewed by our team.",
      "approved": "Great news! Your claim has been approved.",
      "partially-approved": "Your claim has been partially approved.",
      "denied": "Your claim has been denied.",
      "supplement-requested": "Additional documentation is needed for your claim.",
      "supplement-approved": "Your supplement request has been approved.",
      "payment-processing": "Your payment is being processed.",
      "payment-issued": "Payment has been issued for your claim.",
      "closed": "Your claim has been closed.",
    };
    return messages[status] || "Status update available.";
  }
}
