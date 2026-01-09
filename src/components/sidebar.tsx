"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  CloudLightning,
  BarChart3,
  BookOpen,
  Settings,
  Radio,
  Zap,
  Shield,
  ChevronRight,
  ChevronLeft,
  Activity,
  Bot,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { AIChatPanel } from "./ai/chat-panel";
import { ThemeToggle } from "./theme-toggle";
import { useSidebar } from "@/lib/sidebar-context";

const navigation = [
  { 
    name: "COMMAND", 
    href: "/", 
    icon: LayoutDashboard,
    status: "online"
  },
  { 
    name: "TARGETS", 
    href: "/customers", 
    icon: Users,
    badge: "127"
  },
  { 
    name: "STORM INTEL", 
    href: "/storms", 
    icon: CloudLightning,
    status: "alert",
    badge: "2"
  },
  { 
    name: "ANALYTICS", 
    href: "/analytics", 
    icon: BarChart3,
  },
  { 
    name: "PLAYBOOKS", 
    href: "/playbooks", 
    icon: BookOpen,
    badge: "6"
  },
];

const SIDEBAR_WIDTH = 256; // 16rem = 256px (w-64)
const SIDEBAR_COLLAPSED_WIDTH = 72; // Enough for icons + padding

export function Sidebar() {
  const pathname = usePathname();
  const [showAIChat, setShowAIChat] = useState(false);
  const { isCollapsed, isMobileOpen, toggleCollapsed, toggleMobile, closeMobile } = useSidebar();

  const sidebarWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <>
      {/* AI Chat Panel */}
      <AIChatPanel
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
      />

      {/* Mobile Toggle Button */}
      <button
        onClick={toggleMobile}
        className="fixed top-4 left-4 z-[60] lg:hidden p-2 rounded bg-surface-secondary border border-[hsl(var(--sidebar-border))] text-text-primary hover:bg-surface-hover transition-colors"
        aria-label="Toggle navigation"
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] lg:hidden"
            onClick={closeMobile}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ 
          width: sidebarWidth,
          x: 0,
        }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={`
          fixed left-0 top-0 h-screen bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--sidebar-border))] flex flex-col z-50
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        style={{ width: sidebarWidth }}
      >
        {/* Decorative top line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-primary)/0.5)] to-transparent" />
        
        {/* Logo Section */}
        <div className="p-4 border-b border-[hsl(var(--sidebar-border))]">
          <Link href="/" className="flex items-center gap-3 group" onClick={closeMobile}>
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 bg-surface-secondary border border-[hsl(var(--accent-primary)/0.3)] rounded flex items-center justify-center corner-cut">
                <Shield className="w-5 h-5 text-accent-primary" />
              </div>
              {/* Animated ping */}
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--accent-success))] opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[hsl(var(--accent-success))]" />
              </div>
            </div>
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  <div className="font-display font-bold text-lg tracking-wide text-text-primary group-hover:text-accent-primary transition-colors">
                    GUARDIAN
                  </div>
                  <div className="font-mono text-[10px] text-accent-primary tracking-[0.2em]">
                    INTEL COMMAND
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* System Status */}
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="px-4 py-3 border-b border-[hsl(var(--sidebar-border))] bg-surface-secondary/30 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-accent-success animate-pulse" />
                  <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">System Status</span>
                </div>
                <span className="font-mono text-[10px] text-accent-success uppercase tracking-wider">Online</span>
              </div>
              <div className="mt-2 h-1 bg-surface-secondary rounded-full overflow-hidden">
                <motion.div 
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, var(--gradient-start), var(--gradient-end))` }}
                  initial={{ width: "0%" }}
                  animate={{ width: "87%" }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="font-mono text-[9px] text-text-muted">DATA SYNC</span>
                <span className="font-mono text-[9px] text-text-muted">87%</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed status indicator */}
        {isCollapsed && (
          <div className="px-3 py-2 border-b border-[hsl(var(--sidebar-border))] flex justify-center">
            <div className="w-2 h-2 bg-[hsl(var(--accent-success))] rounded-full animate-pulse" title="System Online" />
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeMobile}
                title={isCollapsed ? item.name : undefined}
                className={`
                  relative flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-all duration-200 group
                  ${isCollapsed ? "justify-center" : ""}
                  ${isActive 
                    ? "bg-[hsl(var(--accent-primary)/0.1)] text-accent-primary" 
                    : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
                  }
                `}
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[hsl(var(--accent-primary))] rounded-r"
                    transition={{ type: "spring", duration: 0.5 }}
                  />
                )}

                {/* Icon container */}
                <div className={`
                  relative w-8 h-8 rounded flex items-center justify-center transition-all flex-shrink-0
                  ${isActive 
                    ? "bg-[hsl(var(--accent-primary)/0.2)]" 
                    : "bg-surface-secondary group-hover:bg-surface-hover"
                  }
                `}>
                  <Icon className={`w-4 h-4 ${isActive ? "text-accent-primary" : ""}`} />
                  
                  {/* Status dot */}
                  {item.status === "alert" && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[hsl(var(--accent-danger))] rounded-full animate-pulse" />
                  )}
                  {item.status === "online" && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[hsl(var(--accent-success))] rounded-full" />
                  )}
                </div>

                {/* Label & Badge (hidden when collapsed) */}
                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-2 overflow-hidden flex-1 min-w-0"
                    >
                      <span className="font-display font-medium tracking-wide text-xs whitespace-nowrap">
                        {item.name}
                      </span>

                      {/* Badge */}
                      {item.badge && (
                        <span className={`
                          ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded flex-shrink-0
                          ${item.status === "alert" 
                            ? "bg-[hsl(var(--accent-danger)/0.2)] text-accent-danger" 
                            : "bg-surface-secondary text-text-muted"
                          }
                        `}>
                          {item.badge}
                        </span>
                      )}

                      {/* Hover arrow */}
                      <ChevronRight className={`
                        w-3 h-3 ml-auto opacity-0 -translate-x-2 transition-all flex-shrink-0
                        ${isActive ? "opacity-100 translate-x-0 text-accent-primary" : "group-hover:opacity-50 group-hover:translate-x-0"}
                      `} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>

        {/* AI Assistant Button */}
        <div className="p-2 border-t border-[hsl(var(--sidebar-border))]">
          <button
            onClick={() => setShowAIChat(true)}
            title={isCollapsed ? "AI Assist" : undefined}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-all duration-200 group 
              bg-gradient-to-r from-intel-500/10 to-guardian-500/10 border border-intel-500/30 
              hover:border-intel-500/50 hover:from-intel-500/20 hover:to-guardian-500/20
              ${isCollapsed ? "justify-center" : ""}
            `}
          >
            <div className="relative w-8 h-8 rounded flex items-center justify-center bg-gradient-to-br from-intel-500/30 to-guardian-500/30 flex-shrink-0">
              <Bot className="w-4 h-4 text-intel-400" />
              <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-intel-300 animate-pulse" />
            </div>
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2 overflow-hidden flex-1"
                >
                  <span className="font-display font-medium tracking-wide text-xs text-intel-400 whitespace-nowrap">
                    AI ASSIST
                  </span>
                  <span className="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded bg-intel-500/20 text-intel-300 flex-shrink-0">
                    ⌘K
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Live Feed Indicator */}
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="p-3 border-t border-[hsl(var(--sidebar-border))] overflow-hidden"
            >
              <div className="panel p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Radio className="w-3.5 h-3.5 text-accent-danger animate-pulse" />
                  <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">Live Feed</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[hsl(var(--accent-danger))] rounded-full animate-pulse flex-shrink-0" />
                    <span className="font-mono text-[10px] text-accent-danger truncate">
                      Storm alert: Bucks Co.
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-[hsl(var(--accent-success))] rounded-full flex-shrink-0" />
                    <span className="font-mono text-[10px] text-text-muted truncate">
                      New lead: Chen property
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed Live Feed indicator */}
        {isCollapsed && (
          <div className="p-2 border-t border-[hsl(var(--sidebar-border))] flex justify-center">
            <div className="relative" title="Live Feed Active">
              <Radio className="w-4 h-4 text-accent-danger" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[hsl(var(--accent-danger))] rounded-full animate-pulse" />
            </div>
          </div>
        )}

        {/* Theme Toggle & Settings */}
        <div className="p-2 border-t border-[hsl(var(--sidebar-border))]">
          <div className={`flex items-center gap-2 mb-2 ${isCollapsed ? "justify-center" : ""}`}>
            <ThemeToggle />
          </div>
          <Link
            href="/settings"
            onClick={closeMobile}
            title={isCollapsed ? "Config" : undefined}
            className={`
              flex items-center gap-3 px-3 py-2 rounded text-sm transition-all group
              ${isCollapsed ? "justify-center" : ""}
              ${pathname === "/settings"
                ? "bg-surface-hover text-text-primary"
                : "text-text-muted hover:text-text-secondary hover:bg-surface-secondary"
              }
            `}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="font-mono text-xs uppercase tracking-wider whitespace-nowrap overflow-hidden"
                >
                  Config
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>

        {/* User */}
        <div className="p-3 border-t border-[hsl(var(--sidebar-border))] bg-surface-secondary/30">
          <div className={`flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
            <div 
              className="w-9 h-9 rounded flex items-center justify-center text-white font-display font-bold text-sm flex-shrink-0"
              style={{ background: `linear-gradient(135deg, var(--gradient-start), var(--gradient-end))` }}
              title={isCollapsed ? "S. Mitchell - Field Ops" : undefined}
            >
              SM
            </div>
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 min-w-0 overflow-hidden"
                >
                  <p className="font-medium text-sm text-text-primary truncate">S. Mitchell</p>
                  <p className="font-mono text-[10px] text-accent-success uppercase tracking-wider">Field Ops</p>
                </motion.div>
              )}
            </AnimatePresence>
            {!isCollapsed && <Zap className="w-4 h-4 text-accent-success flex-shrink-0" />}
          </div>
        </div>

        {/* Collapse Toggle Button (Desktop only) */}
        <button
          onClick={toggleCollapsed}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-surface-secondary border border-[hsl(var(--sidebar-border))] rounded-full items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors z-10"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 0 : 180 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </motion.div>
        </button>

        {/* Decorative bottom line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-secondary)/0.3)] to-transparent" />
      </motion.aside>
    </>
  );
}

export { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH };
