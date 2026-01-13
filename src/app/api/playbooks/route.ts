/**
 * Playbooks API
 * 
 * GET /api/playbooks - List playbooks with pagination and filtering
 * POST /api/playbooks - Create a new playbook
 * 
 * Security:
 * - Rate limited
 * - Input validated
 * - Authentication required via middleware
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { playbookQuerySchema, createPlaybookSchema, formatZodErrors } from "@/lib/validations";

export const dynamic = "force-dynamic";

/**
 * GET /api/playbooks
 * 
 * Query params:
 * - page: number (default 1)
 * - limit: number (default 20, max 100)
 * - search: string
 * - category: objection-handling | closing | discovery | etc.
 * - type: script | checklist | guide | template
 * - isPublished: boolean
 * - sortBy: usageCount | rating | createdAt | title
 * - sortOrder: asc | desc
 */
export async function GET(request: Request) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    // Validate query
    const validation = playbookQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: formatZodErrors(validation.error),
        },
        { status: 400 }
      );
    }

    const { page, limit, sortBy, sortOrder, search, category, type, isPublished } = validation.data;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (type) {
      where.type = type;
    }

    if (isPublished !== undefined) {
      where.isPublished = isPublished;
    }

    // Build orderBy
    const orderByField = sortBy || "createdAt";
    const orderByDirection = sortOrder || "desc";
    const orderBy = { [orderByField]: orderByDirection };

    // Get total count
    const total = await prisma.playbook.count({ where });

    // Fetch playbooks
    const playbooks = await prisma.playbook.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    // Parse tags JSON for each playbook
    const parsedPlaybooks = playbooks.map((playbook) => ({
      ...playbook,
      tags: playbook.tags ? JSON.parse(playbook.tags) : [],
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: parsedPlaybooks,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("[API] GET /api/playbooks error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch playbooks" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/playbooks
 * 
 * Create a new playbook
 */
export async function POST(request: Request) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    // Get session for author info
    const session = await getServerSession(authOptions);
    const authorName = session?.user?.name || "Anonymous";

    // Parse and validate body
    const body = await request.json();
    const validation = createPlaybookSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid playbook data",
          details: formatZodErrors(validation.error),
        },
        { status: 400 }
      );
    }

    const { title, description, category, type, content, stage, scenario, tags, isPublished } = validation.data;

    // Create playbook
    const playbook = await prisma.playbook.create({
      data: {
        title,
        description: description || null,
        category,
        type,
        content: content || "",
        stage: stage || null,
        scenario: scenario || null,
        author: authorName,
        isPublished: isPublished ?? true,
        tags: tags ? JSON.stringify(tags) : null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        playbook: {
          ...playbook,
          tags: playbook.tags ? JSON.parse(playbook.tags) : [],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] POST /api/playbooks error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create playbook" },
      { status: 500 }
    );
  }
}
