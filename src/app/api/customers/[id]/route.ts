/**
 * Customer Detail API
 * 
 * GET /api/customers/[id] - Get customer by ID
 * PATCH /api/customers/[id] - Update customer
 * DELETE /api/customers/[id] - Delete customer (soft delete)
 * 
 * Security:
 * - Rate limited
 * - Input validated
 * - Authentication required via middleware
 * - Audit logged
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { cuidSchema, updateCustomerSchema, formatZodErrors } from "@/lib/validations";
import { getCustomerById, getCustomerWithDetails, updateCustomer, deleteCustomer } from "@/lib/data/customers";
import { createRequestAuditor, auditService } from "@/lib/services/audit";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/customers/[id]
 * 
 * Query params:
 * - details: boolean - Include full details (interactions, weather events, etc.)
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const { id } = await params;

    // Validate ID
    const idValidation = cuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: "Invalid customer ID" },
        { status: 400 }
      );
    }

    // Check for details flag
    const { searchParams } = new URL(request.url);
    const includeDetails = searchParams.get("details") === "true";

    const customer = includeDetails
      ? await getCustomerWithDetails(id)
      : await getCustomerById(id);

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("[API] GET /api/customers/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch customer" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/customers/[id]
 * 
 * Update customer fields
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const { id } = await params;

    // Validate ID
    const idValidation = cuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: "Invalid customer ID" },
        { status: 400 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validation = updateCustomerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid update data",
          details: formatZodErrors(validation.error),
        },
        { status: 400 }
      );
    }

    // Check customer exists
    const existing = await getCustomerById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    // Update customer
    const customer = await updateCustomer(id, validation.data);

    // Audit log significant changes
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const customerName = `${existing.firstName} ${existing.lastName}`;
      
      // Log stage changes specifically
      if (validation.data.stage && validation.data.stage !== existing.stage) {
        await auditService.logStageChange(
          session.user.id,
          id,
          existing.stage,
          validation.data.stage,
          customerName
        );
      }
      
      // Log assignment changes
      if (validation.data.assignedRepId && validation.data.assignedRepId !== existing.assignedRepId) {
        await auditService.logAssignment(
          session.user.id,
          id,
          existing.assignedRepId,
          validation.data.assignedRepId,
          customerName
        );
      }
      
      // Log general updates (for other field changes)
      const changedFields = Object.keys(validation.data).filter(
        (key) => key !== "stage" && key !== "assignedRepId"
      );
      if (changedFields.length > 0) {
        await auditService.logCrud(
          session.user.id,
          "update",
          "customer",
          id,
          customerName
        );
      }
    }

    return NextResponse.json({
      success: true,
      customer,
    });
  } catch (error) {
    console.error("[API] PATCH /api/customers/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update customer" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/customers/[id]
 * 
 * Soft delete customer (sets status to closed-lost)
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const { id } = await params;

    // Validate ID
    const idValidation = cuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: "Invalid customer ID" },
        { status: 400 }
      );
    }

    // Check customer exists
    const existing = await getCustomerById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    // Soft delete
    await deleteCustomer(id);

    // Audit log the deletion
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await auditService.logCrud(
        session.user.id,
        "delete",
        "customer",
        id,
        `${existing.firstName} ${existing.lastName}`
      );
    }

    return NextResponse.json({
      success: true,
      message: "Customer deleted",
    });
  } catch (error) {
    console.error("[API] DELETE /api/customers/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}
