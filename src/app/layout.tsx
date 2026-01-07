import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display font for headers - bold, impactful
const displayFont = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Guardian Intel | Sales Intelligence Command Center",
  description: "Real-time customer intelligence and predictive analytics for Guardian sales teams",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${displayFont.variable} font-sans min-h-screen bg-surface-950`}
      >
        {/* Background gradient effects */}
        <div className="fixed inset-0 -z-10">
          {/* Primary gradient orb */}
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-guardian-500/10 rounded-full blur-[120px]" />
          {/* Accent gradient orb */}
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent-500/10 rounded-full blur-[100px]" />
          {/* Grid pattern overlay */}
          <div className="absolute inset-0 grid-pattern opacity-30" />
        </div>
        
        {children}
      </body>
    </html>
  );
}
