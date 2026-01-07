/**
 * Placeholder CRM Adapter
 * 
 * This adapter serves as a template and fallback when no CRM is configured.
 * Replace with HubSpot, Salesforce, or JobNimbus adapter when ready.
 * 
 * To implement a real adapter:
 * 1. Copy this file as {provider}-adapter.ts
 * 2. Implement each method using the provider's API
 * 3. Update the CRM factory to use the new adapter
 */

import {
  ICrmAdapter,
  CrmCustomer,
  CrmDeal,
  CrmInteraction,
  CrmSyncResult,
  CrmConfig,
} from "./types";

export class PlaceholderCrmAdapter implements ICrmAdapter {
  private config: CrmConfig;

  constructor(config: CrmConfig) {
    this.config = config;
    console.log("[CRM] Placeholder adapter initialized - no real CRM connected");
  }

  async testConnection(): Promise<boolean> {
    // In a real adapter, this would test the API connection
    console.log("[CRM] Testing placeholder connection - always returns true");
    return true;
  }

  async getCustomers(options?: { limit?: number; offset?: number; since?: Date }): Promise<CrmCustomer[]> {
    console.log("[CRM] getCustomers called with options:", options);
    
    // Return mock data for development
    // In production, this would call the CRM API
    return [
      {
        id: "crm-001",
        firstName: "John",
        lastName: "Smith",
        email: "john.smith@example.com",
        phone: "(555) 123-4567",
        address: "123 Main St",
        city: "Columbus",
        state: "OH",
        zipCode: "43215",
        status: "lead",
        stage: "new",
        leadSource: "website",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  async getCustomerById(id: string): Promise<CrmCustomer | null> {
    console.log(`[CRM] getCustomerById called for ID: ${id}`);
    
    // In production, fetch from CRM API
    return {
      id,
      firstName: "Mock",
      lastName: "Customer",
      email: "mock@example.com",
      phone: "(555) 000-0000",
      address: "123 Mock St",
      city: "Columbus",
      state: "OH",
      zipCode: "43215",
      status: "lead",
      stage: "new",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async createCustomer(customer: Omit<CrmCustomer, "id" | "createdAt" | "updatedAt">): Promise<CrmCustomer> {
    console.log("[CRM] createCustomer called:", customer);
    
    // In production, create in CRM and return with ID
    return {
      ...customer,
      id: `crm-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async updateCustomer(id: string, data: Partial<CrmCustomer>): Promise<CrmCustomer> {
    console.log(`[CRM] updateCustomer called for ID ${id}:`, data);
    
    // In production, update in CRM
    const existing = await this.getCustomerById(id);
    return {
      ...existing!,
      ...data,
      updatedAt: new Date(),
    };
  }

  async getDeals(customerId?: string): Promise<CrmDeal[]> {
    console.log(`[CRM] getDeals called for customer: ${customerId || "all"}`);
    
    return [
      {
        id: "deal-001",
        customerId: customerId || "crm-001",
        title: "Roof Replacement",
        value: 15000,
        stage: "proposal",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  async createDeal(deal: Omit<CrmDeal, "id" | "createdAt" | "updatedAt">): Promise<CrmDeal> {
    console.log("[CRM] createDeal called:", deal);
    
    return {
      ...deal,
      id: `deal-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async updateDeal(id: string, data: Partial<CrmDeal>): Promise<CrmDeal> {
    console.log(`[CRM] updateDeal called for ID ${id}:`, data);
    
    return {
      id,
      customerId: data.customerId || "crm-001",
      title: data.title || "Updated Deal",
      value: data.value || 0,
      stage: data.stage || "proposal",
      status: data.status || "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async getInteractions(customerId: string): Promise<CrmInteraction[]> {
    console.log(`[CRM] getInteractions called for customer: ${customerId}`);
    
    return [
      {
        id: "interaction-001",
        customerId,
        type: "call",
        direction: "outbound",
        subject: "Initial contact",
        outcome: "voicemail",
        createdAt: new Date(),
      },
    ];
  }

  async createInteraction(interaction: Omit<CrmInteraction, "id" | "createdAt">): Promise<CrmInteraction> {
    console.log("[CRM] createInteraction called:", interaction);
    
    return {
      ...interaction,
      id: `interaction-${Date.now()}`,
      createdAt: new Date(),
    };
  }

  async syncFromCrm(entityType: "customers" | "deals" | "interactions"): Promise<CrmSyncResult> {
    console.log(`[CRM] syncFromCrm called for: ${entityType}`);
    
    // In production, this would:
    // 1. Fetch records from CRM API
    // 2. Transform to our data model
    // 3. Upsert into our database
    // 4. Log sync results
    
    return {
      success: true,
      recordsProcessed: 0,
      recordsFailed: 0,
      lastSyncedAt: new Date(),
    };
  }

  async syncToCrm(entityType: "customers" | "deals" | "interactions", ids: string[]): Promise<CrmSyncResult> {
    console.log(`[CRM] syncToCrm called for ${entityType}:`, ids);
    
    // In production, this would:
    // 1. Fetch records from our database
    // 2. Transform to CRM data model
    // 3. Create/update in CRM
    // 4. Update our records with CRM IDs
    
    return {
      success: true,
      recordsProcessed: ids.length,
      recordsFailed: 0,
      lastSyncedAt: new Date(),
    };
  }
}
