"use client";

import { AlertTriangle, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Alert } from "./alert-ticker";

interface AlertsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: Alert[];
  onAlertClick: (alert: Alert) => void;
  onClearAll: () => void;
}

export function AlertsPanel({ 
  isOpen, 
  onClose, 
  alerts, 
  onAlertClick, 
  onClearAll 
}: AlertsPanelProps) {
  const getSeverityClasses = (severity: Alert["severity"]) => {
    switch (severity) {
      case "critical": return "bg-[hsl(var(--accent-danger))] animate-pulse";
      case "high": return "bg-[hsl(var(--accent-primary))]";
      case "warning": return "bg-[hsl(var(--accent-warning))]";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed right-0 top-0 bottom-0 w-[400px] bg-[hsl(var(--surface-primary))] border-l border-border shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-display font-bold text-lg text-text-primary flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-accent-danger" />
                Active Alerts
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded transition-colors">
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {alerts.map((alert) => (
                <div 
                  key={alert.id}
                  className={`
                    panel p-4 cursor-pointer hover:border-[hsl(var(--accent-primary)/0.5)] transition-all
                    ${alert.severity === "critical" ? "border-l-2 border-l-[hsl(var(--accent-danger))]" : ""}
                  `}
                  onClick={() => onAlertClick(alert)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 ${getSeverityClasses(alert.severity)}`} />
                    <div className="flex-1">
                      <p className="font-mono text-sm text-text-primary">{alert.message}</p>
                      <p className="font-mono text-xs text-text-muted mt-1">{alert.time}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border">
              <button 
                onClick={onClearAll}
                className="w-full px-4 py-2 bg-surface-secondary border border-border rounded font-mono text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
              >
                Mark All as Read
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
