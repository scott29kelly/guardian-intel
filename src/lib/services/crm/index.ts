/**
 * CRM Service Factory
 * 
 * This module provides a unified interface for CRM operations.
 * It automatically selects the correct adapter based on configuration.
 * 
 * Usage:
 *   import { crmService } from "@/lib/services/crm";
 *   const customers = await crmService.getCustomers();
 */

import { ICrmAdapter, CrmConfig } from "./types";
import { PlaceholderCrmAdapter } from "./placeholder-adapter";

// Future adapters would be imported here:
// import { HubSpotAdapter } from "./hubspot-adapter";
// import { SalesforceAdapter } from "./salesforce-adapter";
// import { JobNimbusAdapter } from "./jobnimbus-adapter";

let crmAdapterInstance: ICrmAdapter | null = null;

function getCrmConfig(): CrmConfig {
  // Get CRM configuration from environment variables
  const provider = (process.env.CRM_PROVIDER || "placeholder") as CrmConfig["provider"];
  
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

function createCrmAdapter(config: CrmConfig): ICrmAdapter {
  switch (config.provider) {
    // When implementing real adapters, add cases here:
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
