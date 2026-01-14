"use client";

import { Sidebar, SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from "@/components/sidebar";
import { MobileHeader, MobileBottomNav } from "@/components/mobile-header";
import { ErrorBoundary, SectionErrorBoundary } from "@/components/error-boundary";
import { SidebarProvider, useSidebar } from "@/lib/sidebar-context";
import { GamificationProvider, useGamification } from "@/lib/gamification";
import { AnimationPreferencesProvider, useShouldAnimate } from "@/lib/preferences";
import { CelebrationModal } from "@/components/gamification";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { motion } from "framer-motion";

function CelebrationHandler() {
  const { celebrationQueue, dismissCelebration } = useGamification();
  const { shouldShowCelebrations } = useShouldAnimate();
  const currentCelebration = celebrationQueue[0] || null;
  
  // If celebrations are disabled, auto-dismiss any queued celebrations
  if (!shouldShowCelebrations && currentCelebration) {
    dismissCelebration();
    return null;
  }
  
  return (
    <CelebrationModal
      event={currentCelebration}
      onClose={dismissCelebration}
    />
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const isMobile = useIsMobile();
  const sidebarWidth = isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      {/* Mobile Header */}
      <MobileHeader />
      
      <motion.main
        initial={false}
        animate={{ marginLeft: isMobile ? 0 : sidebarWidth }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex-1 min-h-screen"
      >
        {/* Main content with mobile padding adjustments */}
        <div className="p-4 md:p-6 pt-18 md:pt-6 pb-24 md:pb-6">
          <SectionErrorBoundary sectionName="Page content">
            {children}
          </SectionErrorBoundary>
        </div>
      </motion.main>
      
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
      
      {/* Celebration Handler */}
      <CelebrationHandler />
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
      <AnimationPreferencesProvider>
        <SidebarProvider>
          <GamificationProvider>
            <DashboardContent>{children}</DashboardContent>
          </GamificationProvider>
        </SidebarProvider>
      </AnimationPreferencesProvider>
    </ErrorBoundary>
  );
}
