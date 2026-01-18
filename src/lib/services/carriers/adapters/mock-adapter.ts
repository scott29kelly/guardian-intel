/**
 * Mock Carrier Adapter
 * 
 * Simulates carrier API for development and testing.
 * Demonstrates the adapter pattern for future carrier integrations.
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

export class MockCarrierAdapter extends BaseCarrierAdapter {
  readonly carrierCode = "mock";
  readonly carrierName = "Mock Insurance Co.";
  
  // Simulated claim storage
  private claims = new Map<string, { submission: ClaimSubmission; status: CarrierClaimStatus; data: any }>();
  
  protected getDefaultEndpoint(): string {
    return "https://api.mock-insurance.dev/v1";
  }
  
  async testConnection(): Promise<boolean> {
    // Always succeeds for mock
    return true;
  }
  
  // ============================================================
  // Claim Filing
  // ============================================================
  
  async fileClaim(claim: ClaimSubmission): Promise<CarrierResponse<ClaimFilingResult>> {
    // Simulate API delay
    await this.simulateDelay(500, 1500);
    
    // Simulate validation errors occasionally
    if (Math.random() < 0.05) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Policy number not found in system",
          retryable: false,
        },
      };
    }
    
    // Generate mock claim ID
    const carrierClaimId = `MCK-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const claimNumber = `MCK${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, "0")}`;
    
    // Store claim
    this.claims.set(carrierClaimId, {
      submission: claim,
      status: "received",
      data: {
        claimNumber,
        receivedAt: new Date(),
      },
    });
    
    const result: ClaimFilingResult = {
      carrierClaimId,
      claimNumber,
      status: "received",
      statusMessage: "Your claim has been received and is being processed.",
      assignedAdjuster: Math.random() > 0.5 ? {
        name: "John Smith",
        phone: "1-800-555-0123",
        email: "jsmith@mock-insurance.com",
        company: "Mock Adjusting Services",
        assignedDate: new Date(),
      } : undefined,
      nextSteps: [
        "An adjuster will contact you within 2-3 business days",
        "Gather any additional documentation of damage",
        "Do not dispose of damaged materials until inspection",
      ],
      estimatedResponseDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      trackingUrl: `https://claims.mock-insurance.dev/track/${claimNumber}`,
    };
    
    return { success: true, data: result };
  }
  
  // ============================================================
  // Status Checks
  // ============================================================
  
  async getClaimStatus(carrierClaimId: string): Promise<CarrierResponse<ClaimStatusResult>> {
    await this.simulateDelay(200, 500);
    
    const claim = this.claims.get(carrierClaimId);
    
    if (!claim) {
      // Return a simulated claim for demo purposes
      return this.generateMockStatus(carrierClaimId);
    }
    
    const result: ClaimStatusResult = {
      carrierClaimId,
      claimNumber: claim.data.claimNumber,
      status: claim.status,
      statusCode: this.getStatusCode(claim.status),
      statusMessage: this.getStatusMessage(claim.status),
      lastUpdated: new Date(),
      adjuster: {
        name: "John Smith",
        phone: "1-800-555-0123",
        email: "jsmith@mock-insurance.com",
      },
      timeline: [
        { date: claim.data.receivedAt, event: "Claim Received", description: "Claim submitted successfully" },
      ],
    };
    
    return { success: true, data: result };
  }
  
  async getClaimByNumber(claimNumber: string): Promise<CarrierResponse<ClaimStatusResult>> {
    await this.simulateDelay(200, 500);
    
    // Find claim by number
    for (const [id, claim] of this.claims.entries()) {
      if (claim.data.claimNumber === claimNumber) {
        return this.getClaimStatus(id);
      }
    }
    
    // Return a simulated claim
    return this.generateMockStatus(`mock-${claimNumber}`);
  }
  
  private generateMockStatus(carrierClaimId: string): CarrierResponse<ClaimStatusResult> {
    const statuses: CarrierClaimStatus[] = [
      "received", "assigned", "inspection-scheduled", "inspection-complete",
      "under-review", "approved", "payment-processing",
    ];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    const result: ClaimStatusResult = {
      carrierClaimId,
      claimNumber: `MCK2026-${String(Math.floor(Math.random() * 999999)).padStart(6, "0")}`,
      status: randomStatus,
      statusCode: this.getStatusCode(randomStatus),
      statusMessage: this.getStatusMessage(randomStatus),
      lastUpdated: new Date(),
      approvedAmount: randomStatus === "approved" ? 15000 + Math.random() * 10000 : undefined,
      paidAmount: randomStatus === "payment-processing" ? 12000 : undefined,
      adjuster: {
        name: "Jane Doe",
        phone: "1-800-555-0124",
        email: "jdoe@mock-insurance.com",
        company: "Mock Claims Services",
        assignedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      inspectionDate: ["inspection-scheduled", "inspection-complete", "under-review", "approved", "payment-processing"]
        .includes(randomStatus) ? new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) : undefined,
      timeline: [
        { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), event: "Claim Received" },
        { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), event: "Adjuster Assigned" },
        { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), event: "Inspection Scheduled" },
      ],
    };
    
    return { success: true, data: result };
  }
  
  // ============================================================
  // Supplements
  // ============================================================
  
  async fileSuplement(supplement: SupplementSubmission): Promise<CarrierResponse<SupplementResult>> {
    await this.simulateDelay(500, 1000);
    
    const result: SupplementResult = {
      supplementId: `SUP-${Date.now()}`,
      status: "submitted",
      submittedAt: new Date(),
      notes: "Supplement received. Under review by claims department.",
    };
    
    return { success: true, data: result };
  }
  
  // ============================================================
  // Documents
  // ============================================================
  
  async uploadDocument(document: DocumentUpload): Promise<CarrierResponse<DocumentUploadResult>> {
    await this.simulateDelay(300, 800);
    
    const result: DocumentUploadResult = {
      documentId: `DOC-${Date.now()}`,
      status: "uploaded",
      message: "Document uploaded successfully",
    };
    
    return { success: true, data: result };
  }
  
  async getDocuments(carrierClaimId: string): Promise<CarrierResponse<CarrierDocument[]>> {
    await this.simulateDelay(200, 400);
    
    const documents: CarrierDocument[] = [
      { id: "doc-1", type: "estimate", name: "Initial Estimate.pdf", uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      { id: "doc-2", type: "photo", name: "Roof Damage Photo 1.jpg", uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      { id: "doc-3", type: "scope-of-work", name: "Scope of Work.pdf", uploadedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
    ];
    
    return { success: true, data: documents };
  }
  
  // ============================================================
  // Webhooks
  // ============================================================
  
  verifyWebhook(payload: string, signature: string): boolean {
    if (!this.config?.webhookSecret) return false;
    
    const expectedSignature = crypto
      .createHmac("sha256", this.config.webhookSecret)
      .update(payload)
      .digest("hex");
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
  
  parseWebhook(payload: string): CarrierWebhookPayload {
    const data = JSON.parse(payload);
    
    return {
      eventType: data.event || "claim.status_changed",
      carrierCode: this.carrierCode,
      claimId: data.claimId,
      claimNumber: data.claimNumber,
      timestamp: new Date(data.timestamp || Date.now()),
      data: data.data || {},
    };
  }
  
  // ============================================================
  // Status Mapping
  // ============================================================
  
  mapStatus(carrierStatus: string): CarrierClaimStatus {
    const statusMap: Record<string, CarrierClaimStatus> = {
      "NEW": "received",
      "ASSIGNED": "assigned",
      "SCHEDULED": "inspection-scheduled",
      "INSPECTED": "inspection-complete",
      "REVIEW": "under-review",
      "APPROVED": "approved",
      "PARTIAL": "partially-approved",
      "DENIED": "denied",
      "SUPPLEMENT": "supplement-requested",
      "PROCESSING": "payment-processing",
      "PAID": "payment-issued",
      "CLOSED": "closed",
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
  // Helpers
  // ============================================================
  
  private getStatusCode(status: CarrierClaimStatus): string {
    const codes: Record<CarrierClaimStatus, string> = {
      "received": "RCV",
      "assigned": "ASN",
      "inspection-scheduled": "INS",
      "inspection-complete": "INC",
      "under-review": "REV",
      "approved": "APP",
      "partially-approved": "PAP",
      "denied": "DEN",
      "supplement-requested": "SUP",
      "supplement-approved": "SAP",
      "payment-processing": "PPR",
      "payment-issued": "PID",
      "closed": "CLS",
    };
    return codes[status] || "UNK";
  }
  
  private getStatusMessage(status: CarrierClaimStatus): string {
    const messages: Record<CarrierClaimStatus, string> = {
      "received": "Your claim has been received and is being processed.",
      "assigned": "An adjuster has been assigned to your claim.",
      "inspection-scheduled": "An inspection has been scheduled for your property.",
      "inspection-complete": "The inspection has been completed. Your claim is under review.",
      "under-review": "Your claim is being reviewed by our claims department.",
      "approved": "Your claim has been approved!",
      "partially-approved": "Your claim has been partially approved.",
      "denied": "Unfortunately, your claim has been denied.",
      "supplement-requested": "Additional information has been requested for your claim.",
      "supplement-approved": "Your supplement request has been approved.",
      "payment-processing": "Your payment is being processed.",
      "payment-issued": "Payment has been issued for your claim.",
      "closed": "Your claim has been closed.",
    };
    return messages[status] || "Status update available.";
  }
  
  private simulateDelay(min: number, max: number): Promise<void> {
    const delay = Math.random() * (max - min) + min;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
