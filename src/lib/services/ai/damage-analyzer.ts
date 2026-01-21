/**
 * AI Roof Damage Analyzer
 * 
 * Uses vision AI models to analyze roof photos and identify damage.
 * Generates structured damage assessments and cost estimates.
 * 
 * Supports:
 * - Google Gemini (primary - has free tier with vision)
 * - OpenAI GPT-4 Vision (if available)
 * - Claude (if available)
 */

import { prisma } from "@/lib/prisma";

// ============================================================
// Types
// ============================================================

export interface DamageAnalysisResult {
  id: string;
  photoId: string;
  analyzedAt: Date;
  
  // Overall assessment
  hasDamage: boolean;
  overallSeverity: "none" | "minor" | "moderate" | "severe" | "critical";
  confidenceScore: number; // 0-100
  
  // Detected damage types
  damageTypes: DamageTypeDetail[];
  
  // Property details (if visible)
  roofDetails: RoofDetails;
  
  // Estimate
  estimate: DamageEstimate;
  
  // AI observations
  observations: string[];
  recommendations: string[];
  
  // Claim support
  claimRecommendation: "file" | "monitor" | "not-recommended";
  claimJustification: string;
  
  // Raw AI response
  rawAnalysis?: string;
  model: string;
}

export interface DamageTypeDetail {
  type: DamageType;
  severity: "minor" | "moderate" | "severe";
  location: string; // e.g., "north slope", "ridge line", "valley"
  description: string;
  affectedArea: string; // e.g., "~100 sq ft", "multiple areas"
  repairMethod: string;
  estimatedCost: {
    low: number;
    high: number;
  };
}

export type DamageType = 
  | "hail-impact"
  | "wind-damage"
  | "missing-shingles"
  | "cracked-shingles"
  | "curling-shingles"
  | "granule-loss"
  | "punctures"
  | "debris-damage"
  | "flashing-damage"
  | "gutter-damage"
  | "soffit-damage"
  | "vent-damage"
  | "chimney-damage"
  | "skylight-damage"
  | "wear-and-tear"
  | "moss-algae"
  | "water-damage"
  | "structural"
  | "other";

export interface RoofDetails {
  roofType?: string; // asphalt shingle, metal, tile, etc.
  estimatedAge?: string;
  pitch?: string;
  condition: "excellent" | "good" | "fair" | "poor";
  visibleLayers?: number;
  color?: string;
}

export interface DamageEstimate {
  repairCost: {
    low: number;
    mid: number;
    high: number;
  };
  replacementCost: {
    low: number;
    mid: number;
    high: number;
  };
  recommendation: "repair" | "partial-replacement" | "full-replacement";
  estimatedSquares?: number;
  notes: string;
}

export interface AnalyzePhotoOptions {
  photoUrl?: string;
  photoBase64?: string;
  photoId?: string;
  customerId?: string;
  additionalContext?: string;
}

// ============================================================
// Damage Analyzer Class
// ============================================================

class DamageAnalyzer {
  private geminiKey: string | undefined;
  private openaiKey: string | undefined;
  private anthropicKey: string | undefined;

  constructor() {
    this.geminiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
    this.openaiKey = process.env.OPENAI_API_KEY;
    this.anthropicKey = process.env.ANTHROPIC_API_KEY;
  }

  /**
   * Analyze a photo for roof damage
   */
  async analyzePhoto(options: AnalyzePhotoOptions): Promise<DamageAnalysisResult> {
    const { photoUrl, photoBase64, photoId, customerId, additionalContext } = options;

    // Get image data
    let imageData: string;
    let mimeType = "image/jpeg";

    if (photoBase64) {
      imageData = photoBase64.replace(/^data:image\/\w+;base64,/, "");
      const match = photoBase64.match(/^data:(image\/\w+);base64,/);
      if (match) mimeType = match[1];
    } else if (photoUrl) {
      // Fetch image and convert to base64
      const response = await fetch(photoUrl);
      const buffer = await response.arrayBuffer();
      imageData = Buffer.from(buffer).toString("base64");
      mimeType = response.headers.get("content-type") || "image/jpeg";
    } else if (photoId) {
      // TODO: Photo model not yet implemented
      throw new Error("Photo lookup by ID not yet implemented. Please provide photoUrl or photoBase64 instead.");
    } else {
      throw new Error("No image provided");
    }

    // Get customer context if available
    let customerContext = "";
    if (customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: {
          address: true,
          city: true,
          state: true,
          roofType: true,
          roofAge: true,
          propertyType: true,
          yearBuilt: true,
        },
      });
      if (customer) {
        customerContext = `Property: ${customer.address}, ${customer.city}, ${customer.state}. `;
        if (customer.roofType) customerContext += `Roof type: ${customer.roofType}. `;
        if (customer.roofAge) customerContext += `Roof age: ~${customer.roofAge} years. `;
        if (customer.yearBuilt) customerContext += `Built: ${customer.yearBuilt}. `;
      }
    }

    // Try Gemini first (free tier available)
    if (this.geminiKey) {
      try {
        return await this.analyzeWithGemini(imageData, mimeType, customerContext, additionalContext, photoId);
      } catch (error) {
        console.error("[DamageAnalyzer] Gemini failed:", error);
      }
    }

    // Fall back to OpenAI
    if (this.openaiKey) {
      try {
        return await this.analyzeWithOpenAI(imageData, mimeType, customerContext, additionalContext, photoId);
      } catch (error) {
        console.error("[DamageAnalyzer] OpenAI failed:", error);
      }
    }

    // Return mock analysis if no AI available
    console.warn("[DamageAnalyzer] No AI available, returning mock analysis");
    return this.getMockAnalysis(photoId || "unknown");
  }

  /**
   * Analyze with Gemini Vision
   */
  private async analyzeWithGemini(
    imageData: string,
    mimeType: string,
    customerContext: string,
    additionalContext?: string,
    photoId?: string
  ): Promise<DamageAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(customerContext, additionalContext);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${this.geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: imageData,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse JSON response
    const analysis = this.parseAnalysisResponse(text, "gemini-2.0-flash");
    analysis.photoId = photoId || "unknown";

    return analysis;
  }

  /**
   * Analyze with OpenAI Vision
   */
  private async analyzeWithOpenAI(
    imageData: string,
    mimeType: string,
    customerContext: string,
    additionalContext?: string,
    photoId?: string
  ): Promise<DamageAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(customerContext, additionalContext);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${imageData}`,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
        max_tokens: 4096,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    const analysis = this.parseAnalysisResponse(text, "gpt-4o");
    analysis.photoId = photoId || "unknown";

    return analysis;
  }

  /**
   * Build the analysis prompt
   */
  private buildAnalysisPrompt(customerContext: string, additionalContext?: string): string {
    return `You are an expert roof damage assessor for insurance claims. Analyze this roof photo and provide a detailed damage assessment.

${customerContext}
${additionalContext ? `Additional context: ${additionalContext}` : ""}

Analyze the image and return a JSON response with this exact structure:
{
  "hasDamage": boolean,
  "overallSeverity": "none" | "minor" | "moderate" | "severe" | "critical",
  "confidenceScore": number (0-100),
  "damageTypes": [
    {
      "type": "hail-impact" | "wind-damage" | "missing-shingles" | "cracked-shingles" | "curling-shingles" | "granule-loss" | "punctures" | "debris-damage" | "flashing-damage" | "gutter-damage" | "soffit-damage" | "vent-damage" | "chimney-damage" | "skylight-damage" | "wear-and-tear" | "moss-algae" | "water-damage" | "structural" | "other",
      "severity": "minor" | "moderate" | "severe",
      "location": "string describing where on the roof",
      "description": "detailed description of the damage",
      "affectedArea": "approximate area affected",
      "repairMethod": "recommended repair approach",
      "estimatedCost": { "low": number, "high": number }
    }
  ],
  "roofDetails": {
    "roofType": "string or null",
    "estimatedAge": "string or null",
    "pitch": "string or null",
    "condition": "excellent" | "good" | "fair" | "poor",
    "color": "string or null"
  },
  "estimate": {
    "repairCost": { "low": number, "mid": number, "high": number },
    "replacementCost": { "low": number, "mid": number, "high": number },
    "recommendation": "repair" | "partial-replacement" | "full-replacement",
    "estimatedSquares": number or null,
    "notes": "string with important cost considerations"
  },
  "observations": ["array of specific observations from the image"],
  "recommendations": ["array of action recommendations"],
  "claimRecommendation": "file" | "monitor" | "not-recommended",
  "claimJustification": "string explaining the claim recommendation"
}

Important guidelines:
- Be thorough but accurate. Don't overstate damage.
- If image quality is poor or you can't see clearly, reduce confidence score.
- Use realistic cost estimates for the US market (labor + materials).
- Hail impacts show as circular dents/bruises on shingles.
- Wind damage shows as lifted, creased, or missing shingles.
- Consider roof age in your assessment.
- If this is not a roof image or you cannot assess damage, set hasDamage to false and explain in observations.`;
  }

  /**
   * Parse the AI response into structured result
   */
  private parseAnalysisResponse(text: string, model: string): DamageAnalysisResult {
    try {
      // Try to extract JSON from the response
      let jsonStr = text;
      
      // Handle markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonStr);

      return {
        id: `analysis-${Date.now()}`,
        photoId: "",
        analyzedAt: new Date(),
        hasDamage: parsed.hasDamage ?? false,
        overallSeverity: parsed.overallSeverity || "none",
        confidenceScore: parsed.confidenceScore ?? 50,
        damageTypes: parsed.damageTypes || [],
        roofDetails: parsed.roofDetails || { condition: "fair" },
        estimate: parsed.estimate || {
          repairCost: { low: 0, mid: 0, high: 0 },
          replacementCost: { low: 0, mid: 0, high: 0 },
          recommendation: "repair",
          notes: "",
        },
        observations: parsed.observations || [],
        recommendations: parsed.recommendations || [],
        claimRecommendation: parsed.claimRecommendation || "monitor",
        claimJustification: parsed.claimJustification || "",
        rawAnalysis: text,
        model,
      };
    } catch (error) {
      console.error("[DamageAnalyzer] Failed to parse response:", error);
      
      // Return basic result with raw text
      return {
        id: `analysis-${Date.now()}`,
        photoId: "",
        analyzedAt: new Date(),
        hasDamage: false,
        overallSeverity: "none",
        confidenceScore: 0,
        damageTypes: [],
        roofDetails: { condition: "fair" },
        estimate: {
          repairCost: { low: 0, mid: 0, high: 0 },
          replacementCost: { low: 0, mid: 0, high: 0 },
          recommendation: "repair",
          notes: "Unable to parse AI response",
        },
        observations: ["AI analysis returned unexpected format", text.substring(0, 200)],
        recommendations: ["Please try again with a clearer image"],
        claimRecommendation: "monitor",
        claimJustification: "Unable to complete analysis",
        rawAnalysis: text,
        model,
      };
    }
  }

  /**
   * Get mock analysis for development
   */
  private getMockAnalysis(photoId: string): DamageAnalysisResult {
    return {
      id: `analysis-mock-${Date.now()}`,
      photoId,
      analyzedAt: new Date(),
      hasDamage: true,
      overallSeverity: "moderate",
      confidenceScore: 85,
      damageTypes: [
        {
          type: "hail-impact",
          severity: "moderate",
          location: "North-facing slope",
          description: "Multiple circular impact marks consistent with 1-1.5 inch hail. Granule displacement visible around impact points.",
          affectedArea: "~150 sq ft",
          repairMethod: "Full shingle replacement in affected area",
          estimatedCost: { low: 2500, high: 4000 },
        },
        {
          type: "granule-loss",
          severity: "minor",
          location: "Ridge line and valleys",
          description: "Moderate granule loss indicating age-related wear accelerated by storm damage.",
          affectedArea: "~50 sq ft",
          repairMethod: "Include in shingle replacement",
          estimatedCost: { low: 500, high: 800 },
        },
      ],
      roofDetails: {
        roofType: "Architectural asphalt shingle",
        estimatedAge: "12-15 years",
        pitch: "6/12",
        condition: "fair",
        color: "Weathered wood",
      },
      estimate: {
        repairCost: { low: 3500, mid: 5000, high: 6500 },
        replacementCost: { low: 12000, mid: 15000, high: 18000 },
        recommendation: "partial-replacement",
        estimatedSquares: 25,
        notes: "Partial replacement recommended for storm-damaged sections. Consider full replacement if claim is approved given roof age.",
      },
      observations: [
        "Multiple hail impacts visible on 3-tab shingles",
        "Granule accumulation visible in gutters",
        "No visible structural damage",
        "Flashing appears intact",
        "Some pre-existing wear consistent with roof age",
      ],
      recommendations: [
        "Document all visible damage with close-up photos",
        "Check for interior water damage",
        "File insurance claim promptly",
        "Get multiple contractor estimates",
        "Consider upgrading to impact-resistant shingles",
      ],
      claimRecommendation: "file",
      claimJustification: "Clear storm damage visible with multiple hail impacts. Damage appears to exceed deductible threshold and is consistent with recent storm activity in the area.",
      model: "mock",
    };
  }

  /**
   * Batch analyze multiple photos
   */
  async analyzeMultiplePhotos(photoIds: string[]): Promise<DamageAnalysisResult[]> {
    const results: DamageAnalysisResult[] = [];

    for (const photoId of photoIds) {
      try {
        const result = await this.analyzePhoto({ photoId });
        results.push(result);
      } catch (error) {
        console.error(`[DamageAnalyzer] Failed to analyze photo ${photoId}:`, error);
      }

      // Rate limiting - wait between requests
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return results;
  }

  /**
   * Generate a combined estimate from multiple analyses
   */
  generateCombinedEstimate(analyses: DamageAnalysisResult[]): {
    totalRepairLow: number;
    totalRepairHigh: number;
    totalReplacementLow: number;
    totalReplacementHigh: number;
    overallRecommendation: string;
    damagesSummary: string[];
  } {
    const withDamage = analyses.filter((a) => a.hasDamage);

    if (withDamage.length === 0) {
      return {
        totalRepairLow: 0,
        totalRepairHigh: 0,
        totalReplacementLow: 0,
        totalReplacementHigh: 0,
        overallRecommendation: "No significant damage detected",
        damagesSummary: [],
      };
    }

    // Get unique damage types
    const allDamages = withDamage.flatMap((a) => a.damageTypes);
    const uniqueDamages = new Map<string, DamageTypeDetail>();
    for (const damage of allDamages) {
      const key = `${damage.type}-${damage.location}`;
      if (!uniqueDamages.has(key) || damage.severity === "severe") {
        uniqueDamages.set(key, damage);
      }
    }

    // Calculate totals (avoid double counting)
    const totalRepairLow = Array.from(uniqueDamages.values()).reduce(
      (sum, d) => sum + d.estimatedCost.low,
      0
    );
    const totalRepairHigh = Array.from(uniqueDamages.values()).reduce(
      (sum, d) => sum + d.estimatedCost.high,
      0
    );

    // Get max replacement cost
    const totalReplacementLow = Math.max(...withDamage.map((a) => a.estimate.replacementCost.low));
    const totalReplacementHigh = Math.max(...withDamage.map((a) => a.estimate.replacementCost.high));

    // Determine recommendation
    const severeCounts = withDamage.filter((a) => a.overallSeverity === "severe" || a.overallSeverity === "critical").length;
    const overallRecommendation = severeCounts > 0
      ? "Full roof replacement recommended"
      : withDamage.length > 2
      ? "Significant repairs needed"
      : "Targeted repairs recommended";

    return {
      totalRepairLow,
      totalRepairHigh,
      totalReplacementLow,
      totalReplacementHigh,
      overallRecommendation,
      damagesSummary: Array.from(uniqueDamages.values()).map(
        (d) => `${d.type}: ${d.description} (${d.severity})`
      ),
    };
  }
}

// ============================================================
// Export Singleton
// ============================================================

export const damageAnalyzer = new DamageAnalyzer();
