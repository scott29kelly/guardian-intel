"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="panel p-8 max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-danger-subtle flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-accent-danger" />
        </div>
        <h2 className="font-display text-xl font-bold text-text-primary mb-2">
          Something went wrong
        </h2>
        <p className="font-mono text-sm text-text-muted mb-6">
          {error.message || "An unexpected error occurred while loading the dashboard."}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded font-mono text-sm text-white transition-all hover:opacity-90"
          style={{ background: `linear-gradient(90deg, var(--gradient-start), var(--gradient-end))` }}
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}
