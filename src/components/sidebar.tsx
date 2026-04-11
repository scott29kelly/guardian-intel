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
  Activity,
  ChevronLeft,
  Bot,
  LogOut,
  Target,
  FileCheck,
  MessageSquare,
  Building2,
  Layers,
  Crosshair,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};
import { signOut, useSession } from "next-auth/react";
import { useState, useCallback } from "react";
import { AIChatPanel } from "./ai/chat-panel";
import { ThemeToggle } from "./theme-toggle";
import { ShortcutsModal } from "./modals/shortcuts-modal";
import { useSidebar } from "@/lib/sidebar-context";
import { useKeyboardShortcuts, useModifierKey } from "@/lib/hooks/use-keyboard-shortcuts";


// Exported constants for layout calculations
export const SIDEBAR_WIDTH = 256; // 16rem = 256px
export const SIDEBAR_COLLAPSED_WIDTH = 72; // 4.5rem = 72px

const navigation: NavItem[] = [
  { 
    name: "Dashboard", 
    href: "/", 
    icon: LayoutDashboard,
  },
  {
    name: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    name: "Claims",
    href: "/claims",
    icon: FileCheck,
  },
  {
    name: "Storms",
    href: "/storms",
    icon: CloudLightning,
  },
  {
    name: "Trade Terrain",
    href: "/terrain",
    icon: Target,
  },
  { 
    name: "Competitors", 
    href: "/competitors", 
    icon: Building2,
  },
  { 
    name: "Outreach", 
    href: "/outreach", 
    icon: MessageSquare,
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
  {
    name: "Decks",
    href: "/decks",
    icon: Layers,
  },
  {
    name: "Lead Generator",
    href: "/pipeline",
    icon: Crosshair,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [showAIChat, setShowAIChat] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { isCollapsed, toggle } = useSidebar();
  const modKey = useModifierKey();

  // Get user info from session
  const userName = session?.user?.name || "User";
  const userRole = (session?.user as any)?.role || "rep";
  const userInitials = userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const roleDisplay = userRole === "manager" ? "Manager" : userRole === "admin" ? "Admin" : "Field Ops";

  const handleLogout = () => {
    signOut({ callbackUrl: "/login" });
  };

  const sidebarWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  // Close handlers
  const closeAIChat = useCallback(() => setShowAIChat(false), []);
  const closeShortcuts = useCallback(() => setShowShortcuts(false), []);

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      {
        key: "k",
        meta: true,
        ctrl: true,
        description: "Open AI Assistant",
        action: () => setShowAIChat(true),
      },
      {
        key: "?",
        shift: true,
        description: "Show keyboard shortcuts",
        action: () => setShowShortcuts(true),
        ignoreInputs: true,
      },
      {
        key: "Escape",
        description: "Close modal/panel",
        action: () => {
          if (showAIChat) setShowAIChat(false);
          else if (showShortcuts) setShowShortcuts(false);
        },
      },
    ],
  });

  return (
    <>
    {/* AI Chat Panel */}
    <AIChatPanel
      isOpen={showAIChat}
      onClose={closeAIChat}
    />
    
    {/* Shortcuts Help Modal */}
    <ShortcutsModal
      isOpen={showShortcuts}
      onClose={closeShortcuts}
    />
    <motion.aside
      initial={false}
      animate={{ width: sidebarWidth }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex flex-col z-50 overflow-hidden">
      
      {/* Logo Section */}
      <div className={`p-4 border-b border-sidebar-border ${isCollapsed ? 'px-3' : ''}`}>
        <div className="flex items-center justify-between">
          {isCollapsed ? (
            <button
              onClick={toggle}
              className="flex items-center group"
              title="Expand sidebar"
            >
              <div className="w-9 h-9 bg-accent-primary rounded-full flex items-center justify-center hover:opacity-90 transition-opacity">
                <Activity className="w-5 h-5 text-white" />
              </div>
            </button>
          ) : (
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 bg-accent-primary rounded-full flex items-center justify-center flex-shrink-0">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div className="overflow-hidden">
                <div className="font-semibold text-text-primary group-hover:text-accent-primary transition-colors whitespace-nowrap">
                  TradePulse
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
                relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150
                ${isCollapsed ? 'justify-center px-2' : ''}
                ${isActive
                  ? "bg-accent-primary/[0.08] text-accent-primary"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
                }
              `}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-accent-primary" : ""}`} />

              {!isCollapsed && (
                <>
                  <span className="text-sm">{item.name}</span>
                  {item.badge && (
                    <span className="ml-auto text-xs bg-surface-secondary text-text-muted px-1.5 py-0.5 rounded-full">
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
      <div className={`p-2 border-t border-sidebar-border ${isCollapsed ? 'px-2' : ''}`}>
        <button
          onClick={() => setShowAIChat(true)}
          title={isCollapsed ? `AI Assist (${modKey}+K)` : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 bg-surface-secondary border border-border hover:bg-surface-hover ${isCollapsed ? 'justify-center px-2' : ''}`}
        >
          <Bot className="w-4 h-4 text-accent-primary flex-shrink-0" />
          {!isCollapsed && (
            <>
              <span className="text-sm text-text-secondary">AI Assist</span>
              <span className="ml-auto text-xs text-text-muted font-mono">{modKey}+K</span>
            </>
          )}
        </button>
      </div>

      {/* Theme Toggle & Settings */}
      <div className={`p-2 border-t border-sidebar-border space-y-1 ${isCollapsed ? 'px-2' : ''}`}>
        <div className={`${isCollapsed ? 'flex justify-center' : ''}`}>
          <ThemeToggle isCollapsed={isCollapsed} />
        </div>
        <Link
          href="/settings"
          title={isCollapsed ? "Settings" : undefined}
          className={`
            flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150
            ${isCollapsed ? 'justify-center px-2' : ''}
            ${pathname === "/settings"
              ? "bg-accent-primary/[0.08] text-accent-primary"
              : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
            }
          `}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm">Settings</span>}
        </Link>
      </div>

      {/* User */}
      <div className={`p-3 border-t border-sidebar-border ${isCollapsed ? 'px-2' : ''}`}>
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          <div 
            className="w-8 h-8 rounded-full bg-accent-primary/20 flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
            title={isCollapsed ? userName : undefined}
          >
            {userInitials}
          </div>
          {!isCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{userName}</p>
                <p className="text-xs text-text-muted">{roleDisplay}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </>
          )}
        </div>
        {isCollapsed && (
          <button
            onClick={handleLogout}
            className="w-full mt-2 p-2 rounded text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors flex items-center justify-center"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.aside>
    </>
  );
}
