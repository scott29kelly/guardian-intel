"use client";

/**
 * Dashboard Error Boundary
 *
 * Catches errors within dashboard routes. The root layout and its CSS
 * are still intact, so Tailwind classes work here.
 */

import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard] Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-accent-danger/10 border border-accent-danger/30 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-accent-danger" />
        </div>

        {/* Title */}
        <h2 className="font-display text-xl font-bold text-text-primary mb-2">
          Something went wrong
        </h2>

        {/* Description */}
        <p className="text-text-muted text-sm mb-6">
          This page encountered an error. You can try reloading or head back to
          the dashboard.
        </p>

        {/* Dev-only error details */}
        {process.env.NODE_ENV === "development" && (
          <div className="mb-6 p-4 bg-surface-secondary rounded-lg text-left">
            <p className="font-mono text-xs text-accent-danger break-all">
              {error.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-primary text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-text-primary text-sm font-medium hover:bg-surface-hover transition-colors"
          >
            <Home className="w-4 h-4" />
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
