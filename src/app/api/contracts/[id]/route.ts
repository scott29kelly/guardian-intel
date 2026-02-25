/**
 * Single Contract API - Get, Update, Delete
 *
 * GET    /api/contracts/[id] - Get contract by ID with customer and template
 * PUT    /api/contracts/[id] - Update contract (draft only)
 * DELETE /api/contracts/[id] - Delete contract (draft only)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

// =============================================================================
// GET - Get Contract by ID
// =============================================================================

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
        template: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ contract });
  } catch (error) {
    console.error("[Contract API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch contract" },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT - Update Contract (draft only)
// =============================================================================

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Fetch existing contract to check status
    const existing = await prisma.contract.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    if (existing.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft contracts can be updated" },
        { status: 400 }
      );
    }

    // Whitelist of updatable fields
    const allowedFields: Record<string, (v: unknown) => unknown> = {
      title: (v) => (typeof v === "string" ? v : undefined),
      description: (v) => (typeof v === "string" ? v : undefined),
      totalAmount: (v) => (typeof v === "number" ? v : undefined),
      depositAmount: (v) => (typeof v === "number" ? v : undefined),
      depositPercent: (v) => (typeof v === "number" ? v : undefined),
      balanceDueOn: (v) => (typeof v === "string" ? v : undefined),
      paymentTerms: (v) => (typeof v === "string" ? v : undefined),
      scopeOfWork: (v) => (typeof v === "string" ? v : undefined),
      materials: (v) => (typeof v === "string" ? v : Array.isArray(v) ? JSON.stringify(v) : undefined),
      laborDetails: (v) => (typeof v === "string" ? v : undefined),
      estimatedStartDate: (v) => (v ? new Date(v as string) : undefined),
      estimatedEndDate: (v) => (v ? new Date(v as string) : undefined),
      warrantyTerms: (v) => (typeof v === "string" ? v : undefined),
      templateId: (v) => (typeof v === "string" ? v : undefined),
      claimId: (v) => (typeof v === "string" ? v : undefined),
    };

    const data: Record<string, unknown> = {};
    for (const [key, transform] of Object.entries(allowedFields)) {
      if (key in body) {
        const value = transform(body[key]);
        if (value !== undefined) {
          data[key] = value;
        }
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const contract = await prisma.contract.update({
      where: { id },
      data,
    });

    return NextResponse.json({ contract });
  } catch (error) {
    console.error("[Contract API] PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update contract" },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Delete Contract (draft only)
// =============================================================================

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Fetch existing contract to check status
    const existing = await prisma.contract.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 }
      );
    }

    if (existing.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft contracts can be deleted" },
        { status: 400 }
      );
    }

    await prisma.contract.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Contract API] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete contract" },
      { status: 500 }
    );
  }
}
