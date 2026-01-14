"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  CloudLightning,
  BarChart3,
  BookOpen,
  Settings,
  Shield,
  Bot,
  Zap,
} from "lucide-react";
import { useGamification } from "@/lib/gamification";
import { ThemeToggle } from "./theme-toggle";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Customers", href: "/customers", icon: Users, badge: "127" },
  { name: "Storms", href: "/storms", icon: CloudLightning, badge: "2" },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Playbooks", href: "/playbooks", icon: BookOpen },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function MobileHeader() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { stats } = useGamification();

  return (
    <>
      {/* Mobile Header Bar */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-[hsl(var(--surface-primary))] border-b border-border z-40 md:hidden">
        <div className="flex items-center justify-between h-full px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-surface-secondary border border-border rounded flex items-center justify-center">
              <Shield className="w-4 h-4 text-accent-primary" />
            </div>
            <span className="font-semibold text-text-primary">Guardian</span>
          </Link>

          {/* Quick Stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs">
              <span className="text-base">🔥</span>
              <span className="font-semibold text-text-primary">{stats.currentStreak}</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Zap className="w-3.5 h-3.5 text-accent-primary" />
              <span className="font-semibold text-text-primary">Lv.{stats.level}</span>
            </div>
          </div>

          {/* Hamburger Menu */}
          <button
            onClick={() => setIsOpen(true)}
            className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-text-primary" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50 md:hidden"
              onClick={() => setIsOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-[hsl(var(--surface-primary))] border-l border-border z-50 md:hidden"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <span className="font-semibold text-text-primary">Menu</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
                >
                  <X className="w-5 h-5 text-text-muted" />
                </button>
              </div>

              {/* User Info */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary font-medium">
                    SM
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">S. Mitchell</p>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span>Level {stats.level}</span>
                      <span>•</span>
                      <span>{stats.xp} XP</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="p-2 flex-1 overflow-y-auto">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors mb-1
                        ${isActive
                          ? "bg-accent-primary/10 text-accent-primary"
                          : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="flex-1">{item.name}</span>
                      {item.badge && (
                        <span className="text-xs bg-surface-secondary px-2 py-0.5 rounded">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Bottom Actions */}
              <div className="p-4 border-t border-border space-y-3">
                {/* AI Assistant */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-surface-secondary border border-border text-text-secondary hover:bg-surface-hover transition-colors"
                >
                  <Bot className="w-5 h-5 text-accent-primary" />
                  <span className="text-sm">AI Assistant</span>
                </button>

                {/* Theme Toggle */}
                <div className="flex items-center justify-between px-2">
                  <span className="text-sm text-text-muted">Theme</span>
                  <ThemeToggle isCollapsed={false} />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Mobile Bottom Navigation (alternative tab bar style)
export function MobileBottomNav() {
  const pathname = usePathname();

  const bottomNavItems = [
    { name: "Home", href: "/", icon: LayoutDashboard },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Storms", href: "/storms", icon: CloudLightning },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "More", href: "/settings", icon: Menu },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[hsl(var(--surface-primary))] border-t border-border z-40 md:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors
                ${isActive ? "text-accent-primary" : "text-text-muted"}
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
