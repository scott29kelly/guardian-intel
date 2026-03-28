/**
 * POST /api/decks/schedule
 * 
 * Queue a deck generation job for a customer.
 * The worker script will pick this up and process it.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Templates that don't require a specific customer (rep-scoped)
const REP_SCOPED_TEMPLATES = ["morning-digest"];

// Templates that need expanded claim data (carrier comparables)
const CARRIER_INTEL_TEMPLATES = ["adjuster-war-room"];

// Templates that need photo data
const PHOTO_TEMPLATES = ["homeowner-trust-builder"];

// Templates that need multi-customer neighborhood data
const NEIGHBORHOOD_TEMPLATES = ["storm-command-center"];

// Request validation schema
// Artifact config validation (matches ArtifactConfig type from deck.types.ts)
const artifactConfigSchema = z.object({
  type: z.enum(["slide-deck", "audio", "infographic", "report"]),
  enabled: z.boolean(),
  format: z.enum(["detailed", "presenter"]).optional(),
  length: z.enum(["default", "short"]).optional(),
  downloadFormat: z.enum(["pdf", "pptx"]).optional(),
  audioFormat: z.enum(["deep-dive", "brief", "critique", "debate"]).optional(),
  audioLength: z.enum(["short", "default", "long"]).optional(),
  style: z.enum(["auto", "professional", "bento-grid", "editorial", "sketch-note", "instructional", "scientific", "bricks", "clay", "anime", "kawaii"]).optional(),
  detail: z.enum(["concise", "standard", "detailed"]).optional(),
  orientation: z.enum(["landscape", "portrait", "square"]).optional(),
  reportFormat: z.enum(["briefing-doc", "study-guide", "blog-post", "custom"]).optional(),
  appendInstructions: z.string().optional(),
  description: z.string().optional(),
});

const scheduleRequestSchema = z.object({
  customerId: z.string().min(1).optional(), // Optional for rep-scoped templates
  repId: z.string().optional(), // For rep-scoped templates (defaults to session user)
  templateId: z.string().default("sales-deck"), // Default template
  templateName: z.string().default("Sales Presentation"),
  assignedToId: z.string().optional(), // For manager bulk scheduling
  scheduledFor: z.string().datetime().optional(), // Schedule for later
  // Multi-artifact support
  requestedArtifacts: z.array(z.string()).optional(), // e.g. ["slide-deck", "audio"]
  artifactConfigs: z.array(artifactConfigSchema).optional(), // Per-artifact settings
}).refine(
  (data) => {
    // customerId required unless it's a rep-scoped template
    if (!data.customerId && !REP_SCOPED_TEMPLATES.includes(data.templateId)) {
      return false;
    }
    return true;
  },
  { message: "Customer ID is required for this template type" }
);

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = scheduleRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { customerId, repId, templateId, templateName, assignedToId, scheduledFor, requestedArtifacts, artifactConfigs } = validationResult.data;
    const isRepScoped = REP_SCOPED_TEMPLATES.includes(templateId);

    // =========================================================================
    // REP-SCOPED TEMPLATES (e.g., morning-digest) — fetch multiple customers
    // =========================================================================
    if (isRepScoped) {
      const targetRepId = repId || session.user.id;

      // Auto-expire stale rep-scoped jobs
      const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
      await prisma.scheduledDeck.updateMany({
        where: {
          templateId,
          requestedById: targetRepId,
          OR: [
            { status: "processing", updatedAt: { lt: fifteenMinAgo } },
            { status: "pending", updatedAt: { lt: thirtyMinAgo } },
          ],
        },
        data: { status: "failed", errorMessage: "Auto-expired: exceeded maximum processing time" },
      });

      // Check for existing pending/processing digest for this rep
      const existingJob = await prisma.scheduledDeck.findFirst({
        where: {
          templateId,
          requestedById: targetRepId,
          status: { in: ["pending", "processing"] },
        },
      });

      if (existingJob) {
        return NextResponse.json(
          {
            error: "A digest is already being generated",
            existingJobId: existingJob.id,
            status: existingJob.status,
          },
          { status: 409 }
        );
      }

      // Fetch rep's top priority customers
      const repCustomers = await prisma.customer.findMany({
        where: {
          OR: [
            { assignedRepId: targetRepId },
            { assignedRepId: null }, // Unassigned customers visible to all
          ],
          status: { notIn: ["closed-lost"] },
        },
        orderBy: [
          { urgencyScore: "desc" },
          { leadScore: "desc" },
        ],
        take: 8,
        include: {
          interactions: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          intelItems: {
            where: { isDismissed: false },
            orderBy: { createdAt: "desc" },
            take: 3,
          },
          weatherEvents: {
            orderBy: { eventDate: "desc" },
            take: 2,
          },
        },
      });

      const rep = await prisma.user.findUnique({
        where: { id: targetRepId },
        select: { id: true, name: true, email: true },
      });

      const requestPayload = {
        repId: targetRepId,
        repName: rep?.name || "Sales Rep",
        customers: repCustomers.map((c) => ({
          id: c.id,
          name: `${c.firstName} ${c.lastName}`,
          address: `${c.address}, ${c.city}, ${c.state} ${c.zipCode}`,
          urgencyScore: c.urgencyScore,
          leadScore: c.leadScore,
          stage: c.stage,
          status: c.status,
          estimatedJobValue: c.estimatedJobValue,
          roofAge: c.roofAge,
          insuranceCarrier: c.insuranceCarrier,
          lastInteraction: c.interactions[0] ? {
            date: c.interactions[0].createdAt,
            type: c.interactions[0].type,
            outcome: c.interactions[0].outcome,
            nextAction: c.interactions[0].nextAction,
            nextActionDate: c.interactions[0].nextActionDate,
          } : null,
          recentIntel: c.intelItems.map((item) => `[${item.priority}] ${item.title}`),
          recentStorms: c.weatherEvents.map((e) =>
            `${e.eventType} (${e.severity}) — ${new Date(e.eventDate).toLocaleDateString()}`
          ),
        })),
        generatedAt: new Date().toISOString(),
        templateId,
      };

      // Resolve user ID
      let userId = session.user.id;
      const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!userExists) {
        userId = rep?.id || (await prisma.user.findFirst({ select: { id: true } }))?.id || userId;
      }

      // Include artifact configs in the request payload for the worker
      if (artifactConfigs) {
        requestPayload.artifactConfigs = artifactConfigs;
      }

      const scheduledDeck = await prisma.scheduledDeck.create({
        data: {
          customerId: repCustomers[0]?.id || "rep-digest",
          customerName: `Morning Digest — ${rep?.name || "Rep"}`,
          templateId,
          templateName,
          requestedById: userId,
          assignedToId: assignedToId || userId,
          status: "pending",
          requestPayload: JSON.stringify(requestPayload),
          scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
          estimatedSlides: 7,
          requestedArtifacts: requestedArtifacts || ["slide-deck"],
        },
      });

      return NextResponse.json({
        success: true,
        job: {
          id: scheduledDeck.id,
          status: scheduledDeck.status,
          customerId: scheduledDeck.customerId,
          customerName: scheduledDeck.customerName,
          templateName: scheduledDeck.templateName,
          scheduledFor: scheduledDeck.scheduledFor,
          createdAt: scheduledDeck.createdAt,
        },
        message: "Digest generation queued successfully",
      });
    }

    // =========================================================================
    // CUSTOMER-SCOPED TEMPLATES (standard path)
    // =========================================================================

    // Build template-aware include for the customer query
    const customerInclude: Record<string, unknown> = {
      assignedRep: {
        select: { id: true, name: true, email: true },
      },
      claims: {
        orderBy: { createdAt: "desc" },
        take: CARRIER_INTEL_TEMPLATES.includes(templateId) ? 20 : 3,
      },
      weatherEvents: {
        orderBy: { eventDate: "desc" },
        take: 5,
      },
      intelItems: {
        where: { isDismissed: false },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    };

    // Add photos for templates that need them
    if (PHOTO_TEMPLATES.includes(templateId)) {
      customerInclude.photos = {
        orderBy: { createdAt: "desc" },
        take: 10,
      };
    }

    // Fetch customer to validate existence and get data for the deck
    const customer = await prisma.customer.findUnique({
      where: { id: customerId! },
      include: customerInclude,
    }) as any;

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Auto-expire stale jobs (processing >15min or pending >30min)
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
    await prisma.scheduledDeck.updateMany({
      where: {
        customerId: customerId!,
        OR: [
          { status: "processing", updatedAt: { lt: fifteenMinAgo } },
          { status: "pending", updatedAt: { lt: thirtyMinAgo } },
        ],
      },
      data: { status: "failed", errorMessage: "Auto-expired: exceeded maximum processing time" },
    });

    // Check for existing pending/processing deck for this customer
    const existingJob = await prisma.scheduledDeck.findFirst({
      where: {
        customerId: customerId!,
        status: { in: ["pending", "processing"] },
      },
    });

    if (existingJob) {
      return NextResponse.json(
        {
          error: "A deck is already being generated for this customer",
          existingJobId: existingJob.id,
          status: existingJob.status,
        },
        { status: 409 } // Conflict
      );
    }

    // Build the request payload with all customer context
    const requestPayload: Record<string, unknown> = {
      customer: {
        id: customer.id,
        name: `${customer.firstName} ${customer.lastName}`,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone,
        address: {
          street: customer.address,
          city: customer.city,
          state: customer.state,
          zipCode: customer.zipCode,
          county: customer.county,
        },
        property: {
          type: customer.propertyType,
          yearBuilt: customer.yearBuilt,
          squareFootage: customer.squareFootage,
          lotSize: customer.lotSize,
          stories: customer.stories,
          bedrooms: customer.bedrooms,
          bathrooms: customer.bathrooms,
          value: customer.propertyValue,
        },
        roof: {
          type: customer.roofType,
          age: customer.roofAge,
          squares: customer.roofSquares,
          pitch: customer.roofPitch,
          condition: customer.roofCondition,
          lastWork: customer.lastRoofWork,
        },
        insurance: {
          carrier: customer.insuranceCarrier,
          policyNumber: customer.policyNumber,
          policyType: customer.policyType,
          deductible: customer.deductible,
          claimHistory: customer.claimHistory,
        },
        scores: {
          lead: customer.leadScore,
          urgency: customer.urgencyScore,
          profitPotential: customer.profitPotential,
          churnRisk: customer.churnRisk,
          engagement: customer.engagementScore,
        },
        pipeline: {
          status: customer.status,
          stage: customer.stage,
          leadSource: customer.leadSource,
          estimatedJobValue: customer.estimatedJobValue,
        },
        assignedRep: customer.assignedRep,
      },
      recentClaims: customer.claims.map((claim: any) => ({
        id: claim.id,
        carrier: claim.carrier,
        dateOfLoss: claim.dateOfLoss,
        claimType: claim.claimType,
        status: claim.status,
        approvedValue: claim.approvedValue,
        supplementCount: claim.supplementCount,
        supplementValue: claim.supplementValue,
      })),
      weatherEvents: customer.weatherEvents.map((event: any) => ({
        id: event.id,
        type: event.eventType,
        date: event.eventDate,
        severity: event.severity,
        hailSize: event.hailSize,
        windSpeed: event.windSpeed,
      })),
      intelItems: customer.intelItems.map((item: any) => ({
        id: item.id,
        category: item.category,
        title: item.title,
        content: item.content,
        priority: item.priority,
        confidence: item.confidence,
      })),
      generatedAt: new Date().toISOString(),
      templateId,
    };

    // Add photos if fetched
    if (customer.photos) {
      requestPayload.photos = customer.photos.map((p: any) => ({
        id: p.id,
        url: p.url,
        category: p.category,
        description: p.description,
        aiAnalysis: p.aiAnalysis,
        createdAt: p.createdAt,
      }));
    }

    // Fetch comparable claims for carrier intel templates
    if (CARRIER_INTEL_TEMPLATES.includes(templateId) && customer.insuranceCarrier) {
      const comparableClaims = await prisma.insuranceClaim.findMany({
        where: {
          carrier: customer.insuranceCarrier,
          status: { in: ["approved", "paid"] },
          customer: {
            zipCode: customer.zipCode,
            id: { not: customer.id },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          customer: {
            select: { address: true, city: true, roofType: true, roofAge: true },
          },
        },
      });

      requestPayload.comparableClaims = comparableClaims.map((c: any) => ({
        id: c.id,
        carrier: c.carrier,
        dateOfLoss: c.dateOfLoss,
        claimType: c.claimType,
        status: c.status,
        approvedValue: c.approvedValue,
        supplementCount: c.supplementCount,
        supplementValue: c.supplementValue,
        property: {
          address: c.customer?.address,
          city: c.customer?.city,
          roofType: c.customer?.roofType,
          roofAge: c.customer?.roofAge,
        },
      }));

      // Compute carrier stats for this zip
      const allCarrierClaims = await prisma.insuranceClaim.findMany({
        where: {
          carrier: customer.insuranceCarrier,
          customer: { zipCode: customer.zipCode },
        },
        select: {
          status: true,
          approvedValue: true,
          supplementCount: true,
          supplementValue: true,
        },
      });

      const approved = allCarrierClaims.filter((c: any) => ["approved", "paid"].includes(c.status));
      const withSupplements = allCarrierClaims.filter((c: any) => (c.supplementCount || 0) > 0);
      const supplemented = withSupplements.filter((c: any) => (c.supplementValue || 0) > 0);

      requestPayload.carrierStats = {
        carrier: customer.insuranceCarrier,
        zipCode: customer.zipCode,
        totalClaims: allCarrierClaims.length,
        approvedClaims: approved.length,
        deniedClaims: allCarrierClaims.filter((c: any) => c.status === "denied").length,
        avgApprovedValue: approved.length > 0
          ? Math.round(approved.reduce((sum: number, c: any) => sum + (c.approvedValue || 0), 0) / approved.length)
          : 0,
        avgSupplementValue: supplemented.length > 0
          ? Math.round(supplemented.reduce((sum: number, c: any) => sum + (c.supplementValue || 0), 0) / supplemented.length)
          : 0,
        supplementSuccessRate: withSupplements.length > 0
          ? supplemented.length / withSupplements.length
          : 0,
      };
    }

    // Fetch neighborhood customers for storm command center
    if (NEIGHBORHOOD_TEMPLATES.includes(templateId)) {
      const neighborhoodCustomers = await prisma.customer.findMany({
        where: {
          zipCode: customer.zipCode,
          id: { not: customer.id },
          status: { notIn: ["closed-lost"] },
        },
        orderBy: [
          { urgencyScore: "desc" },
          { leadScore: "desc" },
        ],
        take: 15,
        include: {
          weatherEvents: {
            orderBy: { eventDate: "desc" },
            take: 1,
          },
        },
      });

      requestPayload.neighborhoodCustomers = neighborhoodCustomers.map((c: any) => ({
        name: `${c.firstName} ${c.lastName}`,
        address: `${c.address}, ${c.city}, ${c.state} ${c.zipCode}`,
        roofAge: c.roofAge,
        roofType: c.roofType,
        roofCondition: c.roofCondition,
        insuranceCarrier: c.insuranceCarrier,
        urgencyScore: c.urgencyScore,
        leadScore: c.leadScore,
        profitPotential: c.profitPotential,
        estimatedJobValue: c.estimatedJobValue,
        status: c.status,
        stage: c.stage,
        latitude: c.latitude,
        longitude: c.longitude,
        recentStormExposure: c.weatherEvents[0]
          ? `${c.weatherEvents[0].eventType} (${c.weatherEvents[0].severity}) — ${new Date(c.weatherEvents[0].eventDate).toLocaleDateString()}`
          : undefined,
      }));
    }

    // Resolve user ID — demo bypass sessions use fake IDs like "demo-rep"
    // that don't exist in the User table. Fall back to assigned rep or first user.
    let userId = session.user.id;
    const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!userExists) {
      userId = customer.assignedRepId || (await prisma.user.findFirst({ select: { id: true } }))?.id || userId;
    }

    // Include artifact configs in the request payload for the worker
    if (artifactConfigs) {
      requestPayload.artifactConfigs = artifactConfigs;
    }

    // Create the scheduled deck job
    const scheduledDeck = await prisma.scheduledDeck.create({
      data: {
        customerId: customer.id,
        customerName: `${customer.firstName} ${customer.lastName}`,
        templateId,
        templateName,
        requestedById: userId,
        assignedToId: assignedToId || customer.assignedRepId || userId,
        status: "pending",
        requestPayload: JSON.stringify(requestPayload),
        scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
        estimatedSlides: 8, // Default estimate for sales deck
        requestedArtifacts: requestedArtifacts || ["slide-deck"],
      },
    });

    return NextResponse.json({
      success: true,
      job: {
        id: scheduledDeck.id,
        status: scheduledDeck.status,
        customerId: scheduledDeck.customerId,
        customerName: scheduledDeck.customerName,
        templateName: scheduledDeck.templateName,
        scheduledFor: scheduledDeck.scheduledFor,
        createdAt: scheduledDeck.createdAt,
      },
      message: "Deck generation queued successfully",
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[API] Error scheduling deck:", error);
    return NextResponse.json(
      { error: `Failed to schedule deck generation: ${message}` },
      { status: 500 }
    );
  }
}

// GET - List scheduled decks for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // Filter by status
    const customerId = searchParams.get("customerId"); // Filter by customer
    const limit = parseInt(searchParams.get("limit") || "20");

    // Resolve user ID — demo users (e.g. "demo-rep") don't exist in DB,
    // so match the same fallback logic used when creating ScheduledDecks
    let userId = session.user.id;
    const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!userExists) {
      userId = (await prisma.user.findFirst({ select: { id: true } }))?.id || userId;
    }

    const where: Record<string, unknown> = {
      OR: [
        { requestedById: userId },
        { assignedToId: userId },
      ],
    };

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    const decks = await prisma.scheduledDeck.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        customerId: true,
        customerName: true,
        templateName: true,
        status: true,
        scheduledFor: true,
        completedAt: true,
        createdAt: true,
        errorMessage: true,
        processingTimeMs: true,
        actualSlides: true,
        requestedArtifacts: true,
        pdfUrl: true,
        audioUrl: true,
        infographicUrl: true,
        reportMarkdown: true,
      },
    });

    return NextResponse.json({
      decks,
      count: decks.length,
    });

  } catch (error) {
    console.error("[API] Error fetching decks:", error);
    return NextResponse.json(
      { error: "Failed to fetch decks" },
      { status: 500 }
    );
  }
}
