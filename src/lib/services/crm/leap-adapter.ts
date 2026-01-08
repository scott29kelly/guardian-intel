/**
 * Leap CRM Adapter
 * 
 * Leap is a CRM designed specifically for the home improvement industry
 * (roofing, siding, windows, etc.) - perfect for Guardian's use case.
 * 
 * API Documentation: https://developer.leaptodigital.com/
 * 
 * Key Leap Entities:
 * - Customers (homeowners/contacts)
 * - Jobs (projects/deals)
 * - Appointments
 * - Estimates/Proposals
 * - Work Orders
 * - Documents
 * 
 * To complete this integration:
 * 1. Get API credentials from Leap dashboard
 * 2. Set LEAP_API_KEY and LEAP_COMPANY_ID in .env
 * 3. Implement each method below using Leap's REST API
 */

import {
  ICrmAdapter,
  CrmCustomer,
  CrmDeal,
  CrmInteraction,
  CrmSyncResult,
  LeapConfig,
} from "./types";

export class LeapCrmAdapter implements ICrmAdapter {
  private config: LeapConfig;
  private baseUrl: string;

  constructor(config: LeapConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || "https://api.leaptodigital.com/api/v1";
    console.log("[Leap CRM] Adapter initialized for company:", config.companyId);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        "Authorization": `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        "X-Company-Id": this.config.companyId,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Leap API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test by fetching company info
      await this.request("/company");
      console.log("[Leap CRM] Connection test successful");
      return true;
    } catch (error) {
      console.error("[Leap CRM] Connection test failed:", error);
      return false;
    }
  }

  async getCustomers(options?: { limit?: number; offset?: number; since?: Date }): Promise<CrmCustomer[]> {
    console.log("[Leap CRM] Fetching customers with options:", options);
    
    // TODO: Implement using Leap's /customers endpoint
    // Leap calls customers "contacts" or ties them to "jobs"
    // const response = await this.request<LeapCustomersResponse>("/customers", {
    //   method: "GET",
    //   // Add query params for pagination
    // });
    
    // Placeholder - remove when implementing
    console.warn("[Leap CRM] getCustomers not yet implemented - returning empty array");
    return [];
  }

  async getCustomerById(id: string): Promise<CrmCustomer | null> {
    console.log("[Leap CRM] Fetching customer by ID:", id);
    
    // TODO: Implement using Leap's /customers/{id} endpoint
    // const response = await this.request<LeapCustomer>(`/customers/${id}`);
    // return this.transformLeapCustomer(response);
    
    console.warn("[Leap CRM] getCustomerById not yet implemented");
    return null;
  }

  async createCustomer(customer: Omit<CrmCustomer, "id" | "createdAt" | "updatedAt">): Promise<CrmCustomer> {
    console.log("[Leap CRM] Creating customer:", customer);
    
    // TODO: Implement using Leap's POST /customers endpoint
    // const leapCustomer = this.transformToLeapCustomer(customer);
    // const response = await this.request<LeapCustomer>("/customers", {
    //   method: "POST",
    //   body: JSON.stringify(leapCustomer),
    // });
    // return this.transformLeapCustomer(response);
    
    throw new Error("[Leap CRM] createCustomer not yet implemented");
  }

  async updateCustomer(id: string, data: Partial<CrmCustomer>): Promise<CrmCustomer> {
    console.log("[Leap CRM] Updating customer:", id, data);
    
    // TODO: Implement using Leap's PUT /customers/{id} endpoint
    
    throw new Error("[Leap CRM] updateCustomer not yet implemented");
  }

  async getDeals(customerId?: string): Promise<CrmDeal[]> {
    console.log("[Leap CRM] Fetching deals for customer:", customerId);
    
    // In Leap, deals are called "Jobs"
    // TODO: Implement using Leap's /jobs endpoint
    // Filter by customer_id if provided
    
    console.warn("[Leap CRM] getDeals not yet implemented - returning empty array");
    return [];
  }

  async createDeal(deal: Omit<CrmDeal, "id" | "createdAt" | "updatedAt">): Promise<CrmDeal> {
    console.log("[Leap CRM] Creating deal (job):", deal);
    
    // In Leap, deals are "Jobs" with associated estimates/proposals
    // TODO: Implement using Leap's POST /jobs endpoint
    
    throw new Error("[Leap CRM] createDeal not yet implemented");
  }

  async updateDeal(id: string, data: Partial<CrmDeal>): Promise<CrmDeal> {
    console.log("[Leap CRM] Updating deal (job):", id, data);
    
    // TODO: Implement using Leap's PUT /jobs/{id} endpoint
    
    throw new Error("[Leap CRM] updateDeal not yet implemented");
  }

  async getInteractions(customerId: string): Promise<CrmInteraction[]> {
    console.log("[Leap CRM] Fetching interactions for customer:", customerId);
    
    // In Leap, interactions could be:
    // - Appointments
    // - Notes/Activities
    // - Call logs
    // TODO: Aggregate from multiple Leap endpoints
    
    console.warn("[Leap CRM] getInteractions not yet implemented - returning empty array");
    return [];
  }

  async createInteraction(interaction: Omit<CrmInteraction, "id" | "createdAt">): Promise<CrmInteraction> {
    console.log("[Leap CRM] Creating interaction:", interaction);
    
    // TODO: Implement based on interaction type
    // - "call" -> POST /calls or /activities
    // - "appointment" -> POST /appointments
    // - "note" -> POST /notes
    
    throw new Error("[Leap CRM] createInteraction not yet implemented");
  }

  async syncFromCrm(entityType: "customers" | "deals" | "interactions"): Promise<CrmSyncResult> {
    console.log("[Leap CRM] Starting sync from Leap for:", entityType);
    
    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsFailed = 0;
    const errors: string[] = [];

    try {
      switch (entityType) {
        case "customers":
          // TODO: Implement customer sync
          // 1. Fetch all customers from Leap (paginated)
          // 2. Transform to our data model
          // 3. Upsert into Prisma database
          break;
          
        case "deals":
          // TODO: Implement job/deal sync
          // 1. Fetch all jobs from Leap
          // 2. Transform to our deal model
          // 3. Link to customers
          // 4. Upsert into database
          break;
          
        case "interactions":
          // TODO: Implement activity sync
          // 1. Fetch appointments, notes, calls
          // 2. Transform and merge
          // 3. Upsert into database
          break;
      }
      
      console.log(`[Leap CRM] Sync completed in ${Date.now() - startTime}ms`);
      
    } catch (error) {
      console.error("[Leap CRM] Sync error:", error);
      errors.push(String(error));
    }

    return {
      success: errors.length === 0,
      recordsProcessed,
      recordsFailed,
      errors: errors.length > 0 ? errors : undefined,
      lastSyncedAt: new Date(),
    };
  }

  async syncToCrm(entityType: "customers" | "deals" | "interactions", ids: string[]): Promise<CrmSyncResult> {
    console.log("[Leap CRM] Starting sync to Leap for:", entityType, "IDs:", ids);
    
    // TODO: Implement pushing local changes to Leap
    // This is useful for:
    // - Creating leads from storm detection
    // - Updating deal stages from Guardian Intel
    // - Logging calls/activities back to Leap
    
    return {
      success: true,
      recordsProcessed: 0,
      recordsFailed: ids.length,
      errors: ["syncToCrm not yet implemented"],
      lastSyncedAt: new Date(),
    };
  }

  // ============================================================
  // Leap-specific helper methods (for future implementation)
  // ============================================================

  /**
   * Get all jobs (deals) with their associated estimates
   * Leap has rich estimate/proposal functionality
   */
  async getJobsWithEstimates(): Promise<unknown[]> {
    // TODO: Implement
    return [];
  }

  /**
   * Create a new appointment in Leap
   * Useful for scheduling roof inspections
   */
  async createAppointment(jobId: string, appointment: {
    scheduledDate: Date;
    type: string;
    assignedTo?: string;
    notes?: string;
  }): Promise<unknown> {
    // TODO: Implement using POST /jobs/{jobId}/appointments
    throw new Error("Not implemented");
  }

  /**
   * Get production/installation schedule from Leap
   * For showing upcoming jobs in dashboard
   */
  async getProductionSchedule(startDate: Date, endDate: Date): Promise<unknown[]> {
    // TODO: Implement using Leap's scheduling endpoints
    return [];
  }

  /**
   * Sync weather event to Leap as a note/activity
   * Creates a record in Leap when storm detected
   */
  async logWeatherEvent(customerId: string, event: {
    type: string;
    severity: string;
    date: Date;
    details: string;
  }): Promise<void> {
    // TODO: Implement - create note in Leap with weather details
    console.log("[Leap CRM] Would log weather event:", event);
  }
}
