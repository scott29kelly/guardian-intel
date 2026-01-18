/**
 * AI Damage Analysis API
 * 
 * POST /api/ai/analyze-damage - Analyze photo(s) for roof damage
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { damageAnalyzer, type DamageAnalysisResult } from "@/lib/services/ai/damage-analyzer";
import { z } from "zod";

const analyzeSchema = z.object({
  // One of these is required
  photoId: z.string().optional(),
  photoIds: z.array(z.string()).optional(),
  photoUrl: z.string().url().optional(),
  photoBase64: z.string().optional(),
  
  // Optional context
  customerId: z.string().optional(),
  claimId: z.string().optional(),
  additionalContext: z.string().optional(),
  
  // Options
  saveResults: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = analyzeSchema.parse(body);

    // Determine which analysis to perform
    let results: DamageAnalysisResult[] = [];

    if (validated.photoIds && validated.photoIds.length > 0) {
      // Batch analysis
      results = await damageAnalyzer.analyzeMultiplePhotos(validated.photoIds);
    } else if (validated.photoId) {
      // Single photo by ID
      const result = await damageAnalyzer.analyzePhoto({
        photoId: validated.photoId,
        customerId: validated.customerId,
        additionalContext: validated.additionalContext,
      });
      results = [result];
    } else if (validated.photoUrl || validated.photoBase64) {
      // Single photo by URL or base64
      const result = await damageAnalyzer.analyzePhoto({
        photoUrl: validated.photoUrl,
        photoBase64: validated.photoBase64,
        customerId: validated.customerId,
        additionalContext: validated.additionalContext,
      });
      results = [result];
    } else {
      return NextResponse.json(
        { error: "No photo provided. Include photoId, photoIds, photoUrl, or photoBase64" },
        { status: 400 }
      );
    }

    // Generate combined estimate if multiple photos
    let combinedEstimate: ReturnType<typeof damageAnalyzer.generateCombinedEstimate> | null = null;
    if (results.length > 1) {
      combinedEstimate = damageAnalyzer.generateCombinedEstimate(results);
    }

    // Save results if requested
    if (validated.saveResults) {
      const customerId = validated.customerId || (
        validated.photoId 
          ? (await prisma.photo.findUnique({ where: { id: validated.photoId }, select: { customerId: true } }))?.customerId
          : null
      );

      if (customerId) {
        // Create intel items for damage findings
        const damageResults = results.filter(r => r.hasDamage);
        if (damageResults.length > 0) {
          const primaryResult = damageResults[0];
          
          await prisma.intelItem.create({
            data: {
              customerId,
              source: "ai-analysis",
              sourceId: primaryResult.id,
              category: "property",
              title: `AI Damage Analysis: ${primaryResult.overallSeverity} damage detected`,
              content: [
                `${primaryResult.damageTypes.length} damage type(s) identified.`,
                primaryResult.claimJustification,
                `Estimated repair: $${primaryResult.estimate.repairCost.low.toLocaleString()} - $${primaryResult.estimate.repairCost.high.toLocaleString()}`,
              ].join(" "),
              priority: primaryResult.overallSeverity === "severe" || primaryResult.overallSeverity === "critical"
                ? "critical"
                : primaryResult.overallSeverity === "moderate"
                ? "high"
                : "medium",
              actionable: primaryResult.claimRecommendation === "file",
              metadata: JSON.stringify({
                analysisId: primaryResult.id,
                severity: primaryResult.overallSeverity,
                confidence: primaryResult.confidenceScore,
                estimate: primaryResult.estimate,
                recommendation: primaryResult.claimRecommendation,
              }),
            },
          });
        }

        // Update photo with analysis data if single photo
        if (validated.photoId && results[0]) {
          await prisma.photo.update({
            where: { id: validated.photoId },
            data: {
              damageType: results[0].damageTypes[0]?.type || null,
              damageSeverity: results[0].hasDamage ? results[0].overallSeverity : null,
              description: results[0].observations.join(". "),
            },
          });
        }

        // If claim provided, update claim with estimate
        if (validated.claimId && results.length > 0) {
          const primaryResult = results[0];
          if (primaryResult.hasDamage && !await hasExistingEstimate(validated.claimId)) {
            await prisma.insuranceClaim.update({
              where: { id: validated.claimId },
              data: {
                initialEstimate: primaryResult.estimate.repairCost.mid,
              },
            });
          }
        }
      }

      // Log activity
      await prisma.activity.create({
        data: {
          userId: session.user.id,
          type: "analyze",
          entityType: "photo",
          entityId: validated.photoId || validated.photoIds?.[0] || "batch",
          description: `AI damage analysis: ${results.filter(r => r.hasDamage).length} of ${results.length} photos show damage`,
          metadata: JSON.stringify({
            photoCount: results.length,
            damageCount: results.filter(r => r.hasDamage).length,
            severities: results.map(r => r.overallSeverity),
          }),
        },
      });
    }

    // Build response
    const response: any = {
      success: true,
      data: {
        analyses: results,
        summary: {
          photosAnalyzed: results.length,
          photosWithDamage: results.filter(r => r.hasDamage).length,
          overallSeverity: getMostSevere(results.map(r => r.overallSeverity)),
          averageConfidence: Math.round(
            results.reduce((sum, r) => sum + r.confidenceScore, 0) / results.length
          ),
          claimRecommendation: results.some(r => r.claimRecommendation === "file")
            ? "file"
            : results.some(r => r.claimRecommendation === "monitor")
            ? "monitor"
            : "not-recommended",
        },
      },
    };

    if (combinedEstimate) {
      response.data.combinedEstimate = combinedEstimate;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Damage Analysis API] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analysis failed" },
      { status: 500 }
    );
  }
}

async function hasExistingEstimate(claimId: string): Promise<boolean> {
  const claim = await prisma.insuranceClaim.findUnique({
    where: { id: claimId },
    select: { initialEstimate: true },
  });
  return !!claim?.initialEstimate;
}

function getMostSevere(severities: string[]): string {
  const order = ["critical", "severe", "moderate", "minor", "none"];
  for (const level of order) {
    if (severities.includes(level)) return level;
  }
  return "none";
}
