/**
 * Single Infographic Generation API
 *
 * POST /api/ai/generate-infographic - Schedule infographic generation via NotebookLM.
 * Returns a jobId for async polling. Cache check returns instant result if available.
 *
 * Security: Requires NextAuth session (401 if unauthenticated)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveModules } from "@/features/infographic-generator/services/infographicGenerator";
import { composeNotebookLMInstructions } from "@/features/infographic-generator/services/promptComposer";
import { assembleDataForModules } from "@/features/infographic-generator/utils/infographicDataAssembler";
import { getCached } from "@/features/infographic-generator/services/infographicCache";
import { processDeckWithNotebookLM } from "@/lib/services/deck-processing";
import type {
  InfographicRequest,
  GenerationMode,
} from "@/features/infographic-generator/types/infographic.types";

const VALID_MODES: GenerationMode[] = ["preset", "custom", "conversational"];

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.customerId || typeof body.customerId !== "string") {
      return NextResponse.json(
        { error: "customerId is required and must be a string" },
        { status: 400 },
      );
    }

    if (!body.mode || !VALID_MODES.includes(body.mode)) {
      return NextResponse.json(
        { error: `mode is required and must be one of: ${VALID_MODES.join(", ")}` },
        { status: 400 },
      );
    }

    const infographicRequest: InfographicRequest = {
      customerId: body.customerId,
      mode: body.mode,
      presetId: body.presetId,
      selectedModules: body.selectedModules,
      conversationalPrompt: body.conversationalPrompt,
      audience: body.audience,
    };

    // Cache check: only for preset mode with a presetId
    if (infographicRequest.mode === "preset" && infographicRequest.presetId) {
      const cacheEntry = await getCached(
        infographicRequest.customerId,
        infographicRequest.presetId,
      );

      if (cacheEntry) {
        return NextResponse.json({
          imageUrl: cacheEntry.imageUrl,
          generationTimeMs: 0,
          cached: true,
        });
      }
    }

    // Resolve modules and audience from request
    const { modules, audience } = await resolveModules(infographicRequest);

    // Assemble data for modules
    const data = await assembleDataForModules(infographicRequest.customerId, modules);

    // Build NotebookLM instructions
    const instructions = composeNotebookLMInstructions(modules, data, audience);

    // Fetch customer from Prisma for requestPayload
    const customer = await prisma.customer.findUnique({
      where: { id: infographicRequest.customerId },
      include: {
        assignedRep: { select: { id: true, name: true } },
        claims: { orderBy: { createdAt: "desc" }, take: 3 },
        weatherEvents: { orderBy: { eventDate: "desc" }, take: 5 },
        intelItems: { where: { isDismissed: false }, orderBy: { createdAt: "desc" }, take: 10 },
      },
    }) as any;

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const customerName = `${customer.firstName} ${customer.lastName}`;
    const userId = (session.user as any).id;
    const templateId = `infographic-${infographicRequest.presetId || infographicRequest.mode}`;

    // Check for conflicting infographic job for this customer
    const existingJob = await prisma.scheduledDeck.findFirst({
      where: {
        customerId: customer.id,
        templateId: { startsWith: "infographic-" },
        status: { in: ["pending", "processing"] },
      },
    });

    if (existingJob) {
      return NextResponse.json({
        jobId: existingJob.id,
        message: "Infographic generation already in progress",
      });
    }

    // Build request payload (same shape deck-processing expects)
    const requestPayload: Record<string, unknown> = {
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        address: { street: customer.address, city: customer.city, state: customer.state, zipCode: customer.zipCode },
        property: { type: customer.propertyType, yearBuilt: customer.yearBuilt, squareFootage: customer.squareFootage, value: customer.propertyValue },
        roof: { type: customer.roofType, age: customer.roofAge, squares: customer.roofSquares, pitch: customer.roofPitch, condition: customer.roofCondition },
        insurance: { carrier: customer.insuranceCarrier, policyType: customer.policyType, deductible: customer.deductible, claimHistory: customer.claimHistory },
        scores: { lead: customer.leadScore, urgency: customer.urgencyScore, profitPotential: customer.profitPotential, churnRisk: customer.churnRisk, engagement: customer.engagementScore },
        pipeline: { status: customer.status, stage: customer.stage, leadSource: customer.leadSource, estimatedJobValue: customer.estimatedJobValue },
      },
      recentClaims: customer.claims?.map((c: any) => ({
        id: c.id, claimNumber: c.claimNumber, type: c.type, status: c.status,
        amount: c.amount, filedDate: c.filedDate, description: c.description,
      })) || [],
      weatherEvents: customer.weatherEvents?.map((e: any) => ({
        type: e.eventType, date: e.eventDate, severity: e.severity,
        hailSize: e.hailSize, windSpeed: e.windSpeed,
      })) || [],
      intelItems: customer.intelItems?.map((i: any) => ({
        id: i.id, title: i.title, priority: i.priority, category: i.category,
      })) || [],
      generatedAt: new Date().toISOString(),
      templateId,
      artifactConfigs: [{
        type: "infographic",
        description: instructions,
        orientation: audience === "customer-facing" ? "portrait" : "landscape",
        detail: audience === "customer-facing" ? "detailed" : "standard",
      }],
    };

    // Create ScheduledDeck record
    const scheduledDeck = await prisma.scheduledDeck.create({
      data: {
        customerId: customer.id,
        customerName,
        templateId,
        templateName: `Infographic: ${infographicRequest.presetId || infographicRequest.mode}`,
        requestedById: userId,
        assignedToId: customer.assignedRepId || userId,
        status: "pending",
        requestPayload: JSON.stringify(requestPayload),
        scheduledFor: new Date(),
        estimatedSlides: 0,
        requestedArtifacts: ["infographic"],
      },
    });

    // Transition to processing and fire background task
    await prisma.scheduledDeck.update({
      where: { id: scheduledDeck.id },
      data: { status: "processing" },
    });

    processDeckWithNotebookLM(scheduledDeck.id).then((result) => {
      if (result.success) {
        console.log(`[Infographic] Completed for ${customerName} in ${result.processingTimeMs}ms`);
      } else {
        console.error(`[Infographic] Failed for ${customerName}: ${result.error}`);
      }
    }).catch((err) => {
      console.error(`[Infographic] Unhandled error for ${customerName}:`, err);
    });

    return NextResponse.json({
      jobId: scheduledDeck.id,
      message: "Infographic generation started",
    });
  } catch (error) {
    console.error("[API] POST /api/ai/generate-infographic error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 },
    );
  }
}
