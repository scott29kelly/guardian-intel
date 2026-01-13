import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  runDailyAggregation,
  backfillMetrics,
} from "@/lib/services/analytics";

/**
 * POST /api/analytics/aggregate
 *
 * Triggers daily metrics aggregation.
 *
 * Security:
 * - Vercel Cron: Pass CRON_SECRET in Authorization header
 * - Manual: Requires admin role
 *
 * Query params:
 * - date: Optional ISO date string to aggregate (defaults to today)
 * - backfill: If "true" with startDate/endDate, runs backfill instead
 * - startDate: Start date for backfill (ISO)
 * - endDate: End date for backfill (ISO)
 */
export async function POST(request: Request) {
  try {
    // Check authorization
    const isAuthorized = await checkAuthorization(request);
    if (!isAuthorized.authorized) {
      return NextResponse.json(
        { error: isAuthorized.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const isBackfill = searchParams.get("backfill") === "true";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Handle backfill mode
    if (isBackfill) {
      if (!startDateParam || !endDateParam) {
        return NextResponse.json(
          { error: "Backfill requires startDate and endDate parameters" },
          { status: 400 }
        );
      }

      const startDate = new Date(startDateParam);
      const endDate = new Date(endDateParam);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format. Use ISO format (YYYY-MM-DD)" },
          { status: 400 }
        );
      }

      if (startDate > endDate) {
        return NextResponse.json(
          { error: "startDate must be before endDate" },
          { status: 400 }
        );
      }

      // Limit backfill to 90 days to prevent abuse
      const daysDiff = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysDiff > 90) {
        return NextResponse.json(
          { error: "Backfill limited to 90 days maximum" },
          { status: 400 }
        );
      }

      console.log(`[Aggregation API] Backfill from ${startDateParam} to ${endDateParam}`);
      const result = await backfillMetrics(startDate, endDate);

      return NextResponse.json({
        success: true,
        mode: "backfill",
        startDate: startDateParam,
        endDate: endDateParam,
        ...result,
      });
    }

    // Standard single-day aggregation
    const targetDate = dateParam ? new Date(dateParam) : new Date();

    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use ISO format (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    console.log(`[Aggregation API] Running for ${targetDate.toISOString().split("T")[0]}`);
    const results = await runDailyAggregation(targetDate);

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    return NextResponse.json({
      success: failed.length === 0,
      mode: "single",
      date: targetDate.toISOString().split("T")[0],
      processed: successful.length,
      errors: failed.length,
      results: results.map((r) => ({
        date: r.date,
        userId: r.userId,
        success: r.success,
        error: r.error,
      })),
    });
  } catch (error) {
    console.error("[Aggregation API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/aggregate
 *
 * Returns aggregation status/info (no action taken)
 */
export async function GET(request: Request) {
  try {
    const isAuthorized = await checkAuthorization(request);
    if (!isAuthorized.authorized) {
      return NextResponse.json(
        { error: isAuthorized.error },
        { status: 401 }
      );
    }

    return NextResponse.json({
      endpoint: "/api/analytics/aggregate",
      methods: {
        POST: {
          description: "Run daily metrics aggregation",
          params: {
            date: "Optional ISO date (YYYY-MM-DD) to aggregate. Defaults to today.",
            backfill: "Set to 'true' to enable backfill mode",
            startDate: "Required for backfill - start date",
            endDate: "Required for backfill - end date (max 90 days range)",
          },
        },
      },
      security: {
        cronSecret: "Pass CRON_SECRET in Authorization header for automated calls",
        adminRole: "Or authenticate as admin user",
      },
    });
  } catch (error) {
    console.error("[Aggregation API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Check if request is authorized
 */
async function checkAuthorization(
  request: Request
): Promise<{ authorized: boolean; error?: string }> {
  // Check for Vercel Cron secret (used by scheduled jobs)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return { authorized: true };
  }

  // Check for authenticated admin user
  const session = await auth();

  if (!session?.user) {
    return { authorized: false, error: "Unauthorized" };
  }

  const userRole = (session.user as { role?: string }).role;

  if (userRole !== "admin" && userRole !== "manager") {
    return { authorized: false, error: "Admin or manager role required" };
  }

  return { authorized: true };
}
