/**
 * Batch Infographic Generation API
 *
 * POST /api/ai/generate-infographic/batch - Schedule infographic generation
 * for multiple customers via NotebookLM. Returns deckIds for per-customer polling.
 *
 * Security: Requires NextAuth session (401 if unauthenticated)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPresetsForBatch } from "@/features/infographic-generator/templates/index";
import { resolveModules } from "@/features/infographic-generator/services/infographicGenerator";
import { composeNotebookLMInstructions } from "@/features/infographic-generator/services/promptComposer";
import { assembleDataForModules } from "@/features/infographic-generator/utils/infographicDataAssembler";
import { processDeckWithNotebookLM } from "@/lib/services/deck-processing";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (
      !body.customerIds ||
      !Array.isArray(body.customerIds) ||
      body.customerIds.length === 0
    ) {
      return NextResponse.json(
        { error: "customerIds is required and must be a non-empty string array" },
        { status: 400 },
      );
    }

    const customerIds: string[] = body.customerIds;
    const batchPresets = getPresetsForBatch();

    // Resolve user ID — session.user.id may not match a DB record
    let userId = (session.user as any).id;
    const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!userExists) {
      userId = (await prisma.user.findFirst({ select: { id: true } }))?.id || userId;
    }
    const batchPresetId = batchPresets[0]?.id || "pre-knock-briefing";
    const templateId = `infographic-batch-${batchPresetId}`;

    // Resolve modules once (same preset for all customers)
    const { modules, audience } = await resolveModules({
      customerId: customerIds[0],
      mode: "preset",
      presetId: batchPresetId,
    });

    // Schedule one ScheduledDeck per customer
    const deckIds: string[] = [];

    for (const customerId of customerIds) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          claims: { orderBy: { createdAt: "desc" }, take: 3 },
          weatherEvents: { orderBy: { eventDate: "desc" }, take: 5 },
          intelItems: { where: { isDismissed: false }, orderBy: { createdAt: "desc" }, take: 10 },
        },
      }) as any;

      if (!customer) continue;

      const customerName = `${customer.firstName} ${customer.lastName}`;
      const data = await assembleDataForModules(customerId, modules);
      const instructions = composeNotebookLMInstructions(modules, data, audience);

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
          amount: c.amount, filedDate: c.filedDate,
        })) || [],
        weatherEvents: customer.weatherEvents?.map((e: any) => ({
          type: e.eventType, date: e.eventDate, severity: e.severity,
        })) || [],
        intelItems: customer.intelItems?.map((i: any) => ({
          id: i.id, title: i.title, priority: i.priority,
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

      const scheduledDeck = await prisma.scheduledDeck.create({
        data: {
          customerId: customer.id,
          customerName,
          templateId,
          templateName: `Batch Infographic: ${batchPresetId}`,
          requestedById: userId,
          assignedToId: customer.assignedRepId || userId,
          status: "pending",
          requestPayload: JSON.stringify(requestPayload),
          scheduledFor: new Date(),
          estimatedSlides: 0,
          requestedArtifacts: ["infographic"],
        },
      });

      deckIds.push(scheduledDeck.id);
    }

    // Fire processing sequentially (NotebookLM has rate limits)
    for (const deckId of deckIds) {
      await prisma.scheduledDeck.update({
        where: { id: deckId },
        data: { status: "processing" },
      });

      // Fire-and-forget per job
      processDeckWithNotebookLM(deckId).then((result) => {
        if (!result.success) {
          console.error(`[BatchInfographic] Failed for deck ${deckId}: ${result.error}`);
        }
      }).catch((err) => {
        console.error(`[BatchInfographic] Unhandled error for deck ${deckId}:`, err);
      });
    }

    return NextResponse.json(
      { batchId: crypto.randomUUID(), deckIds, customerCount: deckIds.length },
      { status: 202 },
    );
  } catch (error) {
    console.error("[API] POST /api/ai/generate-infographic/batch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Batch initiation failed" },
      { status: 500 },
    );
  }
}
