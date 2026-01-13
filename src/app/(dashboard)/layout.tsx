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
        className="flex-1 min-h-screen"
      >
        {/* Main content */}
        <div className="p-6">
          <SectionErrorBoundary sectionName="Page content">
            {children}
          </SectionErrorBoundary>
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
