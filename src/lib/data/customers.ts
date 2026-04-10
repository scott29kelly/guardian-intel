/**
 * Customer Data Access Layer
 *
 * Provides type-safe database operations for customers.
 */

import { prisma } from "@/lib/prisma";
import type { Customer, Prisma } from "@prisma/client";
import { CustomerQueryInput, CreateCustomerInput, UpdateCustomerInput, BulkUpdateCustomersInput } from "@/lib/validations";
import { writeOutcomeEvent } from "@/lib/services/lead-intel";

// Types for query results
interface CustomerWithRelations extends Customer {
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

interface PaginatedResult<T> {
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
): Promise<PaginatedResult<any>> {
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

  // Get total count and paginated data in parallel
  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
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
    }),
  ]);

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
  // Capture previous stage/status BEFORE the update so the outcome payload
  // can show the before/after for explainability.
  const previous = (data.stage !== undefined || data.status !== undefined)
    ? await prisma.customer.findUnique({
        where: { id },
        select: { stage: true, status: true, trackedPropertyId: true },
      })
    : null;

  const updated = await prisma.customer.update({
    where: { id },
    data,
  });

  // LG-08: outcome write-back to lead-intel
  // Only fires when stage or status actually changed AND the customer is
  // bridged to a TrackedProperty. Best-effort — writeOutcomeEvent itself
  // swallows and logs any errors so a lead-intel failure cannot break the
  // customer update hot path.
  if (previous?.trackedPropertyId) {
    if (data.stage !== undefined && data.stage !== previous.stage) {
      await writeOutcomeEvent({
        trackedPropertyId: previous.trackedPropertyId,
        eventType: "customer-stage-changed",
        sourceMutationId: `customer:${id}:stage:${updated.updatedAt.toISOString()}`,
        payload: {
          customerId: id,
          fromStage: previous.stage,
          toStage: updated.stage,
        },
      });
    }
    if (data.status !== undefined && data.status !== previous.status) {
      await writeOutcomeEvent({
        trackedPropertyId: previous.trackedPropertyId,
        eventType: "customer-status-changed",
        sourceMutationId: `customer:${id}:status:${updated.updatedAt.toISOString()}`,
        payload: {
          customerId: id,
          fromStatus: previous.status,
          toStatus: updated.status,
        },
      });
    }
  }

  return updated;
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
 * Bulk update customers
 */
export async function bulkUpdateCustomers(
  ids: string[],
  updates: BulkUpdateCustomersInput["updates"]
): Promise<{ count: number }> {
  // LG-08: outcome write-back to lead-intel
  // Bulk update hot path — capture previous stage/status only when a field
  // we care about is actually being changed.
  const outcomeRelevant = updates.stage !== undefined || updates.status !== undefined;
  const previousRows = outcomeRelevant
    ? await prisma.customer.findMany({
        where: { id: { in: ids } },
        select: { id: true, stage: true, status: true, trackedPropertyId: true },
      })
    : [];

  const result = await prisma.customer.updateMany({
    where: { id: { in: ids } },
    data: {
      ...(updates.status && { status: updates.status }),
      ...(updates.stage && { stage: updates.stage }),
      ...(updates.assignedRepId !== undefined && { assignedRepId: updates.assignedRepId }),
    },
  });

  // LG-08: outcome write-back to lead-intel — fire one event per customer
  // whose stage or status actually changed
  if (outcomeRelevant) {
    const now = new Date();
    for (const prev of previousRows) {
      if (!prev.trackedPropertyId) continue;
      if (updates.stage && updates.stage !== prev.stage) {
        await writeOutcomeEvent({
          trackedPropertyId: prev.trackedPropertyId,
          eventType: "customer-stage-changed",
          sourceMutationId: `customer:${prev.id}:stage:bulk:${now.toISOString()}`,
          payload: { customerId: prev.id, fromStage: prev.stage, toStage: updates.stage },
        });
      }
      if (updates.status && updates.status !== prev.status) {
        await writeOutcomeEvent({
          trackedPropertyId: prev.trackedPropertyId,
          eventType: "customer-status-changed",
          sourceMutationId: `customer:${prev.id}:status:bulk:${now.toISOString()}`,
          payload: { customerId: prev.id, fromStatus: prev.status, toStatus: updates.status },
        });
      }
    }
  }

  return { count: result.count };
}

/**
 * Bulk delete customers (soft delete by setting status)
 */
export async function bulkDeleteCustomers(ids: string[]): Promise<{ count: number }> {
  const result = await prisma.customer.updateMany({
    where: { id: { in: ids } },
    data: {
      status: "closed-lost",
      lostReason: "Bulk deleted",
    },
  });

  return { count: result.count };
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

// =============================================================================
// LG-08 FOLLOW-UP: Canvassing outcome write-back
// =============================================================================
//
// The CanvassingPin.appointmentDate and CanvassingPin.outcome fields are
// mutated in src/app/api/canvassing/** and in the SalesRabbit sync code.
// Those paths are out of scope for Phase 8 Plan 08-03 (the planner limited
// this task to the central customer data layer). A follow-up micro-phase
// should insert writeOutcomeEvent calls into the canvassing mutation paths
// with eventType = "canvassing-appointment-set" and
// eventType = "canvassing-outcome-recorded". The writeOutcomeEvent helper
// (src/lib/services/lead-intel/scoring/outcomes.ts) is ready to receive them.
//
// Tracked as a STATE.md TODO at end of Phase 8.
//
// LG-08: outcome write-back to lead-intel
