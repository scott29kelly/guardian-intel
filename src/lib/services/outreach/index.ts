/**
 * Outreach Service
 *
 * Manages automated SMS/Email campaigns triggered by storm events.
 * Handles template personalization, customer targeting, and delivery tracking.
 */

import { prisma } from "@/lib/prisma";
import type {
  CampaignTarget,
  StormTriggerData,
  PersonalizationContext,
  ExecutionResult,
} from "./types";

// Re-export types
export * from "./types";

// ============================================================
// Outreach Service Class
// ============================================================

class OutreachService {
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
      return {
        executionId: "",
        status: "failed",
        targetedCustomers: 0,
        smsSent: 0,
        smsDelivered: 0,
        smsFailed: 0,
        emailSent: 0,
        emailDelivered: 0,
        emailFailed: 0,
        errors: ["Campaign not found or inactive"],
      };
    }

    // Create execution record
    const execution = await prisma.campaignExecution.create({
      data: {
        campaignId,
        triggeredById: campaign.createdById,
        stormEventId: stormData.stormId,
        status: "processing",
      },
    });

    // Find affected customers
    const targets = await this.findAffectedCustomers(
      stormData.affectedZipCodes,
      campaign.excludeRecentDays
    );

    let smsSent = 0;
    let smsFailed = 0;
    let emailSent = 0;
    let emailFailed = 0;
    const errors: string[] = [];

    // Create message records for each target
    for (const target of targets) {
      const context: PersonalizationContext = {
        customer: target,
        storm: stormData,
        company: this.companyInfo,
      };

      // SMS
      if (campaign.enableSms && campaign.smsTemplate && target.phone) {
        const body = this.personalizeTemplate(campaign.smsTemplate, context);
        try {
          await prisma.outreachMessage.create({
            data: {
              executionId: execution.id,
              customerId: target.customerId,
              channel: "sms",
              status: "queued",
              to: target.phone,
              body,
            },
          });
          smsSent++;
        } catch (err) {
          smsFailed++;
          errors.push(`SMS to ${target.customerId}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }

      // Email
      if (campaign.enableEmail && campaign.emailTemplate && target.email) {
        const subject = campaign.emailSubject
          ? this.personalizeTemplate(campaign.emailSubject, context)
          : "Important Information About Your Property";
        const body = this.personalizeTemplate(campaign.emailTemplate, context);
        try {
          await prisma.outreachMessage.create({
            data: {
              executionId: execution.id,
              customerId: target.customerId,
              channel: "email",
              status: "queued",
              to: target.email,
              subject,
              body,
            },
          });
          emailSent++;
        } catch (err) {
          emailFailed++;
          errors.push(`Email to ${target.customerId}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }
    }

    // Update execution with results
    await prisma.campaignExecution.update({
      where: { id: execution.id },
      data: {
        status: "completed",
        targetedCustomers: targets.length,
        smsSent,
        smsFailed,
        emailSent,
        emailFailed,
        errors: errors.length > 0 ? JSON.stringify(errors) : null,
        completedAt: new Date(),
      },
    });

    return {
      executionId: execution.id,
      status: "completed",
      targetedCustomers: targets.length,
      smsSent,
      smsDelivered: 0, // Updated via webhooks
      smsFailed,
      emailSent,
      emailDelivered: 0, // Updated via webhooks
      emailFailed,
      errors,
    };
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

    if (!campaign || !campaign.isActive) {
      return {
        executionId: "",
        status: "failed",
        targetedCustomers: 0,
        smsSent: 0,
        smsDelivered: 0,
        smsFailed: 0,
        emailSent: 0,
        emailDelivered: 0,
        emailFailed: 0,
        errors: ["Campaign not found or inactive"],
      };
    }

    const execution = await prisma.campaignExecution.create({
      data: {
        campaignId,
        triggeredById: campaign.createdById,
        status: "processing",
      },
    });

    // Get target customers
    let targets: CampaignTarget[];
    if (targetCustomerIds && targetCustomerIds.length > 0) {
      const customers = await prisma.customer.findMany({
        where: { id: { in: targetCustomerIds } },
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
      targets = customers.map((c) => ({
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
    } else {
      const zipCodes = campaign.targetZipCodes
        ? JSON.parse(campaign.targetZipCodes)
        : [];
      targets = await this.findAffectedCustomers(zipCodes, campaign.excludeRecentDays);
    }

    let smsSent = 0;
    let smsFailed = 0;
    let emailSent = 0;
    let emailFailed = 0;

    for (const target of targets) {
      const context: PersonalizationContext = {
        customer: target,
        company: this.companyInfo,
      };

      if (campaign.enableSms && campaign.smsTemplate && target.phone) {
        const body = this.personalizeTemplate(campaign.smsTemplate, context);
        await prisma.outreachMessage.create({
          data: {
            executionId: execution.id,
            customerId: target.customerId,
            channel: "sms",
            status: "queued",
            to: target.phone,
            body,
          },
        });
        smsSent++;
      }

      if (campaign.enableEmail && campaign.emailTemplate && target.email) {
        const subject = campaign.emailSubject
          ? this.personalizeTemplate(campaign.emailSubject, context)
          : "Important Information";
        const body = this.personalizeTemplate(campaign.emailTemplate, context);
        await prisma.outreachMessage.create({
          data: {
            executionId: execution.id,
            customerId: target.customerId,
            channel: "email",
            status: "queued",
            to: target.email,
            subject,
            body,
          },
        });
        emailSent++;
      }
    }

    await prisma.campaignExecution.update({
      where: { id: execution.id },
      data: {
        status: "completed",
        targetedCustomers: targets.length,
        smsSent,
        smsFailed,
        emailSent,
        emailFailed,
        completedAt: new Date(),
      },
    });

    return {
      executionId: execution.id,
      status: "completed",
      targetedCustomers: targets.length,
      smsSent,
      smsDelivered: 0,
      smsFailed,
      emailSent,
      emailDelivered: 0,
      emailFailed,
      errors: [],
    };
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
        triggerType: "storm",
      },
    });

    return campaigns
      .filter((c) => {
        // Check storm type match
        if (c.stormTypes) {
          const types = JSON.parse(c.stormTypes) as string[];
          if (types.length > 0 && !types.includes(stormData.stormType)) return false;
        }

        // Check severity threshold
        if (c.minSeverity) {
          const severityOrder = ["minor", "moderate", "severe", "catastrophic"];
          const minIdx = severityOrder.indexOf(c.minSeverity);
          const stormIdx = severityOrder.indexOf(stormData.severity);
          if (stormIdx < minIdx) return false;
        }

        // Check ZIP code overlap
        if (c.targetZipCodes) {
          const targetZips = JSON.parse(c.targetZipCodes) as string[];
          if (targetZips.length > 0) {
            const overlap = targetZips.some((z) => stormData.affectedZipCodes.includes(z));
            if (!overlap) return false;
          }
        }

        return true;
      })
      .map((c) => c.id);
  }

  /**
   * Auto-trigger campaigns based on storm event
   */
  async triggerStormOutreach(stormData: StormTriggerData): Promise<{
    triggered: number;
    executions: string[];
  }> {
    const campaignIds = await this.getTriggeredCampaigns(stormData);
    const executions: string[] = [];

    for (const campaignId of campaignIds) {
      const result = await this.executeStormCampaign(campaignId, stormData);
      if (result.executionId) {
        executions.push(result.executionId);
      }
    }

    return {
      triggered: campaignIds.length,
      executions,
    };
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
        .replace(
          /\{\{fullName\}\}/g,
          `${context.customer.firstName} ${context.customer.lastName}`
        )
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
  previewTemplate(template: string, _channel: "sms" | "email"): string {
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
    const executions = await prisma.campaignExecution.findMany({
      where: { campaignId },
      select: {
        smsSent: true,
        smsDelivered: true,
        emailSent: true,
        emailDelivered: true,
      },
    });

    const totalExecutions = executions.length;
    const totalSent = executions.reduce(
      (sum, e) => sum + e.smsSent + e.emailSent,
      0
    );
    const totalDelivered = executions.reduce(
      (sum, e) => sum + e.smsDelivered + e.emailDelivered,
      0
    );

    // Count opened/clicked from messages
    const messageStats = await prisma.outreachMessage.groupBy({
      by: ["status"],
      where: {
        execution: { campaignId },
      },
      _count: { id: true },
    });

    const totalOpened = messageStats.find((s) => s.status === "opened")?._count.id || 0;
    const totalClicked = messageStats.find((s) => s.status === "clicked")?._count.id || 0;

    return {
      totalExecutions,
      totalSent,
      totalDelivered,
      totalOpened,
      totalClicked,
      deliveryRate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0,
      openRate: totalDelivered > 0 ? Math.round((totalOpened / totalDelivered) * 100) : 0,
      clickRate: totalDelivered > 0 ? Math.round((totalClicked / totalDelivered) * 100) : 0,
    };
  }

  // ============================================================
  // Customer Targeting
  // ============================================================

  /**
   * Find customers in affected ZIP codes, excluding recently contacted
   */
  async findAffectedCustomers(
    zipCodes: string[],
    excludeRecentDays: number
  ): Promise<CampaignTarget[]> {
    const excludeDate = new Date(
      Date.now() - excludeRecentDays * 24 * 60 * 60 * 1000
    );

    // Get customer IDs that were recently messaged
    const recentlyContacted = await prisma.outreachMessage.findMany({
      where: {
        createdAt: { gte: excludeDate },
        status: { not: "failed" },
      },
      select: { customerId: true },
      distinct: ["customerId"],
    });

    const excludeIds = recentlyContacted.map((m) => m.customerId);

    const customers = await prisma.customer.findMany({
      where: {
        zipCode: { in: zipCodes },
        id: { notIn: excludeIds.length > 0 ? excludeIds : undefined },
        status: { in: ["lead", "prospect", "customer"] },
      },
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
}

// ============================================================
// Export Singleton
// ============================================================

export const outreachService = new OutreachService();
