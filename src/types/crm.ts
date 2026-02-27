/**
 * Core CRM types for Customer, IntelItem, and WeatherEvent.
 *
 * These are the canonical UI-facing types used across components and services.
 * They are compatible with — but not identical to — the Prisma-generated types,
 * which carry additional DB-level fields.
 */

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  propertyType: string | null;
  yearBuilt: number | null;
  squareFootage: number | null;
  roofType: string | null;
  roofAge: number | null;
  propertyValue: number | null;
  insuranceCarrier: string | null;
  policyType: string | null;
  deductible: number | null;
  leadScore: number;
  urgencyScore?: number | null;
  profitPotential?: number | null;
  churnRisk?: number | null;
  status: string;
  stage: string;
  assignedRep?: string | { id: string; name: string; email: string } | null;
  lastContact?: Date | string;
  nextAction?: string;
  nextActionDate?: Date | string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IntelItem {
  id: string;
  customerId: string;
  source: string;
  category: string;
  title: string;
  content: string;
  confidence: number;
  actionable: boolean;
  priority: "low" | "medium" | "high" | "critical";
  createdAt: Date;
}

export interface WeatherEvent {
  id: string;
  customerId: string | null;
  eventType: string;
  eventDate: Date | string;
  severity: string;
  hailSize?: number | null;
  windSpeed?: number | null;
  damageReported: boolean;
  claimFiled: boolean;
}
