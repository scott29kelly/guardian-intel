/**
 * Batch Infographic Generation API
 *
 * POST /api/ai/generate-infographic/batch - Schedule infographic generation
 * for multiple customers via NotebookLM. Returns deckIds for per-customer polling.
 *
 * Security:
 * - Requires NextAuth session AND a matching User row (401 if either is missing)
 * - Rep-ownership enforced via assertCustomerAccess (D-04) per customer in the loop.
 *   Unauthorized customers are SILENTLY SKIPPED rather than 403'ing the entire batch.
 *   Rationale: a manager calling for a mixed list should still process the customers
 *   they CAN access. Plain reps who pass another rep's customer get it filtered out.
 *   When the resulting deckIds array is empty, the route returns 403 instead of 202.
 *
 * Fixed 2026-04-07 (Phase 7 Tier 1):
 * - D-01: claim mapping reads claimType/approvedValue/dateOfLoss (was legacy names — silent data loss)
 * - D-02: processing loop is now truly sequential with per-iteration try/catch (was fire-and-forget inside a for-loop)
 * - D-03: strict 401 when session.user.id has no matching User row (removed silent first-user fallback)
 *
 * Fixed 2026-04-07 (Phase 7 Tier 2):
 * - D-04: rep-ownership authorization via assertCustomerAccess helper (silent-skip semantics)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, assertCustomerAccess } from "@/lib/auth";
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

    // D-03: Resolve user ID — session.user.id MUST match a real DB user.
    // PrismaAdapter guarantees this for all real auth flows; reject otherwise.
    // (Removed 2026-04-07: silent fallback to first user in the User table.)
    const userId = (session.user as any).id;
    const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!userExists) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

      // D-04: Rep-ownership authorization, per customer. If the rep is not allowed
      // to access this customer, skip it silently (continue) — do NOT 403 the whole
      // batch, since a manager calling for a mixed list should still process the
      // customers they CAN access. Plain reps who pass another rep's customer get
      // it filtered out.
      if (!assertCustomerAccess(session as { user: { id: string; role: string } }, customer)) {
        console.warn(
          `[BatchInfographic] Skipping customer ${customer.id} — caller ${(session.user as any).id} not authorized`,
        );
        continue;
      }

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
        // D-01: Read real Prisma fields (claimType/approvedValue/dateOfLoss) and emit with
        // the same keys the downstream consumer formatClaimsForNotebook expects.
        // Previous version read legacy field names that do not exist on the Prisma
        // InsuranceClaim model, so every claim field arrived at NotebookLM as undefined.
        recentClaims: customer.claims?.map((c: any) => ({
          id: c.id,
          claimNumber: c.claimNumber,
          carrier: c.carrier,
          claimType: c.claimType,
          status: c.status,
          approvedValue: c.approvedValue,
          dateOfLoss: c.dateOfLoss,
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

    // D-04: If every customer in the batch was filtered out by the ownership check
    // (or missing), respond 403 rather than an empty 202. This gives the caller a
    // clear signal that they had no accessible customers in the request.
    if (deckIds.length === 0) {
      return NextResponse.json(
        { error: "Forbidden — no accessible customers in request" },
        { status: 403 },
      );
    }

    // D-02: Truly sequential processing — NotebookLM CLI has shared headless-browser
    // state and global rate limits, so we MUST await each call before starting the
    // next. Each iteration is wrapped in try/catch so one failure does not abort the
    // batch. (Previous version was a for-loop around a fire-and-forget .then() chain,
    // which launched N parallel jobs against a single shared browser session.)
    for (const deckId of deckIds) {
      try {
        await prisma.scheduledDeck.update({
          where: { id: deckId },
          data: { status: "processing" },
        });

        const result = await processDeckWithNotebookLM(deckId);
        if (result.success) {
          console.log(
            `[BatchInfographic] Completed deck ${deckId} in ${result.processingTimeMs}ms`,
          );
        } else {
          console.error(
            `[BatchInfographic] Failed deck ${deckId}: ${result.error}`,
          );
        }
      } catch (err) {
        console.error(
          `[BatchInfographic] Unhandled error for deck ${deckId}:`,
          err,
        );
        // Best-effort: mark as failed so the UI unblocks. processDeckWithNotebookLM
        // already does this on its own catch path, but we do it again here in case
        // the error came from the prisma.update above or an unexpected throw.
        try {
          await prisma.scheduledDeck.update({
            where: { id: deckId },
            data: {
              status: "failed",
              errorMessage:
                err instanceof Error
                  ? err.message
                  : "Unknown batch loop error",
            },
          });
        } catch {
          // swallow — best effort
        }
      }
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
