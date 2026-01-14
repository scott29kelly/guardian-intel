"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, Info, X, Trophy, Zap, Star, Target } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning" | "achievement" | "levelUp" | "streak" | "xp";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  xp?: number;
  icon?: string;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string, options?: { xp?: number; icon?: string }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, title: string, message?: string, options?: { xp?: number; icon?: string }) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message, xp: options?.xp, icon: options?.icon }]);
    
    // Auto-remove (longer for celebratory toasts)
    const duration = ["achievement", "levelUp", "streak"].includes(type) ? 5000 : 4000;
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getToastIcon = (toast: Toast) => {
    if (toast.icon) {
      return <span className="text-xl">{toast.icon}</span>;
    }
    
    switch (toast.type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-accent-success" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-accent-danger" />;
      case "info":
        return <Info className="w-5 h-5 text-accent-primary" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-accent-warning" />;
      case "achievement":
        return <Trophy className="w-5 h-5 text-yellow-400" />;
      case "levelUp":
        return <Star className="w-5 h-5 text-purple-400" />;
      case "streak":
        return <span className="text-xl">🔥</span>;
      case "xp":
        return <Zap className="w-5 h-5 text-accent-primary" />;
      default:
        return <Info className="w-5 h-5 text-accent-primary" />;
    }
  };

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case "achievement":
        return "bg-gradient-to-r from-yellow-900/80 to-amber-900/80 border-yellow-500/50";
      case "levelUp":
        return "bg-gradient-to-r from-purple-900/80 to-pink-900/80 border-purple-500/50";
      case "streak":
        return "bg-gradient-to-r from-orange-900/80 to-red-900/80 border-orange-500/50";
      case "xp":
        return "bg-gradient-to-r from-cyan-900/80 to-teal-900/80 border-cyan-500/50";
      case "warning":
        return "bg-gradient-to-r from-amber-900/80 to-yellow-900/80 border-amber-500/50";
      default:
        return "bg-[hsl(var(--surface-primary))] border-border";
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => {
            const isCelebratory = ["achievement", "levelUp", "streak", "xp"].includes(toast.type);
            
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.95, x: 100 }}
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  scale: 1, 
                  x: 0,
                  transition: { type: "spring", stiffness: 300, damping: 25 }
                }}
                exit={{ opacity: 0, x: 100, scale: 0.95 }}
                className={`
                  flex items-start gap-3 p-4 border rounded-lg shadow-xl min-w-[300px] max-w-[400px]
                  ${getToastStyles(toast.type)}
                  ${isCelebratory ? "shadow-2xl" : ""}
                `}
              >
                {/* Icon with animation for celebratory toasts */}
                <motion.div
                  animate={isCelebratory ? { 
                    rotate: [0, -10, 10, 0],
                    scale: [1, 1.2, 1]
                  } : {}}
                  transition={{ duration: 0.5 }}
                >
                  {getToastIcon(toast)}
                </motion.div>
                
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${isCelebratory ? "text-white" : "text-text-primary"}`}>
                    {toast.title}
                  </p>
                  {toast.message && (
                    <p className={`text-xs mt-0.5 ${isCelebratory ? "text-white/80" : "text-text-muted"}`}>
                      {toast.message}
                    </p>
                  )}
                  {toast.xp && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center gap-1 mt-1"
                    >
                      <Zap className="w-3 h-3 text-yellow-400" />
                      <span className="text-xs font-medium text-yellow-400">+{toast.xp} XP</span>
                    </motion.div>
                  )}
                </div>
                
                <button 
                  onClick={() => removeToast(toast.id)}
                  className={`transition-colors ${isCelebratory ? "text-white/60 hover:text-white" : "text-text-muted hover:text-text-primary"}`}
                >
                  <X className="w-4 h-4" />
                </button>
                
                {/* Shine effect for celebratory toasts */}
                {isCelebratory && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-lg pointer-events-none"
                    initial={{ x: "-100%" }}
                    animate={{ x: "200%" }}
                    transition={{ duration: 1, delay: 0.2 }}
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
