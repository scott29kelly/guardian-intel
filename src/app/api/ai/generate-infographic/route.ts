/**
 * Single Infographic Generation API
 *
 * POST /api/ai/generate-infographic - Generate a single infographic for a customer.
 * Implements cache-first retrieval: checks cache before generating, stores result after.
 *
 * Security: Requires NextAuth session (401 if unauthenticated)
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateInfographic } from "@/features/infographic-generator/services/infographicGenerator";
import { getCached, cacheResult } from "@/features/infographic-generator/services/infographicCache";
import type {
  InfographicRequest,
  InfographicCacheEntry,
  InfographicResponse,
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
        const cachedResponse: InfographicResponse = {
          imageData: cacheEntry.imageData,
          model: cacheEntry.modelStrategy,
          chainUsed: false,
          generationTimeMs: 0,
          cached: true,
        };
        return NextResponse.json(cachedResponse);
      }
    }

    // Generate infographic (no progress callback for HTTP)
    const response = await generateInfographic(infographicRequest);

    // Cache the result after successful generation
    const entry: InfographicCacheEntry = {
      customerId: infographicRequest.customerId,
      presetId: infographicRequest.presetId || infographicRequest.mode,
      imageData: response.imageData,
      generatedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      modelStrategy: response.model,
    };

    await cacheResult(entry, infographicRequest.audience || "internal");

    return NextResponse.json(response);
  } catch (error) {
    console.error("[API] POST /api/ai/generate-infographic error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 },
    );
  }
}
