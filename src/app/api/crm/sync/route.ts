/**
 * CRM Sync API
 * 
 * POST /api/crm/sync - Trigger CRM synchronization
 * GET /api/crm/sync - Get sync status
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmAdapter } from "@/lib/services/crm";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const crmAdapter = getCrmAdapter();
    
    // Test connection and get status
    const isConnected = await crmAdapter.testConnection();
    
    // Get sync status if the adapter supports it
    const syncStatus = "getSyncStatus" in crmAdapter 
      ? (crmAdapter as any).getSyncStatus() 
      : { isDemoMode: true, provider: "unknown" };

    return NextResponse.json({
      success: true,
      status: {
        connected: isConnected,
        ...syncStatus,
        lastSync: null, // Could be stored in database
      },
    });
  } catch (error) {
    console.error("[API] GET /api/crm/sync error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get CRM status" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user has permission (manager only)
    const userRole = (session.user as any)?.role;
    if (userRole !== "manager" && userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Only managers can trigger CRM sync" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { direction, entityType } = body;

    if (!direction || !["from", "to"].includes(direction)) {
      return NextResponse.json(
        { success: false, error: "Invalid direction. Use 'from' or 'to'" },
        { status: 400 }
      );
    }

    if (!entityType || !["customers", "deals", "interactions"].includes(entityType)) {
      return NextResponse.json(
        { success: false, error: "Invalid entityType. Use 'customers', 'deals', or 'interactions'" },
        { status: 400 }
      );
    }

    const crmAdapter = getCrmAdapter();
    let result;

    if (direction === "from") {
      result = await crmAdapter.syncFromCrm(entityType);
    } else {
      // For sync to CRM, get IDs of recently updated records
      const { ids } = body;
      if (!ids || !Array.isArray(ids)) {
        return NextResponse.json(
          { success: false, error: "IDs array required for sync to CRM" },
          { status: 400 }
        );
      }
      result = await crmAdapter.syncToCrm(entityType, ids);
    }

    return NextResponse.json({
      success: result.success,
      result,
    });
  } catch (error) {
    console.error("[API] POST /api/crm/sync error:", error);
    return NextResponse.json(
      { success: false, error: "CRM sync failed" },
      { status: 500 }
    );
  }
}
