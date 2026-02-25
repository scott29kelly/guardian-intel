/**
 * Insurance Carrier Service
 *
 * Central service for managing carrier integrations.
 * Provides adapter factory, claim filing, and status sync functionality.
 *
 * NOTE: CarrierConfig is not a separate Prisma model. We manage carrier
 * configuration in-memory and via environment variables. The InsuranceClaim
 * model is used for claim tracking.
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
    // Check cache
    if (this.adapters.has(carrierCode)) {
      return this.adapters.get(carrierCode)!;
    }

    // Look up adapter class
    const AdapterClass = adapterRegistry[carrierCode];
    if (!AdapterClass) {
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

    const adapter = new AdapterClass();
    const config = await this.getCarrierConfig(carrierCode);
    if (config) {
      await adapter.initialize(config);
      this.adapters.set(carrierCode, adapter);
    }
    return adapter;
  }

  /**
   * Get carrier configuration
   * Currently built from environment variables; could be DB-backed later
   */
  private async getCarrierConfig(carrierCode: string): Promise<CarrierConfig | null> {
    const name = carrierNames[carrierCode];
    if (!name) return null;

    return {
      carrierCode,
      carrierName: name,
      isTestMode: process.env.NODE_ENV !== "production",
    };
  }

  /**
   * Check if a carrier is configured and available
   */
  async isCarrierAvailable(carrierCode: string): Promise<boolean> {
    return carrierCode in adapterRegistry;
  }

  /**
   * Get list of available carriers
   */
  async getAvailableCarriers(): Promise<
    Array<{
      code: string;
      name: string;
      supportsDirectFiling: boolean;
      supportsStatusUpdates: boolean;
      isTestMode: boolean;
    }>
  > {
    return Object.keys(adapterRegistry).map((code) => ({
      code,
      name: carrierNames[code] || code,
      supportsDirectFiling: code !== "mock",
      supportsStatusUpdates: code !== "mock",
      isTestMode: process.env.NODE_ENV !== "production",
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
          code: "NO_ADAPTER",
          message: `No adapter available for carrier: ${carrierCode}`,
          retryable: false,
        },
      };
    }

    try {
      const result = await adapter.fileClaim(submission);

      // Update the claim in DB with external reference
      if (result.success && result.data) {
        await prisma.insuranceClaim.update({
          where: { id: claimId },
          data: {
            claimNumber: result.data.claimNumber,
            status: "pending",
          },
        });
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: {
          code: "FILING_ERROR",
          message: error instanceof Error ? error.message : "Claim filing failed",
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
    });

    if (!claim || !claim.claimNumber) {
      return {
        success: false,
        error: {
          code: "NO_CLAIM",
          message: "Claim not found or no external claim number",
          retryable: false,
        },
      };
    }

    // Normalize carrier name to code
    const carrierCode = claim.carrier.toLowerCase().replace(/\s+/g, "-");
    const adapter = await this.getAdapter(carrierCode);

    if (!adapter) {
      return {
        success: false,
        error: {
          code: "NO_ADAPTER",
          message: `No adapter for carrier: ${claim.carrier}`,
          retryable: false,
        },
      };
    }

    try {
      const result = await adapter.getClaimStatus(claim.claimNumber);

      if (result.success && result.data) {
        // Update claim with latest status
        await prisma.insuranceClaim.update({
          where: { id: claimId },
          data: {
            status: result.data.status,
            approvedValue: result.data.approvedAmount ?? undefined,
          },
        });
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: {
          code: "SYNC_ERROR",
          message: error instanceof Error ? error.message : "Status sync failed",
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
        carrier: { contains: carrierCode.replace("-", " "), mode: "insensitive" },
        claimNumber: { not: null },
        status: { in: ["pending", "approved", "supplement"] },
      },
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
        errors.push(`Claim ${claim.id}: ${result.error?.message || "Unknown error"}`);
      }
    }

    return { synced, failed, errors };
  }
}

// ============================================================
// Export Singleton
// ============================================================

export const carrierService = new CarrierService();
