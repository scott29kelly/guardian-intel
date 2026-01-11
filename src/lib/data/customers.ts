/**
 * Customer Data Access Layer
 * 
 * Provides type-safe database operations for customers.
 * Replaces direct mock data usage with Prisma queries.
 */

import { prisma } from "@/lib/prisma";
import type { Customer, Prisma } from "@prisma/client";
import { CustomerQueryInput, CreateCustomerInput, UpdateCustomerInput } from "@/lib/validations";

// Types for query results
export interface CustomerWithRelations extends Customer {
  assignedRep?: {
    id: string;
    name: string;
    email: string;
  } | null;
  _count?: {
    interactions: number;
    weatherEvents: number;
    intelItems: number;
  };
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Get paginated customers with optional filtering
 */
export async function getCustomers(
  query: CustomerQueryInput
): Promise<PaginatedResult<CustomerWithRelations>> {
  const {
    page = 1,
    limit = 20,
    sortBy = "leadScore",
    sortOrder = "desc",
    search,
    status,
    stage,
    state,
    assignedRepId,
    minLeadScore,
    maxLeadScore,
    stormAffected,
  } = query;

  // Build where clause
  const where: Prisma.CustomerWhereInput = {};

  if (search) {
    // SQLite doesn't support case-insensitive mode, so we use contains
    // For PostgreSQL, add mode: "insensitive" to each filter
    const searchLower = search.toLowerCase();
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
      { address: { contains: search } },
      { city: { contains: search } },
    ];
  }

  if (status) where.status = status;
  if (stage) where.stage = stage;
  if (state) where.state = state;
  if (assignedRepId) where.assignedRepId = assignedRepId;

  if (minLeadScore !== undefined || maxLeadScore !== undefined) {
    where.leadScore = {};
    if (minLeadScore !== undefined) where.leadScore.gte = minLeadScore;
    if (maxLeadScore !== undefined) where.leadScore.lte = maxLeadScore;
  }

  if (stormAffected) {
    where.weatherEvents = { some: {} };
  }

  // Map sortBy to actual column names
  const sortColumn = mapSortColumn(sortBy);

  // Get total count
  const total = await prisma.customer.count({ where });

  // Get paginated data
  const customers = await prisma.customer.findMany({
    where,
    include: {
      assignedRep: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          interactions: true,
          weatherEvents: true,
          intelItems: true,
        },
      },
    },
    orderBy: { [sortColumn]: sortOrder },
    skip: (page - 1) * limit,
    take: limit,
  });

  const totalPages = Math.ceil(total / limit);

  return {
    data: customers,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Get a single customer by ID with all relations
 */
export async function getCustomerById(
  id: string
): Promise<CustomerWithRelations | null> {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      assignedRep: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          interactions: true,
          weatherEvents: true,
          intelItems: true,
          documents: true,
          notes: true,
          claims: true,
        },
      },
    },
  });
}

/**
 * Get customer with full details (for profile view)
 */
export async function getCustomerWithDetails(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      assignedRep: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatarUrl: true,
        },
      },
      interactions: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: {
            select: { name: true },
          },
        },
      },
      weatherEvents: {
        orderBy: { eventDate: "desc" },
        take: 5,
      },
      intelItems: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      notes: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          user: {
            select: { name: true },
          },
        },
      },
      claims: {
        orderBy: { createdAt: "desc" },
        take: 3,
      },
    },
  });
}

/**
 * Create a new customer
 */
export async function createCustomer(
  data: CreateCustomerInput,
  assignedRepId?: string
): Promise<Customer> {
  return prisma.customer.create({
    data: {
      ...data,
      assignedRepId,
      leadScore: calculateInitialLeadScore(data),
    },
  });
}

/**
 * Update a customer
 */
export async function updateCustomer(
  id: string,
  data: UpdateCustomerInput
): Promise<Customer> {
  return prisma.customer.update({
    where: { id },
    data,
  });
}

/**
 * Delete a customer (soft delete by setting status)
 */
export async function deleteCustomer(id: string): Promise<Customer> {
  return prisma.customer.update({
    where: { id },
    data: {
      status: "closed-lost",
      lostReason: "Deleted",
    },
  });
}

/**
 * Get customers affected by weather events in a specific area
 */
export async function getStormAffectedCustomers(options: {
  lat: number;
  lon: number;
  radiusMiles?: number;
  daysBack?: number;
}) {
  const { lat, lon, radiusMiles = 10, daysBack = 30 } = options;

  // Calculate bounding box (approximate)
  const latDelta = radiusMiles / 69; // ~69 miles per degree latitude
  const lonDelta = radiusMiles / (69 * Math.cos((lat * Math.PI) / 180));

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  return prisma.customer.findMany({
    where: {
      latitude: {
        gte: lat - latDelta,
        lte: lat + latDelta,
      },
      longitude: {
        gte: lon - lonDelta,
        lte: lon + lonDelta,
      },
      weatherEvents: {
        some: {
          eventDate: { gte: cutoffDate },
        },
      },
    },
    include: {
      weatherEvents: {
        where: { eventDate: { gte: cutoffDate } },
        orderBy: { eventDate: "desc" },
      },
      assignedRep: {
        select: { id: true, name: true },
      },
    },
    orderBy: { leadScore: "desc" },
  });
}

/**
 * Get customer statistics for dashboard
 */
export async function getCustomerStats(repId?: string) {
  const where: Prisma.CustomerWhereInput = repId
    ? { assignedRepId: repId }
    : {};

  const [
    total,
    byStatus,
    byStage,
    avgLeadScore,
    stormAffected,
  ] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.groupBy({
      by: ["status"],
      where,
      _count: true,
    }),
    prisma.customer.groupBy({
      by: ["stage"],
      where,
      _count: true,
    }),
    prisma.customer.aggregate({
      where,
      _avg: { leadScore: true },
    }),
    prisma.customer.count({
      where: {
        ...where,
        weatherEvents: { some: {} },
      },
    }),
  ]);

  return {
    total,
    byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
    byStage: Object.fromEntries(byStage.map((s) => [s.stage, s._count])),
    avgLeadScore: Math.round(avgLeadScore._avg.leadScore || 0),
    stormAffected,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function mapSortColumn(sortBy: string | undefined): string {
  const columnMap: Record<string, string> = {
    leadScore: "leadScore",
    urgencyScore: "urgencyScore",
    profitPotential: "profitPotential",
    name: "lastName",
    lastContact: "updatedAt",
    createdAt: "createdAt",
  };
  return columnMap[sortBy || "leadScore"] || "leadScore";
}

function calculateInitialLeadScore(data: CreateCustomerInput): number {
  let score = 50; // Base score

  // Boost for complete information
  if (data.email) score += 5;
  if (data.phone) score += 5;
  if (data.roofAge && data.roofAge > 15) score += 10;
  if (data.roofAge && data.roofAge > 20) score += 10;

  // Boost for property type
  if (data.propertyType === "Single Family") score += 5;

  // Boost for premium roof types (higher job value)
  const premiumRoofs = ["Slate", "Cedar Shake", "Metal"];
  if (data.roofType && premiumRoofs.includes(data.roofType)) score += 10;

  return Math.min(100, Math.max(0, score));
}
