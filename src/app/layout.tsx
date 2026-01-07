import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/lib/theme-context";

// Display font - bold, distinctive
const outfit = Outfit({ 
  subsets: ["latin"], 
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800", "900"],
});

// Mono font for data/numbers
const jetbrainsMono = JetBrains_Mono({ 
  subsets: ["latin"], 
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
});

// Sans font - clean, readable
const sans = Outfit({ 
  subsets: ["latin"], 
  variable: "--font-sans",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "GUARDIAN INTEL | Storm Damage Command",
  description: "Real-time storm intelligence and sales command center for Guardian Roofing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen font-sans antialiased",
          outfit.variable,
          jetbrainsMono.variable,
          sans.variable
        )}
      >
        <ThemeProvider>
          {/* Noise texture overlay */}
          <div className="noise-overlay" aria-hidden="true" />
          
          {/* Main content */}
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
