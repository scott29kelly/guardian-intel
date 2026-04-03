/**
 * Proposals API
 *
 * GET  /api/proposals - List proposals with pagination and filtering
 * POST /api/proposals - Generate and save a new proposal
 */

import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateProposal, saveProposal } from "@/lib/services/proposals/generator";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/proposals
 *
 * Query params:
 * - page: number (default 1)
 * - limit: number (default 20, max 100)
 * - status: ProposalStatus filter
 * - customerId: filter by customer
 */
export async function GET(request: Request) {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId, role } = session.user;
    const isAdmin = role === "admin" || role === "manager";
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const status = searchParams.get("status");
    const customerId = searchParams.get("customerId");

    // Build where clause - reps see only their own
    const where: Prisma.ProposalWhereInput = {};
    if (!isAdmin) {
      where.createdById = userId;
    }

    if (status) {
      // Validate status against known enum values
      const validStatuses = ["draft", "sent", "viewed", "accepted", "rejected", "expired", "revised"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      where.status = status as Prisma.ProposalWhereInput["status"];
    }

    if (customerId) {
      where.customerId = customerId;
    }

    const skip = (page - 1) * limit;

    const [proposals, total] = await Promise.all([
      prisma.proposal.findMany({
        where,
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.proposal.count({ where }),
    ]);

    return NextResponse.json({
      proposals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[API] GET /api/proposals error:", error);
    return NextResponse.json(
      { error: "Failed to fetch proposals" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/proposals
 *
 * Body:
 * - customerId: string (required)
 * - createdById?: string (defaults to session.user.id)
 * - materialGrade?: "economy" | "standard" | "premium" | "luxury"
 * - customDiscount?: { amount: number; reason: string }
 */
export async function POST(request: Request) {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { customerId, materialGrade, customDiscount } = body;

    if (!customerId || typeof customerId !== "string") {
      return NextResponse.json(
        { error: "customerId is required and must be a string" },
        { status: 400 }
      );
    }

    // Validate materialGrade if provided
    if (materialGrade) {
      const validGrades = ["economy", "standard", "premium", "luxury"];
      if (!validGrades.includes(materialGrade)) {
        return NextResponse.json(
          { error: `Invalid materialGrade. Must be one of: ${validGrades.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Validate customDiscount if provided
    if (customDiscount) {
      if (typeof customDiscount.amount !== "number" || customDiscount.amount < 0) {
        return NextResponse.json(
          { error: "customDiscount.amount must be a non-negative number" },
          { status: 400 }
        );
      }
      if (!customDiscount.reason || typeof customDiscount.reason !== "string") {
        return NextResponse.json(
          { error: "customDiscount.reason is required when providing a discount" },
          { status: 400 }
        );
      }
    }

    // Generate proposal
    const result = await generateProposal({
      customerId,
      createdById: userId,
      materialGrade,
      customDiscount,
    });

    if (!result.success || !result.proposal) {
      return NextResponse.json(
        { error: result.error || "Failed to generate proposal" },
        { status: 422 }
      );
    }

    // Save to database
    const saved = await saveProposal(result.proposal, userId);

    return NextResponse.json(
      {
        proposal: {
          id: saved.id,
          proposalNumber: saved.proposalNumber,
          customerId,
          status: "draft",
          title: result.proposal.aiContent.scopeOfWork
            ? `Roof Replacement Proposal - ${result.proposal.customer.firstName} ${result.proposal.customer.lastName}`
            : "New Proposal",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] POST /api/proposals error:", error);
    return NextResponse.json(
      { error: "Failed to create proposal" },
      { status: 500 }
    );
  }
}
