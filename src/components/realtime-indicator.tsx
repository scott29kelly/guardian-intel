/**
 * Realtime Connection Indicator
 * 
 * Shows the status of Supabase Realtime connection
 * and displays live alerts as they come in.
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, X, AlertTriangle, Bell, Zap, CloudRain } from "lucide-react";
import { useStormAlerts, useRealtimeStatus, type RealtimeEvent } from "@/lib/hooks";
import type { WeatherEventPayload } from "@/lib/supabase";

export function RealtimeIndicator() {
  const { isSupabaseConfigured } = useRealtimeStatus();
  const { alerts, isConnected, clearAlerts } = useStormAlerts();
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter for only recent alerts (last hour)
  const recentAlerts = alerts.filter(
    (a) => Date.now() - a.timestamp.getTime() < 60 * 60 * 1000
  );

  if (!isSupabaseConfigured) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Radio className="w-3.5 h-3.5 opacity-50" />
        <span>Realtime disabled</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Status Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          isConnected
            ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
            : "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
        }`}
      >
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isConnected ? "bg-green-400" : "bg-yellow-400"
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isConnected ? "bg-green-500" : "bg-yellow-500"
            }`}
          />
        </span>
        <span>{isConnected ? "LIVE" : "Connecting..."}</span>
        {recentAlerts.length > 0 && (
          <span className="ml-1 bg-red-500 text-white px-1.5 rounded-full">
            {recentAlerts.length}
          </span>
        )}
      </button>

      {/* Expanded Alert Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-sm">Live Storm Feed</span>
              </div>
              <div className="flex items-center gap-2">
                {recentAlerts.length > 0 && (
                  <button
                    onClick={clearAlerts}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Alerts List */}
            <div className="max-h-64 overflow-y-auto">
              {recentAlerts.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  <CloudRain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No recent storm alerts</p>
                  <p className="text-xs mt-1">Listening for activity...</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700/50">
                  {recentAlerts.map((alert, idx) => (
                    <AlertItem key={`${alert.data.id}-${idx}`} alert={alert} />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-gray-700 text-xs text-gray-500 text-center">
              Powered by Supabase Realtime
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AlertItem({ alert }: { alert: RealtimeEvent<WeatherEventPayload> }) {
  const severityColors: Record<string, string> = {
    low: "text-yellow-400",
    moderate: "text-orange-400",
    high: "text-red-400",
    severe: "text-red-500",
  };

  const typeIcons: Record<string, typeof AlertTriangle> = {
    hail: CloudRain,
    wind: Zap,
    tornado: AlertTriangle,
  };

  const Icon = typeIcons[alert.data.eventType] || AlertTriangle;
  const color = severityColors[alert.data.severity] || "text-gray-400";

  const timeAgo = getTimeAgo(alert.timestamp);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 p-3 hover:bg-gray-800/50"
    >
      <div className={`mt-0.5 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm capitalize">
            {alert.data.eventType}
          </span>
          <span className={`text-xs uppercase font-bold ${color}`}>
            {alert.data.severity}
          </span>
        </div>
        <p className="text-xs text-gray-400 truncate">
          {alert.data.city}, {alert.data.state}
        </p>
        {alert.data.hailSize && (
          <p className="text-xs text-cyan-400">
            Hail: {alert.data.hailSize}" diameter
          </p>
        )}
        {alert.data.windSpeed && (
          <p className="text-xs text-cyan-400">
            Wind: {alert.data.windSpeed} mph
          </p>
        )}
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">{timeAgo}</span>
    </motion.div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
