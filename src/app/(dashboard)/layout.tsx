import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64">
        {/* Top gradient line */}
        <div className="fixed top-0 left-64 right-0 h-px bg-gradient-to-r from-intel-500/20 via-storm-500/20 to-damage-500/20 z-40" />
        
        {/* Content area */}
        <div className="relative min-h-screen">
          {/* Background grid pattern */}
          <div 
            className="fixed inset-0 ml-64 pointer-events-none opacity-30"
            style={{
              backgroundImage: `
                radial-gradient(circle at 20% 20%, rgba(34, 211, 238, 0.03) 0%, transparent 40%),
                radial-gradient(circle at 80% 80%, rgba(249, 115, 22, 0.02) 0%, transparent 40%)
              `
            }}
          />
          
          {/* Scan line effect */}
          <div className="fixed inset-0 ml-64 pointer-events-none overflow-hidden">
            <div 
              className="absolute inset-0 opacity-[0.015]"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 2px,
                  rgba(255, 255, 255, 0.03) 2px,
                  rgba(255, 255, 255, 0.03) 4px
                )`
              }}
            />
          </div>
          
          {/* Main content */}
          <div className="relative z-10 p-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
