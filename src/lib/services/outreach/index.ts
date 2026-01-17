/**
 * Outreach Service
 * 
 * Manages automated SMS/Email campaigns triggered by storm events.
 * Handles template personalization, customer targeting, and delivery tracking.
 */

import { prisma } from "@/lib/prisma";
import { twilioProvider } from "./providers/twilio";
import { sendGridProvider } from "./providers/sendgrid";
import type {
  CampaignTarget,
  StormTriggerData,
  PersonalizationContext,
  ExecutionResult,
  CampaignStatus,
  StormType,
} from "./types";

// Re-export types
export * from "./types";

// ============================================================
// Outreach Service Class
// ============================================================

class OutreachService {
  private smsProvider = twilioProvider;
  private emailProvider = sendGridProvider;

  // Company defaults (can be overridden via env)
  private companyInfo = {
    name: process.env.COMPANY_NAME || "Guardian Roofing",
    phone: process.env.COMPANY_PHONE || "(555) 123-4567",
    website: process.env.COMPANY_WEBSITE || "guardianroofing.com",
  };

  // ============================================================
  // Campaign Execution
  // ============================================================

  /**
   * Execute a campaign for a storm event
   */
  async executeStormCampaign(
    campaignId: string,
    stormData: StormTriggerData
  ): Promise<ExecutionResult> {
    const campaign = await prisma.outreachCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign || !campaign.isActive) {
      throw new Error("Campaign not found or inactive");
    }

    // Create execution record
    const execution = await prisma.campaignExecution.create({
      data: {
        campaignId,
        triggerType: "storm",
        triggerId: stormData.stormId,
        triggerData: JSON.stringify(stormData),
        targetZipCodes: JSON.stringify(stormData.affectedZipCodes),
        status: "processing",
        startedAt: new Date(),
      },
    });

    try {
      // Find affected customers
      const customers = await this.findAffectedCustomers(
        stormData.affectedZipCodes,
        campaign.excludeRecent
      );

      await prisma.campaignExecution.update({
        where: { id: execution.id },
        data: { affectedCustomers: customers.length },
      });

      if (customers.length === 0) {
        return this.completeExecution(execution.id, "completed", {
          message: "No customers in affected area",
        });
      }

      // Get rep info for personalization
      const rep = await this.getRepInfo(campaign.createdById);

      // Send messages
      const results = {
        smsSent: 0,
        smsDelivered: 0,
        smsFailed: 0,
        emailSent: 0,
        emailDelivered: 0,
        emailFailed: 0,
        errors: [] as string[],
      };

      for (const customer of customers) {
        const context: PersonalizationContext = {
          customer,
          storm: stormData,
          company: this.companyInfo,
          rep,
        };

        // Send SMS if enabled
        if (campaign.enableSms && campaign.smsTemplate && customer.phone) {
          const smsResult = await this.sendSmsToCustomer(
            execution.id,
            customer,
            campaign.smsTemplate,
            context
          );
          if (smsResult.success) {
            results.smsSent++;
            results.smsDelivered++;
          } else {
            results.smsFailed++;
            if (smsResult.error) results.errors.push(smsResult.error);
          }
        }

        // Send Email if enabled
        if (campaign.enableEmail && campaign.emailTemplate && customer.email) {
          const emailResult = await this.sendEmailToCustomer(
            execution.id,
            customer,
            campaign.emailSubject || "Important Notice",
            campaign.emailTemplate,
            context
          );
          if (emailResult.success) {
            results.emailSent++;
            results.emailDelivered++;
          } else {
            results.emailFailed++;
            if (emailResult.error) results.errors.push(emailResult.error);
          }
        }

        // Small delay between sends to avoid rate limiting
        await this.delay(100);
      }

      // Complete execution
      return this.completeExecution(execution.id, "completed", results);
    } catch (error) {
      console.error("[Outreach] Execution failed:", error);
      return this.completeExecution(execution.id, "failed", {
        errors: [error instanceof Error ? error.message : "Unknown error"],
      });
    }
  }

  /**
   * Execute a manual campaign
   */
  async executeManualCampaign(
    campaignId: string,
    targetCustomerIds?: string[]
  ): Promise<ExecutionResult> {
    const campaign = await prisma.outreachCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    // Create execution record
    const execution = await prisma.campaignExecution.create({
      data: {
        campaignId,
        triggerType: "manual",
        status: "processing",
        startedAt: new Date(),
      },
    });

    try {
      // Get target customers
      let customers: CampaignTarget[];
      
      if (targetCustomerIds && targetCustomerIds.length > 0) {
        customers = await this.getCustomersByIds(targetCustomerIds);
      } else {
        // Use campaign targeting rules
        const targetZips = campaign.targetZipCodes 
          ? JSON.parse(campaign.targetZipCodes) 
          : [];
        customers = await this.findAffectedCustomers(targetZips, campaign.excludeRecent);
      }

      await prisma.campaignExecution.update({
        where: { id: execution.id },
        data: { affectedCustomers: customers.length },
      });

      if (customers.length === 0) {
        return this.completeExecution(execution.id, "completed", {
          message: "No customers match targeting criteria",
        });
      }

      const rep = await this.getRepInfo(campaign.createdById);
      const results = {
        smsSent: 0,
        smsDelivered: 0,
        smsFailed: 0,
        emailSent: 0,
        emailDelivered: 0,
        emailFailed: 0,
        errors: [] as string[],
      };

      for (const customer of customers) {
        const context: PersonalizationContext = {
          customer,
          company: this.companyInfo,
          rep,
        };

        if (campaign.enableSms && campaign.smsTemplate && customer.phone) {
          const smsResult = await this.sendSmsToCustomer(
            execution.id,
            customer,
            campaign.smsTemplate,
            context
          );
          if (smsResult.success) {
            results.smsSent++;
            results.smsDelivered++;
          } else {
            results.smsFailed++;
          }
        }

        if (campaign.enableEmail && campaign.emailTemplate && customer.email) {
          const emailResult = await this.sendEmailToCustomer(
            execution.id,
            customer,
            campaign.emailSubject || "Important Notice",
            campaign.emailTemplate,
            context
          );
          if (emailResult.success) {
            results.emailSent++;
            results.emailDelivered++;
          } else {
            results.emailFailed++;
          }
        }

        await this.delay(100);
      }

      return this.completeExecution(execution.id, "completed", results);
    } catch (error) {
      console.error("[Outreach] Manual execution failed:", error);
      return this.completeExecution(execution.id, "failed", {
        errors: [error instanceof Error ? error.message : "Unknown error"],
      });
    }
  }

  // ============================================================
  // Storm Detection Integration
  // ============================================================

  /**
   * Check for active campaigns that should trigger for a storm
   */
  async getTriggeredCampaigns(stormData: StormTriggerData): Promise<string[]> {
    const campaigns = await prisma.outreachCampaign.findMany({
      where: {
        isActive: true,
        isArchived: false,
        triggerType: "storm",
      },
    });

    const triggered: string[] = [];

    for (const campaign of campaigns) {
      // Check storm type match
      if (campaign.stormTypes) {
        const types = JSON.parse(campaign.stormTypes) as StormType[];
        if (!types.includes(stormData.stormType) && !types.includes("general")) {
          continue;
        }
      }

      // Check severity threshold
      if (campaign.minSeverity) {
        const severityOrder = ["minor", "moderate", "severe", "critical"];
        const minIndex = severityOrder.indexOf(campaign.minSeverity);
        const stormIndex = severityOrder.indexOf(stormData.severity);
        if (stormIndex < minIndex) {
          continue;
        }
      }

      // Check ZIP code overlap
      if (campaign.targetZipCodes) {
        const targetZips = JSON.parse(campaign.targetZipCodes) as string[];
        if (targetZips.length > 0) {
          const hasOverlap = stormData.affectedZipCodes.some((zip) =>
            targetZips.includes(zip)
          );
          if (!hasOverlap) continue;
        }
      }

      triggered.push(campaign.id);
    }

    return triggered;
  }

  /**
   * Auto-trigger campaigns based on storm event
   * Called by weather service when storm is detected
   */
  async triggerStormOutreach(stormData: StormTriggerData): Promise<{
    triggered: number;
    executions: string[];
  }> {
    const campaignIds = await this.getTriggeredCampaigns(stormData);
    const executions: string[] = [];

    for (const campaignId of campaignIds) {
      try {
        const result = await this.executeStormCampaign(campaignId, stormData);
        executions.push(result.executionId);
      } catch (error) {
        console.error(`[Outreach] Failed to execute campaign ${campaignId}:`, error);
      }
    }

    return {
      triggered: campaignIds.length,
      executions,
    };
  }

  // ============================================================
  // Customer Targeting
  // ============================================================

  /**
   * Find customers in affected ZIP codes
   */
  async findAffectedCustomers(
    zipCodes: string[],
    excludeRecentDays: number
  ): Promise<CampaignTarget[]> {
    const recentCutoff = new Date();
    recentCutoff.setDate(recentCutoff.getDate() - excludeRecentDays);

    // Get customers who received outreach recently
    const recentlyContacted = await prisma.outreachMessage.findMany({
      where: {
        createdAt: { gte: recentCutoff },
        status: { in: ["sent", "delivered", "opened"] },
      },
      select: { customerId: true },
      distinct: ["customerId"],
    });

    const excludeIds = recentlyContacted.map((r) => r.customerId);

    // Find matching customers
    const whereClause: any = {
      id: { notIn: excludeIds },
      OR: [
        { phone: { not: null } },
        { email: { not: null } },
      ],
    };

    if (zipCodes.length > 0) {
      whereClause.zipCode = { in: zipCodes };
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
      },
      take: 1000, // Safety limit
    });

    return customers.map((c) => ({
      customerId: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      address: c.address,
      city: c.city,
      state: c.state,
      zipCode: c.zipCode,
    }));
  }

  /**
   * Get customers by IDs
   */
  async getCustomersByIds(ids: string[]): Promise<CampaignTarget[]> {
    const customers = await prisma.customer.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
      },
    });

    return customers.map((c) => ({
      customerId: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      address: c.address,
      city: c.city,
      state: c.state,
      zipCode: c.zipCode,
    }));
  }

  // ============================================================
  // Message Sending
  // ============================================================

  private async sendSmsToCustomer(
    executionId: string,
    customer: CampaignTarget,
    template: string,
    context: PersonalizationContext
  ): Promise<{ success: boolean; error?: string }> {
    const body = this.personalizeTemplate(template, context);

    // Create message record
    const message = await prisma.outreachMessage.create({
      data: {
        executionId,
        customerId: customer.customerId,
        channel: "sms",
        recipient: customer.phone!,
        body,
        status: "pending",
      },
    });

    // Send via provider
    const result = await this.smsProvider.sendSms({
      to: customer.phone!,
      body,
    });

    // Update message record
    await prisma.outreachMessage.update({
      where: { id: message.id },
      data: {
        status: result.success ? "sent" : "failed",
        sentAt: result.success ? new Date() : null,
        externalId: result.messageId,
        errorCode: result.errorCode,
        errorMessage: result.error,
      },
    });

    return result;
  }

  private async sendEmailToCustomer(
    executionId: string,
    customer: CampaignTarget,
    subject: string,
    template: string,
    context: PersonalizationContext
  ): Promise<{ success: boolean; error?: string }> {
    const personalizedSubject = this.personalizeTemplate(subject, context);
    const body = this.personalizeTemplate(template, context);
    const html = this.convertToHtml(body);

    // Create message record
    const message = await prisma.outreachMessage.create({
      data: {
        executionId,
        customerId: customer.customerId,
        channel: "email",
        recipient: customer.email!,
        subject: personalizedSubject,
        body,
        status: "pending",
      },
    });

    // Send via provider
    const result = await this.emailProvider.sendEmail({
      to: customer.email!,
      subject: personalizedSubject,
      body,
      html,
    });

    // Update message record
    await prisma.outreachMessage.update({
      where: { id: message.id },
      data: {
        status: result.success ? "sent" : "failed",
        sentAt: result.success ? new Date() : null,
        externalId: result.messageId,
        errorCode: result.errorCode,
        errorMessage: result.error,
      },
    });

    return result;
  }

  // ============================================================
  // Template Personalization
  // ============================================================

  /**
   * Replace template variables with actual values
   */
  personalizeTemplate(template: string, context: PersonalizationContext): string {
    let result = template;

    // Customer variables
    if (context.customer) {
      result = result
        .replace(/\{\{firstName\}\}/g, context.customer.firstName)
        .replace(/\{\{lastName\}\}/g, context.customer.lastName)
        .replace(/\{\{fullName\}\}/g, `${context.customer.firstName} ${context.customer.lastName}`)
        .replace(/\{\{address\}\}/g, context.customer.address)
        .replace(/\{\{city\}\}/g, context.customer.city)
        .replace(/\{\{state\}\}/g, context.customer.state)
        .replace(/\{\{zipCode\}\}/g, context.customer.zipCode);
    }

    // Storm variables
    if (context.storm) {
      const stormDate = new Date(context.storm.stormDate);
      const formattedDate = stormDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      });

      result = result
        .replace(/\{\{stormType\}\}/g, context.storm.stormType)
        .replace(/\{\{stormDate\}\}/g, formattedDate)
        .replace(/\{\{severity\}\}/g, context.storm.severity);
    }

    // Company variables
    if (context.company) {
      result = result
        .replace(/\{\{companyName\}\}/g, context.company.name)
        .replace(/\{\{companyPhone\}\}/g, context.company.phone)
        .replace(/\{\{companyWebsite\}\}/g, context.company.website);
    }

    // Rep variables
    if (context.rep) {
      result = result
        .replace(/\{\{repName\}\}/g, context.rep.name)
        .replace(/\{\{repPhone\}\}/g, context.rep.phone)
        .replace(/\{\{repEmail\}\}/g, context.rep.email);
    }

    return result;
  }

  /**
   * Preview a template with sample data
   */
  previewTemplate(template: string, channel: "sms" | "email"): string {
    const sampleContext: PersonalizationContext = {
      customer: {
        customerId: "sample",
        firstName: "John",
        lastName: "Smith",
        email: "john@example.com",
        phone: "(555) 123-4567",
        address: "123 Main Street",
        city: "Dallas",
        state: "TX",
        zipCode: "75001",
      },
      storm: {
        stormId: "sample-storm",
        stormType: "hail",
        severity: "moderate",
        affectedZipCodes: ["75001"],
        stormDate: new Date(),
        description: "1.5 inch hail reported",
      },
      company: this.companyInfo,
      rep: {
        name: "Mike Johnson",
        phone: "(555) 987-6543",
        email: "mike@company.com",
      },
    };

    return this.personalizeTemplate(template, sampleContext);
  }

  // ============================================================
  // Helpers
  // ============================================================

  private async completeExecution(
    executionId: string,
    status: CampaignStatus,
    data: {
      smsSent?: number;
      smsDelivered?: number;
      smsFailed?: number;
      emailSent?: number;
      emailDelivered?: number;
      emailFailed?: number;
      errors?: string[];
      message?: string;
    }
  ): Promise<ExecutionResult> {
    const execution = await prisma.campaignExecution.update({
      where: { id: executionId },
      data: {
        status,
        completedAt: new Date(),
        smsSent: data.smsSent || 0,
        smsDelivered: data.smsDelivered || 0,
        smsFailed: data.smsFailed || 0,
        emailSent: data.emailSent || 0,
        emailDelivered: data.emailDelivered || 0,
        emailFailed: data.emailFailed || 0,
        errorMessage: data.errors?.join("; ") || data.message,
      },
    });

    // Update campaign stats
    await prisma.outreachCampaign.update({
      where: { id: execution.campaignId },
      data: {
        totalSent: { increment: (data.smsSent || 0) + (data.emailSent || 0) },
        totalDelivered: { increment: (data.smsDelivered || 0) + (data.emailDelivered || 0) },
      },
    });

    return {
      executionId,
      status,
      targetedCustomers: execution.affectedCustomers,
      smsSent: data.smsSent || 0,
      smsDelivered: data.smsDelivered || 0,
      smsFailed: data.smsFailed || 0,
      emailSent: data.emailSent || 0,
      emailDelivered: data.emailDelivered || 0,
      emailFailed: data.emailFailed || 0,
      errors: data.errors || [],
    };
  }

  private async getRepInfo(userId: string): Promise<{ name: string; phone: string; email: string }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, phone: true, email: true },
    });

    return {
      name: user?.name || "Team Member",
      phone: user?.phone || this.companyInfo.phone,
      email: user?.email || "",
    };
  }

  private convertToHtml(plainText: string): string {
    // Convert plain text to simple HTML
    return plainText
      .split("\n\n")
      .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
      .join("")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/📞/g, "📞")
      .replace(/🌐/g, "🌐");
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================================
  // Analytics
  // ============================================================

  /**
   * Get campaign statistics
   */
  async getCampaignStats(campaignId: string): Promise<{
    totalExecutions: number;
    totalSent: number;
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  }> {
    const campaign = await prisma.outreachCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new Error("Campaign not found");
    }

    const executions = await prisma.campaignExecution.count({
      where: { campaignId },
    });

    const messages = await prisma.outreachMessage.groupBy({
      by: ["status"],
      where: {
        execution: { campaignId },
      },
      _count: true,
    });

    const statusCounts: Record<string, number> = {};
    messages.forEach((m) => {
      statusCounts[m.status] = m._count;
    });

    const totalSent = campaign.totalSent;
    const totalDelivered = campaign.totalDelivered;
    const totalOpened = statusCounts["opened"] || 0;
    const totalClicked = statusCounts["clicked"] || 0;

    return {
      totalExecutions: executions,
      totalSent,
      totalDelivered,
      totalOpened,
      totalClicked,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
      clickRate: totalOpened > 0 ? (totalClicked / totalOpened) * 100 : 0,
    };
  }
}

// ============================================================
// Export Singleton
// ============================================================

export const outreachService = new OutreachService();
