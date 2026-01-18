/**
 * Playbook Duplication API
 * 
 * POST /api/playbooks/[id]/duplicate - Clone a playbook
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { cuidSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/playbooks/[id]/duplicate
 * 
 * Create a copy of an existing playbook
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const idValidation = cuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: "Invalid playbook ID" },
        { status: 400 }
      );
    }

    // Fetch original playbook
    const original = await prisma.playbook.findUnique({
      where: { id },
    });

    if (!original) {
      return NextResponse.json(
        { success: false, error: "Playbook not found" },
        { status: 404 }
      );
    }

    // Parse optional body for custom title
    let customTitle = `${original.title} (Copy)`;
    try {
      const body = await request.json();
      if (body.title) {
        customTitle = body.title;
      }
    } catch {
      // No body provided, use default title
    }

    // Create duplicate
    const duplicate = await prisma.playbook.create({
      data: {
        title: customTitle,
        description: original.description,
        category: original.category,
        type: original.type,
        content: original.content,
        stage: original.stage,
        scenario: original.scenario,
        variables: original.variables,
        author: session.user.name || "Unknown",
        isPublished: false, // Start as draft
        usageCount: 0,
        rating: null,
        tags: original.tags,
      },
    });

    return NextResponse.json({
      success: true,
      playbook: {
        ...duplicate,
        tags: duplicate.tags ? JSON.parse(duplicate.tags) : [],
      },
      message: "Playbook duplicated successfully",
    });
  } catch (error) {
    console.error("[API] POST /api/playbooks/[id]/duplicate error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to duplicate playbook" },
      { status: 500 }
    );
  }
}
