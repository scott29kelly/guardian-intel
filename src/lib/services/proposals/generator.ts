/**
 * Smart Proposal Generator
 * 
 * Synthesizes data from multiple sources to generate AI-powered proposals:
 * - Customer & property data
 * - Weather events & storm damage
 * - Insurance information
 * - Intel items & interactions
 * - Regional pricing data
 */

import { prisma } from "@/lib/prisma";
import { getAI } from "@/lib/services/ai";
import { PricingCalculator, getMaterialByGrade, formatCurrency, MATERIAL_OPTIONS } from "./pricing";
import type {
  ProposalGenerationRequest,
  ProposalGenerationResult,
  GeneratedProposal,
  CustomerData,
  PropertyData,
  WeatherEventData,
  InsuranceData,
  IntelItemData,
  InteractionData,
  DamageAssessment,
  AIGeneratedContent,
  SourceDataSnapshot,
  PricingOption,
  LineItem,
} from "./types";

// =============================================================================
// DATA GATHERING
// =============================================================================

async function gatherCustomerData(customerId: string): Promise<{
  customer: CustomerData;
  property: PropertyData;
  insurance: InsuranceData;
  weatherEvents: WeatherEventData[];
  intelItems: IntelItemData[];
  interactions: InteractionData[];
} | null> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      weatherEvents: {
        orderBy: { eventDate: "desc" },
        take: 10,
      },
      intelItems: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      interactions: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!customer) return null;

  return {
    customer: {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      zipCode: customer.zipCode,
    },
    property: {
      propertyType: customer.propertyType,
      yearBuilt: customer.yearBuilt,
      squareFootage: customer.squareFootage,
      stories: customer.stories,
      roofType: customer.roofType,
      roofAge: customer.roofAge,
      roofSquares: customer.roofSquares,
      roofPitch: customer.roofPitch,
      roofCondition: customer.roofCondition,
      propertyValue: customer.propertyValue,
    },
    insurance: {
      carrier: customer.insuranceCarrier,
      policyType: customer.policyType,
      policyNumber: customer.policyNumber,
      deductible: customer.deductible,
      claimHistory: customer.claimHistory,
    },
    weatherEvents: customer.weatherEvents.map(e => ({
      id: e.id,
      eventType: e.eventType,
      eventDate: e.eventDate,
      severity: e.severity,
      hailSize: e.hailSize,
      windSpeed: e.windSpeed,
      damageReported: e.damageReported,
      claimFiled: e.claimFiled,
    })),
    intelItems: customer.intelItems.map(i => ({
      id: i.id,
      category: i.category,
      title: i.title,
      content: i.content,
      priority: i.priority,
      actionable: i.actionable,
    })),
    interactions: customer.interactions.map(i => ({
      id: i.id,
      type: i.type,
      createdAt: i.createdAt,
      outcome: i.outcome,
      content: i.content,
    })),
  };
}

// =============================================================================
// DAMAGE ASSESSMENT
// =============================================================================

function assessDamage(
  weatherEvents: WeatherEventData[],
  property: PropertyData,
  intelItems: IntelItemData[]
): DamageAssessment {
  // Find most recent/severe weather event
  const recentEvent = weatherEvents[0];
  const severeEvents = weatherEvents.filter(e => 
    e.severity === "severe" || e.severity === "catastrophic"
  );

  // Determine damage type
  let damageType = "age";
  let damageSeverity = "minor";
  
  if (recentEvent) {
    damageType = recentEvent.eventType;
    damageSeverity = recentEvent.severity;
  }

  // Check for multiple damage types
  const eventTypes = new Set(weatherEvents.map(e => e.eventType));
  if (eventTypes.size > 1) {
    damageType = "multiple";
  }

  // Gather damage indicators from intel items
  const damageIntel = intelItems.filter(i => 
    i.category === "property" || 
    i.category === "weather" ||
    i.content.toLowerCase().includes("damage") ||
    i.content.toLowerCase().includes("leak") ||
    i.content.toLowerCase().includes("missing")
  );

  // Build damage description
  let damageDescription = "";
  const affectedAreas: string[] = [];

  if (recentEvent?.eventType === "hail" && recentEvent.hailSize) {
    damageDescription = `Hail damage from ${recentEvent.hailSize}" hail event on ${new Date(recentEvent.eventDate).toLocaleDateString()}.`;
    affectedAreas.push("Shingles", "Vents", "Gutters");
    if (recentEvent.hailSize >= 1) {
      affectedAreas.push("Siding", "Window screens");
    }
  } else if (recentEvent?.eventType === "wind" && recentEvent.windSpeed) {
    damageDescription = `Wind damage from ${recentEvent.windSpeed} mph wind event on ${new Date(recentEvent.eventDate).toLocaleDateString()}.`;
    affectedAreas.push("Shingles", "Ridge cap", "Flashing");
  } else if ((property.roofAge || 0) >= 15) {
    const roofAge = property.roofAge || 15;
    damageDescription = `Roof is ${roofAge} years old and approaching end of serviceable life.`;
    affectedAreas.push("Shingles (wear)", "Flashing", "Underlayment");
    damageSeverity = roofAge >= 20 ? "severe" : "moderate";
  } else {
    damageDescription = "Roof inspection recommended to assess current condition.";
  }

  // Add intel-based observations
  if (damageIntel.length > 0) {
    damageDescription += ` Additional observations: ${damageIntel.slice(0, 2).map(i => i.title).join("; ")}.`;
  }

  // Determine urgency
  let urgencyLevel = "standard";
  if (severeEvents.length > 0 || (property.roofAge || 0) >= 20) {
    urgencyLevel = "high";
  }
  if (recentEvent?.damageReported && !recentEvent.claimFiled) {
    urgencyLevel = "urgent";
  }

  // Recommended action
  let recommendedAction = "Schedule a comprehensive roof inspection";
  if (damageSeverity === "severe") {
    recommendedAction = "Immediate roof replacement recommended";
  } else if (damageSeverity === "moderate") {
    recommendedAction = "Roof replacement or significant repairs recommended";
  }

  // Insurance recommendation
  let insuranceRecommendation = "Standard roof replacement project - not typically covered by insurance.";
  if (recentEvent && (recentEvent.eventType === "hail" || recentEvent.eventType === "wind")) {
    insuranceRecommendation = `Storm damage may be covered by homeowner's insurance. We recommend filing a claim for the ${new Date(recentEvent.eventDate).toLocaleDateString()} ${recentEvent.eventType} event.`;
  }

  return {
    damageType,
    damageSeverity,
    damageDescription,
    affectedAreas,
    urgencyLevel,
    recommendedAction,
    insuranceRecommendation,
  };
}

// =============================================================================
// AI CONTENT GENERATION
// =============================================================================

async function generateAIContent(
  customer: CustomerData,
  property: PropertyData,
  insurance: InsuranceData,
  damage: DamageAssessment,
  recommendedOption: PricingOption,
  weatherEvents: WeatherEventData[]
): Promise<AIGeneratedContent> {
  const ai = getAI();
  
  // If no AI configured, use template-based content
  if (!ai?.hasAdapters()) {
    return generateTemplateContent(customer, property, insurance, damage, recommendedOption);
  }

  const prompt = buildAIPrompt(customer, property, insurance, damage, recommendedOption, weatherEvents);

  try {
    const response = await ai.chat({
      messages: [
        {
          role: "system",
          content: `You are a professional proposal writer for Guardian Roofing & Siding, a trusted storm damage restoration company serving the Mid-Atlantic region. 

Generate professional, persuasive proposal content that:
- Addresses the homeowner by name
- References specific property and damage details
- Emphasizes value and quality
- Builds trust and urgency appropriately
- Is warm but professional in tone

Respond with a JSON object containing these fields:
- executiveSummary: 2-3 paragraph summary for the customer
- scopeOfWork: Brief scope description (1-2 sentences)
- scopeDetails: Detailed scope in markdown format
- valueProposition: Why choose Guardian (3-4 bullet points)
- warrantyDetails: Warranty explanation
- insuranceNotes: Insurance-related guidance if applicable
- callToAction: Compelling next step

Format the response as valid JSON only.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      maxTokens: 2000,
    });

    try {
      // Try to parse JSON from response
      let content = response.message.content;
      
      // Extract JSON if wrapped in markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        content = jsonMatch[1];
      }
      
      const parsed = JSON.parse(content.trim());
      return {
        executiveSummary: parsed.executiveSummary || "",
        scopeOfWork: parsed.scopeOfWork || "",
        scopeDetails: parsed.scopeDetails || "",
        valueProposition: parsed.valueProposition || "",
        warrantyDetails: parsed.warrantyDetails || "",
        insuranceNotes: parsed.insuranceNotes || "",
        termsAndConditions: getTermsAndConditions(),
        callToAction: parsed.callToAction || "",
      };
    } catch {
      console.warn("[Proposal] Failed to parse AI response, using template");
      return generateTemplateContent(customer, property, insurance, damage, recommendedOption);
    }
  } catch (error) {
    console.error("[Proposal] AI generation failed:", error);
    return generateTemplateContent(customer, property, insurance, damage, recommendedOption);
  }
}

function buildAIPrompt(
  customer: CustomerData,
  property: PropertyData,
  insurance: InsuranceData,
  damage: DamageAssessment,
  recommendedOption: PricingOption,
  weatherEvents: WeatherEventData[]
): string {
  const recentEvent = weatherEvents[0];
  
  return `Generate proposal content for:

CUSTOMER:
- Name: ${customer.firstName} ${customer.lastName}
- Address: ${customer.address}, ${customer.city}, ${customer.state} ${customer.zipCode}

PROPERTY:
- Type: ${property.propertyType || "Single Family"}
- Year Built: ${property.yearBuilt || "Unknown"}
- Square Footage: ${property.squareFootage?.toLocaleString() || "Approx. 2,000"} sqft
- Roof Type: ${property.roofType || "Asphalt Shingle"}
- Roof Age: ${property.roofAge || "Unknown"} years
- Roof Size: ${recommendedOption.breakdown.roofSquares} squares

DAMAGE ASSESSMENT:
- Type: ${damage.damageType}
- Severity: ${damage.damageSeverity}
- Description: ${damage.damageDescription}
- Affected Areas: ${damage.affectedAreas.join(", ")}
- Urgency: ${damage.urgencyLevel}

${recentEvent ? `STORM EVENT:
- Type: ${recentEvent.eventType}
- Date: ${new Date(recentEvent.eventDate).toLocaleDateString()}
- Severity: ${recentEvent.severity}
${recentEvent.hailSize ? `- Hail Size: ${recentEvent.hailSize}"` : ""}
${recentEvent.windSpeed ? `- Wind Speed: ${recentEvent.windSpeed} mph` : ""}
` : ""}

INSURANCE:
- Carrier: ${insurance.carrier || "Unknown"}
- Deductible: ${insurance.deductible ? formatCurrency(insurance.deductible) : "Unknown"}
- Recommendation: ${damage.insuranceRecommendation}

PROPOSED SOLUTION:
- Material: ${recommendedOption.material.brand} ${recommendedOption.material.name}
- Warranty: ${recommendedOption.material.warrantyYears} years
- Total Investment: ${formatCurrency(recommendedOption.breakdown.totalPrice)}

Generate persuasive, professional proposal content.`;
}

function generateTemplateContent(
  customer: CustomerData,
  property: PropertyData,
  insurance: InsuranceData,
  damage: DamageAssessment,
  recommendedOption: PricingOption
): AIGeneratedContent {
  const material = recommendedOption.material;
  
  return {
    executiveSummary: `Dear ${customer.firstName},

Thank you for considering Guardian Roofing & Siding for your roofing project. Following our assessment of your property at ${customer.address}, we are pleased to present this comprehensive proposal for your roof replacement.

${damage.damageDescription}

We recommend the ${material.brand} ${material.name} roofing system, which offers ${material.warrantyYears} years of protection and industry-leading durability. Our team of certified installers will ensure your new roof is installed to the highest standards, protecting your home for decades to come.

Your total investment for this project is ${formatCurrency(recommendedOption.breakdown.totalPrice)}, which includes all materials, professional installation, permits, and debris removal.`,

    scopeOfWork: `Complete roof replacement with ${material.brand} ${material.name} shingles, including tear-off of existing roof, new underlayment, and all necessary flashing and ventilation.`,

    scopeDetails: `## Scope of Work

### Preparation
- Protect landscaping, decks, and property with tarps and boards
- Set up safe debris chute system

### Tear-Off
- Remove all existing roofing materials down to the deck
- Inspect roof deck for damage or rot
- Replace any damaged decking (if needed, additional cost applies)

### Installation
- Install synthetic underlayment across entire roof surface
- Apply ice & water shield at eaves, valleys, and penetrations
- Install new drip edge at eaves and rakes
- Install ${material.brand} ${material.name} shingles per manufacturer specifications
- Install matching hip and ridge cap shingles
- Flash all penetrations, walls, and chimneys
- Install or replace roof vents as needed

### Cleanup
- Magnetic sweep of property for nails
- Complete debris removal and disposal
- Final inspection and walkthrough`,

    valueProposition: `## Why Choose Guardian?

- **Licensed & Insured** — Fully licensed in ${customer.state} with comprehensive liability and workers' comp coverage
- **Manufacturer Certified** — GAF Master Elite and CertainTeed SELECT ShingleMaster contractor
- **Storm Damage Experts** — Specialized in insurance claim assistance with 95% approval rate
- **Warranty Protection** — ${material.warrantyYears}-year manufacturer warranty plus our 10-year workmanship guarantee
- **Local Team** — Serving the ${customer.city} area for over 15 years with hundreds of 5-star reviews`,

    warrantyDetails: `## Warranty Coverage

### Manufacturer Warranty
${material.brand} provides a ${material.warrantyYears}-year limited warranty covering manufacturing defects in the shingle material. This warranty is transferable to new homeowners within the first 20 years.

### Guardian Workmanship Warranty
We stand behind our installation with a 10-year workmanship warranty covering any installation-related issues. If any problems arise due to our work, we'll fix them at no cost to you.

### What's Covered
- Shingle material defects
- Premature granule loss
- Wind damage (up to 130 mph for this product)
- Installation defects
- Flashing and seal failures`,

    insuranceNotes: insurance.carrier ? `## Insurance Assistance

${damage.insuranceRecommendation}

**Your Insurance Information:**
- Carrier: ${insurance.carrier}
${insurance.deductible ? `- Deductible: ${formatCurrency(insurance.deductible)}` : ""}

Guardian provides complimentary insurance claim assistance:
- We'll meet with your adjuster on-site
- Provide detailed documentation and photos
- Handle supplement requests if initial approval is insufficient
- Work directly with your insurance company throughout the process

*Note: Your out-of-pocket cost for an approved insurance claim is typically limited to your deductible.*` : "",

    termsAndConditions: getTermsAndConditions(),

    callToAction: `## Ready to Get Started?

Protect your home with a new roof from Guardian. To move forward:

1. **Review this proposal** and let us know if you have any questions
2. **Sign below** to authorize the work
3. **We'll schedule** your installation within 2-3 weeks

Questions? Call us at **(215) 555-ROOF** or reply to this proposal.

*This proposal is valid for 30 days from the date of issue.*`,
  };
}

function getTermsAndConditions(): string {
  return `## Terms & Conditions

1. **Payment Terms**: 50% deposit due at signing, balance due upon completion.
2. **Project Timeline**: Work will commence within 2-3 weeks of signed agreement, weather permitting.
3. **Change Orders**: Any changes to the scope of work must be agreed upon in writing.
4. **Property Access**: Customer grants Guardian access to the property for the duration of the project.
5. **Permits**: Guardian will obtain all necessary permits. Permit fees are included in this proposal.
6. **Hidden Damage**: If hidden damage (such as rotted decking) is discovered during tear-off, customer will be notified and additional costs approved before proceeding.
7. **Warranty Claims**: All warranty claims must be submitted in writing within 30 days of discovering an issue.
8. **Cancellation**: Customer may cancel within 3 business days of signing for a full refund.

*Guardian Roofing & Siding, LLC — Licensed, Bonded & Insured*`;
}

// =============================================================================
// MAIN GENERATOR
// =============================================================================

export async function generateProposal(
  request: ProposalGenerationRequest
): Promise<ProposalGenerationResult> {
  try {
    // Gather all customer data
    const data = await gatherCustomerData(request.customerId);
    
    if (!data) {
      return {
        success: false,
        error: "Customer not found",
      };
    }

    const { customer, property, insurance, weatherEvents, intelItems, interactions } = data;

    // Create pricing calculator for customer's state
    const calculator = new PricingCalculator(customer.state);

    // Assess damage
    const damageAssessment = assessDamage(weatherEvents, property, intelItems);

    // Determine material grade
    let materialGrade = request.materialGrade || "standard";
    
    // Upgrade recommendation for severe damage or high property value
    if (damageAssessment.damageSeverity === "severe" && !request.materialGrade) {
      materialGrade = "premium";
    }
    if ((property.propertyValue || 0) > 500000 && !request.materialGrade) {
      materialGrade = "premium";
    }

    // Generate pricing options
    const pricingOptions = calculator.generatePricingOptions(
      property,
      request.customDiscount,
      materialGrade
    );

    // Get recommended option
    const recommendedOption = pricingOptions.find(o => o.isRecommended) || pricingOptions[1];

    // Generate line items for recommended option
    const lineItems = calculator.generateLineItems(
      property,
      recommendedOption.material,
      recommendedOption.breakdown
    );

    // Generate AI content
    const aiContent = await generateAIContent(
      customer,
      property,
      insurance,
      damageAssessment,
      recommendedOption,
      weatherEvents
    );

    // Create source data snapshot
    const sourceDataSnapshot: SourceDataSnapshot = {
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      propertyAddress: `${customer.address}, ${customer.city}, ${customer.state} ${customer.zipCode}`,
      weatherEventsCount: weatherEvents.length,
      intelItemsCount: intelItems.length,
      interactionsCount: interactions.length,
      generatedAt: new Date(),
      dataVersion: "1.0",
    };

    // Build final proposal
    const proposal: GeneratedProposal = {
      customer,
      property,
      insurance,
      weatherEvents,
      damageAssessment,
      pricingOptions,
      recommendedOption,
      lineItems,
      aiContent,
      sourceDataSnapshot,
    };

    return {
      success: true,
      proposal,
    };
  } catch (error) {
    console.error("[Proposal] Generation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

// =============================================================================
// PROPOSAL PERSISTENCE
// =============================================================================

export async function saveProposal(
  proposal: GeneratedProposal,
  createdById: string
): Promise<{ id: string; proposalNumber: string }> {
  const recommended = proposal.recommendedOption;
  const breakdown = recommended.breakdown;

  const saved = await prisma.proposal.create({
    data: {
      customerId: proposal.customer.id,
      createdById,
      
      title: `Roof Replacement Proposal - ${proposal.customer.firstName} ${proposal.customer.lastName}`,
      status: "draft",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      
      // Property snapshot
      propertyAddress: proposal.customer.address,
      propertyCity: proposal.customer.city,
      propertyState: proposal.customer.state,
      propertyZip: proposal.customer.zipCode,
      propertyType: proposal.property.propertyType,
      roofType: proposal.property.roofType,
      roofAge: proposal.property.roofAge,
      roofSquares: breakdown.roofSquares,
      roofPitch: proposal.property.roofPitch,
      stories: proposal.property.stories,
      squareFootage: proposal.property.squareFootage,
      yearBuilt: proposal.property.yearBuilt,
      
      // Damage assessment
      damageType: proposal.damageAssessment.damageType,
      damageSeverity: proposal.damageAssessment.damageSeverity,
      damageDescription: proposal.damageAssessment.damageDescription,
      stormEventId: proposal.weatherEvents[0]?.id,
      stormDate: proposal.weatherEvents[0]?.eventDate,
      hailSize: proposal.weatherEvents[0]?.hailSize,
      windSpeed: proposal.weatherEvents[0]?.windSpeed,
      
      // Scope
      scopeSummary: proposal.aiContent.scopeOfWork,
      scopeDetails: proposal.aiContent.scopeDetails,
      lineItems: JSON.stringify(proposal.lineItems),
      
      // Materials
      primaryMaterial: `${recommended.material.brand} ${recommended.material.name}`,
      materialGrade: recommended.material.grade,
      materialWarranty: `${recommended.material.warrantyYears} years`,
      
      // Pricing
      materialsCost: breakdown.materialsCost,
      laborCost: breakdown.laborCost,
      permitFees: breakdown.permitFees,
      disposalFees: breakdown.disposalCost,
      miscFees: breakdown.miscFees,
      subtotal: breakdown.subtotal,
      discountAmount: breakdown.discountAmount,
      discountReason: breakdown.discountReason,
      taxRate: breakdown.taxRate,
      taxAmount: breakdown.taxAmount,
      totalPrice: breakdown.totalPrice,
      pricingOptions: JSON.stringify(proposal.pricingOptions),
      
      // Insurance
      isInsuranceClaim: !!proposal.weatherEvents[0],
      insuranceCarrier: proposal.insurance.carrier,
      policyNumber: proposal.insurance.policyNumber,
      deductible: proposal.insurance.deductible,
      insuranceNotes: proposal.aiContent.insuranceNotes,
      
      // AI content
      executiveSummary: proposal.aiContent.executiveSummary,
      valueProposition: proposal.aiContent.valueProposition,
      warrantyDetails: proposal.aiContent.warrantyDetails,
      termsAndConditions: proposal.aiContent.termsAndConditions,
      
      // Metadata
      sourceDataSnapshot: JSON.stringify(proposal.sourceDataSnapshot),
    },
  });

  return {
    id: saved.id,
    proposalNumber: saved.proposalNumber,
  };
}
