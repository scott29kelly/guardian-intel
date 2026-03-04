/**
 * Contract Service
 *
 * Manages digital contracts with e-signature capture.
 * Handles template merging, contract generation, and signing flow.
 */

import { prisma } from "@/lib/prisma";

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

interface SignatureData {
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

// ============================================================
// Helpers
// ============================================================

function generateContractNumber(): string {
  const prefix = "GR";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function addAuditEvent(
  existingTrail: string | null,
  event: AuditEvent
): string {
  const trail: AuditEvent[] = existingTrail
    ? JSON.parse(existingTrail)
    : [];
  trail.push(event);
  return JSON.stringify(trail);
}

// ============================================================
// Contract Service Class
// ============================================================

class ContractService {
  /**
   * Create a new contract
   */
  async createContract(
    data: ContractData,
    createdById: string
  ): Promise<{ id: string; contractNumber: string }> {
    const contractNumber = generateContractNumber();

    const expirationDate = data.expirationDays
      ? new Date(Date.now() + data.expirationDays * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // default 30 days

    const auditTrail = JSON.stringify([
      {
        timestamp: new Date(),
        action: "created",
        actor: createdById,
        details: "Contract created",
      },
    ]);

    const contract = await prisma.contract.create({
      data: {
        customerId: data.customerId,
        templateId: data.templateId || null,
        claimId: data.claimId || null,
        createdById,
        contractNumber,
        title: data.title,
        description: data.description || null,
        status: "draft",
        totalAmount: data.totalAmount,
        depositAmount: data.depositAmount || null,
        depositPercent: data.depositPercent || null,
        balanceDueOn: data.balanceDueOn || null,
        paymentTerms: data.paymentTerms || null,
        scopeOfWork: data.scopeOfWork || null,
        materials: data.materials ? JSON.stringify(data.materials) : null,
        laborDetails: data.laborDetails || null,
        estimatedStartDate: data.estimatedStartDate || null,
        estimatedEndDate: data.estimatedEndDate || null,
        warrantyTerms: data.warrantyTerms || null,
        expirationDate,
        auditTrail,
      },
    });

    return { id: contract.id, contractNumber: contract.contractNumber };
  }

  /**
   * Sign a contract (customer signature)
   */
  async signContract(
    contractId: string,
    signatureData: SignatureData
  ): Promise<void> {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) throw new Error("Contract not found");
    if (contract.status === "cancelled")
      throw new Error("Contract has been cancelled");
    if (contract.customerSignature)
      throw new Error("Contract already signed by customer");

    const auditTrail = addAuditEvent(contract.auditTrail, {
      timestamp: signatureData.signedAt,
      action: "customer_signed",
      actor: "customer",
      ip: signatureData.ip,
      details: "Customer signed the contract",
    });

    // If both customer and rep have signed, mark as completed
    const newStatus = contract.repSignature ? "completed" : "signed";

    await prisma.contract.update({
      where: { id: contractId },
      data: {
        customerSignature: signatureData.signature,
        customerSignedAt: signatureData.signedAt,
        customerSignatureIp: signatureData.ip || null,
        status: newStatus,
        auditTrail,
      },
    });
  }

  /**
   * Add rep signature
   */
  async addRepSignature(
    contractId: string,
    repId: string,
    signature: string
  ): Promise<void> {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) throw new Error("Contract not found");
    if (contract.repSignature)
      throw new Error("Rep has already signed this contract");

    const auditTrail = addAuditEvent(contract.auditTrail, {
      timestamp: new Date(),
      action: "rep_signed",
      actor: repId,
      details: "Sales representative signed the contract",
    });

    // If both customer and rep have signed, mark as completed
    const newStatus = contract.customerSignature ? "completed" : contract.status;

    await prisma.contract.update({
      where: { id: contractId },
      data: {
        repSignature: signature,
        repSignedAt: new Date(),
        status: newStatus,
        auditTrail,
      },
    });
  }

  /**
   * Send contract (mark as sent)
   */
  async sendContract(
    contractId: string,
    via: "email" | "sms" | "in-person",
    userId: string
  ): Promise<void> {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) throw new Error("Contract not found");

    const auditTrail = addAuditEvent(contract.auditTrail, {
      timestamp: new Date(),
      action: "sent",
      actor: userId,
      details: `Contract sent via ${via}`,
    });

    await prisma.contract.update({
      where: { id: contractId },
      data: {
        status: "sent",
        sentVia: via,
        sentAt: new Date(),
        auditTrail,
      },
    });
  }

  /**
   * Mark contract as viewed
   */
  async markViewed(contractId: string): Promise<void> {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) return;

    // Only update viewedAt if not already set
    if (!contract.viewedAt) {
      const auditTrail = addAuditEvent(contract.auditTrail, {
        timestamp: new Date(),
        action: "viewed",
        actor: "customer",
        details: "Contract viewed by customer",
      });

      await prisma.contract.update({
        where: { id: contractId },
        data: {
          status: contract.status === "sent" ? "viewed" : contract.status,
          viewedAt: new Date(),
          auditTrail,
        },
      });
    }
  }

  /**
   * Cancel contract
   */
  async cancelContract(
    contractId: string,
    userId: string,
    reason?: string
  ): Promise<void> {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) throw new Error("Contract not found");
    if (contract.status === "completed")
      throw new Error("Cannot cancel a completed contract");

    const auditTrail = addAuditEvent(contract.auditTrail, {
      timestamp: new Date(),
      action: "cancelled",
      actor: userId,
      details: reason || "Contract cancelled",
    });

    await prisma.contract.update({
      where: { id: contractId },
      data: {
        status: "cancelled",
        auditTrail,
      },
    });
  }

  /**
   * Get contract statistics
   */
  async getContractStats(userId?: string): Promise<{
    total: number;
    draft: number;
    sent: number;
    signed: number;
    completed: number;
    totalValue: number;
    signedValue: number;
    conversionRate: number;
  }> {
    const where = userId ? { createdById: userId } : {};

    const [total, draft, sent, signed, completed, valueAgg, signedAgg] =
      await Promise.all([
        prisma.contract.count({ where }),
        prisma.contract.count({ where: { ...where, status: "draft" } }),
        prisma.contract.count({ where: { ...where, status: "sent" } }),
        prisma.contract.count({ where: { ...where, status: "signed" } }),
        prisma.contract.count({ where: { ...where, status: "completed" } }),
        prisma.contract.aggregate({ where, _sum: { totalAmount: true } }),
        prisma.contract.aggregate({
          where: {
            ...where,
            status: { in: ["signed", "completed"] },
          },
          _sum: { totalAmount: true },
        }),
      ]);

    const totalSentOrBetter = sent + signed + completed;
    const conversionRate =
      totalSentOrBetter > 0
        ? Math.round(((signed + completed) / totalSentOrBetter) * 100)
        : 0;

    return {
      total,
      draft,
      sent,
      signed,
      completed,
      totalValue: valueAgg._sum.totalAmount || 0,
      signedValue: signedAgg._sum.totalAmount || 0,
      conversionRate,
    };
  }
}

// ============================================================
// Export Singleton
// ============================================================

export const contractService = new ContractService();
