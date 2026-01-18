/**
 * Push Notification Service
 * 
 * Utilities for sending push notifications.
 * The actual sending is done via the /api/notifications/send endpoint.
 */

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
 * Utility function to build storm alert notification payload.
 * Can be used to send storm alerts via the notification API.
 */
export function buildStormAlertPayload(
  title: string,
  body: string,
  stormId?: string
): NotificationPayload {
  return {
    title,
    body,
    tag: stormId ? `storm-${stormId}` : "storm-alert",
    data: {
      type: "storm",
      url: "/storms",
      entityId: stormId,
    },
  };
}

/**
 * Send a push notification via the internal API.
 * 
 * @param payload - The notification content
 * @param userIds - Optional: specific user IDs to notify (defaults to all)
 * @param apiKey - Internal API key for authentication
 */
export async function sendPushNotification(
  payload: NotificationPayload,
  userIds?: string[],
  apiKey?: string
): Promise<{ success: boolean; sent?: number; error?: string }> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/notifications/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-api-key": apiKey } : {}),
      },
      body: JSON.stringify({
        payload,
        userIds,
        type: userIds?.length ? "specific" : "all",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || "Failed to send notification" };
    }

    const result = await response.json();
    return { success: true, sent: result.sent };
  } catch (error) {
    console.error("[Notifications] Error sending push notification:", error);
    return { success: false, error: "Network error" };
  }
}

/**
 * Send storm alert to all users or specific affected users.
 */
export async function sendStormAlert(
  title: string,
  body: string,
  stormId?: string,
  affectedUserIds?: string[]
): Promise<{ success: boolean; sent?: number; error?: string }> {
  const payload = buildStormAlertPayload(title, body, stormId);
  const apiKey = process.env.INTERNAL_API_KEY;
  
  return sendPushNotification(payload, affectedUserIds, apiKey);
}
