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
  Shield,
  ChevronLeft,
  Bot,
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
    name: "Dashboard", 
    href: "/", 
    icon: LayoutDashboard,
  },
  { 
    name: "Customers", 
    href: "/customers", 
    icon: Users,
    badge: "127"
  },
  { 
    name: "Storms", 
    href: "/storms", 
    icon: CloudLightning,
    badge: "2"
  },
  { 
    name: "Analytics", 
    href: "/analytics", 
    icon: BarChart3,
  },
  { 
    name: "Playbooks", 
    href: "/playbooks", 
    icon: BookOpen,
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
      
      {/* Logo Section */}
      <div className={`p-4 border-b border-[hsl(var(--sidebar-border))] ${isCollapsed ? 'px-3' : ''}`}>
        <div className="flex items-center justify-between">
          {isCollapsed ? (
            <button
              onClick={toggle}
              className="flex items-center group"
              title="Expand sidebar"
            >
              <div className="w-9 h-9 bg-surface-secondary border border-border rounded flex items-center justify-center hover:bg-surface-hover transition-colors">
                <Shield className="w-5 h-5 text-accent-primary" />
              </div>
            </button>
          ) : (
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-surface-secondary border border-border rounded flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-accent-primary" />
              </div>
              <div className="overflow-hidden">
                <div className="font-semibold text-text-primary group-hover:text-accent-primary transition-colors whitespace-nowrap">
                  Guardian
                </div>
                <div className="text-xs text-text-muted whitespace-nowrap">
                  Intel Platform
                </div>
              </div>
            </Link>
          )}
          
          {!isCollapsed && (
            <button
              onClick={toggle}
              className="w-7 h-7 rounded flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* System Status - minimal */}
      <div className={`py-2 border-b border-[hsl(var(--sidebar-border))] ${isCollapsed ? 'px-3' : 'px-4'}`}>
        <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center' : ''}`}>
          <span className="w-1.5 h-1.5 bg-accent-success rounded-full flex-shrink-0" />
          {!isCollapsed && (
            <span className="text-xs text-text-muted">Online</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 p-2 space-y-0.5 overflow-y-auto ${isCollapsed ? 'px-2' : ''}`}>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              title={isCollapsed ? item.name : undefined}
              className={`
                relative flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors
                ${isCollapsed ? 'justify-center px-2' : ''}
                ${isActive 
                  ? "bg-[hsl(var(--accent-primary)/0.1)] text-accent-primary" 
                  : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
                }
              `}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-accent-primary" : ""}`} />

              {!isCollapsed && (
                <>
                  <span className="text-sm">{item.name}</span>
                  {item.badge && (
                    <span className="ml-auto text-xs text-text-muted bg-surface-secondary px-1.5 py-0.5 rounded">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* AI Assistant Button */}
      <div className={`p-2 border-t border-[hsl(var(--sidebar-border))] ${isCollapsed ? 'px-2' : ''}`}>
        <button
          onClick={() => setShowAIChat(true)}
          title={isCollapsed ? "AI Assist (⌘K)" : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors bg-surface-secondary border border-border hover:bg-surface-hover ${isCollapsed ? 'justify-center px-2' : ''}`}
        >
          <Bot className="w-4 h-4 text-accent-primary flex-shrink-0" />
          {!isCollapsed && (
            <>
              <span className="text-sm text-text-secondary">AI Assist</span>
              <span className="ml-auto text-xs text-text-muted">⌘K</span>
            </>
          )}
        </button>
      </div>

      {/* Theme Toggle & Settings */}
      <div className={`p-2 border-t border-[hsl(var(--sidebar-border))] space-y-1 ${isCollapsed ? 'px-2' : ''}`}>
        <div className={`${isCollapsed ? 'flex justify-center' : ''}`}>
          <ThemeToggle isCollapsed={isCollapsed} />
        </div>
        <Link
          href="/settings"
          title={isCollapsed ? "Settings" : undefined}
          className={`
            flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors
            ${isCollapsed ? 'justify-center px-2' : ''}
            ${pathname === "/settings"
              ? "bg-surface-hover text-text-primary"
              : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
            }
          `}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm">Settings</span>}
        </Link>
      </div>

      {/* User */}
      <div className={`p-3 border-t border-[hsl(var(--sidebar-border))] ${isCollapsed ? 'px-2' : ''}`}>
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <div 
            className="w-8 h-8 rounded bg-accent-primary/20 flex items-center justify-center text-accent-primary text-sm font-medium flex-shrink-0"
            title={isCollapsed ? "S. Mitchell" : undefined}
          >
            SM
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary truncate">S. Mitchell</p>
              <p className="text-xs text-text-muted">Field Ops</p>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
    </>
  );
}
