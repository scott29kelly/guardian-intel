/**
 * Bulk Customers API
 * 
 * PATCH /api/customers/bulk - Bulk update customers (status, stage, assignment)
 * DELETE /api/customers/bulk - Bulk delete customers
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
import { bulkUpdateCustomersSchema, bulkDeleteCustomersSchema, formatZodErrors } from "@/lib/validations";
import { bulkUpdateCustomers, bulkDeleteCustomers } from "@/lib/data/customers";
import { createRequestAuditor } from "@/lib/services/audit";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/customers/bulk
 * 
 * Bulk update customers with status, stage, or assignedRepId
 */
export async function PATCH(request: Request) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    // Get session for audit trail
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validation = bulkUpdateCustomersSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid bulk update data",
          details: formatZodErrors(validation.error),
        },
        { status: 400 }
      );
    }

    const { ids, updates } = validation.data;

    // Perform bulk update
    const result = await bulkUpdateCustomers(ids, updates);

    // Audit log the bulk action
    const auditor = createRequestAuditor(
      session.user.id,
      new Headers(request.headers)
    );
    
    // Determine action type for logging
    let actionDesc = "update";
    if (updates.stage) actionDesc = `stage change to ${updates.stage}`;
    else if (updates.status) actionDesc = `status change to ${updates.status}`;
    else if (updates.assignedRepId) actionDesc = "reassignment";
    
    await auditor.logBulkAction(actionDesc, "customer", ids, {
      updates,
      successCount: result.count,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${result.count} customers`,
      count: result.count,
    });
  } catch (error) {
    console.error("[API] PATCH /api/customers/bulk error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to bulk update customers" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/customers/bulk
 * 
 * Bulk delete (soft delete) customers
 */
export async function DELETE(request: Request) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    // Get session for audit trail
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validation = bulkDeleteCustomersSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid bulk delete data",
          details: formatZodErrors(validation.error),
        },
        { status: 400 }
      );
    }

    const { ids } = validation.data;

    // Perform bulk delete
    const result = await bulkDeleteCustomers(ids);

    // Audit log the bulk delete
    const auditor = createRequestAuditor(
      session.user.id,
      new Headers(request.headers)
    );
    await auditor.logBulkAction("delete", "customer", ids, {
      successCount: result.count,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.count} customers`,
      count: result.count,
    });
  } catch (error) {
    console.error("[API] DELETE /api/customers/bulk error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to bulk delete customers" },
      { status: 500 }
    );
  }
}
