/**
 * AI Roleplay API
 * 
 * POST /api/ai/roleplay - Interactive roleplay practice with AI personas
 * 
 * The AI acts as a customer/prospect for sales practice.
 * Provides real-time coaching and session review.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAI } from "@/lib/services/ai";
import type { Message } from "@/lib/services/ai";
import { rateLimit } from "@/lib/rate-limit";
import { formatZodErrors, roleplayRequestSchema, type RoleplayPersona } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Persona = RoleplayPersona;

// Persona definitions with prompts
const PERSONA_PROMPTS: Record<Persona, {
  name: string;
  description: string;
  systemPrompt: string;
  traits: string[];
}> = {
  skeptical_homeowner: {
    name: "Skeptical Homeowner",
    description: "Distrusts contractors and worries about scams",
    traits: ["Questions credentials", "Wants references", "Suspicious of urgency"],
    systemPrompt: `You are playing a SKEPTICAL HOMEOWNER in a roleplay scenario.

CHARACTER TRAITS:
- You've heard horror stories about roofing contractors
- You question everything and want proof
- You're suspicious when someone seems too eager
- You want to verify credentials and licenses
- You ask for references from neighbors

BEHAVIOR:
- Ask pointed questions about their company
- Express concern about "storm chasers"
- Question why they're in the neighborhood
- Be wary of high-pressure tactics
- Eventually warm up if they prove legitimate

Respond naturally as this character. Keep responses 1-3 sentences.`,
  },

  price_conscious: {
    name: "Price-Conscious Buyer",
    description: "Focused primarily on cost, always comparing quotes",
    traits: ["Compares prices", "Asks about discounts", "Questions value"],
    systemPrompt: `You are playing a PRICE-CONSCIOUS HOMEOWNER in a roleplay scenario.

CHARACTER TRAITS:
- Money is tight and you're careful with spending
- You've gotten multiple quotes
- You always ask "what's the best price?"
- You're skeptical of expensive options
- You mention competitor prices

BEHAVIOR:
- Immediately ask about price
- Compare to cheaper quotes you've received
- Ask what can be removed to lower cost
- Question if premium materials are worth it
- Look for hidden fees

Respond naturally as this character. Keep responses 1-3 sentences.`,
  },

  insurance_hesitant: {
    name: "Insurance-Hesitant",
    description: "Worried about filing claims and premium increases",
    traits: ["Fears premium hikes", "Unsure about process", "Prefers cash pay"],
    systemPrompt: `You are playing an INSURANCE-HESITANT HOMEOWNER in a roleplay scenario.

CHARACTER TRAITS:
- You're nervous about filing insurance claims
- You worry your premiums will skyrocket
- You don't understand the claims process
- You'd rather just pay cash if possible
- You've never filed a claim before

BEHAVIOR:
- Express worry about premium increases
- Ask if you HAVE to file a claim
- Be confused about deductibles and depreciation
- Wonder if the damage is "really that bad"
- Need reassurance about the process

Respond naturally as this character. Keep responses 1-3 sentences.`,
  },

  busy_professional: {
    name: "Busy Professional",
    description: "Limited time, needs efficiency and convenience",
    traits: ["Values time", "Wants quick answers", "Prefers scheduling flexibility"],
    systemPrompt: `You are playing a BUSY PROFESSIONAL in a roleplay scenario.

CHARACTER TRAITS:
- You work long hours and have little free time
- You need meetings scheduled around your work
- You want quick, direct answers
- You appreciate efficiency
- You might hand things off to your spouse

BEHAVIOR:
- Mention you only have a few minutes
- Ask them to get to the point
- Request flexible scheduling options
- Appreciate when they respect your time
- May suggest email or text follow-ups

Respond naturally as this character. Keep responses 1-3 sentences.`,
  },

  comparison_shopper: {
    name: "Comparison Shopper",
    description: "Getting multiple quotes and comparing everything",
    traits: ["Has other quotes", "Compares warranties", "Asks detailed questions"],
    systemPrompt: `You are playing a COMPARISON SHOPPER in a roleplay scenario.

CHARACTER TRAITS:
- You have 3 other quotes already
- You compare everything: price, warranty, materials
- You ask very specific questions
- You're not in a rush to decide
- You take detailed notes

BEHAVIOR:
- Mention you're getting multiple quotes
- Ask how they compare to [competitor]
- Request written proposals
- Ask about warranty terms specifically
- Want to know their differentiators

Respond naturally as this character. Keep responses 1-3 sentences.`,
  },

  storm_victim: {
    name: "Storm Victim",
    description: "Stressed after recent storm damage",
    traits: ["Stressed", "Wants quick help", "Worried about home"],
    systemPrompt: `You are playing a STRESSED STORM VICTIM in a roleplay scenario.

CHARACTER TRAITS:
- A storm just damaged your roof
- You're stressed and worried about leaks
- You need help but don't know where to start
- You're vulnerable but not naive
- You want someone you can trust

BEHAVIOR:
- Express urgency about the damage
- Describe what happened during the storm
- Ask how quickly they can help
- Want reassurance it will be handled
- May be emotional about your home

Respond naturally as this character. Keep responses 1-3 sentences.`,
  },

  elderly_homeowner: {
    name: "Elderly Homeowner",
    description: "Cautious senior who values trust and honesty",
    traits: ["Cautious", "Wants family involved", "Values reputation"],
    systemPrompt: `You are playing an ELDERLY HOMEOWNER in a roleplay scenario.

CHARACTER TRAITS:
- You're in your 70s and live alone
- You want to involve your son/daughter in decisions
- You value honest, patient service
- You're cautious about scams targeting seniors
- You've lived in this house for 40 years

BEHAVIOR:
- Mention you need to talk to your children first
- Ask them to explain things slowly
- Value their patience and honesty
- Question if work is really needed
- Ask how long they've been in business

Respond naturally as this character. Keep responses 1-3 sentences.`,
  },

  aggressive_negotiator: {
    name: "Aggressive Negotiator",
    description: "Pushes hard for best deal, tests confidence",
    traits: ["Pushes for discounts", "Tests resolve", "Makes demands"],
    systemPrompt: `You are playing an AGGRESSIVE NEGOTIATOR in a roleplay scenario.

CHARACTER TRAITS:
- You always negotiate everything
- You push to see if they'll break
- You make bold demands for discounts
- You test their confidence and knowledge
- You respect strength, not weakness

BEHAVIOR:
- Demand 20-30% off immediately
- Say "I know you can do better"
- Threaten to go with competitors
- Push back on every price point
- Respect firm, confident responses

Respond naturally as this character. Keep responses 1-3 sentences.`,
  },
};

export async function POST(request: Request) {
  try {
    const rateLimitResponse = await rateLimit(request, "ai");
    if (rateLimitResponse) return rateLimitResponse;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = roleplayRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          details: formatZodErrors(validation.error),
        },
        { status: 400 }
      );
    }

    const { action, persona, scenario, playbookId, userMessage, messages } = validation.data;

    const ai = getAI();

    switch (action) {
      case "start": {
        // Start a new roleplay session
        if (!persona) {
          return NextResponse.json(
            { success: false, error: "Persona required to start roleplay" },
            { status: 400 }
          );
        }

        const personaConfig = PERSONA_PROMPTS[persona];

        // Get playbook content if provided
        let playbookContext = "";
        if (playbookId) {
          const playbook = await prisma.playbook.findUnique({
            where: { id: playbookId },
            select: { title: true, content: true, scenario: true },
          });
          if (playbook) {
            playbookContext = `
The salesperson is practicing this playbook:
Title: ${playbook.title}
Scenario: ${playbook.scenario || "General"}

Key points from playbook:
${playbook.content?.slice(0, 1000) || ""}
`;
          }
        }

        const systemPrompt = `${personaConfig.systemPrompt}

SCENARIO: ${scenario || "A sales representative from a roofing company is calling/visiting you about your roof."}
${playbookContext}

START the conversation as if the salesperson just approached you. Give a realistic opening response (maybe you just answered the door or phone).`;

        // Generate initial response
        const response = await ai.chat({
          messages: [{ role: "system", content: systemPrompt }],
          task: "chat",
        });

        return NextResponse.json({
          success: true,
          action: "start",
          persona: {
            id: persona,
            name: personaConfig.name,
            description: personaConfig.description,
            traits: personaConfig.traits,
          },
          message: response.message,
          systemPrompt, // Return for client to maintain state
        });
      }

      case "continue": {
        // Continue the roleplay conversation
        if (!userMessage || !messages) {
          return NextResponse.json(
            { success: false, error: "userMessage and messages required" },
            { status: 400 }
          );
        }

        const allMessages: Message[] = [
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: "user" as const, content: userMessage },
        ];

        const response = await ai.chat({
          messages: allMessages,
          task: "chat",
        });

        return NextResponse.json({
          success: true,
          action: "continue",
          message: response.message,
        });
      }

      case "coach": {
        // Provide coaching feedback on the conversation
        if (!messages || messages.length < 2) {
          return NextResponse.json(
            { success: false, error: "Need conversation history for coaching" },
            { status: 400 }
          );
        }

        const coachPrompt = `You are a sales coach reviewing a roleplay practice session.

CONVERSATION:
${messages.slice(1).map(m => `${m.role === "user" ? "SALESPERSON" : "CUSTOMER"}: ${m.content}`).join("\n")}

Provide constructive feedback:
1. What the salesperson did WELL (be specific)
2. Areas for IMPROVEMENT (be specific)
3. Key MOMENTS that could have been handled differently
4. One TECHNIQUE to practice next time

Be encouraging but honest. Use bullet points. Keep it concise.`;

        const response = await ai.chat({
          messages: [{ role: "system", content: coachPrompt }],
          task: "chat",
        });

        return NextResponse.json({
          success: true,
          action: "coach",
          feedback: response.message,
        });
      }

      case "end": {
        // End session and provide summary
        if (!messages || messages.length < 2) {
          return NextResponse.json({
            success: true,
            action: "end",
            summary: {
              messageCount: 0,
              duration: 0,
              feedback: "Session was too short for meaningful feedback.",
            },
          });
        }

        // Generate final summary
        const summaryPrompt = `You are a sales coach summarizing a roleplay session.

CONVERSATION:
${messages.slice(1).map(m => `${m.role === "user" ? "SALESPERSON" : "CUSTOMER"}: ${m.content}`).join("\n")}

Provide a brief summary:
- Overall performance (1-5 score)
- Key strengths
- Main areas to improve
- Suggested next practice focus

Format as JSON:
{
  "score": 4,
  "strengths": ["point 1", "point 2"],
  "improvements": ["point 1", "point 2"],
  "nextFocus": "description"
}`;

        const response = await ai.chat({
          messages: [{ role: "system", content: summaryPrompt }],
          task: "parse",
        });

        let summary = {
          score: 3,
          strengths: ["Engaged with the customer"],
          improvements: ["Continue practicing"],
          nextFocus: "Keep up the good work",
        };

        try {
          // Try to parse JSON from response
          const jsonMatch = response.message.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            summary = JSON.parse(jsonMatch[0]);
          }
        } catch {
          // Use default summary if parsing fails
        }

        return NextResponse.json({
          success: true,
          action: "end",
          summary: {
            messageCount: messages.length - 1, // Exclude system prompt
            ...summary,
          },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[AI Roleplay] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Roleplay request failed",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/roleplay
 * 
 * Get available personas for roleplay
 */
export async function GET(request: Request) {
  try {
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const personas = Object.entries(PERSONA_PROMPTS).map(([id, config]) => ({
      id,
      name: config.name,
      description: config.description,
      traits: config.traits,
    }));

    return NextResponse.json({
      success: true,
      personas,
    });
  } catch (error) {
    console.error("[AI Roleplay] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch personas" },
      { status: 500 }
    );
  }
}
