/**
 * Proposals API
 * 
 * GET /api/proposals - List proposals with filtering
 * POST /api/proposals - Generate and save a new proposal
 * 
 * Security:
 * - Rate limited
 * - Authentication required
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { generateProposal, saveProposal } from "@/lib/services/proposals";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Validation schemas
const proposalQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  customerId: z.string().optional(),
  status: z.enum(["draft", "sent", "viewed", "accepted", "rejected", "expired"]).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "totalPrice", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const generateProposalSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  materialGrade: z.enum(["economy", "standard", "premium", "luxury"]).optional(),
  specificMaterial: z.string().optional(),
  customDiscount: z.object({
    amount: z.number().positive(),
    reason: z.string().min(1),
  }).optional(),
  includeInsuranceAssistance: z.boolean().optional(),
  includeFinancingOptions: z.boolean().optional(),
  urgencyLevel: z.enum(["standard", "high", "urgent"]).optional(),
});

/**
 * GET /api/proposals
 * 
 * List proposals with optional filtering
 */
export async function GET(request: Request) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    // Get session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    const validation = proposalQuerySchema.safeParse(queryParams);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "Invalid query parameters" },
        { status: 400 }
      );
    }

    const { page, limit, customerId, status, sortBy, sortOrder } = validation.data;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    // Fetch proposals
    const [proposals, total] = await Promise.all([
      prisma.proposal.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              address: true,
              city: true,
              state: true,
            },
          },
        },
      }),
      prisma.proposal.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: proposals,
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
    console.error("[API] GET /api/proposals error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch proposals" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/proposals
 * 
 * Generate and save a new proposal
 */
export async function POST(request: Request) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    // Get session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID not found" },
        { status: 401 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validation = generateProposalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request data",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Generate proposal
    const result = await generateProposal({
      ...validation.data,
      createdById: userId,
    });

    if (!result.success || !result.proposal) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to generate proposal" },
        { status: 400 }
      );
    }

    // Save proposal
    const saved = await saveProposal(result.proposal, userId);

    // Fetch the complete saved proposal
    const proposal = await prisma.proposal.findUnique({
      where: { id: saved.id },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: proposal,
      message: `Proposal ${saved.proposalNumber} generated successfully`,
    });
  } catch (error) {
    console.error("[API] POST /api/proposals error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate proposal" },
      { status: 500 }
    );
  }
}
