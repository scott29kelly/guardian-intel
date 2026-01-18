/**
 * AI Playbook Assist API Endpoint
 * 
 * POST /api/ai/playbook-assist
 * 
 * Provides AI-powered assistance for playbook creation and editing:
 * - Generate full playbooks from title + category
 * - Generate specific sections (objections, closing, tips)
 * - Enhance/rewrite existing content
 * - Brainstorm ideas for scenarios
 * 
 * Security:
 * - Rate limited (15 requests/minute)
 * - Input validated with Zod
 * - Authentication required via middleware
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAI } from "@/lib/services/ai";
import { rateLimit } from "@/lib/rate-limit";
import { formatZodErrors } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const playbookAssistActionSchema = z.enum([
  "generate_full",      // Generate a complete playbook
  "generate_section",   // Generate a specific section
  "enhance",            // Improve/rewrite selected text
  "expand",             // Add more detail to content
  "simplify",           // Make content more concise
  "add_objections",     // Generate objection handlers
  "add_closing",        // Generate closing scripts
  "add_tips",           // Generate pro tips
  "add_opening",        // Generate opening scripts
  "make_conversational", // Adjust tone to be more natural
  "add_insurance_context", // Add insurance-specific content
  "brainstorm",         // Generate ideas/options
]);

const playbookAssistRequestSchema = z.object({
  action: playbookAssistActionSchema,
  title: z.string().max(200).optional(),
  category: z.string().max(50).optional(),
  type: z.string().max(50).optional(),
  stage: z.string().max(50).optional(),
  existingContent: z.string().max(50000).optional(),
  selectedText: z.string().max(5000).optional(),
  additionalContext: z.string().max(1000).optional(),
});

export type PlaybookAssistRequest = z.infer<typeof playbookAssistRequestSchema>;

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

const PLAYBOOK_SYSTEM_PROMPT = `You are an expert sales trainer for Guardian Roofing & Siding, a storm damage restoration company. Your specialty is creating actionable, word-for-word sales playbooks that reps can use immediately.

COMPANY CONTEXT:
- Guardian serves PA, NJ, DE, MD, VA, and NY
- Focus on residential roofing, primarily storm damage claims
- Works with all major insurance carriers
- Offers free inspections and handles insurance claim process

YOUR WRITING STYLE:
- Use exact scripts with quotation marks that reps can say verbatim
- Include [PLACEHOLDERS] for variable information
- Write in a confident but not pushy tone
- Focus on value and helping the homeowner
- Always address common objections
- Include "Pro Tips" for advanced techniques

FORMAT REQUIREMENTS:
- Use Markdown formatting (## headings, > blockquotes for scripts, - bullets)
- Start with a brief intro explaining when to use this
- Include specific word-for-word scripts in blockquotes
- Add objection handlers with specific responses
- End with actionable pro tips
- Use tables for pricing, comparisons, or schedules when helpful

TONE:
- Professional but conversational
- Helpful, not salesy
- Confident, not aggressive
- Empathetic to homeowner concerns`;

// =============================================================================
// ACTION-SPECIFIC PROMPTS
// =============================================================================

function buildPrompt(request: PlaybookAssistRequest): string {
  const { action, title, category, type, stage, existingContent, selectedText, additionalContext } = request;
  
  switch (action) {
    case "generate_full":
      return `Create a complete sales playbook with the following specifications:

Title: ${title || "Sales Playbook"}
Category: ${category || "general"}
Type: ${type || "script"}
Pipeline Stage: ${stage || "any"}
${additionalContext ? `Additional Context: ${additionalContext}` : ""}

Include:
1. Brief introduction (when to use this playbook)
2. Pre-call/visit preparation checklist
3. Word-for-word opening script
4. Discovery questions
5. Main presentation/pitch content
6. At least 4 objection handlers with exact responses
7. Closing script
8. Follow-up actions
9. 5+ pro tips
10. Red flags to watch for

Make it immediately usable by a sales rep—no vague advice, only specific scripts and actions.`;

    case "generate_section":
      return `Add a new section to this playbook:

Current Title: ${title || "Unknown"}
Category: ${category || "general"}
Section to Add: ${additionalContext || "new section"}

Existing Content:
${existingContent || "(None yet)"}

Write a complete section that fits seamlessly with the existing content. Include word-for-word scripts where appropriate.`;

    case "enhance":
      return `Improve and enhance this playbook content. Make it more professional, actionable, and effective:

${selectedText || existingContent || ""}

${additionalContext ? `Specific focus: ${additionalContext}` : ""}

Keep the same structure but:
- Sharpen the language
- Add more specific details
- Improve the scripts to be more natural
- Add any missing elements`;

    case "expand":
      return `Expand this content with more detail and depth:

${selectedText || existingContent || ""}

${additionalContext ? `Focus on: ${additionalContext}` : ""}

Add:
- More specific examples
- Additional scripts or variations
- Edge cases to consider
- Supporting information`;

    case "simplify":
      return `Simplify and condense this content while keeping the key information:

${selectedText || existingContent || ""}

Make it:
- More concise (reduce by ~30%)
- Easier to scan quickly
- Focus on the most impactful points
- Remove redundancy`;

    case "add_objections":
      return `Generate objection handlers for this playbook:

Title: ${title || "Sales Playbook"}
Category: ${category || "general"}
Stage: ${stage || "any"}

${existingContent ? `Existing Content:\n${existingContent.slice(0, 2000)}` : ""}

Create 5-6 common objection scenarios with:
- The exact objection in quotes
- A detailed response script
- Alternative responses for different situations
- Tips for reading the customer's real concern`;

    case "add_closing":
      return `Generate closing scripts for this playbook:

Title: ${title || "Sales Playbook"}
Category: ${category || "general"}
Stage: ${stage || "any"}

${existingContent ? `Context:\n${existingContent.slice(0, 2000)}` : ""}

Include:
- 2-3 different closing approaches (assumptive, alternative, urgency-based)
- Word-for-word scripts for each
- What to do if they say "yes"
- What to do if they hesitate
- Follow-up close if they need time`;

    case "add_tips":
      return `Generate pro tips for this playbook:

Title: ${title || "Sales Playbook"}
Category: ${category || "general"}

${existingContent ? `Context:\n${existingContent.slice(0, 2000)}` : ""}

Create 8-10 actionable pro tips that:
- Are specific and tactical (not generic advice)
- Come from real-world sales experience
- Address common mistakes
- Include psychological insights
- Help close more deals`;

    case "add_opening":
      return `Generate opening scripts for this playbook:

Title: ${title || "Sales Playbook"}
Category: ${category || "general"}
Stage: ${stage || "any"}

${additionalContext ? `Scenario: ${additionalContext}` : ""}

Include:
- The first 10-second hook
- Pattern interrupt technique
- 2-3 variations for different customer types
- What NOT to say
- Transition to discovery questions`;

    case "make_conversational":
      return `Rewrite this content to be more conversational and natural:

${selectedText || existingContent || ""}

Make it sound like:
- A friendly advisor, not a salesperson
- Natural spoken language
- Confident but not pushy
- Easy to say out loud`;

    case "add_insurance_context":
      return `Add insurance-specific content to this playbook:

Title: ${title || "Sales Playbook"}
Category: ${category || "general"}

${existingContent ? `Existing Content:\n${existingContent.slice(0, 2000)}` : ""}

Add:
- How to explain insurance coverage to homeowners
- Common insurance terms in plain language
- Carrier-specific tips (State Farm, Allstate, etc.)
- Depreciation and supplement explanations
- Scripts for insurance-hesitant customers`;

    case "brainstorm":
      return `Brainstorm ideas for this playbook topic:

Title: ${title || "Sales Playbook"}
Category: ${category || "general"}
${additionalContext ? `Specific Focus: ${additionalContext}` : ""}

Generate:
- 5-7 unique angles or approaches
- Key talking points for each
- Potential objections to anticipate
- Creative techniques other reps might not think of`;

    default:
      return `Help improve this playbook content:\n\n${existingContent || selectedText || ""}`;
  }
}

// =============================================================================
// API HANDLER
// =============================================================================

export async function POST(request: Request) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request, "ai");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse and validate input
    const rawBody = await request.json();
    const validation = playbookAssistRequestSchema.safeParse(rawBody);
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid request data",
          details: formatZodErrors(validation.error),
        },
        { status: 400 }
      );
    }

    const requestData = validation.data;
    const ai = getAI();

    // Check if any adapters are available
    if (!ai.hasAdapters()) {
      // Return mock response for development
      return NextResponse.json({
        success: true,
        content: getMockResponse(requestData),
        model: "mock",
        warning: "No AI adapters configured. Using mock responses.",
      });
    }

    // Build the prompt
    const userPrompt = buildPrompt(requestData);

    // Call AI
    const response = await ai.chat({
      messages: [
        { role: "system", content: PLAYBOOK_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      task: "chat",
    });

    return NextResponse.json({
      success: true,
      content: response.message.content,
      model: response.model,
      usage: response.usage,
    });

  } catch (error) {
    console.error("[Playbook Assist] Error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Playbook assist request failed",
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// MOCK RESPONSES
// =============================================================================

function getMockResponse(request: PlaybookAssistRequest): string {
  const { action, title, category } = request;
  
  switch (action) {
    case "generate_full":
      return `# ${title || "New Playbook"}

## When to Use This
Use this playbook when [scenario description based on category].

## Pre-Call Preparation
- [ ] Review customer history and notes
- [ ] Check recent weather events in their area
- [ ] Have pricing and materials info ready
- [ ] Prepare inspection tools if visiting

## Opening Script
> "Hi [CUSTOMER NAME], this is [YOUR NAME] with Guardian Roofing & Siding. I'm reaching out because [reason for call]. Do you have a quick moment?"

## Discovery Questions
1. "When was your roof last replaced or inspected?"
2. "Have you noticed any issues—leaks, missing shingles, anything like that?"
3. "Who's your homeowner's insurance through?"
4. "Is this something you'd decide on your own, or with someone else?"

## The Pitch
> "Based on what you've told me, here's what I recommend..."

[Continue with specific pitch content]

## Objection Handlers

### "I need to think about it"
> "I completely understand—this is a big decision. Can I ask what specifically you want to think about? I'd rather address any concerns now than have you wondering about them later."

### "Your price is too high"
> "I appreciate you being upfront. When you say it's too high, are you comparing it to another quote or to your budget?"

### "I'm not interested"
> "No problem. Quick question—if there WAS damage and your insurance would cover it, would you at least want to know?"

### "I already have someone"
> "Great! Have they handled the insurance claim for you? We specialize in maximizing claim payouts—we've gotten homeowners an average of $8,000 more than their initial settlement."

## Closing
> "Based on everything we've discussed, I'd recommend [specific recommendation]. I have availability [day/time]. Should I put you on the schedule?"

## Pro Tips
- Always use their name at least 3 times during the conversation
- Mirror their energy—if they're rushed, be concise
- Never bad-mouth competitors; just differentiate
- Ask for referrals before leaving every appointment
- Document everything for your follow-up

## Red Flags
- 🚩 Homeowner won't commit to any timeline
- 🚩 Already talked to 5+ contractors (price shopping)
- 🚩 Mentions they're selling the home soon
- 🚩 Can't access decision-maker`;

    case "add_objections":
      return `## Objection Handlers

### "It's too expensive"
> "I understand—roofing is a significant investment. Can I ask: when you say expensive, do you mean compared to your budget, or compared to another quote you received?"

**If budget:** "We do offer financing options that can spread this over 12-24 months. Would that help make it work?"

**If competitor quote:** "I'd love to see what they offered. Often what looks cheaper upfront is missing important items like proper underlayment or a real workmanship warranty."

### "I need to talk to my spouse"
> "Absolutely—big decisions should be made together. Would it be helpful if I came back when you're both available? That way I can answer any questions directly."

### "We're getting other quotes"
> "That's smart. What are the main things you're comparing between contractors? I want to make sure I address what matters most to you."

### "I don't trust contractors"
> "I hear that a lot, honestly. Can I ask what happened that made you feel that way? [Listen] I'm sorry you had that experience. Here's how we're different: [specific differentiators]."

### "Just send me an email"
> "I'd be happy to. But quick question—is there something specific you wanted to review, or is email just more convenient for you? I find most people have a few questions that are easier to answer in person."`;

    case "add_tips":
      return `## Pro Tips

1. **Arrive 5 minutes early, not exactly on time.** It shows respect for their schedule and gives you a moment to observe the property from your car.

2. **Comment on something specific about their home.** "I noticed your garden—do you do that yourself?" builds rapport faster than small talk about weather.

3. **Use the phrase "fair enough?"** at the end of explanations. It invites agreement and feels collaborative rather than salesy.

4. **When they mention a competitor, never bash.** Instead say: "They do good work. Here's what makes us different..." and list 2-3 concrete things.

5. **Always walk the property before climbing the roof.** You'll spot things to point out and it builds credibility.

6. **Take photos in front of them.** Narrate what you're documenting. It shows transparency and builds trust.

7. **If they offer you water or coffee, accept it.** It creates reciprocity and makes them more invested in the conversation.

8. **End every visit by asking: "Who else in your neighborhood should I talk to?"** Warm referrals close at 3x the rate of cold calls.`;

    case "add_closing":
      return `## Closing Scripts

### The Assumptive Close
> "Alright, [NAME], here's what I'm going to do: I'll get you on the schedule for [DATE], order the materials, and we'll have this taken care of before [SEASON/EVENT]. I just need your signature here to get started."

### The Alternative Close
> "We can either start next week while the weather is good, or wait until after the holiday—which would work better for you?"

### The Summary Close
> "So just to recap: your insurance is covering [AMOUNT], your out-of-pocket is [DEDUCTIBLE], we're using [MATERIAL], and you'll have a 10-year warranty. Does that cover everything you were hoping for?"

### The Urgency Close (use sparingly)
> "I should mention—material prices are increasing [X]% next month. If we lock this in today, I can hold current pricing. After that, I can't guarantee the same number."

### If They Hesitate
> "I can tell something's holding you back. Would you mind sharing what it is? I'd rather address it now than have you wondering about it later."`;

    case "enhance":
    case "expand":
    case "simplify":
    case "make_conversational":
    case "add_insurance_context":
      return `Here's an improved version of your content:

${request.selectedText || request.existingContent || "[Enhanced content would appear here]"}

**Key improvements made:**
- Sharpened language for clarity
- Added specific scripts and examples
- Improved natural flow for speaking
- Added insurance-specific context where relevant`;

    case "brainstorm":
      return `## Brainstorm: ${title || "Playbook Ideas"}

### Angle 1: The Neighbor Approach
Lead with social proof from their street: "We just finished three roofs on your block this month..."

### Angle 2: The Weather Warning
Use upcoming forecast as urgency: "There's another system coming through next week..."

### Angle 3: The Investment Protection
Frame roof as protecting their home's value: "Your home is worth [X]—let's protect that investment."

### Angle 4: The Insurance Advocate
Position yourself as their insurance helper: "I'm not here to sell—I'm here to make sure you get what your insurance owes you."

### Angle 5: The Peace of Mind
Focus on eliminating worry: "Imagine never having to wonder about your roof again..."

### Angle 6: The Expert Consult
Lead with free expertise: "I'm offering free inspections this week because..."`;

    default:
      return `## Generated Content

[Content generated based on your request would appear here]

*This is a mock response. Configure an AI adapter for real generations.*`;
  }
}
