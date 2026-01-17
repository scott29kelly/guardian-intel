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

  <section style="margin-bottom: 1.5rem;">
    <h2 style="font-size: 1.1rem; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem;">PARTIES</h2>
    <p><strong>Contractor:</strong> {{companyName}}<br>
    Phone: {{companyPhone}} | Email: {{companyEmail}}</p>
    
    <p><strong>Customer:</strong> {{customerName}}<br>
    Property Address: {{propertyAddress}}<br>
    Phone: {{customerPhone}} | Email: {{customerEmail}}</p>
  </section>

  <section style="margin-bottom: 1.5rem;">
    <h2 style="font-size: 1.1rem; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem;">SCOPE OF WORK</h2>
    <div>{{scopeOfWork}}</div>
  </section>

  <section style="margin-bottom: 1.5rem;">
    <h2 style="font-size: 1.1rem; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem;">MATERIALS</h2>
    <div>{{materials}}</div>
  </section>

  <section style="margin-bottom: 1.5rem;">
    <h2 style="font-size: 1.1rem; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem;">PRICING</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 0.5rem; border: 1px solid #ddd;"><strong>Total Contract Amount:</strong></td>
        <td style="padding: 0.5rem; border: 1px solid #ddd; text-align: right;"><strong>{{totalAmount}}</strong></td>
      </tr>
      <tr>
        <td style="padding: 0.5rem; border: 1px solid #ddd;">Deposit Due at Signing:</td>
        <td style="padding: 0.5rem; border: 1px solid #ddd; text-align: right;">{{depositAmount}}</td>
      </tr>
      <tr>
        <td style="padding: 0.5rem; border: 1px solid #ddd;">Balance Due:</td>
        <td style="padding: 0.5rem; border: 1px solid #ddd; text-align: right;">{{balanceAmount}} ({{balanceDueOn}})</td>
      </tr>
    </table>
    <p style="margin-top: 0.5rem; font-size: 0.9rem;">{{paymentTerms}}</p>
  </section>

  <section style="margin-bottom: 1.5rem;">
    <h2 style="font-size: 1.1rem; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem;">TIMELINE</h2>
    <p><strong>Estimated Start Date:</strong> {{estimatedStartDate}}<br>
    <strong>Estimated Completion:</strong> {{estimatedEndDate}}</p>
  </section>

  <section style="margin-bottom: 1.5rem;">
    <h2 style="font-size: 1.1rem; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem;">WARRANTY</h2>
    <p>{{warrantyTerms}}</p>
  </section>
</div>
`;

export const DEFAULT_TERMS = `
<div class="terms" style="font-size: 0.85rem; line-height: 1.6;">
  <h3>TERMS AND CONDITIONS</h3>
  
  <p><strong>1. AUTHORIZATION:</strong> Customer authorizes Contractor to perform the work described above at the property address listed.</p>
  
  <p><strong>2. PAYMENT:</strong> Customer agrees to pay the contract amount as specified. A deposit is due upon signing, with the balance due upon completion unless otherwise specified.</p>
  
  <p><strong>3. PERMITS:</strong> Contractor will obtain all necessary permits. Permit fees are included in the contract price unless otherwise noted.</p>
  
  <p><strong>4. INSURANCE:</strong> Contractor maintains full liability insurance and workers' compensation coverage. Proof of insurance available upon request.</p>
  
  <p><strong>5. CHANGES:</strong> Any changes to the scope of work must be agreed upon in writing. Additional charges may apply.</p>
  
  <p><strong>6. ACCESS:</strong> Customer agrees to provide reasonable access to the property for work to be performed.</p>
  
  <p><strong>7. CANCELLATION:</strong> Customer may cancel within 3 business days of signing for a full refund of deposit. After 3 days, deposit is non-refundable.</p>
  
  <p><strong>8. WARRANTY:</strong> Contractor warrants workmanship for the period specified. Manufacturer warranties on materials apply separately.</p>
  
  <p><strong>9. INSURANCE CLAIMS:</strong> If this work is covered by insurance, Customer authorizes Contractor to communicate with insurance company on their behalf.</p>
  
  <p><strong>10. GOVERNING LAW:</strong> This agreement is governed by the laws of the state where work is performed.</p>
</div>
`;

// ============================================================
// Contract Service Class
// ============================================================

class ContractService {
  private companyInfo = {
    name: process.env.COMPANY_NAME || "Guardian Roofing",
    phone: process.env.COMPANY_PHONE || "(555) 123-4567",
    email: process.env.COMPANY_EMAIL || "contracts@guardianroofing.com",
    address: process.env.COMPANY_ADDRESS || "",
  };

  /**
   * Generate a unique contract number
   */
  private async generateContractNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    
    // Count contracts this month
    const startOfMonth = new Date(year, new Date().getMonth(), 1);
    const count = await prisma.contract.count({
      where: { createdAt: { gte: startOfMonth } },
    });
    
    const sequence = String(count + 1).padStart(4, "0");
    return `GR-${year}${month}-${sequence}`;
  }

  /**
   * Create a new contract
   */
  async createContract(
    data: ContractData,
    createdById: string
  ): Promise<{ id: string; contractNumber: string }> {
    const contractNumber = await this.generateContractNumber();

    // Get customer details
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    // Get template if specified
    let templateContent = DEFAULT_CONTRACT_TEMPLATE;
    let termsContent = DEFAULT_TERMS;

    if (data.templateId) {
      const template = await prisma.contractTemplate.findUnique({
        where: { id: data.templateId },
      });
      if (template) {
        templateContent = template.content;
        if (template.termsContent) termsContent = template.termsContent;
      }
    }

    // Merge template with data
    const content = this.mergeTemplate(templateContent, {
      contractNumber,
      customer,
      data,
    });

    // Calculate deposit and balance
    const depositAmount = data.depositAmount || (data.totalAmount * (data.depositPercent || 0) / 100);
    const balanceAmount = data.totalAmount - depositAmount;

    // Create contract
    const contract = await prisma.contract.create({
      data: {
        contractNumber,
        customerId: data.customerId,
        templateId: data.templateId,
        claimId: data.claimId,
        createdById,
        title: data.title,
        description: data.description,
        content,
        termsContent,
        totalAmount: data.totalAmount,
        depositAmount,
        depositPercent: data.depositPercent,
        balanceDueOn: data.balanceDueOn || "completion",
        paymentTerms: data.paymentTerms,
        scopeOfWork: data.scopeOfWork,
        materials: data.materials ? JSON.stringify(data.materials) : null,
        laborDetails: data.laborDetails,
        estimatedStartDate: data.estimatedStartDate,
        estimatedEndDate: data.estimatedEndDate,
        warrantyTerms: data.warrantyTerms || "5-year workmanship warranty",
        expiresAt: new Date(Date.now() + (data.expirationDays || 30) * 24 * 60 * 60 * 1000),
        auditLog: JSON.stringify([
          {
            timestamp: new Date(),
            action: "created",
            actor: createdById,
            details: "Contract created",
          },
        ]),
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: createdById,
        type: "create",
        entityType: "contract",
        entityId: contract.id,
        description: `Created contract ${contractNumber} for ${customer.firstName} ${customer.lastName}`,
        metadata: JSON.stringify({
          contractNumber,
          totalAmount: data.totalAmount,
        }),
      },
    });

    return {
      id: contract.id,
      contractNumber,
    };
  }

  /**
   * Merge template with data
   */
  private mergeTemplate(
    template: string,
    context: {
      contractNumber: string;
      customer: any;
      data: ContractData;
    }
  ): string {
    const { contractNumber, customer, data } = context;

    const depositAmount = data.depositAmount || (data.totalAmount * (data.depositPercent || 0) / 100);
    const balanceAmount = data.totalAmount - depositAmount;

    return template
      // Contract info
      .replace(/\{\{contractNumber\}\}/g, contractNumber)
      .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
      
      // Company info
      .replace(/\{\{companyName\}\}/g, this.companyInfo.name)
      .replace(/\{\{companyPhone\}\}/g, this.companyInfo.phone)
      .replace(/\{\{companyEmail\}\}/g, this.companyInfo.email)
      
      // Customer info
      .replace(/\{\{customerName\}\}/g, `${customer.firstName} ${customer.lastName}`)
      .replace(/\{\{customerFirstName\}\}/g, customer.firstName)
      .replace(/\{\{customerLastName\}\}/g, customer.lastName)
      .replace(/\{\{customerPhone\}\}/g, customer.phone || "N/A")
      .replace(/\{\{customerEmail\}\}/g, customer.email || "N/A")
      .replace(/\{\{propertyAddress\}\}/g, `${customer.address}, ${customer.city}, ${customer.state} ${customer.zipCode}`)
      
      // Financial
      .replace(/\{\{totalAmount\}\}/g, this.formatCurrency(data.totalAmount))
      .replace(/\{\{depositAmount\}\}/g, this.formatCurrency(depositAmount))
      .replace(/\{\{depositPercent\}\}/g, `${data.depositPercent || 0}%`)
      .replace(/\{\{balanceAmount\}\}/g, this.formatCurrency(balanceAmount))
      .replace(/\{\{balanceDueOn\}\}/g, data.balanceDueOn || "upon completion")
      .replace(/\{\{paymentTerms\}\}/g, data.paymentTerms || "")
      
      // Scope
      .replace(/\{\{scopeOfWork\}\}/g, data.scopeOfWork || "As discussed")
      .replace(/\{\{materials\}\}/g, data.materials?.join(", ") || "Per specification")
      .replace(/\{\{laborDetails\}\}/g, data.laborDetails || "")
      
      // Timeline
      .replace(/\{\{estimatedStartDate\}\}/g, data.estimatedStartDate?.toLocaleDateString() || "TBD")
      .replace(/\{\{estimatedEndDate\}\}/g, data.estimatedEndDate?.toLocaleDateString() || "TBD")
      
      // Warranty
      .replace(/\{\{warrantyTerms\}\}/g, data.warrantyTerms || "5-year workmanship warranty");
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
      include: { customer: true },
    });

    if (!contract) {
      throw new Error("Contract not found");
    }

    if (contract.status === "signed" || contract.status === "completed") {
      throw new Error("Contract is already signed");
    }

    if (contract.status === "cancelled" || contract.status === "expired") {
      throw new Error("Contract is no longer valid");
    }

    // Update contract with signature
    const auditLog = contract.auditLog ? JSON.parse(contract.auditLog) : [];
    auditLog.push({
      timestamp: new Date(),
      action: "customer_signed",
      actor: `${contract.customer.firstName} ${contract.customer.lastName}`,
      ip: signatureData.ip,
      details: signatureData.address 
        ? `Signed at ${signatureData.address}`
        : "Signed digitally",
    });

    await prisma.contract.update({
      where: { id: contractId },
      data: {
        status: "signed",
        customerSignature: signatureData.signature,
        customerSignedAt: signatureData.signedAt,
        customerSignedIp: signatureData.ip,
        customerInitials: signatureData.initials,
        signedLatitude: signatureData.latitude,
        signedLongitude: signatureData.longitude,
        signedAddress: signatureData.address,
        auditLog: JSON.stringify(auditLog),
      },
    });

    // Update customer status
    await prisma.customer.update({
      where: { id: contract.customerId },
      data: {
        status: "customer",
        stage: "closed",
      },
    });

    // Create intel item
    await prisma.intelItem.create({
      data: {
        customerId: contract.customerId,
        source: "contract",
        sourceId: contract.id,
        category: "sales",
        title: `Contract ${contract.contractNumber} signed`,
        content: `Customer signed ${this.formatCurrency(contract.totalAmount)} roofing contract`,
        priority: "high",
        actionable: true,
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: contract.createdById,
        type: "sign",
        entityType: "contract",
        entityId: contractId,
        description: `Contract ${contract.contractNumber} signed by customer`,
        metadata: JSON.stringify({
          totalAmount: contract.totalAmount,
          signedAt: signatureData.signedAt,
        }),
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

    if (!contract) {
      throw new Error("Contract not found");
    }

    const auditLog = contract.auditLog ? JSON.parse(contract.auditLog) : [];
    auditLog.push({
      timestamp: new Date(),
      action: "rep_signed",
      actor: repId,
      details: "Representative signature added",
    });

    await prisma.contract.update({
      where: { id: contractId },
      data: {
        repSignature: signature,
        repSignedAt: new Date(),
        status: contract.customerSignature ? "completed" : contract.status,
        auditLog: JSON.stringify(auditLog),
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

    if (!contract) {
      throw new Error("Contract not found");
    }

    const auditLog = contract.auditLog ? JSON.parse(contract.auditLog) : [];
    auditLog.push({
      timestamp: new Date(),
      action: "sent",
      actor: userId,
      details: `Contract sent via ${via}`,
    });

    await prisma.contract.update({
      where: { id: contractId },
      data: {
        status: "sent",
        sentAt: new Date(),
        sentVia: via,
        auditLog: JSON.stringify(auditLog),
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

    if (contract.status === "sent") {
      const auditLog = contract.auditLog ? JSON.parse(contract.auditLog) : [];
      auditLog.push({
        timestamp: new Date(),
        action: "viewed",
        actor: "customer",
        details: "Contract viewed by customer",
      });

      await prisma.contract.update({
        where: { id: contractId },
        data: {
          status: "viewed",
          viewedAt: new Date(),
          auditLog: JSON.stringify(auditLog),
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

    if (!contract) {
      throw new Error("Contract not found");
    }

    if (contract.status === "completed") {
      throw new Error("Cannot cancel a completed contract");
    }

    const auditLog = contract.auditLog ? JSON.parse(contract.auditLog) : [];
    auditLog.push({
      timestamp: new Date(),
      action: "cancelled",
      actor: userId,
      details: reason || "Contract cancelled",
    });

    await prisma.contract.update({
      where: { id: contractId },
      data: {
        status: "cancelled",
        auditLog: JSON.stringify(auditLog),
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

    const [counts, values] = await Promise.all([
      prisma.contract.groupBy({
        by: ["status"],
        where,
        _count: true,
      }),
      prisma.contract.aggregate({
        where,
        _sum: { totalAmount: true },
      }),
    ]);

    const signedContracts = await prisma.contract.aggregate({
      where: { ...where, status: { in: ["signed", "completed"] } },
      _sum: { totalAmount: true },
    });

    const statusCounts: Record<string, number> = {};
    counts.forEach((c) => {
      statusCounts[c.status] = c._count;
    });

    const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const signed = (statusCounts.signed || 0) + (statusCounts.completed || 0);
    const sent = total - (statusCounts.draft || 0);

    return {
      total,
      draft: statusCounts.draft || 0,
      sent: statusCounts.sent || 0,
      signed: statusCounts.signed || 0,
      completed: statusCounts.completed || 0,
      totalValue: values._sum.totalAmount || 0,
      signedValue: signedContracts._sum.totalAmount || 0,
      conversionRate: sent > 0 ? (signed / sent) * 100 : 0,
    };
  }

  /**
   * Format currency
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
}

// ============================================================
// Export Singleton
// ============================================================

export const contractService = new ContractService();
