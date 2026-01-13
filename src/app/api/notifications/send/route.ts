import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import webpush from "web-push";

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@guardian-intel.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    type?: "storm" | "lead" | "deal" | "reminder";
    entityId?: string;
  };
}

/**
 * POST /api/notifications/send
 * 
 * Send a push notification to specific users or all users.
 * This is an internal API - should be called from server-side code.
 * 
 * For external triggers (webhooks), use proper authentication.
 */
export async function POST(request: Request) {
  try {
    // Check authorization - require admin role or internal API key
    const session = await auth();
    const apiKey = request.headers.get("x-api-key");
    const internalKey = process.env.INTERNAL_API_KEY;

    const isAdmin = session?.user?.role === "admin" || session?.user?.role === "manager";
    const hasValidApiKey = internalKey && apiKey === internalKey;

    if (!isAdmin && !hasValidApiKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if VAPID keys are configured
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        { error: "Push notifications not configured. Set VAPID keys in environment." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { 
      userIds,  // Optional: specific user IDs to notify
      payload,  // Required: notification content
      type = "all" // "all" | "specific"
    } = body as {
      userIds?: string[];
      payload: NotificationPayload;
      type?: "all" | "specific";
    };

    if (!payload?.title || !payload?.body) {
      return NextResponse.json(
        { error: "Notification payload required (title, body)" },
        { status: 400 }
      );
    }

    // Get subscriptions
    const subscriptions = await prisma.pushSubscription.findMany({
      where: type === "specific" && userIds?.length 
        ? { userId: { in: userIds } }
        : {},
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        sent: 0,
        message: "No active subscriptions found",
      });
    }

    // Build notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || "/icons/icon-192x192.svg",
      badge: payload.badge || "/icons/icon-192x192.svg",
      tag: payload.tag,
      data: payload.data || {},
    });

    // Send to all subscriptions
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
            notificationPayload
          );
          return { success: true, userId: sub.userId };
        } catch (error) {
          // If subscription is expired/invalid, remove it
          if (error instanceof webpush.WebPushError && error.statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
            return { success: false, userId: sub.userId, expired: true };
          }
          throw error;
        }
      })
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    const failed = results.filter(
      (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.success)
    ).length;
    const expired = results.filter(
      (r) => r.status === "fulfilled" && r.value.expired
    ).length;

    return NextResponse.json({
      success: true,
      sent,
      failed,
      expired,
      total: subscriptions.length,
    });
  } catch (error) {
    console.error("[Push Send] Error:", error);
    return NextResponse.json(
      { error: "Failed to send notifications" },
      { status: 500 }
    );
  }
}

/**
 * Utility function to send storm alerts
 * Can be imported and called from weather webhook handlers
 */
export async function sendStormAlert(
  title: string,
  body: string,
  stormId?: string,
  affectedUserIds?: string[]
) {
  const payload: NotificationPayload = {
    title,
    body,
    tag: stormId ? `storm-${stormId}` : "storm-alert",
    data: {
      type: "storm",
      url: "/storms",
      entityId: stormId,
    },
  };

  // This would be called internally, not via HTTP
  // In production, you'd implement the actual sending logic here
  return payload;
}
