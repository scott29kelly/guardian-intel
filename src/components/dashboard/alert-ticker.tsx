"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, ChevronRight } from "lucide-react";

export interface Alert {
  id: number;
  type: string;
  message: string;
  time: string;
  severity: "critical" | "high" | "warning";
}

interface AlertTickerProps {
  alerts: Alert[];
  onViewAll: () => void;
}

export function AlertTicker({ alerts, onViewAll }: AlertTickerProps) {
  const [activeAlert, setActiveAlert] = useState(0);

  useEffect(() => {
    const alertTimer = setInterval(() => {
      setActiveAlert((prev) => (prev + 1) % alerts.length);
    }, 5000);
    return () => clearInterval(alertTimer);
  }, [alerts.length]);

  const getSeverityColor = (severity: Alert["severity"]) => {
    switch (severity) {
      case "critical": return "bg-[hsl(var(--accent-danger))] animate-pulse";
      case "high": return "bg-[hsl(var(--accent-primary))]";
      case "warning": return "bg-[hsl(var(--accent-warning))]";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="panel overflow-hidden"
    >
      <div className="flex items-center">
        <div className="px-4 py-3 bg-[hsl(var(--accent-danger)/0.1)] border-r border-border flex items-center gap-2">
          <Radio className="w-4 h-4 text-accent-danger animate-pulse" />
          <span className="font-mono text-xs text-accent-danger uppercase tracking-wider">Intel Feed</span>
        </div>
        <div className="flex-1 px-4 py-3 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeAlert}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center gap-4"
            >
              <span className={`w-2 h-2 rounded-full ${getSeverityColor(alerts[activeAlert].severity)}`} />
              <span className="font-mono text-sm text-text-secondary">
                {alerts[activeAlert].message}
              </span>
              <span className="font-mono text-xs text-text-muted ml-auto">
                {alerts[activeAlert].time}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
        <button 
          onClick={onViewAll}
          className="px-4 py-3 border-l border-border text-text-muted hover:text-text-primary transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
