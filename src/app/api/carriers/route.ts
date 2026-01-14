/**
 * Carriers API
 * 
 * GET /api/carriers - Get available carriers
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { carrierService, carrierNames } from "@/lib/services/carriers";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const carriers = await carrierService.getAvailableCarriers();
    
    // Add display names
    const carriersWithNames = carriers.map(c => ({
      ...c,
      displayName: carrierNames[c.code] || c.name,
    }));

    // Also include carriers without configuration for UI purposes
    const allCarriers = Object.entries(carrierNames).map(([code, name]) => {
      const configured = carriersWithNames.find(c => c.code === code);
      return configured || {
        code,
        name,
        displayName: name,
        supportsDirectFiling: false,
        supportsStatusUpdates: false,
        isTestMode: true,
        isConfigured: false,
      };
    });

    return NextResponse.json({
      success: true,
      data: allCarriers,
    });
  } catch (error) {
    console.error("[Carriers API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch carriers" },
      { status: 500 }
    );
  }
}
