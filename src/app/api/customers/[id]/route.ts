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
import { requireSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { cuidSchema, updateCustomerSchema, formatZodErrors } from "@/lib/validations";
import { getCustomerById, getCustomerWithDetails, updateCustomer, deleteCustomer } from "@/lib/data/customers";
import { auditService } from "@/lib/services/audit";

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

    const session = await requireSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: userId, role } = session.user;
    const isAdmin = role === "admin" || role === "manager";
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

    if (!isAdmin && customer.assignedRepId !== userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
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

    const session = await requireSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: userId, role } = session.user;
    const isAdmin = role === "admin" || role === "manager";
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

    // Check customer exists and ownership
    const existing = await getCustomerById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    if (!isAdmin && existing.assignedRepId !== userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    // Update customer
    const customer = await updateCustomer(id, validation.data);

    // Audit log significant changes
    const customerName = `${existing.firstName} ${existing.lastName}`;

    // Log stage changes specifically
    if (validation.data.stage && validation.data.stage !== existing.stage) {
      await auditService.logStageChange(
        userId,
        id,
        existing.stage,
        validation.data.stage,
        customerName
      );
    }

    // Log assignment changes
    if (validation.data.assignedRepId && validation.data.assignedRepId !== existing.assignedRepId) {
      await auditService.logAssignment(
        userId,
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
        userId,
        "update",
        "customer",
        id,
        customerName
      );
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

    const session = await requireSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: userId, role } = session.user;
    const isAdmin = role === "admin" || role === "manager";
    const { id } = await params;

    // Validate ID
    const idValidation = cuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: "Invalid customer ID" },
        { status: 400 }
      );
    }

    // Check customer exists and ownership
    const existing = await getCustomerById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    if (!isAdmin && existing.assignedRepId !== userId) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    // Soft delete
    await deleteCustomer(id);

    // Audit log the deletion
    await auditService.logCrud(
      userId,
      "delete",
      "customer",
      id,
      `${existing.firstName} ${existing.lastName}`
    );

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
