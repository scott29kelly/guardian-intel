/**
 * Admin Activity Log API
 * 
 * GET /api/admin/activity - Query activity/audit logs
 * 
 * Query params:
 * - userId: Filter by user ID
 * - type: Filter by activity type
 * - entityType: Filter by entity type
 * - entityId: Filter by specific entity
 * - startDate: Filter from date (ISO string)
 * - endDate: Filter to date (ISO string)
 * - limit: Number of results (default: 50, max: 100)
 * - offset: Pagination offset
 * 
 * Security:
 * - Admin/manager role required
 * - Rate limited
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { auditService, type AuditEventType, type AuditEntityType } from "@/lib/services/audit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    // Auth check - admin/manager only
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "admin" && userRole !== "manager") {
      return NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    
    const filter = {
      userId: searchParams.get("userId") || undefined,
      type: (searchParams.get("type") as AuditEventType) || undefined,
      entityType: (searchParams.get("entityType") as AuditEntityType) || undefined,
      entityId: searchParams.get("entityId") || undefined,
      startDate: searchParams.get("startDate") 
        ? new Date(searchParams.get("startDate")!) 
        : undefined,
      endDate: searchParams.get("endDate") 
        ? new Date(searchParams.get("endDate")!) 
        : undefined,
      limit: Math.min(
        parseInt(searchParams.get("limit") || "50"),
        100
      ),
      offset: parseInt(searchParams.get("offset") || "0"),
    };

    const result = await auditService.query(filter);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[API] GET /api/admin/activity error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}
