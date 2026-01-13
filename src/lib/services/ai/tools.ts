/**
 * Guardian Intel AI Tools
 * 
 * Tool definitions for AI agents to interact with the system.
 */

import { prisma } from "@/lib/prisma";
import { ToolDefinition, ToolResult } from "./types";

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

export const AI_TOOLS: ToolDefinition[] = [
  // ===========================================================================
  // CUSTOMER TOOLS
  // ===========================================================================
  {
    name: "get_customer",
    description: "Retrieve detailed information about a specific customer including their property, insurance, pipeline status, and interaction history.",
    parameters: {
      type: "object",
      properties: {
        customerId: {
          type: "string",
          description: "The unique identifier of the customer",
        },
      },
      required: ["customerId"],
    },
  },
  {
    name: "search_customers",
    description: "Search for customers by name, address, phone, email, or other criteria.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (name, address, phone, or email)",
        },
        status: {
          type: "string",
          description: "Filter by status",
          enum: ["lead", "prospect", "customer", "closed-won", "closed-lost"],
        },
        stage: {
          type: "string",
          description: "Filter by pipeline stage",
          enum: ["new", "contacted", "qualified", "proposal", "negotiation", "closed"],
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return (default: 10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "update_customer_stage",
    description: "Update a customer's pipeline stage.",
    parameters: {
      type: "object",
      properties: {
        customerId: {
          type: "string",
          description: "The customer ID",
        },
        stage: {
          type: "string",
          description: "New pipeline stage",
          enum: ["new", "contacted", "qualified", "proposal", "negotiation", "closed"],
        },
        notes: {
          type: "string",
          description: "Optional notes about the stage change",
        },
      },
      required: ["customerId", "stage"],
    },
  },
  {
    name: "schedule_followup",
    description: "Schedule a follow-up action for a customer.",
    parameters: {
      type: "object",
      properties: {
        customerId: {
          type: "string",
          description: "The customer ID",
        },
        action: {
          type: "string",
          description: "Description of the follow-up action",
        },
        date: {
          type: "string",
          description: "Date for the follow-up (ISO format)",
        },
        priority: {
          type: "string",
          description: "Priority level",
          enum: ["low", "medium", "high", "critical"],
        },
      },
      required: ["customerId", "action", "date"],
    },
  },

  // ===========================================================================
  // WEATHER TOOLS
  // ===========================================================================
  {
    name: "check_weather_events",
    description: "Check for recent weather events (hail, wind, storms) at a specific location.",
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Street address to check",
        },
        city: {
          type: "string",
          description: "City name",
        },
        state: {
          type: "string",
          description: "State abbreviation (e.g., PA, NJ)",
        },
        zipCode: {
          type: "string",
          description: "ZIP code",
        },
        daysBack: {
          type: "number",
          description: "Number of days to look back (default: 90)",
        },
      },
      required: ["zipCode"],
    },
  },
  {
    name: "get_storm_opportunities",
    description: "Get list of storm-affected areas with potential opportunities.",
    parameters: {
      type: "object",
      properties: {
        state: {
          type: "string",
          description: "State to search (e.g., PA, NJ, VA)",
        },
        severity: {
          type: "string",
          description: "Minimum severity to include",
          enum: ["minor", "moderate", "severe", "catastrophic"],
        },
        daysBack: {
          type: "number",
          description: "Number of days to look back (default: 30)",
        },
      },
      required: ["state"],
    },
  },

  // ===========================================================================
  // PROPERTY TOOLS
  // ===========================================================================
  {
    name: "get_property_details",
    description: "Get detailed property information from public records.",
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Property street address",
        },
        city: {
          type: "string",
          description: "City name",
        },
        state: {
          type: "string",
          description: "State abbreviation",
        },
        zipCode: {
          type: "string",
          description: "ZIP code",
        },
      },
      required: ["address", "city", "state"],
    },
  },
  {
    name: "estimate_roof_value",
    description: "Estimate the value of a roof replacement based on property details.",
    parameters: {
      type: "object",
      properties: {
        squareFootage: {
          type: "number",
          description: "Property square footage",
        },
        roofType: {
          type: "string",
          description: "Type of roofing material",
          enum: ["3-Tab Shingle", "Architectural Shingle", "Metal Standing Seam", "Slate", "Tile", "Cedar Shake"],
        },
        stories: {
          type: "number",
          description: "Number of stories (affects pitch/complexity)",
        },
        state: {
          type: "string",
          description: "State (affects labor costs)",
        },
      },
      required: ["squareFootage", "roofType"],
    },
  },

  // ===========================================================================
  // COMMUNICATION TOOLS
  // ===========================================================================
  {
    name: "generate_script",
    description: "Generate a customized sales script for a specific customer situation.",
    parameters: {
      type: "object",
      properties: {
        customerId: {
          type: "string",
          description: "Customer ID to personalize the script for",
        },
        scriptType: {
          type: "string",
          description: "Type of script to generate",
          enum: ["initial_contact", "follow_up", "objection_handling", "closing", "storm_outreach"],
        },
        objections: {
          type: "array",
          description: "Specific objections to address",
          items: {
            type: "string",
            description: "An objection text to address in the script",
          },
        },
      },
      required: ["customerId", "scriptType"],
    },
  },
  {
    name: "draft_email",
    description: "Draft a personalized email for a customer.",
    parameters: {
      type: "object",
      properties: {
        customerId: {
          type: "string",
          description: "Customer ID",
        },
        emailType: {
          type: "string",
          description: "Type of email",
          enum: ["introduction", "follow_up", "proposal", "thank_you", "storm_alert"],
        },
        customNotes: {
          type: "string",
          description: "Additional context to include",
        },
      },
      required: ["customerId", "emailType"],
    },
  },

  // ===========================================================================
  // ANALYTICS TOOLS
  // ===========================================================================
  {
    name: "get_pipeline_summary",
    description: "Get a summary of the current sales pipeline.",
    parameters: {
      type: "object",
      properties: {
        repId: {
          type: "string",
          description: "Filter by specific rep (optional)",
        },
        timeframe: {
          type: "string",
          description: "Time period to analyze",
          enum: ["today", "week", "month", "quarter", "year"],
        },
      },
    },
  },
  {
    name: "get_hot_leads",
    description: "Get list of high-priority leads requiring immediate attention.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of leads to return (default: 10)",
        },
        minScore: {
          type: "number",
          description: "Minimum lead score (default: 80)",
        },
      },
    },
  },
];

// =============================================================================
// TOOL EXECUTION
// =============================================================================

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

const toolHandlers: Record<string, ToolHandler> = {
  // ===========================================================================
  // CUSTOMER TOOLS
  // ===========================================================================

  get_customer: async (args) => {
    const customerId = args.customerId as string;
    
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        assignedRep: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        weatherEvents: {
          orderBy: { eventDate: "desc" },
          take: 10,
        },
        intelItems: {
          where: { isDismissed: false },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        interactions: {
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        tasks: {
          where: { status: { not: "completed" } },
          orderBy: { dueDate: "asc" },
          take: 5,
        },
        notes: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!customer) {
      return {
        success: false,
        error: `Customer not found: ${customerId}`,
        data: null,
      };
    }

    return {
      success: true,
      data: customer,
    };
  },

  search_customers: async (args) => {
    const query = (args.query as string).toLowerCase();
    const status = args.status as string | undefined;
    const stage = args.stage as string | undefined;
    const limit = (args.limit as number) || 10;

    const customers = await prisma.customer.findMany({
      where: {
        AND: [
          // Text search across multiple fields
          {
            OR: [
              { firstName: { contains: query, mode: "insensitive" } },
              { lastName: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
              { phone: { contains: query, mode: "insensitive" } },
              { address: { contains: query, mode: "insensitive" } },
              { city: { contains: query, mode: "insensitive" } },
              { zipCode: { contains: query, mode: "insensitive" } },
            ],
          },
          // Optional filters
          ...(status ? [{ status }] : []),
          ...(stage ? [{ stage }] : []),
        ],
      },
      include: {
        assignedRep: {
          select: { id: true, name: true },
        },
      },
      orderBy: { leadScore: "desc" },
      take: limit,
    });

    return {
      success: true,
      query,
      filters: { status, stage },
      count: customers.length,
      results: customers.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
        phone: c.phone,
        address: `${c.address}, ${c.city}, ${c.state} ${c.zipCode}`,
        status: c.status,
        stage: c.stage,
        leadScore: c.leadScore,
        estimatedJobValue: c.estimatedJobValue,
        assignedRep: c.assignedRep?.name || "Unassigned",
      })),
    };
  },

  update_customer_stage: async (args) => {
    const customerId = args.customerId as string;
    const newStage = args.stage as string;
    const notes = args.notes as string | undefined;

    // Get current customer data
    const current = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { stage: true, firstName: true, lastName: true },
    });

    if (!current) {
      return {
        success: false,
        error: `Customer not found: ${customerId}`,
      };
    }

    const previousStage = current.stage;

    // Update customer stage
    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: { stage: newStage },
    });

    // Log the activity (we'll use IntelItem as an activity log)
    await prisma.intelItem.create({
      data: {
        customerId,
        source: "system",
        category: "pipeline",
        title: "Stage Changed",
        content: `Pipeline stage updated from "${previousStage}" to "${newStage}"${notes ? `. Notes: ${notes}` : ""}`,
        actionable: false,
        priority: "low",
      },
    });

    return {
      success: true,
      message: `Updated ${current.firstName} ${current.lastName} from "${previousStage}" to "${newStage}"`,
      previousStage,
      newStage,
      customerId: updated.id,
    };
  },

  schedule_followup: async (args) => {
    const customerId = args.customerId as string;
    const action = args.action as string;
    const dateStr = args.date as string;
    const priority = (args.priority as string) || "medium";

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, firstName: true, lastName: true, assignedRepId: true },
    });

    if (!customer) {
      return {
        success: false,
        error: `Customer not found: ${customerId}`,
      };
    }

    // Create the task
    const task = await prisma.task.create({
      data: {
        customerId,
        title: action,
        description: `AI-scheduled follow-up: ${action}`,
        type: "follow-up",
        priority,
        status: "pending",
        dueDate: new Date(dateStr),
        assignedToId: customer.assignedRepId || "system",
        createdById: "ai-assistant",
      },
    });

    return {
      success: true,
      message: `Scheduled "${action}" for ${customer.firstName} ${customer.lastName} on ${new Date(dateStr).toLocaleDateString()}`,
      task: {
        id: task.id,
        title: task.title,
        dueDate: task.dueDate,
        priority: task.priority,
      },
    };
  },

  // ===========================================================================
  // WEATHER TOOLS
  // ===========================================================================

  check_weather_events: async (args) => {
    const zipCode = args.zipCode as string;
    const daysBack = (args.daysBack as number) || 90;
    const state = args.state as string | undefined;
    const city = args.city as string | undefined;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const events = await prisma.weatherEvent.findMany({
      where: {
        AND: [
          { eventDate: { gte: cutoffDate } },
          {
            OR: [
              { zipCode },
              ...(state ? [{ state }] : []),
              ...(city ? [{ city: { contains: city, mode: "insensitive" as const } }] : []),
            ],
          },
        ],
      },
      orderBy: { eventDate: "desc" },
      take: 20,
    });

    // Group by severity for summary
    const severityCounts = events.reduce((acc, e) => {
      acc[e.severity] = (acc[e.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      success: true,
      location: { zipCode, state, city },
      daysBack,
      totalEvents: events.length,
      severitySummary: severityCounts,
      events: events.map((e) => ({
        id: e.id,
        type: e.eventType,
        date: e.eventDate,
        severity: e.severity,
        hailSize: e.hailSize,
        windSpeed: e.windSpeed,
        damageReported: e.damageReported,
        source: e.source,
      })),
    };
  },

  get_storm_opportunities: async (args) => {
    const state = args.state as string;
    const severity = args.severity as string | undefined;
    const daysBack = (args.daysBack as number) || 30;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const severityOrder = ["minor", "moderate", "severe", "catastrophic"];
    const minSeverityIndex = severity ? severityOrder.indexOf(severity) : 0;
    const validSeverities = severityOrder.slice(minSeverityIndex);

    // Get weather events in the state
    const events = await prisma.weatherEvent.findMany({
      where: {
        state: { equals: state, mode: "insensitive" },
        eventDate: { gte: cutoffDate },
        severity: { in: validSeverities },
      },
      orderBy: { eventDate: "desc" },
    });

    // Get affected customers in those areas
    const affectedZips = [...new Set(events.map((e) => e.zipCode).filter(Boolean))] as string[];
    
    const affectedCustomers = await prisma.customer.findMany({
      where: {
        zipCode: { in: affectedZips },
        status: { in: ["lead", "prospect"] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        zipCode: true,
        city: true,
        leadScore: true,
        estimatedJobValue: true,
        stage: true,
      },
      orderBy: { leadScore: "desc" },
      take: 50,
    });

    // Group opportunities by ZIP code
    const opportunitiesByZip = affectedZips.reduce((acc, zip) => {
      const zipEvents = events.filter((e) => e.zipCode === zip);
      const zipCustomers = affectedCustomers.filter((c) => c.zipCode === zip);
      
      if (zipCustomers.length > 0) {
        acc[zip] = {
          zipCode: zip,
          city: zipEvents[0]?.city || zipCustomers[0]?.city,
          eventCount: zipEvents.length,
          worstSeverity: zipEvents.reduce((worst, e) => {
            return severityOrder.indexOf(e.severity) > severityOrder.indexOf(worst) ? e.severity : worst;
          }, "minor"),
          customerCount: zipCustomers.length,
          totalPotentialValue: zipCustomers.reduce((sum, c) => sum + (c.estimatedJobValue || 0), 0),
          customers: zipCustomers,
        };
      }
      return acc;
    }, {} as Record<string, unknown>);

    return {
      success: true,
      state,
      daysBack,
      minSeverity: severity || "minor",
      totalEvents: events.length,
      affectedZipCodes: affectedZips.length,
      totalOpportunities: affectedCustomers.length,
      opportunities: Object.values(opportunitiesByZip),
    };
  },

  // ===========================================================================
  // PROPERTY TOOLS (existing implementation)
  // ===========================================================================

  get_property_details: async (args) => {
    const address = args.address as string;
    const city = args.city as string;
    const state = args.state as string;
    const zipCode = args.zipCode as string | undefined;

    // Try to find cached property data
    const property = await prisma.propertyData.findFirst({
      where: {
        address: { contains: address, mode: "insensitive" },
        city: { contains: city, mode: "insensitive" },
        state: { equals: state, mode: "insensitive" },
        ...(zipCode ? { zipCode } : {}),
      },
    });

    if (property) {
      return {
        success: true,
        source: "cached",
        property: {
          address: property.address,
          city: property.city,
          state: property.state,
          zipCode: property.zipCode,
          propertyType: property.propertyType,
          yearBuilt: property.yearBuilt,
          squareFootage: property.squareFootage,
          lotSize: property.lotSize,
          stories: property.stories,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          assessedValue: property.assessedValue,
          marketValue: property.marketValue,
          roofType: property.roofType,
          roofYear: property.roofYear,
          roofCondition: property.roofCondition,
        },
      };
    }

    return {
      success: false,
      message: `No property data found for ${address}, ${city}, ${state}. Consider fetching from external API.`,
      property: null,
    };
  },

  estimate_roof_value: async (args) => {
    const basePricePerSqFt: Record<string, number> = {
      "3-Tab Shingle": 3.5,
      "Architectural Shingle": 4.5,
      "Metal Standing Seam": 12,
      "Slate": 20,
      "Tile": 15,
      "Cedar Shake": 10,
    };

    const sqft = args.squareFootage as number;
    const roofType = args.roofType as string;
    const basePrice = basePricePerSqFt[roofType] || 5;
    const roofSqFt = sqft * 1.1; // Roof is typically ~10% larger than floor area
    const estimate = roofSqFt * basePrice;

    return {
      success: true,
      estimate: {
        low: Math.round(estimate * 0.85),
        mid: Math.round(estimate),
        high: Math.round(estimate * 1.2),
      },
      details: {
        roofSquareFootage: Math.round(roofSqFt),
        pricePerSqFt: basePrice,
        roofType,
      },
    };
  },

  // ===========================================================================
  // COMMUNICATION TOOLS (placeholders - require AI generation)
  // ===========================================================================

  generate_script: async (args) => {
    const customerId = args.customerId as string;
    const scriptType = args.scriptType as string;

    // Get customer context for personalization
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        weatherEvents: { orderBy: { eventDate: "desc" }, take: 1 },
        interactions: { orderBy: { createdAt: "desc" }, take: 3 },
      },
    });

    if (!customer) {
      return {
        success: false,
        error: `Customer not found: ${customerId}`,
      };
    }

    return {
      success: true,
      message: `Script generation ready for ${customer.firstName} ${customer.lastName}`,
      scriptType,
      customerContext: {
        name: `${customer.firstName} ${customer.lastName}`,
        stage: customer.stage,
        recentStorm: customer.weatherEvents[0] || null,
        interactionCount: customer.interactions.length,
      },
      script: "Use AI to generate personalized script based on customer context",
    };
  },

  draft_email: async (args) => {
    const customerId = args.customerId as string;
    const emailType = args.emailType as string;

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        stage: true,
        city: true,
        state: true,
      },
    });

    if (!customer) {
      return {
        success: false,
        error: `Customer not found: ${customerId}`,
      };
    }

    return {
      success: true,
      emailType,
      recipient: {
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
      },
      email: {
        subject: "Email generation pending - use AI",
        body: "Use AI to generate personalized email based on customer context and email type",
      },
    };
  },

  // ===========================================================================
  // ANALYTICS TOOLS
  // ===========================================================================

  get_pipeline_summary: async (args) => {
    const repId = args.repId as string | undefined;
    const timeframe = (args.timeframe as string) || "month";

    // Calculate date range based on timeframe
    const now = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case "today":
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case "quarter":
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        break;
      case "year":
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setMonth(now.getMonth() - 1));
    }

    // Get customers grouped by stage
    const customers = await prisma.customer.groupBy({
      by: ["stage"],
      where: {
        ...(repId ? { assignedRepId: repId } : {}),
        updatedAt: { gte: startDate },
      },
      _count: { id: true },
      _sum: { estimatedJobValue: true },
    });

    // Get total pipeline
    const totals = await prisma.customer.aggregate({
      where: {
        ...(repId ? { assignedRepId: repId } : {}),
        status: { in: ["lead", "prospect", "customer"] },
      },
      _count: { id: true },
      _sum: { estimatedJobValue: true },
      _avg: { leadScore: true },
    });

    const byStage = customers.reduce((acc, row) => {
      acc[row.stage] = {
        count: row._count.id,
        value: row._sum.estimatedJobValue || 0,
      };
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    return {
      success: true,
      timeframe,
      repId: repId || "all",
      summary: {
        totalDeals: totals._count.id,
        totalValue: totals._sum.estimatedJobValue || 0,
        avgLeadScore: Math.round(totals._avg.leadScore || 0),
        byStage,
      },
    };
  },

  get_hot_leads: async (args) => {
    const limit = (args.limit as number) || 10;
    const minScore = (args.minScore as number) || 80;

    const leads = await prisma.customer.findMany({
      where: {
        status: { in: ["lead", "prospect"] },
        leadScore: { gte: minScore },
      },
      include: {
        assignedRep: {
          select: { id: true, name: true },
        },
        weatherEvents: {
          orderBy: { eventDate: "desc" },
          take: 1,
        },
        interactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: [
        { leadScore: "desc" },
        { urgencyScore: "desc" },
      ],
      take: limit,
    });

    return {
      success: true,
      minScore,
      count: leads.length,
      leads: leads.map((lead) => ({
        id: lead.id,
        name: `${lead.firstName} ${lead.lastName}`,
        phone: lead.phone,
        address: `${lead.city}, ${lead.state}`,
        leadScore: lead.leadScore,
        urgencyScore: lead.urgencyScore,
        stage: lead.stage,
        estimatedValue: lead.estimatedJobValue,
        assignedRep: lead.assignedRep?.name || "Unassigned",
        recentStorm: lead.weatherEvents[0]
          ? {
              type: lead.weatherEvents[0].eventType,
              date: lead.weatherEvents[0].eventDate,
              severity: lead.weatherEvents[0].severity,
            }
          : null,
        lastContact: lead.interactions[0]?.createdAt || null,
        daysSinceContact: lead.interactions[0]
          ? Math.floor((Date.now() - new Date(lead.interactions[0].createdAt).getTime()) / (1000 * 60 * 60 * 24))
          : null,
      })),
    };
  },
};

/**
 * Execute a tool by name
 */
export async function executeTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  const handler = toolHandlers[toolName];

  if (!handler) {
    return {
      toolCallId: "",
      name: toolName,
      result: null,
      error: `Unknown tool: ${toolName}`,
    };
  }

  try {
    const result = await handler(args);
    return {
      toolCallId: "",
      name: toolName,
      result,
    };
  } catch (error) {
    return {
      toolCallId: "",
      name: toolName,
      result: null,
      error: error instanceof Error ? error.message : "Tool execution failed",
    };
  }
}

/**
 * Get tool definitions by category
 */
export function getToolsByCategory(category: "customer" | "weather" | "property" | "communication" | "analytics"): ToolDefinition[] {
  const categoryPrefixes: Record<string, string[]> = {
    customer: ["get_customer", "search_customers", "update_customer", "schedule_followup"],
    weather: ["check_weather", "get_storm"],
    property: ["get_property", "estimate_roof"],
    communication: ["generate_script", "draft_email"],
    analytics: ["get_pipeline", "get_hot_leads"],
  };

  const prefixes = categoryPrefixes[category] || [];
  return AI_TOOLS.filter(tool => 
    prefixes.some(prefix => tool.name.startsWith(prefix))
  );
}
