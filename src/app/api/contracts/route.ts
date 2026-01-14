/**
 * Contracts API
 * 
 * GET  /api/contracts - List contracts
 * POST /api/contracts - Create contract
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contractService } from "@/lib/services/contracts";
import { z } from "zod";

const createContractSchema = z.object({
  customerId: z.string(),
  templateId: z.string().optional(),
  claimId: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  totalAmount: z.number().positive(),
  depositAmount: z.number().optional(),
  depositPercent: z.number().min(0).max(100).optional(),
  balanceDueOn: z.string().optional(),
  paymentTerms: z.string().optional(),
  scopeOfWork: z.string().optional(),
  materials: z.array(z.string()).optional(),
  laborDetails: z.string().optional(),
  estimatedStartDate: z.string().transform((s) => new Date(s)).optional(),
  estimatedEndDate: z.string().transform((s) => new Date(s)).optional(),
  warrantyTerms: z.string().optional(),
  expirationDays: z.number().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    // Non-admin users only see their contracts
    if (session.user.role !== "admin" && session.user.role !== "manager") {
      where.createdById = session.user.id;
    }

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
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
            },
          },
          createdBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contract.count({ where }),
    ]);

    return NextResponse.json({
      data: contracts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createContractSchema.parse(body);

    const result = await contractService.createContract(
      {
        ...validated,
        estimatedStartDate: validated.estimatedStartDate,
        estimatedEndDate: validated.estimatedEndDate,
      },
      session.user.id
    );

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error("[Contracts API] POST error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create contract" },
      { status: 500 }
    );
  }
}
