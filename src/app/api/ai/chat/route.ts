/**
 * AI Chat API Endpoint
 * 
 * POST /api/ai/chat
 * 
 * Uses Gemini Flash for all AI tasks.
 * Configure with GOOGLE_API_KEY in .env.local
 * 
 * Falls back to mock responses if no API key is configured.
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
  
  // Import mock data inline to get actual customer context
  const { mockCustomers, mockIntelItems, mockWeatherEvents } = require("@/lib/mock-data");
  
  // Get actual customer data if customerId is provided
  const customer = customerId ? mockCustomers.find((c: { id: string }) => c.id === customerId) : null;
  const customerIntel = customerId ? mockIntelItems.filter((i: { customerId: string }) => i.customerId === customerId) : [];
  const customerWeather = customerId ? mockWeatherEvents.filter((w: { customerId: string }) => w.customerId === customerId) : [];
  
  // Build customer-specific context
  const customerName = customer ? `${customer.firstName} ${customer.lastName}` : null;
  const hasCustomer = !!customer;
  
  // Check conversation context for follow-up patterns
  const previousMessages = messages.slice(0, -1);
  const previousAssistantMessage = previousMessages.filter(m => m.role === "assistant").pop()?.content?.toLowerCase() || "";

  // Handle property/customer research requests
  if (lastMessage.includes("property") || lastMessage.includes("look up") || lastMessage.includes("research") || lastMessage.includes("details") || lastMessage.includes("insurance")) {
    if (hasCustomer) {
      const criticalIntel = customerIntel.filter((i: { priority: string }) => i.priority === "critical" || i.priority === "high");
      const recentWeather = customerWeather[0];
      
      return `## Customer Profile: ${customerName}

### Property Details
- **Address:** ${customer.address}, ${customer.city}, ${customer.state} ${customer.zipCode}
- **Type:** ${customer.propertyType} (${customer.squareFootage.toLocaleString()} sq ft)
- **Year Built:** ${customer.yearBuilt}
- **Property Value:** $${customer.propertyValue.toLocaleString()}

### Roof Information
- **Type:** ${customer.roofType}
- **Estimated Age:** ${customer.roofAge} years
- **Condition:** ${customer.roofAge > 15 ? "Aging - likely needs attention" : customer.roofAge > 10 ? "Mid-life - inspect for wear" : "Relatively new"}

### Insurance
- **Carrier:** ${customer.insuranceCarrier}
- **Policy:** ${customer.policyType}
- **Deductible:** $${customer.deductible.toLocaleString()}

${recentWeather ? `### Recent Weather Exposure
- **Event:** ${recentWeather.eventType.toUpperCase()} on ${new Date(recentWeather.eventDate).toLocaleDateString()}
- **Severity:** ${recentWeather.severity}${recentWeather.hailSize ? ` (${recentWeather.hailSize}" hail)` : ""}${recentWeather.windSpeed ? ` (${recentWeather.windSpeed} mph winds)` : ""}
- **Damage Reported:** ${recentWeather.damageReported ? "Yes" : "Not yet"}` : ""}

${criticalIntel.length > 0 ? `### Key Intelligence
${criticalIntel.map((i: { priority: string; title: string; content: string }) => `- **[${i.priority.toUpperCase()}]** ${i.title}: ${i.content}`).join("\n")}` : ""}

### Sales Opportunity
- **Lead Score:** ${customer.leadScore}/100
- **Urgency:** ${customer.urgencyScore}/100
- **Profit Potential:** $${customer.profitPotential.toLocaleString()}
- **Churn Risk:** ${customer.churnRisk}%

Would you like me to generate a strategy for ${customer.firstName}?`;
    }
    return `I can look up property and insurance details. Please select a customer first, or tell me which customer you're working with.`;
  }

  // Weather/storm requests
  if (lastMessage.includes("weather") || lastMessage.includes("storm")) {
    if (hasCustomer && customerWeather.length > 0) {
      return `## Storm History for ${customerName}
**Location:** ${customer.city}, ${customer.state} ${customer.zipCode}

### Recent Weather Events
${customerWeather.map((w: { eventType: string; eventDate: Date; severity: string; hailSize?: number; windSpeed?: number; damageReported: boolean; claimFiled: boolean }) => 
  `- **${w.eventType.toUpperCase()}** on ${new Date(w.eventDate).toLocaleDateString()}: ${w.severity} severity${w.hailSize ? `, ${w.hailSize}" hail` : ""}${w.windSpeed ? `, ${w.windSpeed} mph winds` : ""}
  - Damage Reported: ${w.damageReported ? "Yes ✓" : "Not yet"}
  - Claim Filed: ${w.claimFiled ? "Yes ✓" : "No"}`
).join("\n\n")}

### Impact Assessment
${customer.roofAge > 15 ? `⚠️ **High Risk:** ${customer.roofAge}-year-old ${customer.roofType} roof is vulnerable to storm damage` : customer.roofAge > 10 ? `⚡ **Moderate Risk:** ${customer.roofAge}-year-old roof may have sustained damage` : `📋 **Lower Risk:** Newer roof, but still worth inspecting`}

${!customerWeather[0]?.claimFiled ? `### Recommended Action
${customer.firstName} hasn't filed a claim yet. This is an opportunity to:
1. Discuss the ${customerWeather[0]?.eventType} event from ${new Date(customerWeather[0]?.eventDate).toLocaleDateString()}
2. Offer a free inspection to document damage
3. Assist with the ${customer.insuranceCarrier} claim process` : ""}

Would you like talking points for discussing storm damage with ${customer.firstName}?`;
    }
    return hasCustomer 
      ? `No recent storm events recorded for ${customerName}'s area. Would you like me to check regional weather alerts?`
      : `I can check storm activity for a specific customer. Please select one to see their weather exposure.`;
  }

  // Next steps / recommendations
  if (lastMessage.includes("next step") || lastMessage.includes("recommend") || lastMessage.includes("what should")) {
    if (hasCustomer) {
      const stageActions: Record<string, string[]> = {
        "new": [
          `Make initial contact with ${customer.firstName}`,
          `Introduce Guardian's services and storm damage expertise`,
          `Schedule a free roof inspection`
        ],
        "contacted": [
          `Follow up on initial conversation`,
          `Address any questions or concerns`,
          `Push to schedule on-site inspection`
        ],
        "qualified": [
          `Complete thorough property inspection`,
          `Document any storm damage found`,
          `Prepare detailed proposal`
        ],
        "proposal": [
          `Review proposal with ${customer.firstName}`,
          `Explain insurance claim process with ${customer.insuranceCarrier}`,
          `Address any concerns about the $${customer.deductible.toLocaleString()} deductible`
        ],
        "negotiation": [
          `Address ${customer.firstName}'s remaining objections`,
          `Emphasize value: 10-year warranty, A+ BBB rating`,
          `Schedule final walkthrough with decision-maker`
        ],
        "closed": [
          `Confirm production schedule`,
          `Coordinate with crew on installation`,
          `Prepare for post-install follow-up`
        ]
      };
      
      const actions = stageActions[customer.stage] || stageActions["contacted"];
      const urgencyNote = customer.urgencyScore > 80 
        ? "🔥 **High Urgency** - Prioritize this customer today" 
        : customer.urgencyScore > 50 
          ? "⚡ **Moderate Urgency** - Follow up within 48 hours"
          : "📅 **Standard Priority** - Include in regular outreach";

      return `## Recommended Next Steps for ${customerName}

**Current Stage:** ${customer.stage.charAt(0).toUpperCase() + customer.stage.slice(1)}
**Lead Score:** ${customer.leadScore}/100 | **Urgency:** ${customer.urgencyScore}/100
${urgencyNote}

### Priority Actions
${actions.map((action, i) => `${i + 1}. ${action}`).join("\n")}

### Context to Remember
- Property: ${customer.squareFootage.toLocaleString()} sq ft ${customer.propertyType} in ${customer.city}
- Roof: ${customer.roofAge}-year-old ${customer.roofType}
- Insurance: ${customer.insuranceCarrier} (${customer.policyType}) - $${customer.deductible.toLocaleString()} deductible
- Potential Value: $${customer.profitPotential.toLocaleString()}

${customer.churnRisk > 50 ? `⚠️ **Churn Alert:** ${customer.churnRisk}% risk - needs immediate attention` : ""}

Would you like me to draft a script or email for ${customer.firstName}?`;
    }
    return `I can provide personalized recommendations based on a customer's pipeline stage and history. Select a customer to see tailored next steps.`;
  }

  // Script generation
  if (lastMessage.includes("script") || lastMessage.includes("call") || lastMessage.includes("say") || lastMessage.includes("talk")) {
    if (hasCustomer) {
      const recentWeather = customerWeather[0];
      const weatherTalkingPoint = recentWeather 
        ? `I noticed there was a ${recentWeather.eventType} event in your area on ${new Date(recentWeather.eventDate).toLocaleDateString()}${recentWeather.hailSize ? ` with ${recentWeather.hailSize}-inch hail` : ""}${recentWeather.windSpeed ? ` with ${recentWeather.windSpeed} mph winds` : ""}. Have you had a chance to inspect your roof since then?`
        : `I was reviewing properties in ${customer.city} and noticed your ${customer.roofAge}-year-old roof might benefit from an inspection.`;
      
      return `## Call Script for ${customerName}

### Opening
*"Hi ${customer.firstName}, this is [Your Name] from Guardian Roofing & Siding. How are you today?"*

### Bridge to Purpose
*"${weatherTalkingPoint}"*

### Value Proposition
*"We specialize in helping homeowners like you navigate the insurance claim process with ${customer.insuranceCarrier}. Most of our customers are surprised to learn their storm damage is fully covered, often with just a $${customer.deductible.toLocaleString()} out-of-pocket cost."*

### The Ask
${customer.stage === "new" || customer.stage === "contacted" 
  ? `*"I'd love to offer you a free, no-obligation roof inspection. We can document any damage and let you know exactly what ${customer.insuranceCarrier} would likely cover. Would tomorrow or the day after work better for you?"*`
  : customer.stage === "proposal" || customer.stage === "negotiation"
    ? `*"I wanted to follow up on the proposal we sent over. Do you have any questions about the scope of work or how the insurance process works with ${customer.insuranceCarrier}?"*`
    : `*"I'm following up to see if you had any questions about moving forward. What concerns can I address for you today?"*`}

### Objection Handlers for ${customer.firstName}
${customer.stage === "negotiation" ? `
- **"Price is too high"** → "I understand. With your ${customer.insuranceCarrier} policy, most of this is covered. Your actual out-of-pocket is just the $${customer.deductible.toLocaleString()} deductible."
- **"Getting other quotes"** → "Smart move. When comparing, make sure to ask about warranty length, insurance claim handling, and local references in ${customer.city}."
- **"Need to think about it"** → "Of course. What specific concerns would help you feel more confident? I'm happy to schedule a walkthrough so your spouse/partner can ask questions too."` 
: `
- **"Not interested"** → "I understand. Just so you know, storm damage often isn't visible from the ground. Would it be okay if I sent you some photos of what we typically find on ${customer.roofType} roofs after storms?"
- **"Call back later"** → "Absolutely. When would be a better time? I want to make sure you don't miss the window to file with ${customer.insuranceCarrier} if there is damage."`}

Would you like me to create a follow-up email template for ${customer.firstName} as well?`;
    }
    return `I can generate personalized call scripts based on a customer's stage and history. Select a customer to get a tailored script.`;
  }

  // Email requests
  if (lastMessage.includes("email") || lastMessage.includes("write") || lastMessage.includes("draft")) {
    if (hasCustomer) {
      const recentWeather = customerWeather[0];
      return `## Email Draft for ${customerName}

---

**To:** ${customer.email}
**Subject:** ${recentWeather ? `Storm damage assessment for ${customer.address}` : `Your ${customer.roofType} roof - free inspection offer`}

---

Hi ${customer.firstName},

${recentWeather 
  ? `I hope this email finds you well. I'm reaching out because we've been helping homeowners in ${customer.city} assess damage from the recent ${recentWeather.eventType} event on ${new Date(recentWeather.eventDate).toLocaleDateString()}.`
  : `I hope this email finds you well. I'm reaching out to homeowners in ${customer.city} who have ${customer.roofType} roofs that are ${customer.roofAge}+ years old.`}

**Why I'm contacting you:**
- Your property at ${customer.address} ${customer.roofAge > 15 ? "has a roof that's past its typical warranty period" : "may have been impacted by recent weather"}
- ${customer.insuranceCarrier} policyholders like yourself often qualify for covered repairs
- Most homeowners only pay their $${customer.deductible.toLocaleString()} deductible

**What we offer:**
- ✓ Free, no-obligation roof inspection
- ✓ Detailed damage documentation with photos
- ✓ Assistance with your ${customer.insuranceCarrier} claim
- ✓ 10-year workmanship warranty

Would you have 15 minutes this week for a quick inspection? I can work around your schedule.

Best regards,
[Your Name]
Guardian Roofing & Siding
1-855-424-5911

---

Would you like me to adjust the tone or add more details?`;
    }
    return `I can draft personalized emails for your customers. Select a customer to generate an email tailored to their situation.`;
  }

  // Objection handling
  if (lastMessage.includes("objection") || lastMessage.includes("price") || lastMessage.includes("expensive") || lastMessage.includes("competitor") || lastMessage.includes("handle")) {
    if (hasCustomer) {
      return `## Objection Handling for ${customerName}

Based on ${customer.firstName}'s profile (${customer.stage} stage, ${customer.insuranceCarrier} policy):

### "Your price is too high"
*"I understand budget is important, ${customer.firstName}. Here's the good news: with your ${customer.insuranceCarrier} ${customer.policyType} policy, most of this work would be covered. Your actual out-of-pocket is typically just your $${customer.deductible.toLocaleString()} deductible. Would it help if I walked you through how the insurance claim works?"*

### "I need to think about it"
*"Absolutely, ${customer.firstName}. This is a significant decision for your home. What specific concerns would help you feel more confident? I'm also happy to schedule a walkthrough at ${customer.address} with your spouse or partner so everyone can ask questions."*

### "I'm getting other quotes"
*"That's smart - you should compare. When you're reviewing other bids, I'd recommend asking about:
- How long is their workmanship warranty? (Ours is 10 years)
- Do they handle the ${customer.insuranceCarrier} claim process? (We do, start to finish)
- How many jobs have they done in ${customer.city}? (We've done 2,000+ locally)

What matters most to you in choosing a contractor?"*

### "Going with someone else"
*"I appreciate you letting me know, ${customer.firstName}. May I ask what made the difference? If it's price, I might be able to work with your ${customer.insuranceCarrier} adjuster on additional coverage. If it's something else, I'd genuinely appreciate the feedback."*

${customer.churnRisk > 50 ? `\n⚠️ **Risk Alert:** ${customer.firstName} has a ${customer.churnRisk}% churn risk. Consider offering additional value like expedited scheduling or material upgrades.` : ""}`;
    }
    return `## Common Objection Responses

**"Your price is too high"**
*"I understand budget is important. Our quote includes a 10-year warranty, full insurance handling, and premium materials. Many cheaper quotes don't include these. Would it help to see a breakdown?"*

**"I need to think about it"**
*"Of course. What specific concerns would help you feel more confident? I can schedule a walkthrough with your spouse/partner so everyone can ask questions."*

**"I'm getting other quotes"**
*"Smart move. When comparing, ask about warranty length, insurance claim handling, and local references. What's most important to you?"*

Select a customer for personalized objection responses based on their specific situation.`;
  }

  // Handle follow-up confirmations
  if (conversationLength > 1 && /^(yes|yeah|yep|do it|go ahead|please|ok|okay|sure|all|sounds good)/i.test(lastMessage.trim())) {
    if (hasCustomer) {
      return `Perfect! Here's what I've prepared for ${customerName}:

I've tailored everything to ${customer.firstName}'s specific situation:
- **Stage:** ${customer.stage}
- **Insurance:** ${customer.insuranceCarrier} (${customer.policyType})
- **Property:** ${customer.squareFootage.toLocaleString()} sq ft in ${customer.city}
- **Roof:** ${customer.roofAge}-year-old ${customer.roofType}

What would you like me to focus on next?
1. 📞 Generate a detailed call script
2. 📧 Draft a personalized email
3. 📊 Analyze the full pipeline opportunity
4. 🎯 Create a closing strategy`;
    }
    return `Got it! What would you like me to help you with? Select a customer for personalized assistance, or ask me a general question.`;
  }

  // Default intro for new conversations - context-aware
  if (hasCustomer) {
    const criticalIntel = customerIntel.filter((i: { priority: string }) => i.priority === "critical");
    const recentWeather = customerWeather[0];
    
    return `## ${customerName} - Quick Overview

**Stage:** ${customer.stage.charAt(0).toUpperCase() + customer.stage.slice(1)} | **Lead Score:** ${customer.leadScore}/100 | **Next Action:** ${customer.nextAction}

### Key Facts
- 📍 ${customer.address}, ${customer.city}, ${customer.state}
- 🏠 ${customer.squareFootage.toLocaleString()} sq ft ${customer.propertyType}, built ${customer.yearBuilt}
- 🏗️ ${customer.roofAge}-year-old ${customer.roofType}
- 🛡️ ${customer.insuranceCarrier} (${customer.policyType}) - $${customer.deductible.toLocaleString()} deductible

${criticalIntel.length > 0 ? `### ⚡ Critical Intel
${criticalIntel.map((i: { title: string }) => `- ${i.title}`).join("\n")}` : ""}

${recentWeather ? `### 🌩️ Recent Storm Exposure
${recentWeather.eventType.toUpperCase()} on ${new Date(recentWeather.eventDate).toLocaleDateString()} - ${recentWeather.severity}${recentWeather.hailSize ? ` (${recentWeather.hailSize}" hail)` : ""}${recentWeather.windSpeed ? ` (${recentWeather.windSpeed} mph)` : ""}` : ""}

### What would you like to do?
- 🔍 Get detailed research on ${customer.firstName}'s property
- 📞 Generate a call script
- 📧 Draft an email
- 🎯 See recommended next steps
- ⚡ Handle objections`;
  }

  return `I'm Guardian Intel, your AI assistant for storm damage sales. Here's what I can help with:

🔍 **Customer Research** - Look up property details, insurance info, weather history
📊 **Pipeline Analysis** - Get recommendations based on lead score and stage  
📝 **Script Generation** - Create personalized scripts for calls and objections
🌩️ **Weather Alerts** - Check for storm activity affecting your customers
📧 **Communication** - Draft emails and follow-up messages

Select a customer to get started with personalized insights, or ask me anything!`;
}
