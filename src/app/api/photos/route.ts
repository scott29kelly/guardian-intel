/**
 * Photos API
 * 
 * POST /api/photos - Upload a new photo with GPS metadata
 * GET /api/photos - List photos with filters
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

// Photo upload schema
const photoUploadSchema = z.object({
  // Base64 encoded image data
  imageData: z.string().min(1),
  filename: z.string().optional(),
  mimeType: z.string().default("image/jpeg"),
  
  // Relationships
  customerId: z.string().optional(),
  claimId: z.string().optional(),
  
  // GPS Location
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  altitude: z.number().optional(),
  accuracy: z.number().optional(),
  heading: z.number().optional(),
  
  // Address (can be provided or will be reverse geocoded)
  capturedAddress: z.string().optional(),
  capturedCity: z.string().optional(),
  capturedState: z.string().optional(),
  capturedZipCode: z.string().optional(),
  
  // Categorization
  category: z.enum([
    "general", "damage", "before", "after", "roof", "siding",
    "gutter", "interior", "signature", "adjuster-meeting", "other"
  ]).default("general"),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  
  // Damage info
  damageType: z.enum(["hail", "wind", "water", "wear", "impact"]).optional(),
  damageSeverity: z.enum(["minor", "moderate", "severe"]).optional(),
  
  // Device info
  deviceType: z.enum(["mobile", "tablet", "desktop"]).optional(),
  deviceModel: z.string().optional(),
});

// Query params schema
const querySchema = z.object({
  customerId: z.string().optional(),
  claimId: z.string().optional(),
  category: z.string().optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = photoUploadSchema.parse(body);

    // Decode base64 image
    const base64Data = validated.imageData.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Generate unique filename
    const ext = validated.mimeType.split("/")[1] || "jpg";
    const uniqueId = uuidv4();
    const filename = validated.filename || `photo_${uniqueId}.${ext}`;
    const safeFilename = `${uniqueId}_${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), "public", "uploads", "photos");
    await mkdir(uploadsDir, { recursive: true });

    // Save file
    const filePath = join(uploadsDir, safeFilename);
    await writeFile(filePath, buffer);

    // Calculate dimensions (simplified - in production use sharp or similar)
    const size = buffer.length;
    
    // Public URL
    const url = `/uploads/photos/${safeFilename}`;

    // Reverse geocode if we have coordinates but no address
    let address = validated.capturedAddress;
    let city = validated.capturedCity;
    let state = validated.capturedState;
    let zipCode = validated.capturedZipCode;

    if (validated.latitude && validated.longitude && !address) {
      const geoResult = await reverseGeocode(validated.latitude, validated.longitude);
      if (geoResult) {
        address = geoResult.address;
        city = geoResult.city;
        state = geoResult.state;
        zipCode = geoResult.zipCode;
      }
    }

    // Create photo record
    const photo = await prisma.photo.create({
      data: {
        filename: safeFilename,
        originalName: validated.filename || filename,
        url,
        size,
        mimeType: validated.mimeType,
        
        customerId: validated.customerId,
        claimId: validated.claimId,
        uploadedById: session.user.id,
        
        latitude: validated.latitude,
        longitude: validated.longitude,
        altitude: validated.altitude,
        accuracy: validated.accuracy,
        heading: validated.heading,
        
        capturedAddress: address,
        capturedCity: city,
        capturedState: state,
        capturedZipCode: zipCode,
        
        category: validated.category,
        tags: validated.tags ? JSON.stringify(validated.tags) : null,
        description: validated.description,
        
        damageType: validated.damageType,
        damageSeverity: validated.damageSeverity,
        
        deviceType: validated.deviceType,
        deviceModel: validated.deviceModel,
      },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        type: "create",
        entityType: "photo",
        entityId: photo.id,
        description: `Uploaded ${validated.category} photo${validated.customerId ? " for customer" : ""}`,
        metadata: JSON.stringify({
          hasGPS: !!(validated.latitude && validated.longitude),
          category: validated.category,
          customerId: validated.customerId,
          claimId: validated.claimId,
        }),
      },
    });

    // If linked to customer, create intel item for significant photos
    if (validated.customerId && validated.category === "damage") {
      await prisma.intelItem.create({
        data: {
          customerId: validated.customerId,
          source: "photo",
          sourceId: photo.id,
          category: "property",
          title: `Damage photo captured`,
          content: `${validated.damageSeverity || "Unassessed"} ${validated.damageType || "damage"} documented at ${address || "property location"}`,
          priority: validated.damageSeverity === "severe" ? "high" : "medium",
          actionable: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: photo,
    });
  } catch (error) {
    console.error("[Photos API] Upload error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = querySchema.parse({
      customerId: searchParams.get("customerId"),
      claimId: searchParams.get("claimId"),
      category: searchParams.get("category"),
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    const where: any = {};

    if (params.customerId) {
      where.customerId = params.customerId;
    }
    if (params.claimId) {
      where.claimId = params.claimId;
    }
    if (params.category) {
      where.category = params.category;
    }

    const [photos, total] = await Promise.all([
      prisma.photo.findMany({
        where,
        include: {
          customer: {
            select: { id: true, firstName: true, lastName: true, address: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.photo.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: photos,
      meta: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit),
      },
    });
  } catch (error) {
    console.error("[Photos API] List error:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}

// Simple reverse geocoding using Nominatim (free, no API key)
async function reverseGeocode(lat: number, lon: number): Promise<{
  address: string;
  city: string;
  state: string;
  zipCode: string;
} | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      {
        headers: {
          "User-Agent": "GuardianIntel/1.0",
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const addr = data.address || {};

    return {
      address: [addr.house_number, addr.road].filter(Boolean).join(" ") || data.display_name?.split(",")[0] || "",
      city: addr.city || addr.town || addr.village || addr.municipality || "",
      state: addr.state || "",
      zipCode: addr.postcode || "",
    };
  } catch (error) {
    console.error("[Geocode] Reverse geocoding failed:", error);
    return null;
  }
}
