/**
 * Individual Proposal API
 * 
 * GET /api/proposals/[id] - Get a specific proposal
 * PUT /api/proposals/[id] - Update a proposal
 * DELETE /api/proposals/[id] - Delete a proposal
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
import { z } from "zod";

export const dynamic = "force-dynamic";

// Update schema
const updateProposalSchema = z.object({
  status: z.enum(["draft", "sent", "viewed", "accepted", "rejected", "expired"]).optional(),
  title: z.string().min(1).optional(),
  
  // Pricing adjustments
  discountAmount: z.number().min(0).optional(),
  discountReason: z.string().optional(),
  
  // Notes
  customerNotes: z.string().optional(),
  internalNotes: z.string().optional(),
  
  // Content overrides
  executiveSummary: z.string().optional(),
  scopeDetails: z.string().optional(),
  valueProposition: z.string().optional(),
  termsAndConditions: z.string().optional(),
  
  // Dates
  validUntil: z.string().datetime().optional(),
  estimatedStartDate: z.string().datetime().optional(),
  estimatedDuration: z.number().int().positive().optional(),
  
  // Signature
  signatureData: z.string().optional(),
  signedByName: z.string().optional(),
  signedByEmail: z.string().email().optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/proposals/[id]
 * 
 * Get a specific proposal with all details
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const { id } = await params;

    // Fetch proposal
    const proposal = await prisma.proposal.findUnique({
      where: { id },
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
            zipCode: true,
            propertyValue: true,
            insuranceCarrier: true,
          },
        },
      },
    });

    if (!proposal) {
      return NextResponse.json(
        { success: false, error: "Proposal not found" },
        { status: 404 }
      );
    }

    // Track view (for customer portal)
    const isExternalView = request.headers.get("x-proposal-view") === "customer";
    if (isExternalView && proposal.status === "sent") {
      await prisma.proposal.update({
        where: { id },
        data: {
          status: "viewed",
          viewedAt: proposal.viewedAt || new Date(),
          viewCount: { increment: 1 },
        },
      });
    }

    // Parse JSON fields
    const parsedProposal = {
      ...proposal,
      lineItems: proposal.lineItems ? JSON.parse(proposal.lineItems) : [],
      pricingOptions: proposal.pricingOptions ? JSON.parse(proposal.pricingOptions) : [],
      sourceDataSnapshot: proposal.sourceDataSnapshot ? JSON.parse(proposal.sourceDataSnapshot) : null,
      attachments: proposal.attachments ? JSON.parse(proposal.attachments) : [],
    };

    return NextResponse.json({
      success: true,
      data: parsedProposal,
    });
  } catch (error) {
    console.error("[API] GET /api/proposals/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch proposal" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/proposals/[id]
 * 
 * Update a proposal
 */
export async function PUT(request: Request, { params }: RouteParams) {
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

    const { id } = await params;

    // Check proposal exists
    const existing = await prisma.proposal.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Proposal not found" },
        { status: 404 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validation = updateProposalSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid update data",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const updates = validation.data;

    // Handle status transitions
    if (updates.status === "sent" && existing.status === "draft") {
      (updates as Record<string, unknown>).sentAt = new Date();
    }
    
    if (updates.signatureData) {
      (updates as Record<string, unknown>).signedAt = new Date();
      (updates as Record<string, unknown>).status = "accepted";
      (updates as Record<string, unknown>).respondedAt = new Date();
    }

    // Recalculate total if discount changed
    if (updates.discountAmount !== undefined && updates.discountAmount !== existing.discountAmount) {
      const newSubtotal = existing.subtotal - updates.discountAmount + existing.discountAmount;
      const newTaxAmount = newSubtotal * existing.taxRate;
      const newTotal = newSubtotal + newTaxAmount;
      
      (updates as Record<string, unknown>).subtotal = newSubtotal;
      (updates as Record<string, unknown>).taxAmount = newTaxAmount;
      (updates as Record<string, unknown>).totalPrice = newTotal;
    }

    // Update proposal
    const updated = await prisma.proposal.update({
      where: { id },
      data: updates,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Proposal updated successfully",
    });
  } catch (error) {
    console.error("[API] PUT /api/proposals/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update proposal" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/proposals/[id]
 * 
 * Delete a proposal
 */
export async function DELETE(request: Request, { params }: RouteParams) {
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

    const { id } = await params;

    // Check proposal exists
    const existing = await prisma.proposal.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Proposal not found" },
        { status: 404 }
      );
    }

    // Don't allow deleting accepted proposals
    if (existing.status === "accepted") {
      return NextResponse.json(
        { success: false, error: "Cannot delete an accepted proposal" },
        { status: 400 }
      );
    }

    // Delete proposal
    await prisma.proposal.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Proposal deleted successfully",
    });
  } catch (error) {
    console.error("[API] DELETE /api/proposals/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete proposal" },
      { status: 500 }
    );
  }
}
