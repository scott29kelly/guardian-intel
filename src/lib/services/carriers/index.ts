/**
 * Insurance Carrier Service
 *
 * Central service for managing carrier integrations.
 * Provides adapter factory, claim filing, and status sync functionality.
 *
 * NOTE: This service is stubbed pending CarrierConfig and related Prisma models.
 */

// import { prisma } from "@/lib/prisma"; // TODO: Re-enable when CarrierConfig model exists
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

// Suppress unused variable warnings for stubbed code
void adapterRegistry;

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

  // Suppress unused variable warnings
  constructor() {
    void this.adapters;
  }

  // ============================================================
  // Adapter Management (STUBBED - pending CarrierConfig model)
  // ============================================================

  /**
   * Get an initialized adapter for a carrier
   * STUBBED: Returns mock adapter in development, null otherwise
   */
  async getAdapter(carrierCode: string): Promise<CarrierAdapter | null> {
    // TODO: Implement when CarrierConfig model exists
    console.log(`[CarrierService] getAdapter called for ${carrierCode} - returning mock adapter`);

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

  /**
   * Get carrier configuration from database
   * STUBBED: Returns null pending CarrierConfig model
   */
  private async getCarrierConfig(_carrierCode: string): Promise<CarrierConfig | null> {
    // TODO: Implement when CarrierConfig model exists
    return null;
  }

  /**
   * Check if a carrier is configured and available
   * STUBBED: Returns false pending CarrierConfig model
   */
  async isCarrierAvailable(_carrierCode: string): Promise<boolean> {
    // TODO: Implement when CarrierConfig model exists
    return false;
  }

  /**
   * Get list of available carriers
   * STUBBED: Returns empty array pending CarrierConfig model
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
    // TODO: Implement when CarrierConfig model exists
    return [];
  }

  // ============================================================
  // Claim Operations (STUBBED - pending model fields)
  // ============================================================

  /**
   * File a claim with the carrier
   * STUBBED: Returns error pending full implementation
   */
  async fileClaim(
    _claimId: string,
    _carrierCode: string,
    _submission: ClaimSubmission
  ): Promise<CarrierResponse<ClaimFilingResult>> {
    // TODO: Implement when CarrierConfig and InsuranceClaim fields exist
    return {
      success: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Carrier integration coming soon",
        retryable: false,
      },
    };
  }

  /**
   * Sync claim status with carrier
   * STUBBED: Returns error pending full implementation
   */
  async syncClaimStatus(_claimId: string): Promise<CarrierResponse<ClaimStatusResult>> {
    // TODO: Implement when CarrierConfig and InsuranceClaim fields exist
    return {
      success: false,
      error: {
        code: "NOT_IMPLEMENTED",
        message: "Carrier sync coming soon",
        retryable: false,
      },
    };
  }

  /**
   * Sync all claims for a carrier
   * STUBBED: Returns empty result pending full implementation
   */
  async syncAllClaims(_carrierCode: string): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    // TODO: Implement when CarrierConfig model exists
    return { synced: 0, failed: 0, errors: ["Carrier sync coming soon"] };
  }
}

// ============================================================
// Export Singleton
// ============================================================

export const carrierService = new CarrierService();
