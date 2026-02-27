import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Competitor, StateCode } from "@/lib/terrain/types";
import type { CompetitorActivity } from "@/lib/terrain/generators/competitor-generator";
import { TERRITORY_COUNTIES } from "@/lib/terrain/constants";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dbCompetitors = await prisma.competitor.findMany({
      where: { isActive: true },
      include: {
        activities: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    const competitors: Competitor[] = dbCompetitors.map((c) => {
      // Parse serviceAreas JSON string to StateCode[]
      let serviceArea: StateCode[] = [];
      if (c.serviceAreas) {
        try {
          const parsed = JSON.parse(c.serviceAreas);
          if (Array.isArray(parsed)) {
            serviceArea = parsed as StateCode[];
          }
        } catch {
          serviceArea = [];
        }
      }

      // Map employeeCount to estimatedSize
      const estimatedSize: Competitor["estimatedSize"] =
        !c.employeeCount || c.employeeCount < 20
          ? "small"
          : c.employeeCount <= 100
            ? "medium"
            : "large";

      // Parse strengths/weaknesses (comma-separated or single string)
      const strengths = c.strengths
        ? c.strengths.includes(",")
          ? c.strengths.split(",").map((s) => s.trim())
          : [c.strengths]
        : [];
      const weaknesses = c.weaknesses
        ? c.weaknesses.includes(",")
          ? c.weaknesses.split(",").map((s) => s.trim())
          : [c.weaknesses]
        : [];

      // Compute threatLevel from recent activity count
      const recentActivityCount = c.activities.filter(
        (a) => a.createdAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length;
      const threatLevel: Competitor["threatLevel"] =
        recentActivityCount >= 10 ? "high" : recentActivityCount >= 3 ? "moderate" : "low";

      return {
        id: c.id,
        name: c.displayName || c.name,
        serviceArea,
        estimatedSize,
        strengths,
        weaknesses,
        threatLevel,
      };
    });

    // Map Prisma CompetitorActivity to terrain CompetitorActivity
    const activityTypeMap: Record<string, CompetitorActivity["activityType"]> = {
      sighting: "job_sighting",
      canvassing: "job_sighting",
      quote: "price_change",
      price_intel: "price_change",
      won_deal: "job_sighting",
      lost_deal: "job_sighting",
      marketing: "marketing_activity",
    };

    const activities: CompetitorActivity[] = dbCompetitors.flatMap((c) =>
      c.activities.map((a) => {
        const county = a.state
          ? TERRITORY_COUNTIES.find(
              (tc) => tc.state === a.state
            )
          : undefined;

        return {
          id: a.id,
          competitorId: a.competitorId,
          competitorName: c.displayName || c.name,
          activityType: activityTypeMap[a.activityType] || "job_sighting",
          description: a.description || `${a.activityType} activity reported`,
          location: a.state
            ? { county: county?.name || a.city || "Unknown", state: a.state as StateCode }
            : undefined,
          detectedAt: a.createdAt,
          significance: ((): CompetitorActivity["significance"] => {
            const comp = competitors.find((comp) => comp.id === a.competitorId);
            if (!comp) return "low";
            return comp.threatLevel === "high" ? "high" : comp.threatLevel === "moderate" ? "medium" : "low";
          })(),
          source: "Competitor Monitoring",
        };
      })
    ).sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

    return NextResponse.json({ success: true, data: { competitors, activities } });
  } catch (error) {
    console.error("Failed to fetch terrain competitors:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch competitor data" },
      { status: 500 }
    );
  }
}
