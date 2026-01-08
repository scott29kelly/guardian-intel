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
 *   import { crmService } from "@/lib/services/crm";
 *   const customers = await crmService.getCustomers();
 * 
 * To enable Leap integration:
 *   1. Set CRM_PROVIDER=leap in .env
 *   2. Set LEAP_API_KEY and LEAP_COMPANY_ID
 */

import { ICrmAdapter, CrmConfig, LeapConfig } from "./types";
import { PlaceholderCrmAdapter } from "./placeholder-adapter";
import { LeapCrmAdapter } from "./leap-adapter";

let crmAdapterInstance: ICrmAdapter | null = null;

function getCrmConfig(): CrmConfig | LeapConfig {
  // Get CRM configuration from environment variables
  const provider = (process.env.CRM_PROVIDER || "placeholder") as CrmConfig["provider"];
  
  // Leap-specific config
  if (provider === "leap") {
    return {
      provider: "leap",
      apiKey: process.env.LEAP_API_KEY || "",
      companyId: process.env.LEAP_COMPANY_ID || "",
      baseUrl: process.env.LEAP_BASE_URL,
    } as LeapConfig;
  }
  
  // Generic config for other providers
  return {
    provider,
    apiKey: process.env.CRM_API_KEY,
    apiSecret: process.env.CRM_API_SECRET,
    accessToken: process.env.CRM_ACCESS_TOKEN,
    refreshToken: process.env.CRM_REFRESH_TOKEN,
    instanceUrl: process.env.CRM_INSTANCE_URL,
    webhookSecret: process.env.CRM_WEBHOOK_SECRET,
  };
}

function createCrmAdapter(config: CrmConfig | LeapConfig): ICrmAdapter {
  switch (config.provider) {
    case "leap":
      // Leap CRM - Guardian's primary CRM
      return new LeapCrmAdapter(config as LeapConfig);
    // Other providers can be added here if needed:
    // case "hubspot":
    //   return new HubSpotAdapter(config);
    // case "salesforce":
    //   return new SalesforceAdapter(config);
    // case "jobnimbus":
    //   return new JobNimbusAdapter(config);
    case "placeholder":
    default:
      return new PlaceholderCrmAdapter(config);
  }
}

export function getCrmAdapter(): ICrmAdapter {
  if (!crmAdapterInstance) {
    const config = getCrmConfig();
    crmAdapterInstance = createCrmAdapter(config);
  }
  return crmAdapterInstance;
}

// Export a singleton instance for convenience
export const crmService = getCrmAdapter();

// Re-export types
export * from "./types";
