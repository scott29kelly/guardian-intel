/**
 * Playbook Rating API
 * 
 * POST /api/playbooks/[id]/rating - Rate a playbook
 * GET /api/playbooks/[id]/rating - Get user's rating
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { cuidSchema, formatZodErrors, playbookRatingSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/playbooks/[id]/rating
 * 
 * Rate a playbook (create or update)
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

    const body = await request.json();
    const validation = playbookRatingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid rating data",
          details: formatZodErrors(validation.error),
        },
        { status: 400 }
      );
    }

    const { rating, feedback } = validation.data;

    // Check if playbook exists
    const playbook = await prisma.playbook.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!playbook) {
      return NextResponse.json(
        { success: false, error: "Playbook not found" },
        { status: 404 }
      );
    }

    // Upsert rating
    const playbookRating = await prisma.playbookRating.upsert({
      where: {
        playbookId_userId: {
          playbookId: id,
          userId: session.user.id,
        },
      },
      create: {
        playbookId: id,
        userId: session.user.id,
        rating,
        feedback: feedback || null,
      },
      update: {
        rating,
        feedback: feedback || null,
      },
    });

    // Update playbook's average rating
    const allRatings = await prisma.playbookRating.findMany({
      where: { playbookId: id },
      select: { rating: true },
    });

    const avgRating =
      allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;

    await prisma.playbook.update({
      where: { id },
      data: { rating: Math.round(avgRating * 10) / 10 },
    });

    return NextResponse.json({
      success: true,
      rating: {
        id: playbookRating.id,
        rating: playbookRating.rating,
        feedback: playbookRating.feedback,
        createdAt: playbookRating.createdAt,
        updatedAt: playbookRating.updatedAt,
      },
      newAvgRating: Math.round(avgRating * 10) / 10,
    });
  } catch (error) {
    console.error("[API] POST /api/playbooks/[id]/rating error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save rating" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/playbooks/[id]/rating
 * 
 * Get current user's rating for a playbook
 */
export async function GET(request: Request, { params }: RouteParams) {
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

    const rating = await prisma.playbookRating.findUnique({
      where: {
        playbookId_userId: {
          playbookId: id,
          userId: session.user.id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      rating: rating
        ? {
            rating: rating.rating,
            feedback: rating.feedback,
            createdAt: rating.createdAt,
          }
        : null,
    });
  } catch (error) {
    console.error("[API] GET /api/playbooks/[id]/rating error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch rating" },
      { status: 500 }
    );
  }
}
