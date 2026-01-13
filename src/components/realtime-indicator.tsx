/**
 * Realtime Connection Indicator
 * 
 * Shows the status of SSE (Server-Sent Events) connection
 * and displays live alerts as they come in.
 * 
 * SSE is the primary realtime method (Vercel-compatible).
 * Supabase Realtime is an optional fallback.
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Zap, CloudRain, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useSSE, useRealtimeStatus, type SSEEvent, type SSEConnectionState } from "@/lib/hooks";

export function RealtimeIndicator() {
  const { isSSEAvailable } = useRealtimeStatus();
  const { events, connectionState, isConnected, clearEvents, connect } = useSSE();
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter for storm events only (last hour)
  const stormEvents = events.filter(
    (e) => e.type === "storm" && Date.now() - new Date(e.timestamp).getTime() < 60 * 60 * 1000
  );

  if (!isSSEAvailable) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <WifiOff className="w-3.5 h-3.5 opacity-50" />
        <span>Realtime disabled</span>
      </div>
    );
  }

  const statusConfig = getStatusConfig(connectionState);

  return (
    <div className="relative">
      {/* Status Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${statusConfig.buttonClass}`}
      >
        <span className="relative flex h-2 w-2">
          {isConnected && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusConfig.dotClass}`} />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${statusConfig.dotClass}`} />
        </span>
        <span>{statusConfig.label}</span>
        {stormEvents.length > 0 && (
          <span className="ml-1 bg-red-500 text-white px-1.5 rounded-full">
            {stormEvents.length}
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
                {isConnected ? (
                  <Wifi className="w-4 h-4 text-green-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-yellow-400" />
                )}
                <span className="font-semibold text-sm">Live Storm Feed</span>
              </div>
              <div className="flex items-center gap-2">
                {connectionState.status === "error" && (
                  <button
                    onClick={connect}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                )}
                {stormEvents.length > 0 && (
                  <button
                    onClick={clearEvents}
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

            {/* Connection Status Banner */}
            {connectionState.status !== "connected" && (
              <div className={`px-3 py-2 text-xs ${statusConfig.bannerClass}`}>
                <div className="flex items-center gap-2">
                  {connectionState.status === "connecting" && (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  )}
                  <span>{statusConfig.message}</span>
                </div>
                {connectionState.reconnectAttempt > 0 && (
                  <span className="text-xs opacity-75">
                    Attempt {connectionState.reconnectAttempt}/10
                  </span>
                )}
              </div>
            )}

            {/* Alerts List */}
            <div className="max-h-64 overflow-y-auto">
              {stormEvents.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  <CloudRain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No recent storm alerts</p>
                  <p className="text-xs mt-1">
                    {isConnected ? "Listening for activity..." : "Connecting..."}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-700/50">
                  {stormEvents.map((event, idx) => (
                    <SSEAlertItem key={`${(event.data as any).id}-${idx}`} event={event} />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-gray-700 text-xs text-gray-500 text-center flex items-center justify-center gap-2">
              <Zap className="w-3 h-3" />
              <span>Server-Sent Events</span>
              {connectionState.lastHeartbeat && (
                <span className="opacity-50">
                  • Last ping {getTimeAgo(connectionState.lastHeartbeat)}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getStatusConfig(state: SSEConnectionState) {
  switch (state.status) {
    case "connected":
      return {
        label: "LIVE",
        buttonClass: "bg-green-500/10 text-green-400 hover:bg-green-500/20",
        dotClass: "bg-green-500",
        bannerClass: "",
        message: "",
      };
    case "connecting":
      return {
        label: "Connecting...",
        buttonClass: "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20",
        dotClass: "bg-yellow-500",
        bannerClass: "bg-yellow-500/10 text-yellow-400",
        message: "Establishing connection...",
      };
    case "disconnected":
      return {
        label: "Reconnecting",
        buttonClass: "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20",
        dotClass: "bg-yellow-500",
        bannerClass: "bg-yellow-500/10 text-yellow-400",
        message: state.error || "Connection lost, reconnecting...",
      };
    case "error":
      return {
        label: "Offline",
        buttonClass: "bg-red-500/10 text-red-400 hover:bg-red-500/20",
        dotClass: "bg-red-500",
        bannerClass: "bg-red-500/10 text-red-400",
        message: state.error || "Connection failed",
      };
  }
}

interface StormEventData {
  id: string;
  eventType: string;
  severity: string;
  city?: string;
  state?: string;
  hailSize?: number | null;
  windSpeed?: number | null;
}

function SSEAlertItem({ event }: { event: SSEEvent }) {
  const data = event.data as StormEventData;
  
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

  const Icon = typeIcons[data.eventType] || AlertTriangle;
  const color = severityColors[data.severity] || "text-gray-400";

  const timeAgo = getTimeAgo(new Date(event.timestamp));

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
            {data.eventType}
          </span>
          <span className={`text-xs uppercase font-bold ${color}`}>
            {data.severity}
          </span>
        </div>
        <p className="text-xs text-gray-400 truncate">
          {data.city}, {data.state}
        </p>
        {data.hailSize && (
          <p className="text-xs text-cyan-400">
            Hail: {data.hailSize}" diameter
          </p>
        )}
        {data.windSpeed && (
          <p className="text-xs text-cyan-400">
            Wind: {data.windSpeed} mph
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
