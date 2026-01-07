// CRM Integration Types
// This is the abstraction layer that allows swapping between different CRM providers

export interface CrmCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  status: string;
  stage: string;
  leadSource?: string;
  assignedRepEmail?: string;
  propertyType?: string;
  createdAt: Date;
  updatedAt: Date;
  customFields?: Record<string, unknown>;
}

export interface CrmDeal {
  id: string;
  customerId: string;
  title: string;
  value: number;
  stage: string;
  status: string;
  closeDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrmInteraction {
  id: string;
  customerId: string;
  type: string;
  direction: string;
  subject?: string;
  content?: string;
  outcome?: string;
  createdAt: Date;
}

export interface CrmSyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsFailed: number;
  errors?: string[];
  lastSyncedAt: Date;
}

export interface CrmConfig {
  provider: "hubspot" | "salesforce" | "jobnimbus" | "placeholder";
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  instanceUrl?: string;
  webhookSecret?: string;
}

// Base CRM Adapter interface - all providers must implement this
export interface ICrmAdapter {
  // Connection
  testConnection(): Promise<boolean>;
  
  // Customers/Contacts
  getCustomers(options?: { limit?: number; offset?: number; since?: Date }): Promise<CrmCustomer[]>;
  getCustomerById(id: string): Promise<CrmCustomer | null>;
  createCustomer(customer: Omit<CrmCustomer, "id" | "createdAt" | "updatedAt">): Promise<CrmCustomer>;
  updateCustomer(id: string, data: Partial<CrmCustomer>): Promise<CrmCustomer>;
  
  // Deals/Opportunities
  getDeals(customerId?: string): Promise<CrmDeal[]>;
  createDeal(deal: Omit<CrmDeal, "id" | "createdAt" | "updatedAt">): Promise<CrmDeal>;
  updateDeal(id: string, data: Partial<CrmDeal>): Promise<CrmDeal>;
  
  // Interactions/Activities
  getInteractions(customerId: string): Promise<CrmInteraction[]>;
  createInteraction(interaction: Omit<CrmInteraction, "id" | "createdAt">): Promise<CrmInteraction>;
  
  // Sync
  syncFromCrm(entityType: "customers" | "deals" | "interactions"): Promise<CrmSyncResult>;
  syncToCrm(entityType: "customers" | "deals" | "interactions", ids: string[]): Promise<CrmSyncResult>;
}
