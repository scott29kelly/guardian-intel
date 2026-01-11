"use client";

import { Sidebar, SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from "@/components/sidebar";
import { ErrorBoundary, SectionErrorBoundary } from "@/components/error-boundary";
import { SidebarProvider, useSidebar } from "@/lib/sidebar-context";
import { motion } from "framer-motion";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const sidebarWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarWidth }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex-1"
      >
        {/* Top gradient line */}
        <motion.div
          initial={false}
          animate={{ left: sidebarWidth }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="fixed top-0 right-0 h-px bg-gradient-to-r from-[hsl(var(--accent-primary)/0.2)] via-[hsl(var(--accent-success)/0.2)] to-[hsl(var(--accent-danger)/0.2)] z-40"
          style={{ left: sidebarWidth }}
        />
        
        {/* Content area */}
        <div className="relative min-h-screen">
          {/* Background effects */}
          <motion.div
            initial={false}
            animate={{ marginLeft: 0 }}
            className="fixed inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 20%, hsl(var(--accent-primary) / 0.03) 0%, transparent 40%),
                radial-gradient(circle at 80% 80%, hsl(var(--accent-danger) / 0.02) 0%, transparent 40%)
              `
            }}
          />
          
          {/* Scan line effect */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <motion.div
              initial={false}
              animate={{ marginLeft: sidebarWidth }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="absolute inset-0"
              style={{
                opacity: 'var(--scan-line-opacity)',
                backgroundImage: `repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 2px,
                  hsl(var(--text-primary) / 0.03) 2px,
                  hsl(var(--text-primary) / 0.03) 4px
                )`
              }}
            />
          </div>
          
          {/* Main content */}
          <div className="relative z-10 p-6">
            <SectionErrorBoundary sectionName="Page content">
              {children}
            </SectionErrorBoundary>
          </div>
        </div>
      </motion.main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <SidebarProvider>
        <DashboardContent>{children}</DashboardContent>
      </SidebarProvider>
    </ErrorBoundary>
  );
}
