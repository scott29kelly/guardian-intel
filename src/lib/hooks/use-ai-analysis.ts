/**
 * AI Text Analysis Hook
 * 
 * Provides intelligent analysis of text content (notes, emails, etc.)
 * with graceful fallback when AI is unavailable.
 * 
 * Features:
 * - Sentiment detection
 * - Objection extraction
 * - Next step suggestions
 * - Key insight generation
 */

import { useState, useCallback } from "react";

// =============================================================================
// TYPES
// =============================================================================

export interface TextAnalysisResult {
  sentiment: "positive" | "neutral" | "negative" | "mixed";
  insights: string[];
  objections: string[];
  nextSteps: string[];
  confidence: "high" | "medium" | "low";
  source: "ai" | "heuristic";
}

export interface UseAIAnalysisOptions {
  context?: {
    activityType?: string;
    outcome?: string;
    customerName?: string;
  };
}

export interface UseAIAnalysisReturn {
  analyze: (text: string) => Promise<TextAnalysisResult>;
  isAnalyzing: boolean;
  error: string | null;
  lastResult: TextAnalysisResult | null;
  clearResult: () => void;
}

// =============================================================================
// KEYWORD PATTERNS FOR HEURISTIC ANALYSIS
// =============================================================================

const SENTIMENT_PATTERNS = {
  positive: [
    /interested/i, /excited/i, /ready/i, /agreed/i, /wants/i, /loves/i,
    /happy/i, /great/i, /perfect/i, /yes/i, /definitely/i, /scheduled/i,
    /signed/i, /approved/i, /moving forward/i, /let'?s do it/i,
    /sounds good/i, /on board/i, /impressed/i
  ],
  negative: [
    /skeptical/i, /hesitant/i, /concerned/i, /worried/i, /not sure/i,
    /too expensive/i, /too high/i, /can'?t afford/i, /not interested/i,
    /no thanks/i, /already have/i, /don'?t need/i, /passed/i, /declined/i,
    /refused/i, /angry/i, /upset/i, /frustrated/i, /scam/i, /rip.?off/i,
    /cheap/i, /suspicious/i, /doubt/i, /won'?t/i, /never/i
  ],
  objection: [
    /price|pricing|cost|expensive|cheap|afford/i,
    /spouse|wife|husband|partner|family/i,
    /think about|sleep on|consider/i,
    /other quotes?|comparing|competitors?/i,
    /not now|bad timing|later|busy/i,
    /insurance|claim|deductible|coverage/i,
    /already have|current contractor/i,
    /not convinced|don'?t see|damage/i,
    /trust|suspicious|scam/i
  ]
};

const OBJECTION_MAPPING: Record<string, string> = {
  "price|pricing|cost|expensive|cheap|afford": "Price concerns",
  "spouse|wife|husband|partner|family": "Needs to discuss with family",
  "think about|sleep on|consider": "Wants time to think",
  "other quotes?|comparing|competitors?": "Comparing other quotes",
  "not now|bad timing|later|busy": "Bad timing",
  "insurance|claim|deductible|coverage": "Insurance concerns",
  "already have|current contractor": "Already has a contractor",
  "not convinced|don'?t see|damage": "Not convinced of damage",
  "trust|suspicious|scam": "Trust issues"
};

// =============================================================================
// HEURISTIC ANALYSIS
// =============================================================================

function analyzeTextHeuristically(
  text: string,
  context?: UseAIAnalysisOptions["context"]
): TextAnalysisResult {
  const lowerText = text.toLowerCase();
  
  // Detect sentiment
  let positiveScore = 0;
  let negativeScore = 0;
  
  SENTIMENT_PATTERNS.positive.forEach(pattern => {
    if (pattern.test(text)) positiveScore++;
  });
  
  SENTIMENT_PATTERNS.negative.forEach(pattern => {
    if (pattern.test(text)) negativeScore++;
  });
  
  let sentiment: TextAnalysisResult["sentiment"] = "neutral";
  if (positiveScore > negativeScore + 1) {
    sentiment = "positive";
  } else if (negativeScore > positiveScore + 1) {
    sentiment = "negative";
  } else if (positiveScore > 0 && negativeScore > 0) {
    sentiment = "mixed";
  }
  
  // Extract objections
  const objections: string[] = [];
  Object.entries(OBJECTION_MAPPING).forEach(([pattern, label]) => {
    if (new RegExp(pattern, "i").test(text) && !objections.includes(label)) {
      objections.push(label);
    }
  });
  
  // Generate insights based on content
  const insights: string[] = [];
  
  if (negativeScore > 0) {
    if (/skeptic|doubt|suspicious|trust/i.test(text)) {
      insights.push("Customer has trust concerns - focus on credibility and references");
    }
    if (/cheap|too good|so cheap/i.test(text)) {
      insights.push("Price skepticism detected - may need to justify value proposition");
    }
    if (/expensive|afford|cost/i.test(text)) {
      insights.push("Budget concerns - discuss financing options or insurance coverage");
    }
    if (/spouse|husband|wife|partner/i.test(text)) {
      insights.push("Decision involves others - offer to schedule a joint meeting");
    }
  }
  
  if (positiveScore > 0) {
    if (/interested|excited|ready/i.test(text)) {
      insights.push("Customer shows positive buying signals");
    }
    if (/scheduled|appointment|meeting/i.test(text)) {
      insights.push("Next step already scheduled - prepare materials");
    }
  }
  
  if (/voicemail|no answer|didn'?t pick up/i.test(text)) {
    insights.push("Unable to reach - try different contact times or methods");
  }
  
  if (/callback|call back|return call/i.test(text)) {
    insights.push("Customer expects follow-up call");
  }
  
  // Generate next steps based on context and content
  const nextSteps: string[] = [];
  
  if (objections.includes("Price concerns")) {
    nextSteps.push("Send detailed value breakdown and ROI comparison");
  }
  if (objections.includes("Comparing other quotes")) {
    nextSteps.push("Follow up in 2-3 days to address questions about competitors");
  }
  if (objections.includes("Needs to discuss with family")) {
    nextSteps.push("Schedule follow-up after family discussion");
  }
  if (objections.includes("Insurance concerns")) {
    nextSteps.push("Explain insurance claim process and what we handle");
  }
  if (objections.includes("Trust issues")) {
    nextSteps.push("Share customer testimonials and reference contacts");
  }
  
  // Add generic next step if none detected
  if (nextSteps.length === 0) {
    if (sentiment === "positive") {
      nextSteps.push("Move to proposal or scheduling phase");
    } else if (sentiment === "negative") {
      nextSteps.push("Address concerns and rebuild rapport");
    } else {
      nextSteps.push("Follow up with additional information");
    }
  }
  
  // Ensure we have at least one insight
  if (insights.length === 0) {
    if (context?.outcome === "connected") {
      insights.push("Made contact - continue building relationship");
    } else if (context?.outcome === "voicemail") {
      insights.push("Left voicemail - schedule follow-up attempt");
    } else if (context?.activityType === "visit") {
      insights.push("On-site interaction provides valuable face-to-face engagement");
    } else {
      insights.push("Document key points for future reference");
    }
  }
  
  return {
    sentiment,
    insights,
    objections,
    nextSteps,
    confidence: insights.length > 2 ? "medium" : "low",
    source: "heuristic"
  };
}

// =============================================================================
// AI ANALYSIS
// =============================================================================

async function analyzeTextWithAI(
  text: string,
  context?: UseAIAnalysisOptions["context"]
): Promise<TextAnalysisResult | null> {
  try {
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `You are a sales coach analyzing rep notes from customer interactions. 
Analyze the notes and provide actionable insights.

IMPORTANT: Be accurate to what the notes actually say. If the customer expressed skepticism or concerns, acknowledge that - don't claim they seem interested when they clearly aren't.

Provide your analysis in this exact JSON format:
{
  "sentiment": "positive" | "neutral" | "negative" | "mixed",
  "insights": ["insight 1", "insight 2"],
  "objections": ["objection 1"],
  "nextSteps": ["next step 1", "next step 2"]
}

Keep insights concise (under 15 words each). Focus on actionable guidance.`
          },
          {
            role: "user",
            content: `Activity Type: ${context?.activityType || "note"}
Outcome: ${context?.outcome || "unknown"}
Customer: ${context?.customerName || "Unknown"}

Notes to analyze:
"${text}"`
          }
        ],
        task: "parse",
        temperature: 0.3 // Lower temperature for more consistent output
      })
    });

    if (!response.ok) {
      console.warn("[AI Analysis] API returned non-OK status:", response.status);
      return null;
    }

    const data = await response.json();
    
    if (!data.success) {
      console.warn("[AI Analysis] API returned error:", data.error);
      return null;
    }

    const content = data.message?.content;
    if (!content) {
      console.warn("[AI Analysis] No content in response");
      return null;
    }

    // Try to parse JSON from the response
    // Handle cases where AI wraps JSON in markdown code blocks
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    // Also try to find raw JSON object
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonStr = objectMatch[0];
    }

    const analysis = JSON.parse(jsonStr);
    
    return {
      sentiment: analysis.sentiment || "neutral",
      insights: Array.isArray(analysis.insights) ? analysis.insights : [],
      objections: Array.isArray(analysis.objections) ? analysis.objections : [],
      nextSteps: Array.isArray(analysis.nextSteps) ? analysis.nextSteps : [],
      confidence: "high",
      source: "ai"
    };
  } catch (error) {
    console.warn("[AI Analysis] Failed to analyze with AI:", error);
    return null;
  }
}

// =============================================================================
// HOOK
// =============================================================================

export function useAIAnalysis(
  options: UseAIAnalysisOptions = {}
): UseAIAnalysisReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<TextAnalysisResult | null>(null);

  const analyze = useCallback(async (text: string): Promise<TextAnalysisResult> => {
    if (!text.trim()) {
      const emptyResult: TextAnalysisResult = {
        sentiment: "neutral",
        insights: ["Add notes to get AI insights"],
        objections: [],
        nextSteps: [],
        confidence: "low",
        source: "heuristic"
      };
      setLastResult(emptyResult);
      return emptyResult;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Try AI analysis first
      const aiResult = await analyzeTextWithAI(text, options.context);
      
      if (aiResult && aiResult.insights.length > 0) {
        setLastResult(aiResult);
        return aiResult;
      }

      // Fall back to heuristic analysis
      const heuristicResult = analyzeTextHeuristically(text, options.context);
      setLastResult(heuristicResult);
      return heuristicResult;
    } catch (err) {
      console.error("[AI Analysis] Unexpected error:", err);
      setError("Analysis failed - using basic insights");
      
      // Always provide something useful
      const fallbackResult = analyzeTextHeuristically(text, options.context);
      setLastResult(fallbackResult);
      return fallbackResult;
    } finally {
      setIsAnalyzing(false);
    }
  }, [options.context]);

  const clearResult = useCallback(() => {
    setLastResult(null);
    setError(null);
  }, []);

  return {
    analyze,
    isAnalyzing,
    error,
    lastResult,
    clearResult
  };
}

export default useAIAnalysis;
