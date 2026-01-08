"use client";

import { useEffect } from "react";
import { Shield, AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html>
      <body className="bg-[hsl(240,10%,4%)] min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-emerald-500 shadow-lg mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          
          <div className="bg-[hsl(240,10%,6%)] border border-[hsl(240,4%,16%)] rounded-lg p-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-orange-500/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-orange-500" />
            </div>
            
            <h1 className="font-bold text-xl text-white mb-2">
              Application Error
            </h1>
            <p className="text-gray-400 text-sm mb-6">
              {error.message || "Something went wrong. Please try again."}
            </p>
            
            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 px-4 py-2 rounded text-sm text-white bg-gradient-to-r from-cyan-500 to-emerald-500 hover:opacity-90 transition-opacity"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 rounded text-sm text-gray-300 bg-[hsl(240,6%,10%)] border border-[hsl(240,4%,16%)] hover:bg-[hsl(240,4%,14%)] transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
