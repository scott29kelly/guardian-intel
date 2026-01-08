/**
 * Guardian Intel AI Tools
 * 
 * Tool definitions for AI agents to interact with the system.
 */

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
  // These will be implemented with actual database/API calls
  // For now, they return mock data

  get_customer: async (args) => {
    // TODO: Implement actual customer lookup
    return {
      success: true,
      message: `Customer ${args.customerId} lookup - implementation pending`,
      data: null,
    };
  },

  search_customers: async (args) => {
    // TODO: Implement actual customer search
    return {
      success: true,
      message: `Searching for: ${args.query}`,
      results: [],
    };
  },

  update_customer_stage: async (args) => {
    // TODO: Implement actual stage update
    return {
      success: true,
      message: `Updated ${args.customerId} to stage: ${args.stage}`,
    };
  },

  schedule_followup: async (args) => {
    // TODO: Implement actual scheduling
    return {
      success: true,
      message: `Scheduled follow-up for ${args.customerId}: ${args.action} on ${args.date}`,
    };
  },

  check_weather_events: async (args) => {
    // TODO: Integrate with weather service
    return {
      success: true,
      message: `Weather check for ZIP ${args.zipCode}`,
      events: [],
    };
  },

  get_storm_opportunities: async (args) => {
    // TODO: Integrate with storm intel service
    return {
      success: true,
      message: `Storm opportunities in ${args.state}`,
      opportunities: [],
    };
  },

  get_property_details: async (args) => {
    // TODO: Integrate with property service
    return {
      success: true,
      message: `Property details for ${args.address}`,
      property: null,
    };
  },

  estimate_roof_value: async (args) => {
    // Simple estimation logic
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

  generate_script: async (args) => {
    // TODO: Generate actual script using AI
    return {
      success: true,
      message: `Script generation for ${args.customerId} (${args.scriptType})`,
      script: "Script generation pending implementation",
    };
  },

  draft_email: async (args) => {
    // TODO: Generate actual email using AI
    return {
      success: true,
      message: `Email draft for ${args.customerId} (${args.emailType})`,
      email: {
        subject: "Email subject pending",
        body: "Email body pending implementation",
      },
    };
  },

  get_pipeline_summary: async (args) => {
    // TODO: Implement actual pipeline analytics
    return {
      success: true,
      timeframe: args.timeframe || "month",
      summary: {
        totalDeals: 0,
        totalValue: 0,
        byStage: {},
      },
    };
  },

  get_hot_leads: async (args) => {
    // TODO: Implement actual hot leads query
    return {
      success: true,
      leads: [],
      count: 0,
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
