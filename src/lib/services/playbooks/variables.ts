/**
 * Playbook Variables Service
 * 
 * Parses and resolves dynamic variables in playbook content.
 * Variables follow the pattern: {VARIABLE_NAME}
 * 
 * Available variables:
 * - {CUSTOMER_NAME} - Full name (FirstName LastName)
 * - {CUSTOMER_FIRST_NAME} - First name only
 * - {CUSTOMER_LAST_NAME} - Last name only
 * - {CUSTOMER_PHONE} - Phone number
 * - {CUSTOMER_EMAIL} - Email address
 * - {PROPERTY_ADDRESS} - Full property address
 * - {PROPERTY_CITY} - City
 * - {PROPERTY_STATE} - State
 * - {PROPERTY_ZIP} - ZIP code
 * - {INSURANCE_CARRIER} - Insurance company name
 * - {INSURANCE_DEDUCTIBLE} - Deductible amount
 * - {ROOF_TYPE} - Type of roof
 * - {ROOF_AGE} - Estimated roof age in years
 * - {PROPERTY_VALUE} - Estimated property value
 * - {LEAD_SCORE} - Customer's lead score (0-100)
 * - {STAGE} - Current pipeline stage
 * - {STORM_DATE} - Most recent storm event date
 * - {STORM_TYPE} - Most recent storm type
 * - {REP_NAME} - Sales rep's name
 * - {TODAY_DATE} - Current date
 */

import { prisma } from "@/lib/prisma";

// Variable definition with metadata
export interface VariableDefinition {
  name: string;
  label: string;
  description: string;
  category: "customer" | "property" | "insurance" | "weather" | "system";
  example: string;
}

// All available variables
export const PLAYBOOK_VARIABLES: VariableDefinition[] = [
  // Customer variables
  {
    name: "CUSTOMER_NAME",
    label: "Customer Name",
    description: "Full name of the customer",
    category: "customer",
    example: "John Smith",
  },
  {
    name: "CUSTOMER_FIRST_NAME",
    label: "First Name",
    description: "Customer's first name",
    category: "customer",
    example: "John",
  },
  {
    name: "CUSTOMER_LAST_NAME",
    label: "Last Name",
    description: "Customer's last name",
    category: "customer",
    example: "Smith",
  },
  {
    name: "CUSTOMER_PHONE",
    label: "Phone Number",
    description: "Customer's phone number",
    category: "customer",
    example: "(215) 555-0123",
  },
  {
    name: "CUSTOMER_EMAIL",
    label: "Email Address",
    description: "Customer's email",
    category: "customer",
    example: "john.smith@email.com",
  },

  // Property variables
  {
    name: "PROPERTY_ADDRESS",
    label: "Property Address",
    description: "Full street address",
    category: "property",
    example: "123 Oak Street",
  },
  {
    name: "PROPERTY_CITY",
    label: "City",
    description: "Property city",
    category: "property",
    example: "Philadelphia",
  },
  {
    name: "PROPERTY_STATE",
    label: "State",
    description: "Property state",
    category: "property",
    example: "PA",
  },
  {
    name: "PROPERTY_ZIP",
    label: "ZIP Code",
    description: "Property ZIP code",
    category: "property",
    example: "19103",
  },
  {
    name: "PROPERTY_VALUE",
    label: "Property Value",
    description: "Estimated property value",
    category: "property",
    example: "$425,000",
  },
  {
    name: "ROOF_TYPE",
    label: "Roof Type",
    description: "Type of roofing material",
    category: "property",
    example: "Architectural Shingle",
  },
  {
    name: "ROOF_AGE",
    label: "Roof Age",
    description: "Estimated age of the roof",
    category: "property",
    example: "15 years",
  },

  // Insurance variables
  {
    name: "INSURANCE_CARRIER",
    label: "Insurance Carrier",
    description: "Insurance company name",
    category: "insurance",
    example: "State Farm",
  },
  {
    name: "INSURANCE_DEDUCTIBLE",
    label: "Deductible",
    description: "Insurance deductible amount",
    category: "insurance",
    example: "$1,000",
  },

  // Weather variables
  {
    name: "STORM_DATE",
    label: "Storm Date",
    description: "Most recent storm event date",
    category: "weather",
    example: "January 5, 2026",
  },
  {
    name: "STORM_TYPE",
    label: "Storm Type",
    description: "Type of storm event",
    category: "weather",
    example: "Hail (1.25\")",
  },

  // System variables
  {
    name: "LEAD_SCORE",
    label: "Lead Score",
    description: "Customer's lead score (0-100)",
    category: "system",
    example: "85",
  },
  {
    name: "STAGE",
    label: "Pipeline Stage",
    description: "Current pipeline stage",
    category: "system",
    example: "Qualified",
  },
  {
    name: "REP_NAME",
    label: "Rep Name",
    description: "Sales rep's name",
    category: "system",
    example: "Sarah Mitchell",
  },
  {
    name: "TODAY_DATE",
    label: "Today's Date",
    description: "Current date",
    category: "system",
    example: "January 16, 2026",
  },
];

// Get variables grouped by category
export function getVariablesByCategory() {
  const groups: Record<string, VariableDefinition[]> = {
    customer: [],
    property: [],
    insurance: [],
    weather: [],
    system: [],
  };

  for (const variable of PLAYBOOK_VARIABLES) {
    groups[variable.category].push(variable);
  }

  return groups;
}

// Parse content to find all variable placeholders
export function parseVariables(content: string): string[] {
  const regex = /\{([A-Z_]+)\}/g;
  const matches = content.matchAll(regex);
  const variables: string[] = [];

  for (const match of matches) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  return variables;
}

// Check if content contains variables
export function hasVariables(content: string): boolean {
  return /\{[A-Z_]+\}/.test(content);
}

// Variable values interface
export interface VariableValues {
  [key: string]: string | number | null | undefined;
}

// Resolve variables from customer data
export async function resolveCustomerVariables(
  customerId: string,
  userId?: string
): Promise<VariableValues> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      assignedRep: { select: { name: true } },
      weatherEvents: {
        orderBy: { eventDate: "desc" },
        take: 1,
      },
    },
  });

  if (!customer) {
    return {};
  }

  const values: VariableValues = {
    // Customer
    CUSTOMER_NAME: `${customer.firstName} ${customer.lastName}`,
    CUSTOMER_FIRST_NAME: customer.firstName,
    CUSTOMER_LAST_NAME: customer.lastName,
    CUSTOMER_PHONE: customer.phone || undefined,
    CUSTOMER_EMAIL: customer.email || undefined,

    // Property
    PROPERTY_ADDRESS: customer.address,
    PROPERTY_CITY: customer.city,
    PROPERTY_STATE: customer.state,
    PROPERTY_ZIP: customer.zipCode,
    PROPERTY_VALUE: customer.propertyValue
      ? `$${customer.propertyValue.toLocaleString()}`
      : undefined,
    ROOF_TYPE: customer.roofType || undefined,
    ROOF_AGE: customer.roofAge ? `${customer.roofAge} years` : undefined,

    // Insurance
    INSURANCE_CARRIER: customer.insuranceCarrier || undefined,
    INSURANCE_DEDUCTIBLE: customer.deductible
      ? `$${customer.deductible.toLocaleString()}`
      : undefined,

    // System
    LEAD_SCORE: customer.leadScore.toString(),
    STAGE: formatStage(customer.stage),
    REP_NAME: customer.assignedRep?.name || undefined,
    TODAY_DATE: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };

  // Weather
  if (customer.weatherEvents.length > 0) {
    const storm = customer.weatherEvents[0];
    values.STORM_DATE = new Date(storm.eventDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    values.STORM_TYPE = formatStormType(storm);
  }

  return values;
}

// Replace variables in content with actual values
export function replaceVariables(
  content: string,
  values: VariableValues,
  options: {
    preserveUnresolved?: boolean;
    highlightUnresolved?: boolean;
  } = {}
): string {
  const { preserveUnresolved = false, highlightUnresolved = false } = options;

  return content.replace(/\{([A-Z_]+)\}/g, (match, variableName) => {
    const value = values[variableName];

    if (value !== undefined && value !== null) {
      return String(value);
    }

    if (preserveUnresolved) {
      return match;
    }

    if (highlightUnresolved) {
      return `[${variableName}]`;
    }

    // Find the variable definition for a friendly fallback
    const def = PLAYBOOK_VARIABLES.find((v) => v.name === variableName);
    return def ? `[${def.label}]` : `[${variableName}]`;
  });
}

// Get preview with example values
export function getPreviewWithExamples(content: string): string {
  const exampleValues: VariableValues = {};

  for (const variable of PLAYBOOK_VARIABLES) {
    exampleValues[variable.name] = variable.example;
  }

  return replaceVariables(content, exampleValues);
}

// Helper: Format stage name
function formatStage(stage: string): string {
  const stageMap: Record<string, string> = {
    new: "New Lead",
    contacted: "Contacted",
    qualified: "Qualified",
    proposal: "Proposal",
    negotiation: "Negotiation",
    closed: "Closed",
  };
  return stageMap[stage] || stage;
}

// Helper: Format storm type with details
function formatStormType(storm: {
  eventType: string;
  hailSize?: number | null;
  windSpeed?: number | null;
}): string {
  let type = storm.eventType.charAt(0).toUpperCase() + storm.eventType.slice(1);

  if (storm.eventType === "hail" && storm.hailSize) {
    type += ` (${storm.hailSize}")`;
  } else if (
    (storm.eventType === "wind" || storm.eventType === "thunderstorm") &&
    storm.windSpeed
  ) {
    type += ` (${storm.windSpeed} mph)`;
  }

  return type;
}
