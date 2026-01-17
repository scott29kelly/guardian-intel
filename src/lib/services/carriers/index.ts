/**
 * Insurance Carrier Service
 * 
 * Central service for managing carrier integrations.
 * Provides adapter factory, claim filing, and status sync functionality.
 */

import { prisma } from "@/lib/prisma";
import type { CarrierAdapter, CarrierConfig, ClaimSubmission, CarrierResponse, ClaimFilingResult, ClaimStatusResult } from "./types";
import { MockCarrierAdapter } from "./adapters/mock-adapter";
import { StateFarmAdapter } from "./adapters/state-farm-adapter";

// Export types
export * from "./types";

// ============================================================
// Adapter Registry
// ============================================================

const adapterRegistry: Record<string, new () => CarrierAdapter> = {
  "mock": MockCarrierAdapter,
  "state-farm": StateFarmAdapter,
  // Add more carriers as they're implemented:
  // "allstate": AllstateAdapter,
  // "usaa": USAAAdapter,
  // "liberty-mutual": LibertyMutualAdapter,
  // "farmers": FarmersAdapter,
  // "nationwide": NationwideAdapter,
  // "progressive": ProgressiveAdapter,
};

// Carrier display names for UI
export const carrierNames: Record<string, string> = {
  "mock": "Mock Insurance",
  "state-farm": "State Farm",
  "allstate": "Allstate",
  "usaa": "USAA",
  "liberty-mutual": "Liberty Mutual",
  "farmers": "Farmers Insurance",
  "nationwide": "Nationwide",
  "progressive": "Progressive",
  "travelers": "Travelers",
  "amica": "Amica",
  "auto-owners": "Auto-Owners",
  "erie": "Erie Insurance",
  "american-family": "American Family",
};

// ============================================================
// Carrier Service Class
// ============================================================

class CarrierService {
  private adapters: Map<string, CarrierAdapter> = new Map();
  
  // ============================================================
  // Adapter Management
  // ============================================================
  
  /**
   * Get an initialized adapter for a carrier
   */
  async getAdapter(carrierCode: string): Promise<CarrierAdapter | null> {
    // Check cache first
    const cached = this.adapters.get(carrierCode);
    if (cached) return cached;
    
    // Load config from database
    const config = await this.getCarrierConfig(carrierCode);
    if (!config) {
      // Fall back to mock adapter for development
      if (process.env.NODE_ENV === "development") {
        const mockAdapter = new MockCarrierAdapter();
        await mockAdapter.initialize({
          carrierCode: "mock",
          carrierName: "Mock Carrier",
          isTestMode: true,
        });
        return mockAdapter;
      }
      return null;
    }
    
    // Get adapter class
    const AdapterClass = adapterRegistry[carrierCode];
    if (!AdapterClass) {
      console.warn(`[CarrierService] No adapter registered for carrier: ${carrierCode}`);
      return null;
    }
    
    // Initialize adapter
    const adapter = new AdapterClass();
    await adapter.initialize(config);
    
    // Cache adapter
    this.adapters.set(carrierCode, adapter);
    
    return adapter;
  }
  
  /**
   * Get carrier configuration from database
   */
  private async getCarrierConfig(carrierCode: string): Promise<CarrierConfig | null> {
    const config = await prisma.carrierConfig.findUnique({
      where: { carrierCode },
    });
    
    if (!config || !config.isActive) return null;
    
    return {
      carrierCode: config.carrierCode,
      carrierName: config.carrierName,
      apiEndpoint: config.apiEndpoint || undefined,
      apiKey: config.apiKey || undefined,
      apiSecret: config.apiSecret || undefined,
      clientId: config.clientId || undefined,
      clientSecret: config.clientSecret || undefined,
      accessToken: config.accessToken || undefined,
      refreshToken: config.refreshToken || undefined,
      tokenExpiry: config.tokenExpiry || undefined,
      webhookSecret: config.webhookSecret || undefined,
      isTestMode: config.isTestMode,
    };
  }
  
  /**
   * Check if a carrier is configured and available
   */
  async isCarrierAvailable(carrierCode: string): Promise<boolean> {
    const config = await prisma.carrierConfig.findUnique({
      where: { carrierCode },
      select: { isActive: true, supportsDirectFiling: true },
    });
    
    return !!(config?.isActive && config.supportsDirectFiling);
  }
  
  /**
   * Get list of available carriers
   */
  async getAvailableCarriers(): Promise<Array<{
    code: string;
    name: string;
    supportsDirectFiling: boolean;
    supportsStatusUpdates: boolean;
    isTestMode: boolean;
  }>> {
    const configs = await prisma.carrierConfig.findMany({
      where: { isActive: true },
      select: {
        carrierCode: true,
        carrierName: true,
        supportsDirectFiling: true,
        supportsStatusUpdates: true,
        isTestMode: true,
      },
    });
    
    return configs.map(c => ({
      code: c.carrierCode,
      name: c.carrierName,
      supportsDirectFiling: c.supportsDirectFiling,
      supportsStatusUpdates: c.supportsStatusUpdates,
      isTestMode: c.isTestMode,
    }));
  }
  
  // ============================================================
  // Claim Operations
  // ============================================================
  
  /**
   * File a claim with the carrier
   */
  async fileClaim(
    claimId: string,
    carrierCode: string,
    submission: ClaimSubmission
  ): Promise<CarrierResponse<ClaimFilingResult>> {
    const adapter = await this.getAdapter(carrierCode);
    
    if (!adapter) {
      return {
        success: false,
        error: {
          code: "CARRIER_NOT_AVAILABLE",
          message: `Carrier ${carrierCode} is not configured or available`,
          retryable: false,
        },
      };
    }
    
    try {
      const result = await adapter.fileClaim(submission);
      
      if (result.success && result.data) {
        // Update claim with carrier info
        await prisma.insuranceClaim.update({
          where: { id: claimId },
          data: {
            carrierClaimId: result.data.carrierClaimId,
            claimNumber: result.data.claimNumber,
            carrierStatus: result.data.status,
            isFiledWithCarrier: true,
            lastSyncAt: new Date(),
            adjusterName: result.data.assignedAdjuster?.name,
            adjusterPhone: result.data.assignedAdjuster?.phone,
            adjusterEmail: result.data.assignedAdjuster?.email,
            adjusterCompany: result.data.assignedAdjuster?.company,
          },
        });
        
        // Create activity log
        await prisma.activity.create({
          data: {
            userId: "system",
            type: "create",
            entityType: "claim",
            entityId: claimId,
            description: `Claim filed with ${carrierNames[carrierCode] || carrierCode}. Claim #: ${result.data.claimNumber}`,
          },
        });
      } else {
        // Log error
        await prisma.insuranceClaim.update({
          where: { id: claimId },
          data: {
            lastSyncError: result.error?.message,
            lastSyncAt: new Date(),
          },
        });
      }
      
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: "FILING_FAILED",
          message: error.message || "Failed to file claim",
          retryable: true,
        },
      };
    }
  }
  
  /**
   * Sync claim status with carrier
   */
  async syncClaimStatus(claimId: string): Promise<CarrierResponse<ClaimStatusResult>> {
    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: claimId },
      select: {
        carrier: true,
        carrierClaimId: true,
        claimNumber: true,
        status: true,
      },
    });
    
    if (!claim) {
      return {
        success: false,
        error: {
          code: "CLAIM_NOT_FOUND",
          message: "Claim not found",
          retryable: false,
        },
      };
    }
    
    if (!claim.carrierClaimId && !claim.claimNumber) {
      return {
        success: false,
        error: {
          code: "NOT_FILED",
          message: "Claim has not been filed with carrier",
          retryable: false,
        },
      };
    }
    
    const adapter = await this.getAdapter(claim.carrier);
    if (!adapter) {
      return {
        success: false,
        error: {
          code: "CARRIER_NOT_AVAILABLE",
          message: `Carrier ${claim.carrier} is not available`,
          retryable: false,
        },
      };
    }
    
    try {
      const result = claim.carrierClaimId
        ? await adapter.getClaimStatus(claim.carrierClaimId)
        : await adapter.getClaimByNumber(claim.claimNumber!);
      
      if (result.success && result.data) {
        // Map carrier status to internal status
        const internalStatus = adapter.mapStatusToInternal(result.data.status);
        
        // Update claim
        await prisma.insuranceClaim.update({
          where: { id: claimId },
          data: {
            carrierStatus: result.data.status,
            lastSyncAt: new Date(),
            status: internalStatus,
            approvedValue: result.data.approvedAmount,
            totalPaid: result.data.paidAmount,
            depreciation: result.data.depreciation,
            acv: result.data.acv,
            rcv: result.data.rcv,
            adjusterName: result.data.adjuster?.name || undefined,
            adjusterPhone: result.data.adjuster?.phone || undefined,
            adjusterEmail: result.data.adjuster?.email || undefined,
            adjusterCompany: result.data.adjuster?.company || undefined,
            inspectionDate: result.data.inspectionDate,
            lastSyncError: null,
          },
        });
        
        // Create intel item for significant status changes
        if (internalStatus !== claim.status) {
          const claimWithCustomer = await prisma.insuranceClaim.findUnique({
            where: { id: claimId },
            include: { customer: { select: { id: true } } },
          });
          
          if (claimWithCustomer?.customer) {
            await prisma.intelItem.create({
              data: {
                customerId: claimWithCustomer.customer.id,
                source: "carrier-api",
                sourceId: claimId,
                category: "insurance",
                title: `Claim status updated to ${internalStatus}`,
                content: result.data.statusMessage || `Carrier status: ${result.data.status}`,
                priority: internalStatus === "approved" ? "high" : "medium",
                actionable: ["approved", "denied", "supplement"].includes(internalStatus),
              },
            });
          }
        }
      } else {
        // Log sync error
        await prisma.insuranceClaim.update({
          where: { id: claimId },
          data: {
            lastSyncError: result.error?.message,
            lastSyncAt: new Date(),
          },
        });
      }
      
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: "SYNC_FAILED",
          message: error.message || "Failed to sync status",
          retryable: true,
        },
      };
    }
  }
  
  /**
   * Sync all claims for a carrier
   */
  async syncAllClaims(carrierCode: string): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const claims = await prisma.insuranceClaim.findMany({
      where: {
        carrier: carrierCode,
        isFiledWithCarrier: true,
        status: { notIn: ["closed", "denied"] },
      },
      select: { id: true },
    });
    
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];
    
    for (const claim of claims) {
      const result = await this.syncClaimStatus(claim.id);
      if (result.success) {
        synced++;
      } else {
        failed++;
        if (result.error) {
          errors.push(`${claim.id}: ${result.error.message}`);
        }
      }
      
      // Rate limiting - 100ms between requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    
    return { synced, failed, errors };
  }
}

// ============================================================
// Export Singleton
// ============================================================

export const carrierService = new CarrierService();
