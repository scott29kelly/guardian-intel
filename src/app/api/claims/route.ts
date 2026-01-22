/**
 * Claims API - List and Create
 * 
 * GET /api/claims - List claims with filters
 * POST /api/claims - Create a new claim
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { claimCreateSchema } from "@/lib/validations";

// =============================================================================
// GET - List Claims
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse query params
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const status = searchParams.get("status");
    const carrier = searchParams.get("carrier");
    const customerId = searchParams.get("customerId");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "updatedAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";
    const repId = searchParams.get("repId");

    // Build where clause
    const where: Record<string, unknown> = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (carrier && carrier !== "all") {
      where.carrier = { contains: carrier, mode: "insensitive" };
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (repId) {
      where.customer = { assignedRepId: repId };
    }

    if (search) {
      where.OR = [
        { claimNumber: { contains: search, mode: "insensitive" } },
        { carrier: { contains: search, mode: "insensitive" } },
        { customer: { firstName: { contains: search, mode: "insensitive" } } },
        { customer: { lastName: { contains: search, mode: "insensitive" } } },
        { customer: { address: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Query claims
    const [claims, total] = await Promise.all([
      prisma.insuranceClaim.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              address: true,
              city: true,
              state: true,
              zipCode: true,
              phone: true,
              email: true,
              assignedRep: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.insuranceClaim.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: claims,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("[Claims API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch claims" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Create Claim
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = claimCreateSchema.parse(body);

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: validated.customerId },
      select: { id: true, firstName: true, lastName: true, insuranceCarrier: true },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Create the claim
    const claim = await prisma.insuranceClaim.create({
      data: {
        customerId: validated.customerId,
        carrier: validated.carrier,
        dateOfLoss: validated.dateOfLoss,
        claimType: validated.claimType,
        claimNumber: validated.claimNumber,
        status: validated.status,
        initialEstimate: validated.initialEstimate,
        deductible: validated.deductible,
        adjusterName: validated.adjusterName,
        adjusterPhone: validated.adjusterPhone,
        adjusterEmail: validated.adjusterEmail,
        adjusterCompany: validated.adjusterCompany,
        inspectionDate: validated.inspectionDate,
        notes: validated.notes,
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            address: true,
            city: true,
            state: true,
          },
        },
      },
    });

    // Log the activity
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        type: "create",
        entityType: "claim",
        entityId: claim.id,
        description: `Created claim for ${customer.firstName} ${customer.lastName} (${validated.carrier})`,
      },
    });

    // Also create an intel item for the customer
    await prisma.intelItem.create({
      data: {
        customerId: validated.customerId,
        source: "system",
        category: "insurance",
        title: "Insurance Claim Filed",
        content: `New ${validated.claimType} claim filed with ${validated.carrier}. Date of loss: ${validated.dateOfLoss.toLocaleDateString()}`,
        actionable: true,
        priority: "high",
      },
    });

    return NextResponse.json({
      success: true,
      data: claim,
    });
  } catch (error) {
    console.error("[Claims API] Create error:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create claim" },
      { status: 500 }
    );
  }
}
