/**
 * Outreach Templates API
 * 
 * GET  /api/outreach/templates - List templates
 * POST /api/outreach/templates - Create template
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { outreachService, DEFAULT_TEMPLATES, TEMPLATE_VARIABLES } from "@/lib/services/outreach";
import { z } from "zod";

const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(["storm", "follow-up", "seasonal", "promotional"]),
  channel: z.enum(["sms", "email"]),
  subject: z.string().optional(),
  body: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const channel = searchParams.get("channel");
    const includeDefaults = searchParams.get("includeDefaults") !== "false";

    const where: any = { isActive: true };
    if (category) where.category = category;
    if (channel) where.channel = channel;

    const templates = await prisma.outreachTemplate.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });

    // Include default templates if requested and none exist
    let allTemplates: any[] = templates.map((t) => ({
      ...t,
      variables: t.variables ? JSON.parse(t.variables) : [],
    }));

    if (includeDefaults && templates.length === 0) {
      const defaults = Object.values(DEFAULT_TEMPLATES).map((t, i) => ({
        id: `default-${i}`,
        name: t.name,
        category: t.category,
        channel: t.channel,
        subject: "subject" in t ? t.subject : null,
        body: t.body,
        isDefault: true,
        isBuiltIn: true,
      }));
      allTemplates = [...defaults, ...allTemplates];
    }

    return NextResponse.json({
      data: allTemplates,
      variables: TEMPLATE_VARIABLES,
    });
  } catch (error) {
    console.error("[Templates API] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createTemplateSchema.parse(body);

    // Extract variables used in template
    const variablePattern = /\{\{(\w+)\}\}/g;
    const usedVariables: string[] = [];
    let match;
    while ((match = variablePattern.exec(validated.body)) !== null) {
      if (!usedVariables.includes(match[1])) {
        usedVariables.push(match[1]);
      }
    }
    if (validated.subject) {
      while ((match = variablePattern.exec(validated.subject)) !== null) {
        if (!usedVariables.includes(match[1])) {
          usedVariables.push(match[1]);
        }
      }
    }

    const template = await prisma.outreachTemplate.create({
      data: {
        name: validated.name,
        description: validated.description,
        category: validated.category,
        channel: validated.channel,
        subject: validated.subject,
        body: validated.body,
        variables: JSON.stringify(usedVariables),
        createdById: session.user.id,
      },
    });

    return NextResponse.json({ data: template }, { status: 201 });
  } catch (error) {
    console.error("[Templates API] POST error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
