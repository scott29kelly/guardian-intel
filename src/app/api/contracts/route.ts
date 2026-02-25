/**
 * Contracts API - List and Create
 *
 * GET  /api/contracts - List contracts with pagination and optional status filter
 * POST /api/contracts - Create a new contract
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contractService, type ContractData } from "@/lib/services/contracts";

export const dynamic = "force-dynamic";

// =============================================================================
// GET - List Contracts
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const status = searchParams.get("status");

    // Build where clause - scope to current user's contracts
    const where: Record<string, unknown> = { createdById: userId };

    if (status && status !== "all") {
      where.status = status;
    }

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contract.count({ where }),
    ]);

    return NextResponse.json({
      contracts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[Contracts API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contracts" },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Create Contract
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    // Validate required fields
    if (!body.customerId || typeof body.customerId !== "string") {
      return NextResponse.json(
        { error: "customerId is required" },
        { status: 400 }
      );
    }

    if (!body.title || typeof body.title !== "string") {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }

    if (body.totalAmount == null || typeof body.totalAmount !== "number" || body.totalAmount < 0) {
      return NextResponse.json(
        { error: "totalAmount must be a non-negative number" },
        { status: 400 }
      );
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: body.customerId },
      select: { id: true },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    const contractData: ContractData = {
      customerId: body.customerId,
      templateId: body.templateId,
      claimId: body.claimId,
      title: body.title,
      description: body.description,
      totalAmount: body.totalAmount,
      depositAmount: body.depositAmount,
      depositPercent: body.depositPercent,
      balanceDueOn: body.balanceDueOn,
      paymentTerms: body.paymentTerms,
      scopeOfWork: body.scopeOfWork,
      materials: body.materials,
      laborDetails: body.laborDetails,
      estimatedStartDate: body.estimatedStartDate ? new Date(body.estimatedStartDate) : undefined,
      estimatedEndDate: body.estimatedEndDate ? new Date(body.estimatedEndDate) : undefined,
      warrantyTerms: body.warrantyTerms,
      expirationDays: body.expirationDays,
    };

    const result = await contractService.createContract(contractData, userId);

    return NextResponse.json(
      { contract: { id: result.id, contractNumber: result.contractNumber } },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Contracts API] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create contract" },
      { status: 500 }
    );
  }
}
