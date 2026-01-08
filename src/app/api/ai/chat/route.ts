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
      // Return a mock response for development
      return NextResponse.json({
        success: true,
        message: {
          role: "assistant",
          content: getMockResponse(messages[messages.length - 1].content, customerId),
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

function getMockResponse(userMessage: string, customerId?: string): string {
  const lowercaseMessage = userMessage.toLowerCase();

  if (lowercaseMessage.includes("weather") || lowercaseMessage.includes("storm")) {
    return `Based on our weather monitoring, there have been several significant storm events in the Mid-Atlantic region recently:

**Recent Activity:**
- Bucks County, PA: Hail event on Jan 2nd (1.25" hail)
- Montgomery County, PA: High winds on Dec 28th (65 mph)
- New Castle County, DE: Thunderstorm activity on Jan 5th

${customerId ? "I can cross-reference this with the customer's property location if you'd like." : "Would you like me to check a specific location for storm damage potential?"}`;
  }

  if (lowercaseMessage.includes("next step") || lowercaseMessage.includes("recommend")) {
    return customerId
      ? `Based on this customer's position in the pipeline and recent interactions:

**Recommended Next Steps:**
1. **Follow-up call** - Address any remaining objections from the last conversation
2. **Send comparison sheet** - Show value vs competitor quotes
3. **Schedule final walkthrough** - Get the decision-maker on-site

Would you like me to draft a script or email for any of these?`
      : `I can provide personalized recommendations if you tell me which customer you're working with. Just select a customer or give me their name!`;
  }

  if (lowercaseMessage.includes("script") || lowercaseMessage.includes("say")) {
    return `Here's a suggested script for your situation:

---
*"Hi [Customer Name], this is [Your Name] from Guardian Roofing & Siding. I'm following up on our recent inspection - I wanted to make sure you had a chance to review the proposal and see if you have any questions.*

*I know comparing quotes can be overwhelming, so I wanted to highlight a few things that set us apart: our 10-year workmanship warranty, our BBB A+ rating, and our experience handling over 2,000 insurance claims in the area.*

*What questions can I answer for you today?"*

---
Would you like me to customize this further?`;
  }

  return `I'm Guardian Intel, your AI assistant for storm damage sales. Here's what I can help with:

🔍 **Customer Research** - Look up property details, insurance info, weather history
📊 **Pipeline Analysis** - Get recommendations based on lead score and stage
📝 **Script Generation** - Create personalized scripts for calls and objections
🌩️ **Weather Alerts** - Check for storm activity affecting your customers
📧 **Communication** - Draft emails and follow-up messages

${customerId ? "I see you have a customer selected. What would you like to know about them?" : "Select a customer or ask me anything to get started!"}`;
}
