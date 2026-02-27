/**
 * CRM Service Factory
 *
 * This module provides a unified interface for CRM operations.
 * It automatically selects the correct adapter based on configuration.
 *
 * Guardian uses Leap CRM (https://leaptodigital.com) - a CRM designed
 * specifically for the home improvement industry (roofing, siding, etc.)
 *
 * Usage:
 *   import { getCrmAdapter } from "@/lib/services/crm";
 *   const adapter = getCrmAdapter();
 *   if (adapter) {
 *     const customers = await adapter.getCustomers();
 *   }
 *
 * To enable Leap integration:
 *   1. Set CRM_PROVIDER=leap in .env
 *   2. Set LEAP_API_KEY and LEAP_COMPANY_ID
 */

import { ICrmAdapter, LeapConfig } from "./types";
import { LeapCrmAdapter } from "./leap-adapter";

let crmAdapterInstance: ICrmAdapter | null = null;
let adapterInitialized = false;

export function getCrmAdapter(): ICrmAdapter | null {
  if (!adapterInitialized) {
    const provider = process.env.CRM_PROVIDER;

    if (provider === "leap") {
      const config: LeapConfig = {
        provider: "leap",
        apiKey: process.env.LEAP_API_KEY || "",
        companyId: process.env.LEAP_COMPANY_ID || "",
        baseUrl: process.env.LEAP_BASE_URL,
      };
      crmAdapterInstance = new LeapCrmAdapter(config);
    }
    // No CRM configured — crmAdapterInstance stays null

    adapterInitialized = true;
  }
  return crmAdapterInstance;
}

// Re-export types
export * from "./types";
