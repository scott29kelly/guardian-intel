/**
 * AI-Powered Slide Content Generator
 *
 * Uses Gemini Flash (via AI Router) to generate compelling,
 * insight-driven presentation content from customer data.
 */

import type {
  SlideType,
  TitleSlideContent,
  StatsSlideContent,
  ListSlideContent,
  TimelineSlideContent,
  TalkingPointsSlideContent,
  ChartSlideContent,
} from '../types/deck.types';

// =============================================================================
// TYPES
// =============================================================================

export interface CustomerData {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType?: string;
  yearBuilt?: number;
  squareFootage?: number;
  roofType?: string;
  roofAge?: number;
  propertyValue?: number;
  insuranceCarrier?: string;
  policyType?: string;
  deductible?: number;
  leadScore?: number;
  urgencyScore?: number;
  stage?: string;
  status?: string;
  leadSource?: string;
  assignedRep?: { name: string };
}

export interface WeatherEvent {
  id: string;
  eventDate: string;
  eventType: string;
  severity?: string;
  hailSize?: number;
  windSpeed?: number;
  damageReported?: boolean;
  claimFiled?: boolean;
}

export interface SlideGenerationContext {
  customer: CustomerData;
  weatherEvents?: WeatherEvent[];
  slideType: SlideType;
  sectionId: string;
  sectionTitle: string;
}

// =============================================================================
// AI PROMPT TEMPLATES
// =============================================================================

const SLIDE_PROMPTS: Record<string, (ctx: SlideGenerationContext) => string> = {
  // Stats slide - Create compelling headline stats with strategic insights
  'customer-overview': (ctx) => `
You are creating a "Customer At-A-Glance" stats slide for a sales presentation.
Generate 4 strategic insight cards that will help a sales rep understand this customer quickly.

CUSTOMER DATA:
- Name: ${ctx.customer.firstName} ${ctx.customer.lastName}
- Location: ${ctx.customer.city}, ${ctx.customer.state}
- Lead Score: ${ctx.customer.leadScore || 'Unknown'}/100
- Urgency Score: ${ctx.customer.urgencyScore || 'Unknown'}/100
- Property Value: $${ctx.customer.propertyValue?.toLocaleString() || 'Unknown'}
- Roof Age: ${ctx.customer.roofAge || 'Unknown'} years
- Roof Type: ${ctx.customer.roofType || 'Unknown'}
- Property Type: ${ctx.customer.propertyType || 'Unknown'}
- Square Footage: ${ctx.customer.squareFootage?.toLocaleString() || 'Unknown'}
- Insurance: ${ctx.customer.insuranceCarrier || 'Unknown'} (${ctx.customer.policyType || 'Unknown'})
- Deductible: $${ctx.customer.deductible?.toLocaleString() || 'Unknown'}
- Stage: ${ctx.customer.stage || 'Unknown'}
- Lead Source: ${ctx.customer.leadSource || 'Unknown'}

WEATHER HISTORY:
${ctx.weatherEvents?.map(e => `- ${e.eventType} on ${new Date(e.eventDate).toLocaleDateString()}: ${e.severity || 'Unknown'} severity, ${e.hailSize ? e.hailSize + '" hail' : 'no hail'}, ${e.windSpeed ? e.windSpeed + ' mph winds' : 'no wind data'}`).join('\n') || 'No storm data available'}

Return a JSON object with this EXACT structure:
{
  "title": "A compelling headline (not just 'Customer At-A-Glance')",
  "stats": [
    {
      "label": "Short label (2-4 words)",
      "value": "Display value (format numbers, add units)",
      "insight": "1-sentence strategic insight for the sales rep",
      "icon": "Target|Home|Calendar|Zap|DollarSign|Shield|TrendingUp|AlertTriangle"
    }
  ],
  "bottomLine": "A 1-sentence summary of the biggest opportunity or risk"
}

Be strategic. Don't just regurgitate data - provide INSIGHTS. For example:
- If roof is 18+ years old: "Near end of lifespan - prime replacement candidate"
- If lead score is high but urgency low: "Needs activation - create urgency"
- If recent storms + old roof: "High-probability close - storm damage likely"
`,

  // Talking points - Generate actual sales scripts, not generic templates
  'talking-points': (ctx) => `
You are a top-performing roofing sales coach creating a PERSONALIZED call script for this specific customer.

CUSTOMER DATA:
- Name: ${ctx.customer.firstName} ${ctx.customer.lastName}
- Location: ${ctx.customer.city}, ${ctx.customer.state}
- Lead Source: ${ctx.customer.leadSource || 'Unknown'}
- Roof Age: ${ctx.customer.roofAge || 'Unknown'} years
- Roof Type: ${ctx.customer.roofType || 'Unknown'}
- Property Value: $${ctx.customer.propertyValue?.toLocaleString() || 'Unknown'}
- Insurance: ${ctx.customer.insuranceCarrier || 'Unknown'}
- Deductible: $${ctx.customer.deductible?.toLocaleString() || 'Unknown'}
- Stage: ${ctx.customer.stage || 'Unknown'}

WEATHER HISTORY:
${ctx.weatherEvents?.map(e => `- ${e.eventType} on ${new Date(e.eventDate).toLocaleDateString()}: ${e.severity || 'Unknown'} severity${e.hailSize ? ', ' + e.hailSize + '" hail' : ''}${e.windSpeed ? ', ' + e.windSpeed + ' mph winds' : ''}`).join('\n') || 'No storm data available'}

Return a JSON object with this EXACT structure:
{
  "title": "Personalized talking points title",
  "points": [
    {
      "topic": "Topic name (e.g., 'Storm Damage Opening', 'Urgency Builder', 'Insurance Angle')",
      "script": "The EXACT words to say - make it conversational and natural",
      "priority": "high|medium|low",
      "timing": "When to use this (e.g., 'Opening', 'After objection', 'Closing')"
    }
  ],
  "keyInsight": "The #1 thing this rep needs to know about this customer"
}

REQUIREMENTS:
1. Use the customer's FIRST NAME in scripts
2. Reference SPECIFIC storms if available (dates, type)
3. Reference SPECIFIC property details (roof age, type)
4. Create urgency based on actual data (roof age, storm timing)
5. Include insurance-specific angles if carrier is known
6. Provide at least 5 talking points
7. Make scripts sound natural, not robotic
`,

  // Objection handlers - Personalized to this customer's likely objections
  'objection-handlers': (ctx) => `
You are a sales coach preparing CUSTOMER-SPECIFIC objection handlers for this homeowner.

CUSTOMER DATA:
- Name: ${ctx.customer.firstName} ${ctx.customer.lastName}
- Location: ${ctx.customer.city}, ${ctx.customer.state}
- Property Value: $${ctx.customer.propertyValue?.toLocaleString() || 'Unknown'}
- Insurance: ${ctx.customer.insuranceCarrier || 'Unknown'}
- Deductible: $${ctx.customer.deductible?.toLocaleString() || 'Unknown'}
- Roof Age: ${ctx.customer.roofAge || 'Unknown'} years
- Stage: ${ctx.customer.stage || 'Unknown'}
- Lead Source: ${ctx.customer.leadSource || 'Unknown'}

WEATHER HISTORY:
${ctx.weatherEvents?.map(e => `- ${e.eventType} on ${new Date(e.eventDate).toLocaleDateString()}: ${e.severity}`).join('\n') || 'No storm data'}

Based on this customer's profile, predict the MOST LIKELY objections and provide tailored responses.

Return a JSON object with this EXACT structure:
{
  "title": "Handling ${ctx.customer.firstName}'s Concerns",
  "items": [
    {
      "objection": "The exact objection they'll say",
      "response": "Your personalized response using their specific data",
      "followUp": "A question to ask after your response",
      "priority": "high|medium|low"
    }
  ],
  "proactiveTip": "Something to say BEFORE they object to prevent the objection"
}

PERSONALIZE based on their data:
- If deductible is high ($2500+): Expect "I can't afford it" - address payment options
- If roof is newer (<10 years): Expect "I don't need a new roof" - focus on inspection/repair
- If no recent storms: Expect "Why now?" - focus on prevention and wear/tear
- If insurance is unknown: Expect "Insurance won't cover it" - explain claim process
`,

  // Storm timeline - Strategic analysis, not just dates
  'storm-history': (ctx) => `
You are analyzing this homeowner's storm exposure to identify sales opportunities.

PROPERTY:
- Address: ${ctx.customer.address}, ${ctx.customer.city}, ${ctx.customer.state}
- Roof Age: ${ctx.customer.roofAge || 'Unknown'} years
- Roof Type: ${ctx.customer.roofType || 'Unknown'}

WEATHER EVENTS:
${ctx.weatherEvents?.map(e => `
Event: ${e.eventType}
Date: ${new Date(e.eventDate).toLocaleDateString()}
Severity: ${e.severity || 'Unknown'}
Hail Size: ${e.hailSize ? e.hailSize + ' inches' : 'Not recorded'}
Wind Speed: ${e.windSpeed ? e.windSpeed + ' mph' : 'Not recorded'}
Damage Reported: ${e.damageReported ? 'Yes' : 'No'}
Claim Filed: ${e.claimFiled ? 'Yes' : 'No'}
`).join('\n') || 'No storm events recorded'}

Return a JSON object with this EXACT structure:
{
  "title": "Storm Analysis: ${ctx.customer.lastName} Property",
  "events": [
    {
      "date": "Formatted date",
      "title": "Storm type with strategic note",
      "description": "What this means for the roof",
      "status": "completed|current|upcoming",
      "damageRisk": "high|medium|low",
      "opportunity": "Why this matters for the sale"
    }
  ],
  "summary": {
    "totalEvents": number,
    "highRiskEvents": number,
    "claimOpportunity": "Assessment of whether there's an unclaimed insurance opportunity",
    "urgencyLevel": "Critical|High|Medium|Low",
    "recommendation": "What the rep should do with this information"
  }
}

Focus on SALES RELEVANCE:
- Hail 1"+ = likely roof damage, claim opportunity
- Wind 60+ mph = possible damage, worth inspection
- Multiple events = cumulative damage argument
- No claims filed after major storms = money left on table
`,

  // Next steps - Specific actions based on customer stage
  'next-steps': (ctx) => `
You are a sales manager creating a SPECIFIC action plan for closing this customer.

CUSTOMER DATA:
- Name: ${ctx.customer.firstName} ${ctx.customer.lastName}
- Stage: ${ctx.customer.stage || 'Unknown'}
- Status: ${ctx.customer.status || 'Unknown'}
- Lead Score: ${ctx.customer.leadScore || 'Unknown'}/100
- Urgency Score: ${ctx.customer.urgencyScore || 'Unknown'}/100
- Roof Age: ${ctx.customer.roofAge || 'Unknown'} years
- Insurance: ${ctx.customer.insuranceCarrier || 'Unknown'}
- Last Contact: Recently
- Lead Source: ${ctx.customer.leadSource || 'Unknown'}

WEATHER HISTORY:
${ctx.weatherEvents?.length ? `${ctx.weatherEvents.length} storm events recorded` : 'No storm events'}

Return a JSON object with this EXACT structure:
{
  "title": "Action Plan: ${ctx.customer.firstName} ${ctx.customer.lastName}",
  "items": [
    {
      "action": "Specific action to take",
      "timing": "When to do it (Today, Within 24h, This week)",
      "script": "What to say/do",
      "icon": "Calendar|Phone|FileText|CheckCircle|MapPin|Shield",
      "priority": "high|medium|low"
    }
  ],
  "primaryGoal": "The single most important outcome to achieve",
  "fallbackPlan": "What to do if primary approach doesn't work"
}

Base actions on their STAGE:
- New/Contacted: Focus on scheduling inspection
- Qualified: Focus on proposal and urgency
- Proposal: Focus on follow-up and closing
- Negotiation: Focus on overcoming final objections
`,
};

// =============================================================================
// AI SLIDE GENERATOR
// =============================================================================

export async function generateAISlideContent(
  context: SlideGenerationContext
): Promise<Record<string, unknown>> {
  const promptKey = getPromptKey(context.sectionId);
  const promptGenerator = SLIDE_PROMPTS[promptKey];

  if (!promptGenerator) {
    // No AI prompt for this slide type - return null to use default data fetching
    return {};
  }

  const prompt = promptGenerator(context);

  try {
    // Call the AI API endpoint
    const response = await fetch('/api/ai/generate-slide', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        slideType: context.slideType,
        customerId: context.customer.id,
      }),
    });

    if (!response.ok) {
      console.error('AI slide generation failed:', await response.text());
      return {};
    }

    const data = await response.json();
    return data.content || {};
  } catch (error) {
    console.error('AI slide generation error:', error);
    return {};
  }
}

// Map section IDs to prompt keys
function getPromptKey(sectionId: string): string {
  const mapping: Record<string, string> = {
    'customer-overview': 'customer-overview',
    'talking-points': 'talking-points',
    'objection-handling': 'objection-handlers',
    'storm-exposure': 'storm-history',
    'recommended-actions': 'next-steps',
  };
  return mapping[sectionId] || sectionId;
}

// =============================================================================
// HELPER: Fetch customer context for AI generation
// =============================================================================

export async function fetchCustomerContext(customerId: string): Promise<{
  customer: CustomerData;
  weatherEvents: WeatherEvent[];
} | null> {
  try {
    const [customerRes, weatherRes] = await Promise.all([
      fetch(`/api/customers/${customerId}`),
      fetch(`/api/customers/${customerId}/weather-events`).catch(() => null),
    ]);

    if (!customerRes.ok) {
      throw new Error('Failed to fetch customer');
    }

    const customerData = await customerRes.json();
    const weatherData = weatherRes?.ok ? await weatherRes.json() : { weatherEvents: [] };

    return {
      customer: customerData.customer,
      weatherEvents: weatherData.weatherEvents || [],
    };
  } catch (error) {
    console.error('Failed to fetch customer context:', error);
    return null;
  }
}
