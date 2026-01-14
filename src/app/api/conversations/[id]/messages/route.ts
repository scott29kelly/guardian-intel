import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

// Message creation schema with strict validation
const createMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1, "Content is required").max(50000, "Content too long"),
  model: z.string().max(100).optional(),
  toolCalls: z.array(z.object({
    id: z.string(),
    name: z.string(),
    arguments: z.record(z.string(), z.unknown()),
  })).optional(),
});

// POST /api/conversations/[id]/messages - Add message to conversation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit message creation (uses AI limits for chat-related endpoints)
    const rateLimitResponse = await rateLimit(request, "ai");
    if (rateLimitResponse) return rateLimitResponse;

    const { id } = await params;
    const body = await request.json();

    // Validate request body with Zod
    const validation = createMessageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid message data",
          details: validation.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; "),
        },
        { status: 400 }
      );
    }

    const { role, content, model, toolCalls } = validation.data;

    // Verify conversation ownership
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        conversationId: id,
        role,
        content,
        model: model || null,
        toolCalls: toolCalls ? JSON.stringify(toolCalls) : null,
      },
    });

    // Auto-generate title from first user message if not set
    if (!conversation.title && role === "user") {
      const title = content.substring(0, 50) + (content.length > 50 ? "..." : "");
      await prisma.conversation.update({
        where: { id },
        data: { title },
      });
    }

    // Update conversation's updatedAt
    await prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Failed to add message:", error);
    return NextResponse.json(
      { error: "Failed to add message" },
      { status: 500 }
    );
  }
}
