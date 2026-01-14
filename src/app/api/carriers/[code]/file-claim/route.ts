/**
 * File Claim with Carrier API
 * 
 * POST /api/carriers/[code]/file-claim
 * Files a claim directly with the insurance carrier
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { carrierService } from "@/lib/services/carriers";
import type { ClaimSubmission, DamageArea } from "@/lib/services/carriers/types";
import { z } from "zod";

const fileClaimSchema = z.object({
  claimId: z.string(),
  
  // Policy info
  policyNumber: z.string().min(1),
  
  // Loss details
  lossDescription: z.string().min(10),
  causeOfLoss: z.enum([
    "hail", "wind", "tornado", "hurricane", "fire", "water",
    "lightning", "fallen-tree", "vandalism", "theft", "other"
  ]),
  
  // Damage areas
  damageAreas: z.array(z.object({
    type: z.string(),
    severity: z.enum(["minor", "moderate", "severe"]),
    description: z.string().optional(),
  })),
  
  // Additional info
  emergencyRepairsNeeded: z.boolean().default(false),
  temporaryRepairsCost: z.number().optional(),
  
  // Photos to include
  photoIds: z.array(z.string()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code: carrierCode } = await params;
    const body = await request.json();
    const validated = fileClaimSchema.parse(body);

    // Check carrier availability
    const isAvailable = await carrierService.isCarrierAvailable(carrierCode);
    if (!isAvailable) {
      return NextResponse.json(
        { error: `Carrier ${carrierCode} is not configured for direct filing` },
        { status: 400 }
      );
    }

    // Get claim with customer info
    const claim = await prisma.insuranceClaim.findUnique({
      where: { id: validated.claimId },
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
            propertyType: true,
            insuranceCarrier: true,
            policyNumber: true,
          },
        },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    if (claim.isFiledWithCarrier) {
      return NextResponse.json(
        { error: "Claim has already been filed with carrier" },
        { status: 400 }
      );
    }

    // Get photos if specified
    let photos: any[] = [];
    if (validated.photoIds && validated.photoIds.length > 0) {
      const photoRecords = await prisma.photo.findMany({
        where: { id: { in: validated.photoIds } },
        select: {
          url: true,
          filename: true,
          category: true,
          description: true,
          latitude: true,
          longitude: true,
          createdAt: true,
        },
      });

      photos = photoRecords.map(p => ({
        url: p.url,
        filename: p.filename,
        category: p.category,
        description: p.description,
        latitude: p.latitude,
        longitude: p.longitude,
        capturedAt: p.createdAt,
      }));
    }

    // Build claim submission
    const submission: ClaimSubmission = {
      policyNumber: validated.policyNumber || claim.customer.policyNumber || "",
      policyholderFirstName: claim.customer.firstName,
      policyholderLastName: claim.customer.lastName,
      policyholderEmail: claim.customer.email || undefined,
      policyholderPhone: claim.customer.phone || undefined,
      
      propertyAddress: claim.customer.address,
      propertyCity: claim.customer.city,
      propertyState: claim.customer.state,
      propertyZipCode: claim.customer.zipCode,
      propertyType: claim.customer.propertyType || undefined,
      
      dateOfLoss: claim.dateOfLoss,
      causeOfLoss: validated.causeOfLoss,
      lossDescription: validated.lossDescription,
      
      damageType: validated.damageAreas.map(a => a.type) as any[],
      damageAreas: validated.damageAreas as DamageArea[],
      emergencyRepairsNeeded: validated.emergencyRepairsNeeded,
      temporaryRepairsCost: validated.temporaryRepairsCost,
      
      initialEstimate: claim.initialEstimate || undefined,
      photos,
      
      internalClaimId: claim.id,
    };

    // File claim with carrier
    const result = await carrierService.fileClaim(claim.id, carrierCode, submission);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error?.message || "Failed to file claim" },
        { status: 500 }
      );
    }

    // Create intel item
    await prisma.intelItem.create({
      data: {
        customerId: claim.customer.id,
        source: "carrier-api",
        sourceId: claim.id,
        category: "insurance",
        title: `Claim filed with ${carrierCode}`,
        content: `Claim #${result.data?.claimNumber} filed successfully. ${result.data?.statusMessage || ""}`,
        priority: "high",
        actionable: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("[File Claim API] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to file claim with carrier" },
      { status: 500 }
    );
  }
}
