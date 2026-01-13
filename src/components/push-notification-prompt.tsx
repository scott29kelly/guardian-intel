"use client";

/**
 * Push Notification Prompt Component
 * 
 * Handles requesting notification permissions and subscribing to push notifications.
 * Shows a non-intrusive prompt that respects user choice.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, X, CloudLightning, Zap, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

type PermissionState = "prompt" | "granted" | "denied" | "unsupported" | "loading";

export function PushNotificationPrompt() {
  const [permissionState, setPermissionState] = useState<PermissionState>("loading");
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const { showToast } = useToast();

  // Check current permission state
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if push notifications are supported
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPermissionState("unsupported");
      return;
    }

    // Check current permission
    const permission = Notification.permission;
    setPermissionState(permission as PermissionState);

    // Show prompt if permission hasn't been decided and user hasn't dismissed before
    if (permission === "default") {
      const dismissed = localStorage.getItem("guardian-push-dismissed");
      const dismissedAt = dismissed ? parseInt(dismissed, 10) : 0;
      const daysSinceDismissed = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      
      // Show prompt if never dismissed or dismissed more than 7 days ago
      if (!dismissed || daysSinceDismissed > 7) {
        // Delay prompt to not be too aggressive
        const timer = setTimeout(() => setShowPrompt(true), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // Convert VAPID key from base64 to Uint8Array
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    setIsSubscribing(true);

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      setPermissionState(permission as PermissionState);

      if (permission !== "granted") {
        showToast("info", "Notifications Disabled", "You can enable them later in browser settings");
        setShowPrompt(false);
        return;
      }

      // Get VAPID public key from server
      let vapidData;
      try {
        const vapidResponse = await fetch("/api/notifications/vapid-key");
        vapidData = await vapidResponse.json();
      } catch (fetchError) {
        console.warn("Failed to fetch VAPID key:", fetchError);
        showToast("warning", "Setup Required", "Push notifications need server configuration");
        setShowPrompt(false);
        return;
      }

      if (!vapidData?.configured || !vapidData?.publicKey) {
        console.warn("Push notifications not configured on server");
        showToast("warning", "Not Available", "Push notifications are not configured yet");
        setShowPrompt(false);
        return;
      }

      // Wait for service worker with timeout
      let registration;
      try {
        registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Service worker timeout")), 10000)
          ),
        ]) as ServiceWorkerRegistration;
      } catch (swError) {
        console.warn("Service worker not ready:", swError);
        showToast("warning", "Please Refresh", "Service worker is still loading");
        setShowPrompt(false);
        return;
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
      });

      // Send subscription to server
      const response = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save subscription");
      }

      showToast("success", "Notifications Enabled", "You'll receive alerts for storms and hot leads");
      setShowPrompt(false);
    } catch (error) {
      console.error("Failed to subscribe to push notifications:", error);
      showToast("error", "Subscription Failed", "Please try again later");
      setShowPrompt(false);
    } finally {
      setIsSubscribing(false);
    }
  }, [showToast]);

  // Dismiss the prompt
  const dismiss = useCallback(() => {
    localStorage.setItem("guardian-push-dismissed", Date.now().toString());
    setShowPrompt(false);
  }, []);

  // Don't render if not showing
  if (!showPrompt || permissionState === "granted" || permissionState === "unsupported") {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className="fixed bottom-4 right-4 z-[100] max-w-sm"
      >
        <div className="bg-[hsl(var(--surface-primary))] border border-border rounded-xl shadow-2xl overflow-hidden">
          {/* Header gradient */}
          <div className="h-1 bg-gradient-to-r from-intel-500 via-guardian-500 to-intel-500" />
          
          <div className="p-4">
            {/* Close button */}
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Icon and title */}
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-intel-500/20 to-guardian-500/20 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-intel-400" />
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="font-display font-bold text-text-primary text-sm">
                  Stay Ahead of Storms
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Get instant alerts when severe weather hits your territory
                </p>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <CloudLightning className="w-3.5 h-3.5 text-accent-danger" />
                <span>Real-time storm alerts</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Zap className="w-3.5 h-3.5 text-accent-warning" />
                <span>Hot lead notifications</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <AlertTriangle className="w-3.5 h-3.5 text-accent-primary" />
                <span>At-risk deal reminders</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                onClick={subscribe}
                disabled={isSubscribing}
                className="flex-1"
                size="sm"
              >
                {isSubscribing ? (
                  "Enabling..."
                ) : (
                  <>
                    <Bell className="w-4 h-4 mr-1" />
                    Enable Alerts
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={dismiss}
                className="text-text-muted"
              >
                Not Now
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Hook to manage push notification state
 */
export function usePushNotifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const supported =
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;

    setIsSupported(supported);

    if (supported && Notification.permission === "granted") {
      // Check if we have an active subscription
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(!!subscription);
        });
      });
    }
  }, []);

  return { isSubscribed, isSupported };
}

/**
 * Bell icon button for header/sidebar to manage notification settings
 */
export function NotificationBellButton() {
  const { isSubscribed, isSupported } = usePushNotifications();
  const { showToast } = useToast();

  if (!isSupported) return null;

  const handleClick = async () => {
    if (isSubscribed) {
      showToast("info", "Notifications Active", "You're receiving push notifications");
    } else if (Notification.permission === "denied") {
      showToast("warning", "Notifications Blocked", "Enable in browser settings to receive alerts");
    } else {
      // Trigger the subscription flow
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        showToast("success", "Enabling...", "Setting up notifications");
        // The PushNotificationPrompt component will handle the rest
        window.location.reload();
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`p-2 rounded-lg transition-colors ${
        isSubscribed
          ? "bg-accent-success/10 text-accent-success"
          : "bg-surface-secondary text-text-muted hover:text-text-primary hover:bg-surface-hover"
      }`}
      title={isSubscribed ? "Notifications enabled" : "Enable notifications"}
    >
      {isSubscribed ? (
        <Bell className="w-4 h-4" />
      ) : (
        <BellOff className="w-4 h-4" />
      )}
    </button>
  );
}
