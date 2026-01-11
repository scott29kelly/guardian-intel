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
 * Environment Variables:
 * - CRM_PROVIDER=leap
 * - LEAP_API_KEY=your-api-key
 * - LEAP_COMPANY_ID=your-company-id
 * - LEAP_BASE_URL=https://api.leaptodigital.com/api/v1 (optional)
 */

import {
  ICrmAdapter,
  CrmCustomer,
  CrmDeal,
  CrmInteraction,
  CrmSyncResult,
  LeapConfig,
} from "./types";
import { prisma } from "@/lib/prisma";

// Leap API Response Types
interface LeapCustomer {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  status: string;
  lead_source: string | null;
  created_at: string;
  updated_at: string;
  custom_fields?: Record<string, unknown>;
}

interface LeapJob {
  id: number;
  customer_id: number;
  name: string;
  total: number;
  stage: string;
  status: string;
  expected_close_date: string | null;
  created_at: string;
  updated_at: string;
}

interface LeapActivity {
  id: number;
  customer_id: number;
  type: string;
  direction: string;
  subject: string | null;
  description: string | null;
  outcome: string | null;
  created_at: string;
}

interface LeapPaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export class LeapCrmAdapter implements ICrmAdapter {
  private config: LeapConfig;
  private baseUrl: string;
  private isDemoMode: boolean;

  constructor(config: LeapConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || "https://api.leaptodigital.com/api/v1";
    this.isDemoMode = !config.apiKey || config.apiKey === "" || config.apiKey.startsWith("demo");
    
    if (this.isDemoMode) {
      console.log("[Leap CRM] Running in DEMO mode - API calls will use mock data");
    } else {
      console.log("[Leap CRM] Adapter initialized for company:", config.companyId);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (this.isDemoMode) {
      return this.handleDemoRequest<T>(endpoint, options);
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        "Authorization": `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        "X-Company-Id": this.config.companyId,
        "Accept": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Leap API error (${response.status}): ${error}`);
    }

    return response.json();
  }

  private async handleDemoRequest<T>(endpoint: string, options: RequestInit): Promise<T> {
    // Return mock data for demo mode
    console.log(`[Leap CRM Demo] ${options.method || "GET"} ${endpoint}`);
    
    if (endpoint.startsWith("/customers")) {
      return this.getMockCustomers() as T;
    }
    if (endpoint.startsWith("/jobs")) {
      return this.getMockJobs() as T;
    }
    if (endpoint === "/company") {
      return { id: 1, name: "Guardian Roofing (Demo)" } as T;
    }
    
    return { data: [], meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 } } as T;
  }

  private getMockCustomers(): LeapPaginatedResponse<LeapCustomer> {
    return {
      data: [
        {
          id: 1,
          first_name: "Robert",
          last_name: "Chen",
          email: "robert.chen@email.com",
          phone: "(215) 555-0123",
          address: { street: "742 Maple Drive", city: "Bensalem", state: "PA", zip: "19020" },
          status: "prospect",
          lead_source: "storm_canvass",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 2,
          first_name: "Michael",
          last_name: "Henderson",
          email: "mike.h@email.com",
          phone: "(215) 555-0456",
          address: { street: "156 Oak Lane", city: "Southampton", state: "PA", zip: "18966" },
          status: "prospect",
          lead_source: "referral",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 2 },
    };
  }

  private getMockJobs(): LeapPaginatedResponse<LeapJob> {
    return {
      data: [
        {
          id: 1,
          customer_id: 1,
          name: "Roof Replacement - Chen",
          total: 14500,
          stage: "proposal",
          status: "active",
          expected_close_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
    };
  }

  // Transform Leap customer to our format
  private transformLeapCustomer(leap: LeapCustomer): CrmCustomer {
    return {
      id: String(leap.id),
      firstName: leap.first_name,
      lastName: leap.last_name,
      email: leap.email || undefined,
      phone: leap.phone || undefined,
      address: leap.address.street,
      city: leap.address.city,
      state: leap.address.state,
      zipCode: leap.address.zip,
      status: this.mapLeapStatus(leap.status),
      stage: "new",
      leadSource: leap.lead_source || undefined,
      createdAt: new Date(leap.created_at),
      updatedAt: new Date(leap.updated_at),
      customFields: leap.custom_fields,
    };
  }

  // Transform our customer to Leap format
  private transformToLeapCustomer(customer: Omit<CrmCustomer, "id" | "createdAt" | "updatedAt">): Partial<LeapCustomer> {
    return {
      first_name: customer.firstName,
      last_name: customer.lastName,
      email: customer.email || null,
      phone: customer.phone || null,
      address: {
        street: customer.address,
        city: customer.city,
        state: customer.state,
        zip: customer.zipCode,
      },
      status: customer.status,
      lead_source: customer.leadSource || null,
    };
  }

  // Map Leap status to our status
  private mapLeapStatus(leapStatus: string): string {
    const statusMap: Record<string, string> = {
      "new": "lead",
      "contacted": "prospect",
      "qualified": "prospect",
      "proposal": "prospect",
      "negotiation": "prospect",
      "won": "closed-won",
      "lost": "closed-lost",
      "customer": "customer",
    };
    return statusMap[leapStatus.toLowerCase()] || "lead";
  }

  // Transform Leap job to our deal format
  private transformLeapJob(job: LeapJob): CrmDeal {
    return {
      id: String(job.id),
      customerId: String(job.customer_id),
      title: job.name,
      value: job.total,
      stage: job.stage,
      status: job.status,
      closeDate: job.expected_close_date ? new Date(job.expected_close_date) : undefined,
      createdAt: new Date(job.created_at),
      updatedAt: new Date(job.updated_at),
    };
  }

  // ============================================================
  // ICrmAdapter Implementation
  // ============================================================

  async testConnection(): Promise<boolean> {
    try {
      await this.request("/company");
      console.log("[Leap CRM] Connection test successful");
      return true;
    } catch (error) {
      console.error("[Leap CRM] Connection test failed:", error);
      return false;
    }
  }

  async getCustomers(options?: { limit?: number; offset?: number; since?: Date }): Promise<CrmCustomer[]> {
    const limit = options?.limit || 100;
    const page = options?.offset ? Math.floor(options.offset / limit) + 1 : 1;
    
    let endpoint = `/customers?per_page=${limit}&page=${page}`;
    if (options?.since) {
      endpoint += `&updated_after=${options.since.toISOString()}`;
    }

    const response = await this.request<LeapPaginatedResponse<LeapCustomer>>(endpoint);
    return response.data.map((c) => this.transformLeapCustomer(c));
  }

  async getCustomerById(id: string): Promise<CrmCustomer | null> {
    try {
      const response = await this.request<{ data: LeapCustomer }>(`/customers/${id}`);
      return this.transformLeapCustomer(response.data);
    } catch (error) {
      console.error("[Leap CRM] Failed to fetch customer:", error);
      return null;
    }
  }

  async createCustomer(customer: Omit<CrmCustomer, "id" | "createdAt" | "updatedAt">): Promise<CrmCustomer> {
    const leapData = this.transformToLeapCustomer(customer);
    
    const response = await this.request<{ data: LeapCustomer }>("/customers", {
      method: "POST",
      body: JSON.stringify(leapData),
    });
    
    return this.transformLeapCustomer(response.data);
  }

  async updateCustomer(id: string, data: Partial<CrmCustomer>): Promise<CrmCustomer> {
    const updateData: Partial<LeapCustomer> = {};
    
    if (data.firstName) updateData.first_name = data.firstName;
    if (data.lastName) updateData.last_name = data.lastName;
    if (data.email) updateData.email = data.email;
    if (data.phone) updateData.phone = data.phone;
    if (data.status) updateData.status = data.status;

    const response = await this.request<{ data: LeapCustomer }>(`/customers/${id}`, {
      method: "PUT",
      body: JSON.stringify(updateData),
    });
    
    return this.transformLeapCustomer(response.data);
  }

  async getDeals(customerId?: string): Promise<CrmDeal[]> {
    let endpoint = "/jobs?per_page=100";
    if (customerId) {
      endpoint += `&customer_id=${customerId}`;
    }

    const response = await this.request<LeapPaginatedResponse<LeapJob>>(endpoint);
    return response.data.map((j) => this.transformLeapJob(j));
  }

  async createDeal(deal: Omit<CrmDeal, "id" | "createdAt" | "updatedAt">): Promise<CrmDeal> {
    const response = await this.request<{ data: LeapJob }>("/jobs", {
      method: "POST",
      body: JSON.stringify({
        customer_id: parseInt(deal.customerId),
        name: deal.title,
        total: deal.value,
        stage: deal.stage,
        status: deal.status,
        expected_close_date: deal.closeDate?.toISOString(),
      }),
    });
    
    return this.transformLeapJob(response.data);
  }

  async updateDeal(id: string, data: Partial<CrmDeal>): Promise<CrmDeal> {
    const response = await this.request<{ data: LeapJob }>(`/jobs/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: data.title,
        total: data.value,
        stage: data.stage,
        status: data.status,
        expected_close_date: data.closeDate?.toISOString(),
      }),
    });
    
    return this.transformLeapJob(response.data);
  }

  async getInteractions(customerId: string): Promise<CrmInteraction[]> {
    const response = await this.request<LeapPaginatedResponse<LeapActivity>>(
      `/customers/${customerId}/activities?per_page=50`
    );
    
    return response.data.map((a) => ({
      id: String(a.id),
      customerId: String(a.customer_id),
      type: a.type,
      direction: a.direction,
      subject: a.subject || undefined,
      content: a.description || undefined,
      outcome: a.outcome || undefined,
      createdAt: new Date(a.created_at),
    }));
  }

  async createInteraction(interaction: Omit<CrmInteraction, "id" | "createdAt">): Promise<CrmInteraction> {
    const response = await this.request<{ data: LeapActivity }>(
      `/customers/${interaction.customerId}/activities`,
      {
        method: "POST",
        body: JSON.stringify({
          type: interaction.type,
          direction: interaction.direction,
          subject: interaction.subject,
          description: interaction.content,
          outcome: interaction.outcome,
        }),
      }
    );
    
    const data = response.data;
    return {
      id: String(data.id),
      customerId: String(data.customer_id),
      type: data.type,
      direction: data.direction,
      subject: data.subject || undefined,
      content: data.description || undefined,
      outcome: data.outcome || undefined,
      createdAt: new Date(data.created_at),
    };
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
          const customers = await this.getCustomers({ limit: 500 });
          
          for (const crmCustomer of customers) {
            try {
              await prisma.customer.upsert({
                where: { crmId: crmCustomer.id },
                create: {
                  crmId: crmCustomer.id,
                  crmSource: "leap",
                  firstName: crmCustomer.firstName,
                  lastName: crmCustomer.lastName,
                  email: crmCustomer.email,
                  phone: crmCustomer.phone,
                  address: crmCustomer.address,
                  city: crmCustomer.city,
                  state: crmCustomer.state,
                  zipCode: crmCustomer.zipCode,
                  status: crmCustomer.status,
                  stage: crmCustomer.stage,
                  leadSource: crmCustomer.leadSource,
                  leadScore: 50, // Default score
                  lastCrmSync: new Date(),
                },
                update: {
                  firstName: crmCustomer.firstName,
                  lastName: crmCustomer.lastName,
                  email: crmCustomer.email,
                  phone: crmCustomer.phone,
                  status: crmCustomer.status,
                  lastCrmSync: new Date(),
                },
              });
              recordsProcessed++;
            } catch (err) {
              recordsFailed++;
              errors.push(`Customer ${crmCustomer.id}: ${err}`);
            }
          }
          break;
          
        case "deals":
          const deals = await this.getDeals();
          
          for (const deal of deals) {
            try {
              // Find local customer by CRM ID
              const customer = await prisma.customer.findFirst({
                where: { crmId: deal.customerId },
              });
              
              if (customer) {
                // Update customer's estimated job value
                await prisma.customer.update({
                  where: { id: customer.id },
                  data: {
                    estimatedJobValue: deal.value,
                    stage: deal.stage,
                  },
                });
                recordsProcessed++;
              } else {
                recordsFailed++;
                errors.push(`Deal ${deal.id}: Customer not found (crmId: ${deal.customerId})`);
              }
            } catch (err) {
              recordsFailed++;
              errors.push(`Deal ${deal.id}: ${err}`);
            }
          }
          break;
          
        case "interactions":
          // Get all customers with CRM IDs
          const customersWithCrm = await prisma.customer.findMany({
            where: { crmId: { not: null } },
            select: { id: true, crmId: true },
          });
          
          for (const customer of customersWithCrm) {
            if (!customer.crmId) continue;
            
            try {
              const interactions = await this.getInteractions(customer.crmId);
              
              for (const interaction of interactions) {
                await prisma.interaction.upsert({
                  where: {
                    customerId_type_createdAt: {
                      customerId: customer.id,
                      type: interaction.type,
                      createdAt: interaction.createdAt,
                    },
                  },
                  create: {
                    customerId: customer.id,
                    type: interaction.type,
                    direction: interaction.direction as "inbound" | "outbound",
                    subject: interaction.subject,
                    content: interaction.content,
                    outcome: interaction.outcome,
                    createdAt: interaction.createdAt,
                  },
                  update: {
                    subject: interaction.subject,
                    content: interaction.content,
                    outcome: interaction.outcome,
                  },
                });
                recordsProcessed++;
              }
            } catch (err) {
              recordsFailed++;
              errors.push(`Customer ${customer.id} interactions: ${err}`);
            }
          }
          break;
      }
      
      console.log(`[Leap CRM] Sync completed in ${Date.now() - startTime}ms - ${recordsProcessed} processed, ${recordsFailed} failed`);
      
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
    
    let recordsProcessed = 0;
    let recordsFailed = 0;
    const errors: string[] = [];

    try {
      switch (entityType) {
        case "customers":
          for (const id of ids) {
            const customer = await prisma.customer.findUnique({ where: { id } });
            if (!customer) {
              recordsFailed++;
              errors.push(`Customer ${id} not found`);
              continue;
            }
            
            try {
              if (customer.crmId) {
                // Update existing
                await this.updateCustomer(customer.crmId, {
                  firstName: customer.firstName,
                  lastName: customer.lastName,
                  email: customer.email || undefined,
                  phone: customer.phone || undefined,
                  status: customer.status,
                });
              } else {
                // Create new
                const crmCustomer = await this.createCustomer({
                  firstName: customer.firstName,
                  lastName: customer.lastName,
                  email: customer.email || undefined,
                  phone: customer.phone || undefined,
                  address: customer.address,
                  city: customer.city,
                  state: customer.state,
                  zipCode: customer.zipCode,
                  status: customer.status,
                  stage: customer.stage,
                  leadSource: customer.leadSource || undefined,
                });
                
                // Store CRM ID
                await prisma.customer.update({
                  where: { id },
                  data: {
                    crmId: crmCustomer.id,
                    crmSource: "leap",
                    lastCrmSync: new Date(),
                  },
                });
              }
              recordsProcessed++;
            } catch (err) {
              recordsFailed++;
              errors.push(`Customer ${id}: ${err}`);
            }
          }
          break;
          
        // Deals and interactions sync to CRM can be added similarly
        default:
          errors.push(`Sync to CRM for ${entityType} not yet implemented`);
      }
    } catch (error) {
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

  // ============================================================
  // Leap-specific methods for Guardian workflows
  // ============================================================

  /**
   * Log a weather event to Leap as a customer activity
   */
  async logWeatherEvent(customerId: string, event: {
    type: string;
    severity: string;
    date: Date;
    details: string;
  }): Promise<void> {
    try {
      await this.createInteraction({
        customerId,
        type: "note",
        direction: "outbound",
        subject: `Storm Alert: ${event.type} (${event.severity})`,
        content: `${event.details}\n\nDetected: ${event.date.toLocaleDateString()}`,
        outcome: "storm_detected",
      });
      console.log("[Leap CRM] Logged weather event for customer:", customerId);
    } catch (error) {
      console.error("[Leap CRM] Failed to log weather event:", error);
    }
  }

  /**
   * Create appointment for inspection
   */
  async createInspectionAppointment(customerId: string, options: {
    scheduledDate: Date;
    notes?: string;
    assignedRepId?: string;
  }): Promise<unknown> {
    return this.request(`/customers/${customerId}/appointments`, {
      method: "POST",
      body: JSON.stringify({
        scheduled_at: options.scheduledDate.toISOString(),
        type: "inspection",
        notes: options.notes,
        assigned_user_id: options.assignedRepId,
      }),
    });
  }

  /**
   * Get sync status for a customer
   */
  getSyncStatus(): { isDemoMode: boolean; provider: string } {
    return {
      isDemoMode: this.isDemoMode,
      provider: "leap",
    };
  }
}
