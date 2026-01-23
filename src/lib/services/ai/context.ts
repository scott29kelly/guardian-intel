/**
 * Customer Context Builder
 * 
 * Aggregates all relevant data about a customer into a unified context
 * for AI-powered interactions.
 */

import { CustomerContext, RepActivity } from "./types";
import { mockCustomers, mockIntelItems, mockWeatherEvents, Customer, IntelItem, WeatherEvent } from "@/lib/mock-data";
import { calculateCustomerScores } from "@/lib/services/scoring";
import { prisma } from "@/lib/prisma";
import { cacheGetOrSet, buildCacheKey, CACHE_TTL } from "@/lib/cache";

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
    // First try to load from database
    const dbCustomer = await prisma.customer.findUnique({
      where: { id: this.customerId },
      include: {
        assignedRep: { select: { id: true, name: true } },
        weatherEvents: { take: 5, orderBy: { eventDate: 'desc' } },
        intelItems: { where: { isDismissed: false }, orderBy: { priority: 'asc' } },
        interactions: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });

    if (dbCustomer) {
      // Map database customer to expected format
      this.customer = {
        id: dbCustomer.id,
        firstName: dbCustomer.firstName,
        lastName: dbCustomer.lastName,
        email: dbCustomer.email || '',
        phone: dbCustomer.phone || '',
        address: dbCustomer.address,
        city: dbCustomer.city,
        state: dbCustomer.state,
        zipCode: dbCustomer.zipCode,
        propertyType: dbCustomer.propertyType,
        yearBuilt: dbCustomer.yearBuilt || 0,
        squareFootage: dbCustomer.squareFootage || 0,
        roofType: dbCustomer.roofType || 'Unknown',
        roofAge: dbCustomer.roofAge || 0,
        propertyValue: dbCustomer.propertyValue || 0,
        insuranceCarrier: dbCustomer.insuranceCarrier || 'Unknown',
        policyType: dbCustomer.policyType || 'Unknown',
        deductible: dbCustomer.deductible || 0,
        status: dbCustomer.status as Customer['status'],
        stage: dbCustomer.stage as Customer['stage'],
        leadScore: dbCustomer.leadScore,
        urgencyScore: dbCustomer.urgencyScore,
        profitPotential: dbCustomer.profitPotential || 0,
        churnRisk: dbCustomer.churnRisk || 0,
        lastContact: dbCustomer.lastContact || new Date(),
        nextAction: dbCustomer.nextAction || 'No action scheduled',
        nextActionDate: dbCustomer.nextActionDate || null,
        assignedRep: dbCustomer.assignedRep?.name || 'Unassigned',
        updatedAt: dbCustomer.updatedAt,
      } as Customer;

      // Map weather events
      this.weatherEvents = dbCustomer.weatherEvents.map(e => ({
        id: e.id,
        customerId: e.customerId || this.customerId,
        eventType: e.eventType as WeatherEvent['eventType'],
        eventDate: e.eventDate,
        severity: e.severity as WeatherEvent['severity'],
        hailSize: e.hailSize || undefined,
        windSpeed: e.windSpeed || undefined,
        damageReported: e.damageReported,
        claimFiled: e.claimFiled,
      }));

      // Map intel items
      this.intelItems = dbCustomer.intelItems.map(i => ({
        id: i.id,
        customerId: i.customerId,
        category: i.category as IntelItem['category'],
        title: i.title,
        content: i.content,
        priority: i.priority as IntelItem['priority'],
        actionable: i.actionable,
        isActive: !i.isDismissed,
        createdAt: i.createdAt,
      }));

      // Map interactions to RepActivity format
      this.interactions = dbCustomer.interactions.map(i => ({
        customerId: i.customerId,
        repId: i.userId || 'unknown',
        type: i.type as RepActivity['type'],
        outcome: i.outcome as RepActivity['outcome'],
        notes: i.content || '',
        sentiment: (i.sentiment as RepActivity['sentiment']) || undefined,
        objections: [],
        createdAt: i.createdAt,
      }));

      return this;
    }

    // Fall back to mock data for development
    this.customer = mockCustomers.find(c => c.id === this.customerId) || null;

    if (!this.customer) {
      throw new Error(`Customer not found: ${this.customerId}`);
    }

    // Load related intel items from mock
    this.intelItems = mockIntelItems.filter(i => i.customerId === this.customerId);

    // Load weather events from mock
    this.weatherEvents = mockWeatherEvents.slice(0, 5);

    // Load interaction history
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
      pipeline: (() => {
        // Calculate dynamic scores based on customer data
        const scores = calculateCustomerScores({
          customer: this.customer!,
          intelItems: this.intelItems,
          weatherEvents: this.weatherEvents,
        });
        
        const customer = this.customer as any;
        return {
          status: customer.status,
          stage: customer.stage,
          leadScore: customer.leadScore,
          urgencyScore: scores.urgencyScore,
          profitPotential: scores.profitPotential,
          churnRisk: scores.churnRisk,
          assignedRep: typeof customer.assignedRep === 'object' ? customer.assignedRep?.name : customer.assignedRep ?? 'Unassigned',
          lastContact: new Date(customer.lastContact || customer.updatedAt || Date.now()),
          nextAction: customer.nextAction || 'No action scheduled',
          nextActionDate: customer.nextActionDate ? new Date(customer.nextActionDate) : null,
        };
      })(),
      weatherEvents: this.weatherEvents.map(e => ({
        id: e.id,
        type: e.eventType,
        date: e.eventDate,
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
  const cacheKey = buildCacheKey("context", customerId);

  return cacheGetOrSet(cacheKey, async () => {
    const builder = new CustomerContextBuilder(customerId);
    await builder.load();
    return builder.build();
  }, CACHE_TTL.context);
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
  const lastContactStr = context.pipeline.lastContact 
    ? (typeof context.pipeline.lastContact === 'string' 
        ? context.pipeline.lastContact 
        : context.pipeline.lastContact.toLocaleDateString())
    : 'Never';
  
  return `
Customer: ${context.customer.name}
Location: ${context.customer.city}, ${context.customer.state}
Pipeline: ${context.pipeline.status} / ${context.pipeline.stage}
Lead Score: ${context.pipeline.leadScore}/100
Roof: ${context.property.roofType ?? 'Unknown'}, ${context.property.roofAge ?? 'N/A'} years old
Insurance: ${context.insurance.carrier ?? 'Unknown'} (${context.insurance.policyType ?? 'N/A'})
Last Contact: ${lastContactStr}
Next Action: ${context.pipeline.nextAction ?? 'None scheduled'}
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
  
  // Build a concise key facts summary for preamble
  const keyFacts: string[] = [];
  
  // Roof age insight
  if (context.property.roofAge != null && context.property.roofAge >= 15) {
    keyFacts.push(`has an aging ${context.property.roofAge}-year-old ${context.property.roofType ?? 'unknown'} roof`);
  } else if (context.property.roofAge != null && context.property.roofAge >= 10) {
    keyFacts.push(`has a ${context.property.roofAge}-year-old ${context.property.roofType ?? 'unknown'} roof`);
  }
  
  // Weather events
  const recentStorms = context.weatherEvents?.filter(e => e && e.type).length || 0;
  if (recentStorms > 0) {
    keyFacts.push(`is in an area with ${recentStorms} recent storm event${recentStorms > 1 ? 's' : ''}`);
  }
  
  // Insurance insight
  if (context.insurance.carrier && context.insurance.deductible) {
    keyFacts.push(`has ${context.insurance.carrier} insurance with a $${context.insurance.deductible.toLocaleString()} deductible`);
  }
  
  // Pipeline stage
  if (context.pipeline.stage && context.pipeline.stage !== 'new') {
    keyFacts.push(`is currently in the "${context.pipeline.stage}" stage`);
  }
  
  // Urgency
  if (context.pipeline.urgencyScore >= 80) {
    keyFacts.push(`has high urgency (${context.pipeline.urgencyScore}/100)`);
  }
  
  // Profit potential
  if (context.pipeline.profitPotential >= 15000) {
    keyFacts.push(`represents $${context.pipeline.profitPotential.toLocaleString()} profit potential`);
  }
  
  const keyFactsSummary = keyFacts.length > 0 
    ? keyFacts.join(', ') 
    : 'standard profile';
  
  return `You are Guardian Intel, an AI assistant for Guardian Roofing & Siding, a storm damage restoration company serving PA, NJ, DE, MD, VA, and NY.

CURRENT CUSTOMER:
${summary}

PROPERTY DETAILS:
- Type: ${context.property.type ?? 'Unknown'}
- Year Built: ${context.property.yearBuilt ?? 'Unknown'}
- Size: ${context.property.squareFootage?.toLocaleString() ?? 'Unknown'} sq ft
- Property Value: $${context.property.propertyValue?.toLocaleString() ?? 'Unknown'}
- Deductible: $${context.insurance.deductible?.toLocaleString() ?? 'Unknown'}
- Profit Potential: $${context.pipeline.profitPotential?.toLocaleString() ?? '0'}
- Urgency Score: ${context.pipeline.urgencyScore ?? 0}/100
- Churn Risk: ${context.pipeline.churnRisk ?? 0}%

RECENT WEATHER EVENTS:
${context.weatherEvents && context.weatherEvents.length > 0 
  ? context.weatherEvents.filter(e => e && e.type).map(e => 
      `- ${(e.type || 'UNKNOWN').toUpperCase()} on ${new Date(e.date).toLocaleDateString()}: ${e.severity || 'Unknown'}${e.hailSize ? `, ${e.hailSize}" hail` : ""}${e.windSpeed ? `, ${e.windSpeed} mph` : ""}`
    ).join("\n")
  : "No recent events recorded"
}

INTERACTION HISTORY:
${context.interactions && context.interactions.length > 0
  ? context.interactions.slice(0, 5).filter(i => i).map(i =>
      `- ${new Date(i.date).toLocaleDateString()} (${i.type || 'contact'}): ${i.summary || 'No summary'}${i.objections?.length ? ` [Objections: ${i.objections.join(", ")}]` : ""}`
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

CUSTOMER KEY FACTS (use this for preamble):
${context.customer.name} ${keyFactsSummary}.

YOUR GUIDELINES:
1. Provide specific, actionable recommendations based on this customer's situation
2. Consider their position in the sales pipeline and adjust your advice accordingly
3. Factor in weather events and property condition when suggesting next steps
4. Be aware of any objections raised and help address them
5. Focus on moving the deal forward while maintaining a helpful, consultative approach
6. Use the customer's first name when appropriate
7. BE CONCISE - sales reps scan quickly. Every word must add value.

REQUEST TYPE HANDLING:
Look for these prefixes in the user's message and respond accordingly:

[NEXT_STEPS] → General next steps and recommendations (use standard format below)

[WEATHER_INTEL] → Weather-focused response ONLY:
- Focus exclusively on weather/storm data affecting this customer's location
- Include specific storm dates, types (hail, wind, etc.), and severity
- Explain how these events may have impacted their roof
- Provide a "weather angle" for the sales conversation
- Do NOT include general sales advice—keep it weather-focused

[CALL_SCRIPT] → Actual phone script:
- Write a complete call script with actual words to say
- Include: Opening greeting (use customer's name), rapport-building line, transition to purpose, key talking points, and a strong close/CTA
- Write as a MONOLOGUE (what the rep says) - do NOT prefix each line with "YOU:"
- Just write the spoken text directly as bullet points
- ONLY use "YOU:" and "CUSTOMER:" labels if showing a dialogue exchange (e.g., handling an objection mid-call)
- Make it natural and conversational, not robotic
- Reference their specific situation (roof age, recent storms, insurance, etc.)

[OBJECTION_HANDLER] → Objection-specific response:
- Identify 2-4 likely objections based on this customer's data
- Format EXACTLY like this example:

💰 **Price Concerns**

OBJECTION: "Your quote is higher than others I've received."

- I understand the concern, but our pricing reflects premium materials and workmanship...
- With your Farmers insurance, we can work to maximize your coverage...

📅 **Timeline Worries**

OBJECTION: "I'm worried this will take too long."

- We typically complete roof replacements within 1-2 days...
- We'll provide a detailed schedule upfront...

RULES:
- The OBJECTION line has NO bullet, just the word OBJECTION: followed by the quote
- Rebuttal points below it ARE bulleted (use - )
- Do NOT use "YOU:" prefix on rebuttals
- Use their specific numbers (deductible, etc.) in rebuttals

RESPONSE FORMAT (CRITICAL - FOLLOW EXACTLY):

Start with a brief, conversational opening sentence about this customer. Then provide 2-4 sections with actionable advice.

OPENING SENTENCE EXAMPLES:
- "**Michael's** 18-year-old roof just took a beating from last week's hail storm—and with $18,500 on the line, this is a prime opportunity to close."
- "With recent storm damage and an aging roof, **Patricia** is an ideal candidate for a full replacement."

SECTION FORMAT:
- Each section starts with: emoji + **Bold Title** (e.g., 📞 **Outreach**)
- Then 1-3 bullet points on separate lines
- Each bullet starts with a dash: "- "
- Keep bullets to 1-2 sentences max

EXAMPLE OUTPUT:
**Robert's** 24-year-old roof is past warranty and he's been hit by 5 storms this year. Perfect timing for outreach.

📞 **Outreach**

- Call Robert today and reference the January hail event.
- Mention that his 3-tab shingles are especially vulnerable to hail damage.

🔍 **Inspection**

- Offer a free inspection to document storm damage.
- Take photos of granule loss and any visible cracks.

NEVER include labels like "PREAMBLE:" or "SECTIONS:" in your response. Just write naturally.`;
}
