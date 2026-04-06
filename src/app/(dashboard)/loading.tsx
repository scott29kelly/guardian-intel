/**
 * Dashboard Loading State
 *
 * Shown during route transitions within the dashboard group.
 * Prevents blank screens while pages load.
 */

import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
        <p className="text-sm text-text-muted">Loading...</p>
      </div>
    </div>
  );
}
