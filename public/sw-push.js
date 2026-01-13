/**
 * Guardian Intel - Push Notification Service Worker
 * 
 * This file handles push notification events.
 * It's loaded alongside the next-pwa generated service worker.
 */

// Handle push events
self.addEventListener("push", (event) => {
  console.log("[SW] Push received:", event);

  if (!event.data) {
    console.log("[SW] Push event but no data");
    return;
  }

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || "New notification from Guardian Intel",
      icon: data.icon || "/icons/icon-192x192.svg",
      badge: data.badge || "/icons/icon-192x192.svg",
      tag: data.tag || "guardian-notification",
      vibrate: [100, 50, 100],
      data: data.data || {},
      actions: getActionsForType(data.data?.type),
      requireInteraction: data.data?.type === "storm", // Keep storm alerts visible
    };

    event.waitUntil(
      self.registration.showNotification(data.title || "Guardian Intel", options)
    );
  } catch (error) {
    console.error("[SW] Error parsing push data:", error);
    
    // Fallback: show raw text
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification("Guardian Intel", {
        body: text,
        icon: "/icons/icon-192x192.svg",
      })
    );
  }
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification click:", event);
  
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = "/";

  // Determine URL based on notification type or action
  if (event.action === "view-storms") {
    targetUrl = "/storms";
  } else if (event.action === "view-customer") {
    targetUrl = data.entityId ? `/customers?id=${data.entityId}` : "/customers";
  } else if (event.action === "dismiss") {
    return; // Just close, don't navigate
  } else if (data.url) {
    targetUrl = data.url;
  } else {
    // Default URLs by type
    switch (data.type) {
      case "storm":
        targetUrl = "/storms";
        break;
      case "lead":
      case "deal":
        targetUrl = data.entityId ? `/customers?id=${data.entityId}` : "/customers";
        break;
      case "reminder":
        targetUrl = "/";
        break;
      default:
        targetUrl = "/";
    }
  }

  // Focus existing window or open new one
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Try to focus an existing Guardian Intel window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      
      // Open new window if none found
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle notification close (for analytics)
self.addEventListener("notificationclose", (event) => {
  console.log("[SW] Notification closed:", event.notification.tag);
  // Could send analytics here
});

// Get action buttons based on notification type
function getActionsForType(type) {
  switch (type) {
    case "storm":
      return [
        { action: "view-storms", title: "View Storm Intel", icon: "/icons/icon-192x192.svg" },
        { action: "dismiss", title: "Dismiss" },
      ];
    case "lead":
    case "deal":
      return [
        { action: "view-customer", title: "View Customer", icon: "/icons/icon-192x192.svg" },
        { action: "dismiss", title: "Dismiss" },
      ];
    default:
      return [];
  }
}

// Log when service worker is installed
self.addEventListener("install", (event) => {
  console.log("[SW Push] Installing...");
  self.skipWaiting();
});

// Log when service worker is activated
self.addEventListener("activate", (event) => {
  console.log("[SW Push] Activated");
  event.waitUntil(clients.claim());
});
