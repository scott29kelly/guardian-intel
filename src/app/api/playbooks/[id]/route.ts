/**
 * Single Playbook API
 * 
 * GET /api/playbooks/[id] - Get a single playbook (increments usage count)
 * PUT /api/playbooks/[id] - Update a playbook
 * DELETE /api/playbooks/[id] - Delete a playbook
 * 
 * Security:
 * - Rate limited
 * - Input validated
 * - Authentication required via middleware
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { updatePlaybookSchema, formatZodErrors, cuidSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/playbooks/[id]
 * 
 * Get a single playbook by ID and increment usage count
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    // Rate limiting
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const { id } = await params;

    // Validate ID
    const idValidation = cuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: "Invalid playbook ID" },
        { status: 400 }
      );
    }

    // Fetch playbook and increment usage count
    const playbook = await prisma.playbook.update({
      where: { id },
      data: {
        usageCount: { increment: 1 },
      },
    });

    if (!playbook) {
      return NextResponse.json(
        { success: false, error: "Playbook not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      playbook: {
        ...playbook,
        tags: playbook.tags ? JSON.parse(playbook.tags) : [],
      },
    });
  } catch (error) {
    // Check if it's a "not found" error from Prisma
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json(
        { success: false, error: "Playbook not found" },
        { status: 404 }
      );
    }
    console.error("[API] GET /api/playbooks/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch playbook" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/playbooks/[id]
 *
 * Update a playbook (managers and admins only)
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    // Require authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only managers and admins can update playbooks
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "manager" && userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only managers and admins can update playbooks" },
        { status: 403 }
      );
    }

    // Rate limiting
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const { id } = await params;

    // Validate ID
    const idValidation = cuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: "Invalid playbook ID" },
        { status: 400 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validation = updatePlaybookSchema.safeParse(body);

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

    const { tags, ...rest } = validation.data;

    // Build update data
    const updateData: Record<string, unknown> = { ...rest };
    if (tags !== undefined) {
      updateData.tags = JSON.stringify(tags);
    }

    // Update playbook
    const playbook = await prisma.playbook.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      playbook: {
        ...playbook,
        tags: playbook.tags ? JSON.parse(playbook.tags) : [],
      },
    });
  } catch (error) {
    // Check if it's a "not found" error from Prisma
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json(
        { success: false, error: "Playbook not found" },
        { status: 404 }
      );
    }
    console.error("[API] PUT /api/playbooks/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update playbook" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/playbooks/[id]
 *
 * Delete a playbook (admins only)
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    // Require authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only admins can delete playbooks
    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "admin") {
      return NextResponse.json(
        { success: false, error: "Forbidden: Only admins can delete playbooks" },
        { status: 403 }
      );
    }

    // Rate limiting
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const { id } = await params;

    // Validate ID
    const idValidation = cuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: "Invalid playbook ID" },
        { status: 400 }
      );
    }

    // Delete playbook
    await prisma.playbook.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Playbook deleted successfully",
    });
  } catch (error) {
    // Check if it's a "not found" error from Prisma
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json(
        { success: false, error: "Playbook not found" },
        { status: 404 }
      );
    }
    console.error("[API] DELETE /api/playbooks/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete playbook" },
      { status: 500 }
    );
  }
}
