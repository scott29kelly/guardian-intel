import { NextResponse } from "next/server";

/**
 * GET /api/notifications/vapid-key
 * 
 * Returns the public VAPID key for push subscription.
 * This is needed by the client to subscribe to push notifications.
 */
export async function GET() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!vapidPublicKey) {
    return NextResponse.json(
      { 
        error: "Push notifications not configured",
        configured: false,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    publicKey: vapidPublicKey,
    configured: true,
  });
}
