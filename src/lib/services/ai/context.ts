/**
 * Customer Context Builder
 * 
 * Aggregates all relevant data about a customer into a unified context
 * for AI-powered interactions.
 */

import { CustomerContext, RepActivity } from "./types";
import { mockCustomers, mockIntelItems, mockWeatherEvents, Customer, IntelItem, WeatherEvent } from "@/lib/mock-data";

// =============================================================================
// CONTEXT BUILDER
// =============================================================================

export class CustomerContextBuilder {
  private customerId: string;
  private customer: Customer | null = null;
  private intelItems: IntelItem[] = [];
  private weatherEvents: WeatherEvent[] = [];
  private interactions: RepActivity[] = [];

  constructor(customerId: string) {
    this.customerId = customerId;
  }

  /**
   * Load all data for the customer
   */
  async load(): Promise<CustomerContextBuilder> {
    // Load customer data
    // In production, this would query the database
    this.customer = mockCustomers.find(c => c.id === this.customerId) || null;
    
    if (!this.customer) {
      throw new Error(`Customer not found: ${this.customerId}`);
    }

    // Load related intel items
    this.intelItems = mockIntelItems.filter(i => i.customerId === this.customerId);
    
    // Load weather events (in production, filter by location proximity)
    // For mock data, just get recent events
    this.weatherEvents = mockWeatherEvents.filter(e => {
      // Check if event is in the same state as customer
      // This is simplified - in production, use lat/lon proximity
      return true; // Include all for now
    }).slice(0, 5);

    // Load interaction history
    // In production, this would query the CRM or local database
    this.interactions = this.generateMockInteractions();

    return this;
  }

  /**
   * Build the full context object
   */
  build(): CustomerContext {
    if (!this.customer) {
      throw new Error("Customer not loaded. Call load() first.");
    }

    return {
      customer: {
        id: this.customer.id,
        name: `${this.customer.firstName} ${this.customer.lastName}`,
        email: this.customer.email,
        phone: this.customer.phone,
        address: this.customer.address,
        city: this.customer.city,
        state: this.customer.state,
        zipCode: this.customer.zipCode,
      },
      property: {
        type: this.customer.propertyType,
        yearBuilt: this.customer.yearBuilt,
        squareFootage: this.customer.squareFootage,
        roofType: this.customer.roofType,
        roofAge: this.customer.roofAge,
        propertyValue: this.customer.propertyValue,
      },
      insurance: {
        carrier: this.customer.insuranceCarrier,
        policyType: this.customer.policyType,
        deductible: this.customer.deductible,
      },
      pipeline: {
        status: this.customer.status,
        stage: this.customer.stage,
        leadScore: this.customer.leadScore,
        urgencyScore: this.customer.urgencyScore,
        profitPotential: this.customer.profitPotential,
        churnRisk: this.customer.churnRisk,
        assignedRep: this.customer.assignedRep,
        lastContact: this.customer.lastContact,
        nextAction: this.customer.nextAction,
        nextActionDate: this.customer.nextActionDate,
      },
      weatherEvents: this.weatherEvents.map(e => ({
        id: e.id,
        type: e.type,
        date: e.date,
        severity: e.severity,
        hailSize: e.hailSize,
        windSpeed: e.windSpeed,
        damageReported: e.damageReported || false,
      })),
      interactions: this.interactions.map(i => ({
        id: i.id || `int-${Date.now()}`,
        type: i.type,
        date: i.createdAt,
        summary: i.notes,
        outcome: i.outcome,
        objections: i.objections,
        sentiment: i.sentiment,
      })),
      intelItems: this.intelItems.map(i => ({
        id: i.id,
        category: i.category,
        title: i.title,
        content: i.content,
        priority: i.priority,
        actionable: i.actionable || false,
      })),
    };
  }

  /**
   * Generate mock interaction history
   * In production, this would come from CRM or database
   */
  private generateMockInteractions(): RepActivity[] {
    if (!this.customer) return [];

    const interactions: RepActivity[] = [];
    const baseDate = new Date();

    // Generate some mock interaction history
    if (this.customer.stage !== "new") {
      interactions.push({
        customerId: this.customer.id,
        repId: "rep-1",
        type: "call",
        outcome: "connected",
        notes: "Initial contact made. Discussed recent storm damage and offered free inspection.",
        sentiment: "positive",
        createdAt: new Date(baseDate.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      });
    }

    if (["qualified", "proposal", "negotiation", "closed"].includes(this.customer.stage)) {
      interactions.push({
        customerId: this.customer.id,
        repId: "rep-1",
        type: "visit",
        outcome: "scheduled",
        notes: "Conducted on-site inspection. Found significant hail damage to shingles and gutters.",
        sentiment: "positive",
        createdAt: new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      });
    }

    if (["proposal", "negotiation", "closed"].includes(this.customer.stage)) {
      interactions.push({
        customerId: this.customer.id,
        repId: "rep-1",
        type: "email",
        outcome: "proposal_sent",
        notes: "Sent detailed proposal with inspection photos and insurance claim breakdown.",
        createdAt: new Date(baseDate.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      });
    }

    if (this.customer.stage === "negotiation") {
      interactions.push({
        customerId: this.customer.id,
        repId: "rep-1",
        type: "call",
        outcome: "follow_up_needed",
        notes: "Discussed pricing concerns. Customer comparing with competitor quotes.",
        objections: ["price", "timeline"],
        sentiment: "neutral",
        createdAt: new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      });
    }

    return interactions;
  }
}

// =============================================================================
// QUICK CONTEXT FUNCTIONS
// =============================================================================

/**
 * Get a customer context quickly
 */
export async function getCustomerContext(customerId: string): Promise<CustomerContext> {
  const builder = new CustomerContextBuilder(customerId);
  await builder.load();
  return builder.build();
}

/**
 * Get multiple customer contexts
 */
export async function getCustomerContexts(customerIds: string[]): Promise<CustomerContext[]> {
  return Promise.all(customerIds.map(id => getCustomerContext(id)));
}

/**
 * Get a simplified context summary for quick reference
 */
export function getContextSummary(context: CustomerContext): string {
  return `
Customer: ${context.customer.name}
Location: ${context.customer.city}, ${context.customer.state}
Pipeline: ${context.pipeline.status} / ${context.pipeline.stage}
Lead Score: ${context.pipeline.leadScore}/100
Roof: ${context.property.roofType}, ${context.property.roofAge} years old
Insurance: ${context.insurance.carrier} (${context.insurance.policyType})
Last Contact: ${context.pipeline.lastContact.toLocaleDateString()}
Next Action: ${context.pipeline.nextAction}
`.trim();
}

// =============================================================================
// PROMPT BUILDING
// =============================================================================

/**
 * Build a system prompt for customer-focused AI interactions
 */
export function buildCustomerSystemPrompt(context: CustomerContext): string {
  const summary = getContextSummary(context);
  
  return `You are Guardian Intel, an AI assistant for Guardian Roofing & Siding, a storm damage restoration company serving PA, NJ, DE, MD, VA, and NY.

CURRENT CUSTOMER:
${summary}

PROPERTY DETAILS:
- Type: ${context.property.type}
- Year Built: ${context.property.yearBuilt}
- Size: ${context.property.squareFootage.toLocaleString()} sq ft
- Property Value: $${context.property.propertyValue.toLocaleString()}
- Deductible: $${context.insurance.deductible.toLocaleString()}
- Profit Potential: $${context.pipeline.profitPotential.toLocaleString()}
- Urgency Score: ${context.pipeline.urgencyScore}/100
- Churn Risk: ${context.pipeline.churnRisk}%

RECENT WEATHER EVENTS:
${context.weatherEvents.length > 0 
  ? context.weatherEvents.map(e => 
      `- ${e.type.toUpperCase()} on ${new Date(e.date).toLocaleDateString()}: ${e.severity}${e.hailSize ? `, ${e.hailSize}" hail` : ""}${e.windSpeed ? `, ${e.windSpeed} mph` : ""}`
    ).join("\n")
  : "No recent events recorded"
}

INTERACTION HISTORY:
${context.interactions.length > 0
  ? context.interactions.slice(0, 5).map(i =>
      `- ${new Date(i.date).toLocaleDateString()} (${i.type}): ${i.summary}${i.objections?.length ? ` [Objections: ${i.objections.join(", ")}]` : ""}`
    ).join("\n")
  : "No interaction history"
}

KEY INTEL:
${context.intelItems.length > 0
  ? context.intelItems.filter(i => i.priority === "high" || i.priority === "critical").map(i =>
      `- [${i.priority.toUpperCase()}] ${i.title}`
    ).join("\n")
  : "No active intel"
}

YOUR GUIDELINES:
1. Provide specific, actionable recommendations based on this customer's situation
2. Consider their position in the sales pipeline and adjust your advice accordingly
3. Factor in weather events and property condition when suggesting next steps
4. Be aware of any objections raised and help address them
5. Focus on moving the deal forward while maintaining a helpful, consultative approach
6. Use the customer's name when appropriate
7. Be concise but thorough - sales reps are busy`;
}
