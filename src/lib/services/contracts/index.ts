/**
 * Contract Service
 *
 * Manages digital contracts with e-signature capture.
 * Handles template merging, contract generation, and signing flow.
 *
 * NOTE: This service is stubbed pending Contract and ContractTemplate Prisma models.
 */

// import { prisma } from "@/lib/prisma"; // TODO: Re-enable when Contract model exists

// ============================================================
// Types
// ============================================================

export type ContractStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "signed"
  | "completed"
  | "cancelled"
  | "expired";

export interface ContractData {
  customerId: string;
  templateId?: string;
  claimId?: string;
  title: string;
  description?: string;

  // Financial
  totalAmount: number;
  depositAmount?: number;
  depositPercent?: number;
  balanceDueOn?: string;
  paymentTerms?: string;

  // Scope
  scopeOfWork?: string;
  materials?: string[];
  laborDetails?: string;

  // Timeline
  estimatedStartDate?: Date;
  estimatedEndDate?: Date;
  warrantyTerms?: string;

  // Settings
  expirationDays?: number;
}

export interface SignatureData {
  signature: string; // Base64 image
  initials?: string; // Base64 image
  signedAt: Date;
  ip?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}

export interface AuditEvent {
  timestamp: Date;
  action: string;
  actor: string;
  ip?: string;
  details?: string;
}

// ============================================================
// Default Templates
// ============================================================

export const DEFAULT_CONTRACT_TEMPLATE = `
<div class="contract">
  <header style="text-align: center; margin-bottom: 2rem;">
    <h1 style="font-size: 1.5rem; margin-bottom: 0.5rem;">ROOFING SERVICE AGREEMENT</h1>
    <p style="color: #666;">Contract #{{contractNumber}}</p>
  </header>
  <!-- Template content... -->
</div>
`;

export const DEFAULT_TERMS = `
<div class="terms" style="font-size: 0.85rem; line-height: 1.6;">
  <h3>TERMS AND CONDITIONS</h3>
  <!-- Terms content... -->
</div>
`;

// ============================================================
// Contract Service Class (STUBBED)
// ============================================================

class ContractService {
  /**
   * Create a new contract
   * STUBBED: Returns error pending Contract model
   */
  async createContract(
    _data: ContractData,
    _createdById: string
  ): Promise<{ id: string; contractNumber: string }> {
    // TODO: Implement when Contract model exists
    throw new Error("Contract creation coming soon");
  }

  /**
   * Sign a contract (customer signature)
   * STUBBED: Returns error pending Contract model
   */
  async signContract(
    _contractId: string,
    _signatureData: SignatureData
  ): Promise<void> {
    // TODO: Implement when Contract model exists
    throw new Error("Contract signing coming soon");
  }

  /**
   * Add rep signature
   * STUBBED: Returns error pending Contract model
   */
  async addRepSignature(
    _contractId: string,
    _repId: string,
    _signature: string
  ): Promise<void> {
    // TODO: Implement when Contract model exists
    throw new Error("Rep signature coming soon");
  }

  /**
   * Send contract (mark as sent)
   * STUBBED: Returns error pending Contract model
   */
  async sendContract(
    _contractId: string,
    _via: "email" | "sms" | "in-person",
    _userId: string
  ): Promise<void> {
    // TODO: Implement when Contract model exists
    throw new Error("Contract sending coming soon");
  }

  /**
   * Mark contract as viewed
   * STUBBED: No-op pending Contract model
   */
  async markViewed(_contractId: string): Promise<void> {
    // TODO: Implement when Contract model exists
  }

  /**
   * Cancel contract
   * STUBBED: Returns error pending Contract model
   */
  async cancelContract(
    _contractId: string,
    _userId: string,
    _reason?: string
  ): Promise<void> {
    // TODO: Implement when Contract model exists
    throw new Error("Contract cancellation coming soon");
  }

  /**
   * Get contract statistics
   * STUBBED: Returns empty stats pending Contract model
   */
  async getContractStats(_userId?: string): Promise<{
    total: number;
    draft: number;
    sent: number;
    signed: number;
    completed: number;
    totalValue: number;
    signedValue: number;
    conversionRate: number;
  }> {
    // TODO: Implement when Contract model exists
    return {
      total: 0,
      draft: 0,
      sent: 0,
      signed: 0,
      completed: 0,
      totalValue: 0,
      signedValue: 0,
      conversionRate: 0,
    };
  }
}

// ============================================================
// Export Singleton
// ============================================================

export const contractService = new ContractService();
