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
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useState } from "react";
import { AIChatPanel } from "./ai/chat-panel";
import { ThemeToggle } from "./theme-toggle";
import { useSidebar } from "@/lib/sidebar-context";

// Exported constants for layout calculations
export const SIDEBAR_WIDTH = 256; // 16rem = 256px
export const SIDEBAR_COLLAPSED_WIDTH = 72; // 4.5rem = 72px

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

export function Sidebar() {
  const pathname = usePathname();
  const [showAIChat, setShowAIChat] = useState(false);
  const { isCollapsed, toggle } = useSidebar();

  const sidebarWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <>
    {/* AI Chat Panel */}
    <AIChatPanel
      isOpen={showAIChat}
      onClose={() => setShowAIChat(false)}
    />
    <motion.aside
      initial={false}
      animate={{ width: sidebarWidth }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="fixed left-0 top-0 h-screen bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--sidebar-border))] flex flex-col z-50 overflow-hidden">
      {/* Decorative top line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-primary)/0.5)] to-transparent" />
      
      {/* Logo Section */}
      <div className={`p-5 border-b border-[hsl(var(--sidebar-border))] ${isCollapsed ? 'px-4' : ''}`}>
        <div className="flex items-center gap-3">
          {/* Shield icon - Click to toggle sidebar */}
          <button
            onClick={toggle}
            className="relative flex-shrink-0 group/shield"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <div className="w-10 h-10 bg-surface-secondary border border-[hsl(var(--accent-primary)/0.3)] rounded flex items-center justify-center corner-cut group-hover/shield:border-[hsl(var(--accent-primary)/0.6)] group-hover/shield:bg-[hsl(var(--accent-primary)/0.1)] transition-all cursor-pointer">
              <Shield className="w-5 h-5 text-accent-primary" />
            </div>
            {/* Animated ping */}
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--accent-success))] opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[hsl(var(--accent-success))]" />
            </div>
          </button>
          
          {/* Logo text - Click to go home */}
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <Link href="/" className="group">
                  <div className="font-display font-bold text-lg tracking-wide text-text-primary group-hover:text-accent-primary transition-colors whitespace-nowrap">
                    GUARDIAN
                  </div>
                  <div className="font-mono text-[10px] text-accent-primary tracking-[0.2em] whitespace-nowrap">
                    INTEL COMMAND
                  </div>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* System Status */}
      <div className={`py-3 border-b border-[hsl(var(--sidebar-border))] bg-surface-secondary/30 ${isCollapsed ? 'px-3' : 'px-4'}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-accent-success animate-pulse flex-shrink-0" />
            {!isCollapsed && (
              <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">System Status</span>
            )}
          </div>
          {!isCollapsed && (
            <span className="font-mono text-[10px] text-accent-success uppercase tracking-wider">Online</span>
          )}
        </div>
        {!isCollapsed && (
          <>
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
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 p-3 space-y-1 overflow-y-auto ${isCollapsed ? 'px-2' : ''}`}>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              title={isCollapsed ? item.name : undefined}
              className={`
                relative flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-all duration-200 group
                ${isCollapsed ? 'justify-center px-2' : ''}
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

              {/* Label - hidden when collapsed */}
              {!isCollapsed && (
                <span className="font-display font-medium tracking-wide text-xs">
                  {item.name}
                </span>
              )}

              {/* Badge - hidden when collapsed */}
              {!isCollapsed && item.badge && (
                <span className={`
                  ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded
                  ${item.status === "alert" 
                    ? "bg-[hsl(var(--accent-danger)/0.2)] text-accent-danger" 
                    : "bg-surface-secondary text-text-muted"
                  }
                `}>
                  {item.badge}
                </span>
              )}

              {/* Hover arrow - hidden when collapsed */}
              {!isCollapsed && (
                <ChevronRight className={`
                  w-3 h-3 ml-auto opacity-0 -translate-x-2 transition-all
                  ${isActive ? "opacity-100 translate-x-0 text-accent-primary" : "group-hover:opacity-50 group-hover:translate-x-0"}
                `} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* AI Assistant Button */}
      <div className={`p-3 border-t border-[hsl(var(--sidebar-border))] ${isCollapsed ? 'px-2' : ''}`}>
        <button
          onClick={() => setShowAIChat(true)}
          title={isCollapsed ? "AI Assist (⌘K)" : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-all duration-200 group bg-gradient-to-r from-intel-500/10 to-guardian-500/10 border border-intel-500/30 hover:border-intel-500/50 hover:from-intel-500/20 hover:to-guardian-500/20 ${isCollapsed ? 'justify-center px-2' : ''}`}
        >
          <div className="relative w-8 h-8 rounded flex items-center justify-center bg-gradient-to-br from-intel-500/30 to-guardian-500/30 flex-shrink-0">
            <Bot className="w-4 h-4 text-intel-400" />
            <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-intel-300 animate-pulse" />
          </div>
          {!isCollapsed && (
            <>
              <span className="font-display font-medium tracking-wide text-xs text-intel-400">
                AI ASSIST
              </span>
              <span className="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded bg-intel-500/20 text-intel-300">
                ⌘K
              </span>
            </>
          )}
        </button>
      </div>

      {/* Live Feed Indicator */}
      {!isCollapsed && (
        <div className="p-4 border-t border-[hsl(var(--sidebar-border))]">
          <div className="panel p-3">
            <div className="flex items-center gap-2 mb-2">
              <Radio className="w-3.5 h-3.5 text-accent-danger animate-pulse" />
              <span className="font-mono text-[10px] text-text-muted uppercase tracking-wider">Live Feed</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[hsl(var(--accent-danger))] rounded-full animate-pulse" />
                <span className="font-mono text-[10px] text-accent-danger truncate">
                  Storm alert: Bucks Co.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[hsl(var(--accent-success))] rounded-full" />
                <span className="font-mono text-[10px] text-text-muted truncate">
                  New lead: Chen property
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Theme Toggle & Settings */}
      <div className={`p-3 border-t border-[hsl(var(--sidebar-border))] ${isCollapsed ? 'px-2' : ''}`}>
        <div className={`flex items-center gap-2 mb-2 ${isCollapsed ? 'justify-center' : ''}`}>
          <ThemeToggle />
        </div>
        <Link
          href="/settings"
          title={isCollapsed ? "Config" : undefined}
          className={`
            flex items-center gap-3 px-3 py-2 rounded text-sm transition-all group
            ${isCollapsed ? 'justify-center px-2' : ''}
            ${pathname === "/settings"
              ? "bg-surface-hover text-text-primary"
              : "text-text-muted hover:text-text-secondary hover:bg-surface-secondary"
            }
          `}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && (
            <span className="font-mono text-xs uppercase tracking-wider">Config</span>
          )}
        </Link>
      </div>

      {/* User */}
      <div className={`p-4 border-t border-[hsl(var(--sidebar-border))] bg-surface-secondary/30 ${isCollapsed ? 'px-3' : ''}`}>
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <div 
            className="w-9 h-9 rounded flex items-center justify-center text-white font-display font-bold text-sm flex-shrink-0"
            style={{ background: `linear-gradient(135deg, var(--gradient-start), var(--gradient-end))` }}
            title={isCollapsed ? "S. Mitchell - Field Ops" : undefined}
          >
            SM
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-text-primary truncate">S. Mitchell</p>
                <p className="font-mono text-[10px] text-accent-success uppercase tracking-wider">Field Ops</p>
              </div>
              <Zap className="w-4 h-4 text-accent-success" />
            </>
          )}
        </div>
      </div>

      {/* Expand Button - Only visible when collapsed, at bottom */}
      {isCollapsed && (
        <div className="p-3 border-t border-[hsl(var(--sidebar-border))]">
          <button
            onClick={toggle}
            className="w-full h-10 rounded flex items-center justify-center text-text-muted hover:text-accent-primary hover:bg-surface-hover transition-all border border-dashed border-[hsl(var(--sidebar-border))] hover:border-[hsl(var(--accent-primary)/0.5)]"
            title="Expand sidebar"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Decorative bottom line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-secondary)/0.3)] to-transparent" />
    </motion.aside>
    </>
  );
}
