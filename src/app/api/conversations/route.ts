import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { cuidSchema } from "@/lib/validations";

// Conversation creation schema
const createConversationSchema = z.object({
  customerId: cuidSchema.optional().nullable(),
  title: z.string().max(200).optional().nullable(),
});

// GET /api/conversations - List user's conversations
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const customerId = searchParams.get("customerId");
    const limit = parseInt(searchParams.get("limit") || "20");

    const conversations = await prisma.conversation.findMany({
      where: {
        userId: session.user.id,
        isArchived: false,
        ...(customerId && { customerId }),
        ...(search && {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            {
              messages: {
                some: {
                  content: { contains: search, mode: "insensitive" },
                },
              },
            },
          ],
        }),
      },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title || "New Conversation",
        customerId: c.customerId,
        messageCount: c._count.messages,
        lastMessage: c.messages[0]?.content?.substring(0, 100) || null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create new conversation
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();

    // Validate input
    const validation = createConversationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid conversation data" },
        { status: 400 }
      );
    }

    const { customerId, title } = validation.data;

    const conversation = await prisma.conversation.create({
      data: {
        userId: session.user.id,
        customerId: customerId || null,
        title: title || null,
      },
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("Failed to create conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
