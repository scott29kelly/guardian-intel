/**
 * Playbook Usage Tracking API
 * 
 * POST /api/playbooks/[id]/use - Log playbook usage with context
 * 
 * Tracks when and how playbooks are used, linking to customers
 * for effectiveness analytics.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { cuidSchema, formatZodErrors } from "@/lib/validations";

export const dynamic = "force-dynamic";

const usageContextSchema = z.enum([
  "practice",
  "customer_call",
  "meeting",
  "reference",
  "roleplay",
]);

const usageOutcomeSchema = z.enum([
  "closed_won",
  "follow_up",
  "no_result",
  "objection_handled",
]);

const createUsageSchema = z.object({
  customerId: cuidSchema.optional(),
  context: usageContextSchema,
  duration: z.number().int().min(0).optional(),
  completed: z.boolean().optional().default(false),
  outcome: usageOutcomeSchema.optional(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/playbooks/[id]/use
 * 
 * Log a playbook usage event
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    // Rate limiting
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

    // Validate playbook ID
    const idValidation = cuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: "Invalid playbook ID" },
        { status: 400 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validation = createUsageSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid usage data",
          details: formatZodErrors(validation.error),
        },
        { status: 400 }
      );
    }

    const { customerId, context, duration, completed, outcome } = validation.data;

    // Verify playbook exists and increment usage count
    const playbook = await prisma.playbook.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
      select: { id: true, title: true },
    });

    if (!playbook) {
      return NextResponse.json(
        { success: false, error: "Playbook not found" },
        { status: 404 }
      );
    }

    // Create usage record
    const usage = await prisma.playbookUsage.create({
      data: {
        playbookId: id,
        userId: session.user.id,
        customerId: customerId || null,
        context,
        duration: duration || null,
        completed,
        outcome: outcome || null,
      },
      include: {
        customer: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      usage: {
        id: usage.id,
        playbookId: usage.playbookId,
        context: usage.context,
        duration: usage.duration,
        completed: usage.completed,
        outcome: usage.outcome,
        customer: usage.customer,
        createdAt: usage.createdAt,
      },
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2025") {
      return NextResponse.json(
        { success: false, error: "Playbook not found" },
        { status: 404 }
      );
    }
    console.error("[API] POST /api/playbooks/[id]/use error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to log usage" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/playbooks/[id]/use
 * 
 * Get usage history for a playbook
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const rateLimitResponse = await rateLimit(request, "api");
    if (rateLimitResponse) return rateLimitResponse;

    const { id } = await params;

    const idValidation = cuidSchema.safeParse(id);
    if (!idValidation.success) {
      return NextResponse.json(
        { success: false, error: "Invalid playbook ID" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

    const usages = await prisma.playbookUsage.findMany({
      where: { playbookId: id },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, name: true } },
        customer: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({
      success: true,
      usages: usages.map((u) => ({
        id: u.id,
        context: u.context,
        duration: u.duration,
        completed: u.completed,
        outcome: u.outcome,
        user: u.user,
        customer: u.customer,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    console.error("[API] GET /api/playbooks/[id]/use error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch usage history" },
      { status: 500 }
    );
  }
}
