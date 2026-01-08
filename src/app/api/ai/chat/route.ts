/**
 * AI Chat API Endpoint
 * 
 * POST /api/ai/chat
 * 
 * Routes chat requests through the multi-model AI system:
 * - General chat → Kimi K2
 * - Tool calls → Claude Opus 4.5
 * - Research → Perplexity
 */

import { NextResponse } from "next/server";
import { getAI, getCustomerContext, buildCustomerSystemPrompt, AI_TOOLS, executeTool } from "@/lib/services/ai";
import type { Message, AITask, ToolCall } from "@/lib/services/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatRequestBody {
  messages: Message[];
  customerId?: string;
  task?: AITask;
  enableTools?: boolean;
  stream?: boolean;
}

export async function POST(request: Request) {
  try {
    const body: ChatRequestBody = await request.json();
    const { messages, customerId, task = "chat", enableTools = false, stream = false } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "No messages provided" },
        { status: 400 }
      );
    }

    const ai = getAI();

    // Check if any adapters are available
    if (!ai.hasAdapters()) {
      // Return a context-aware mock response for development
      const formattedMessages = messages.map(m => ({ role: m.role, content: m.content }));
      return NextResponse.json({
        success: true,
        message: {
          role: "assistant",
          content: getMockResponse(formattedMessages, customerId),
        },
        model: "mock",
        warning: "No AI adapters configured. Using mock responses.",
      });
    }

    // Build context if customer ID is provided
    let systemPrompt: string | undefined;
    if (customerId) {
      const context = await getCustomerContext(customerId);
      systemPrompt = buildCustomerSystemPrompt(context);
    }

    // Prepare messages with system prompt
    const allMessages: Message[] = systemPrompt
      ? [{ role: "system", content: systemPrompt }, ...messages]
      : messages;

    // Determine if this needs tool calling
    const shouldUseTtools = enableTools || task === "tool_call" || task === "simple_tool";
    const isComplexTask = task === "tool_call" || analyzeMessageComplexity(messages);

    if (shouldUseTtools) {
      // Use Claude for tool calls
      const response = await ai.callTool({
        messages: allMessages,
        tools: AI_TOOLS,
        task: isComplexTask ? "tool_call" : "simple_tool",
      }, isComplexTask);

      // Execute any tool calls
      if (response.message.toolCalls && response.message.toolCalls.length > 0) {
        const toolResults = await executeToolCalls(response.message.toolCalls);
        
        return NextResponse.json({
          success: true,
          message: response.message,
          toolResults,
          model: response.model,
          usage: response.usage,
        });
      }

      return NextResponse.json({
        success: true,
        message: response.message,
        model: response.model,
        usage: response.usage,
      });
    }

    // Standard chat (uses Kimi K2)
    if (stream) {
      // Return streaming response
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of ai.chatStream({ messages: allMessages, task })) {
              const data = JSON.stringify(chunk) + "\n";
              controller.enqueue(encoder.encode(`data: ${data}\n`));
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    }

    // Non-streaming chat
    const response = await ai.chat({ messages: allMessages, task });

    return NextResponse.json({
      success: true,
      message: response.message,
      model: response.model,
      usage: response.usage,
    });

  } catch (error) {
    console.error("[AI Chat] Error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Chat request failed",
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function executeToolCalls(toolCalls: ToolCall[]) {
  const results = await Promise.all(
    toolCalls.map(async (tc) => {
      const result = await executeTool(tc.name, tc.arguments);
      return {
        ...result,
        toolCallId: tc.id,
      };
    })
  );
  return results;
}

function analyzeMessageComplexity(messages: Message[]): boolean {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "user") return false;

  const content = lastMessage.content.toLowerCase();
  
  // Keywords that suggest complex operations
  const complexKeywords = [
    "analyze", "compare", "calculate", "estimate",
    "find all", "search for", "look up multiple",
    "create a plan", "build a strategy",
    "schedule multiple", "batch", "bulk",
  ];

  return complexKeywords.some(keyword => content.includes(keyword));
}

function getMockResponse(messages: Array<{ role: string; content: string }>, customerId?: string): string {
  const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || "";
  const conversationLength = messages.filter(m => m.role === "user").length;
  
  // Check conversation context for follow-up patterns
  const previousMessages = messages.slice(0, -1);
  const previousAssistantMessage = previousMessages.filter(m => m.role === "assistant").pop()?.content?.toLowerCase() || "";
  
  // Handle follow-up confirmations like "yes", "yes to all", "do it", etc.
  if (conversationLength > 1 && /^(yes|yeah|yep|do it|go ahead|please|ok|okay|sure|all of|all 3|all three)/.test(lastMessage.trim())) {
    // Check what the previous assistant message was offering
    if (previousAssistantMessage.includes("script") || previousAssistantMessage.includes("email")) {
      return `Here are all three items you requested:

---

## 1. Follow-Up Call Script

*"Hi ${customerId ? "[Customer Name]" : "there"}, this is [Your Name] from Guardian Roofing & Siding. I'm following up on our conversation about your roof inspection.*

*I know you mentioned wanting to compare a few options, and I completely understand. I wanted to share a quick comparison that shows how our warranty, materials, and local track record stack up. Many homeowners in your neighborhood have chosen us specifically because we handle the entire insurance process.*

*Do you have 5 minutes to go over this together?"*

---

## 2. Comparison Email

**Subject:** Quick comparison: Guardian vs. other quotes

Hi [Customer Name],

Thank you for considering Guardian for your roofing project. I put together a quick comparison to help with your decision:

| Feature | Guardian | Typical Competitor |
|---------|----------|-------------------|
| Workmanship Warranty | 10 years | 1-2 years |
| Insurance Claim Handling | Full service | DIY |
| BBB Rating | A+ | Varies |
| Local Jobs Completed | 2,000+ | Unknown |

Would you like to schedule a final walkthrough this week?

Best,
[Your Name]

---

## 3. Final Walkthrough Scheduling

**Recommended talking points:**
- Confirm decision-maker will be present
- Bring physical samples of materials
- Prepare before/after photos from similar jobs
- Have contract ready for immediate signing

**Suggested times to offer:**
- Tomorrow morning (9-10am)
- Day after tomorrow afternoon (2-3pm)
- End of week (Friday 11am)

---

Would you like me to customize any of these further?`;
    }
    
    if (previousAssistantMessage.includes("property") || previousAssistantMessage.includes("research")) {
      return `Here's the full customer research profile:

## Property Details
- **Address:** 1456 Maple Drive, Warminster, PA 18974
- **Property Type:** Single Family Home
- **Year Built:** 2003
- **Square Footage:** 2,850 sq ft
- **Lot Size:** 0.35 acres
- **Current Roof:** Architectural Shingle (CertainTeed)
- **Estimated Roof Age:** 10 years

## Insurance Information
- **Carrier:** State Farm
- **Policy Type:** HO-3 (Special Form)
- **Deductible:** $1,000
- **Claim History:** 1 claim filed in 2019 (water damage, approved)
- **Premium Status:** Good standing

## Weather History (Last 12 Months)
- **Jan 2nd, 2026:** Hail event - 1.25" diameter
- **Dec 28th, 2025:** High winds - 65 mph gusts
- **Aug 15th, 2025:** Severe thunderstorm
- **Risk Score:** 87/100 (High priority)

## Key Insights
⚡ Property is in a confirmed hail impact zone
⚡ Roof age + storm exposure = ideal replacement candidate
⚡ State Farm has favorable claim approval rates in this area

Would you like me to generate an insurance claim strategy?`;
    }
    
    return `Got it! I'll proceed with that. Is there anything specific you'd like me to focus on or adjust?`;
  }

  // Handle property/customer research requests
  if (lastMessage.includes("property") || lastMessage.includes("look up") || lastMessage.includes("research") || lastMessage.includes("details") || lastMessage.includes("insurance info")) {
    return customerId
      ? `Here's what I found for this customer:

## Property Summary
- **Address:** 1456 Maple Drive, Warminster, PA 18974
- **Property Type:** Single Family Home
- **Year Built:** 2003
- **Roof Type:** Architectural Shingle (approx. 10 years old)
- **Property Value:** ~$425,000

## Insurance
- **Carrier:** State Farm
- **Policy Type:** HO-3
- **Deductible:** $1,000

## Recent Weather Events
- Jan 2nd: 1.25" hail (confirmed in Bucks County)
- Dec 28th: 65 mph wind gusts

## Risk Assessment
**Lead Score:** 98/100 - High conversion probability

Would you like me to generate a claim strategy or next steps?`
      : `I can look up property and insurance details if you select a customer first. Which customer would you like me to research?`;
  }

  // Weather/storm requests
  if (lastMessage.includes("weather") || lastMessage.includes("storm")) {
    return `Based on our weather monitoring, there have been several significant storm events in the Mid-Atlantic region recently:

**Recent Activity:**
- Bucks County, PA: Hail event on Jan 2nd (1.25" hail)
- Montgomery County, PA: High winds on Dec 28th (65 mph)
- New Castle County, DE: Thunderstorm activity on Jan 5th

${customerId ? "This customer's property is in **Bucks County** and was directly in the hail impact zone. Their property has a high probability of damage.\n\nWould you like me to generate talking points for discussing storm damage with them?" : "Would you like me to check a specific location for storm damage potential?"}`;
  }

  // Next steps / recommendations
  if (lastMessage.includes("next step") || lastMessage.includes("recommend")) {
    return customerId
      ? `Based on this customer's position in the pipeline and recent interactions:

**Recommended Next Steps:**
1. **Follow-up call** - Address any remaining objections from the last conversation
2. **Send comparison sheet** - Show value vs competitor quotes
3. **Schedule final walkthrough** - Get the decision-maker on-site

Would you like me to draft a script or email for any of these?`
      : `I can provide personalized recommendations if you tell me which customer you're working with. Just select a customer or give me their name!`;
  }

  // Script generation
  if (lastMessage.includes("script") || lastMessage.includes("call") || lastMessage.includes("say") || lastMessage.includes("talk")) {
    return `Here's a suggested script for your follow-up call:

---

*"Hi [Customer Name], this is [Your Name] from Guardian Roofing & Siding. I'm following up on our recent inspection - I wanted to make sure you had a chance to review the proposal and see if you have any questions.*

*I know comparing quotes can be overwhelming, so I wanted to highlight a few things that set us apart: our 10-year workmanship warranty, our BBB A+ rating, and our experience handling over 2,000 insurance claims in your area.*

*What questions can I answer for you today?"*

---

**Objection Handlers:**
- *"Price is too high"* → Focus on long-term value, warranty, insurance coverage
- *"Need to think about it"* → Offer final walkthrough with decision-maker
- *"Going with someone else"* → Ask what made the difference, offer to match

Would you like me to customize this script or create an email version?`;
  }

  // Email requests
  if (lastMessage.includes("email") || lastMessage.includes("write") || lastMessage.includes("draft")) {
    return `Here's a follow-up email draft:

---

**Subject:** Your roof inspection results + next steps

Hi [Customer Name],

Thank you for allowing Guardian Roofing & Siding to inspect your property last week. I wanted to follow up and make sure you received our proposal.

Based on our inspection, your roof has [damage type] that qualifies for an insurance claim. Here's what we recommend:

**Next Steps:**
1. Review the attached proposal
2. Contact your insurance agent to file a claim
3. Schedule a final walkthrough with our team

We handle the entire insurance process for you, so there's typically little to no out-of-pocket cost.

Would you like to schedule a quick call to go over the details?

Best regards,
[Your Name]
Guardian Roofing & Siding

---

Would you like me to adjust the tone or add more details?`;
  }

  // Objection handling
  if (lastMessage.includes("objection") || lastMessage.includes("price") || lastMessage.includes("expensive") || lastMessage.includes("competitor")) {
    return `Here are responses for common objections:

## "Your price is too high"

*"I understand budget is important. Let me ask - are you comparing apples to apples? Our quote includes [10-year warranty / full insurance handling / premium materials]. Many 'cheaper' quotes don't include these, and homeowners end up paying more in the long run. Would it help if I showed you a breakdown?"*

## "I need to think about it"

*"Absolutely, this is a big decision. What specific concerns would help you feel more confident? I'm happy to address them now, or I can schedule a walkthrough with your spouse/partner so everyone can ask questions."*

## "I'm getting other quotes"

*"That's smart - you should compare. Quick question: what's most important to you in choosing a contractor? [Wait for answer] That's exactly why our customers choose us. Can I show you some reviews from homeowners in your neighborhood?"*

## "Going with someone else"

*"I appreciate you letting me know. May I ask what made the difference? If it's price, I might be able to work something out. If it's something else, I'd love the feedback so I can improve."*

Would you like specific responses for this customer's situation?`;
  }

  // Default intro for new conversations
  return `I'm Guardian Intel, your AI assistant for storm damage sales. Here's what I can help with:

🔍 **Customer Research** - Look up property details, insurance info, weather history
📊 **Pipeline Analysis** - Get recommendations based on lead score and stage  
📝 **Script Generation** - Create personalized scripts for calls and objections
🌩️ **Weather Alerts** - Check for storm activity affecting your customers
📧 **Communication** - Draft emails and follow-up messages

${customerId ? "I see you have a customer selected. What would you like to know about them?" : "Select a customer or ask me anything to get started!"}`;
}
