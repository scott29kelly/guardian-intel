"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
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
  Activity,
} from "lucide-react";

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

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-void-950 border-r border-void-800/50 flex flex-col z-50">
      {/* Decorative top line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-intel-500/50 to-transparent" />
      
      {/* Logo Section */}
      <div className="p-5 border-b border-void-800/50">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-10 h-10 bg-void-900 border border-intel-500/30 rounded flex items-center justify-center corner-cut">
              <Shield className="w-5 h-5 text-intel-400" />
            </div>
            {/* Animated ping */}
            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-storm-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-storm-400" />
            </div>
          </div>
          <div>
            <div className="font-display font-bold text-lg tracking-wide text-white group-hover:text-intel-400 transition-colors">
              GUARDIAN
            </div>
            <div className="font-mono text-[10px] text-intel-500 tracking-[0.2em]">
              INTEL COMMAND
            </div>
          </div>
        </Link>
      </div>

      {/* System Status */}
      <div className="px-4 py-3 border-b border-void-800/50 bg-void-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-storm-400 animate-pulse" />
            <span className="font-mono text-[10px] text-void-400 uppercase tracking-wider">System Status</span>
          </div>
          <span className="font-mono text-[10px] text-storm-400 uppercase tracking-wider">Online</span>
        </div>
        <div className="mt-2 h-1 bg-void-800 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-storm-500 to-intel-500"
            initial={{ width: "0%" }}
            animate={{ width: "87%" }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="font-mono text-[9px] text-void-500">DATA SYNC</span>
          <span className="font-mono text-[9px] text-void-500">87%</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                relative flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-all duration-200 group
                ${isActive 
                  ? "bg-intel-500/10 text-intel-400" 
                  : "text-void-400 hover:text-white hover:bg-void-800/50"
                }
              `}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-intel-400 rounded-r"
                  transition={{ type: "spring", duration: 0.5 }}
                />
              )}

              {/* Icon container */}
              <div className={`
                relative w-8 h-8 rounded flex items-center justify-center transition-all
                ${isActive 
                  ? "bg-intel-500/20" 
                  : "bg-void-800/50 group-hover:bg-void-700/50"
                }
              `}>
                <Icon className={`w-4 h-4 ${isActive ? "text-intel-400" : ""}`} />
                
                {/* Status dot */}
                {item.status === "alert" && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-damage-500 rounded-full animate-pulse" />
                )}
                {item.status === "online" && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-storm-500 rounded-full" />
                )}
              </div>

              {/* Label */}
              <span className="font-display font-medium tracking-wide text-xs">
                {item.name}
              </span>

              {/* Badge */}
              {item.badge && (
                <span className={`
                  ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded
                  ${item.status === "alert" 
                    ? "bg-damage-500/20 text-damage-400" 
                    : "bg-void-700 text-void-400"
                  }
                `}>
                  {item.badge}
                </span>
              )}

              {/* Hover arrow */}
              <ChevronRight className={`
                w-3 h-3 ml-auto opacity-0 -translate-x-2 transition-all
                ${isActive ? "opacity-100 translate-x-0 text-intel-400" : "group-hover:opacity-50 group-hover:translate-x-0"}
              `} />
            </Link>
          );
        })}
      </nav>

      {/* Live Feed Indicator */}
      <div className="p-4 border-t border-void-800/50">
        <div className="panel p-3">
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-3.5 h-3.5 text-damage-400 animate-pulse" />
            <span className="font-mono text-[10px] text-void-400 uppercase tracking-wider">Live Feed</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-damage-500 rounded-full animate-pulse" />
              <span className="font-mono text-[10px] text-damage-400 truncate">
                Storm alert: Franklin Co.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-storm-500 rounded-full" />
              <span className="font-mono text-[10px] text-void-500 truncate">
                New lead: Chen property
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="p-3 border-t border-void-800/50">
        <Link
          href="/settings"
          className={`
            flex items-center gap-3 px-3 py-2 rounded text-sm transition-all group
            ${pathname === "/settings"
              ? "bg-void-800/50 text-white"
              : "text-void-500 hover:text-void-300 hover:bg-void-800/30"
            }
          `}
        >
          <Settings className="w-4 h-4" />
          <span className="font-mono text-xs uppercase tracking-wider">Config</span>
        </Link>
      </div>

      {/* User */}
      <div className="p-4 border-t border-void-800/50 bg-void-900/30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-intel-500 to-storm-500 rounded flex items-center justify-center text-void-950 font-display font-bold text-sm">
            SM
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-white truncate">S. Mitchell</p>
            <p className="font-mono text-[10px] text-storm-500 uppercase tracking-wider">Field Ops</p>
          </div>
          <Zap className="w-4 h-4 text-storm-500" />
        </div>
      </div>

      {/* Decorative bottom line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-storm-500/30 to-transparent" />
    </aside>
  );
}
