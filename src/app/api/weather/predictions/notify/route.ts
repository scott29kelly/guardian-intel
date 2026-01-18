/**
 * Storm Prediction Notification API
 * 
 * POST /api/weather/predictions/notify
 * Send push notifications for storm predictions
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import webpush from "web-push";
import { z } from "zod";

// Configure web-push
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:contact@guardian-intel.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

const notifySchema = z.object({
  predictionId: z.string(),
  title: z.string(),
  body: z.string(),
  severity: z.enum(["marginal", "slight", "enhanced", "moderate", "high"]),
  hoursUntil: z.number(),
  affectedStates: z.array(z.string()),
  userIds: z.array(z.string()).optional(), // If empty, notify all users in affected states
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only managers and admins can trigger notifications
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !["manager", "admin"].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const validated = notifySchema.parse(body);

    // Get push subscriptions
    let subscriptions;
    if (validated.userIds && validated.userIds.length > 0) {
      subscriptions = await prisma.pushSubscription.findMany({
        where: { userId: { in: validated.userIds } },
      });
    } else {
      // Get all active subscriptions
      subscriptions = await prisma.pushSubscription.findMany({
        where: {
          user: { isActive: true },
        },
      });
    }

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No subscriptions to notify",
        notified: 0,
      });
    }

    // Build notification payload
    const icon = validated.severity === "high" || validated.severity === "moderate"
      ? "⚠️"
      : validated.severity === "enhanced"
      ? "🌩️"
      : "🌧️";

    const payload = JSON.stringify({
      title: `${icon} ${validated.title}`,
      body: validated.body,
      icon: "/icons/icon-192x192.svg",
      badge: "/icons/icon-192x192.svg",
      tag: `storm-prediction-${validated.predictionId}`,
      data: {
        type: "storm-prediction",
        predictionId: validated.predictionId,
        severity: validated.severity,
        url: `/storms?prediction=${validated.predictionId}`,
      },
      actions: [
        { action: "view", title: "View Details" },
        { action: "dismiss", title: "Dismiss" },
      ],
    });

    // Send notifications
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload
          );
          return { success: true, userId: sub.userId };
        } catch (error: any) {
          // Remove invalid subscriptions
          if (error.statusCode === 404 || error.statusCode === 410) {
            await prisma.pushSubscription.delete({
              where: { id: sub.id },
            });
          }
          return { success: false, userId: sub.userId, error: error.message };
        }
      })
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && (r.value as any).success
    ).length;

    // Log the notification
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        type: "create",
        entityType: "notification",
        entityId: validated.predictionId,
        description: `Sent storm alert to ${successful} users: ${validated.title}`,
        metadata: JSON.stringify({
          severity: validated.severity,
          affectedStates: validated.affectedStates,
          totalSubscriptions: subscriptions.length,
          successful,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Notifications sent to ${successful} of ${subscriptions.length} users`,
      notified: successful,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error("[Notify API] Error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 }
    );
  }
}
