/**
 * Proposal Preview API
 *
 * POST /api/proposals/preview - Generate a proposal preview without saving
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateProposal } from "@/lib/services/proposals/generator";

export const dynamic = "force-dynamic";

/**
 * POST /api/proposals/preview
 *
 * Generates a full proposal object (with pricing, damage assessment, AI content, etc.)
 * but does NOT persist it to the database. Useful for previewing before committing.
 *
 * Body:
 * - customerId: string (required)
 * - materialGrade?: "economy" | "standard" | "premium" | "luxury"
 * - customDiscount?: { amount: number; reason: string }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const userId = (session.user as unknown as { id: string }).id;

    const result = await generateProposal({
      customerId,
      createdById: userId,
      materialGrade,
      customDiscount,
    });

    if (!result.success || !result.proposal) {
      return NextResponse.json(
        { error: result.error || "Failed to generate proposal preview" },
        { status: 422 }
      );
    }

    // Return the generated proposal without saving
    return NextResponse.json({ proposal: result.proposal });
  } catch (error) {
    console.error("[API] POST /api/proposals/preview error:", error);
    return NextResponse.json(
      { error: "Failed to generate proposal preview" },
      { status: 500 }
    );
  }
}
