/**
 * Single Contract API
 * 
 * GET    /api/contracts/[id] - Get contract details
 * PUT    /api/contracts/[id] - Update contract
 * DELETE /api/contracts/[id] - Cancel contract
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contractService } from "@/lib/services/contracts";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        customer: true,
        template: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Mark as viewed if customer is viewing
    if (contract.status === "sent") {
      await contractService.markViewed(id);
    }

    return NextResponse.json({
      data: {
        ...contract,
        materials: contract.materials ? JSON.parse(contract.materials) : [],
        auditLog: contract.auditLog ? JSON.parse(contract.auditLog) : [],
      },
    });
  } catch (error) {
    console.error("[Contract API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contract" },
      { status: 500 }
    );
  }
}

const updateSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  scopeOfWork: z.string().optional(),
  materials: z.array(z.string()).optional(),
  totalAmount: z.number().optional(),
  depositAmount: z.number().optional(),
  paymentTerms: z.string().optional(),
  estimatedStartDate: z.string().transform((s) => new Date(s)).optional(),
  estimatedEndDate: z.string().optional(),
  warrantyTerms: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateSchema.parse(body);

    const existing = await prisma.contract.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    if (existing.status !== "draft") {
      return NextResponse.json(
        { error: "Can only edit draft contracts" },
        { status: 400 }
      );
    }

    const updateData: any = { ...validated };
    if (validated.materials) {
      updateData.materials = JSON.stringify(validated.materials);
    }

    const contract = await prisma.contract.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: contract });
  } catch (error) {
    console.error("[Contract API] PUT error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update contract" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const reason = searchParams.get("reason") || undefined;

    await contractService.cancelContract(id, session.user.id, reason);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Contract API] DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cancel contract" },
      { status: 500 }
    );
  }
}
