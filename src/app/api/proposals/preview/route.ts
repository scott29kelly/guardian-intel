/**
 * Proposal Preview API
 * 
 * POST /api/proposals/preview - Generate a proposal preview without saving
 * 
 * This allows the UI to show a preview before the user commits to saving.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { generateProposal } from "@/lib/services/proposals";
import { z } from "zod";

export const dynamic = "force-dynamic";

const previewProposalSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  materialGrade: z.enum(["economy", "standard", "premium", "luxury"]).optional(),
  specificMaterial: z.string().optional(),
  customDiscount: z.object({
    amount: z.number().positive(),
    reason: z.string().min(1),
  }).optional(),
  includeInsuranceAssistance: z.boolean().optional(),
  urgencyLevel: z.enum(["standard", "high", "urgent"]).optional(),
});

/**
 * POST /api/proposals/preview
 * 
 * Generate a proposal preview without saving to database
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
    const validation = previewProposalSchema.safeParse(body);

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

    // Generate proposal (but don't save)
    const result = await generateProposal({
      ...validation.data,
      createdById: userId,
    });

    if (!result.success || !result.proposal) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to generate proposal preview" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.proposal,
      message: "Preview generated successfully",
    });
  } catch (error) {
    console.error("[API] POST /api/proposals/preview error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate proposal preview" },
      { status: 500 }
    );
  }
}
