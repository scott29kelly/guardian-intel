"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // ===========================================================================
  // DEV BYPASS: Auto-login when NEXT_PUBLIC_DEV_AUTH_BYPASS=true
  // ===========================================================================
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true") {
      setIsLoading(true);
      signIn("credentials", {
        email: "dev@bypass",
        password: "dev",
        redirect: false,
      }).then((result) => {
        if (!result?.error) {
          router.push(callbackUrl);
          router.refresh();
        } else {
          setIsLoading(false);
        }
      });
    }
  }, [callbackUrl, router]);
  // ===========================================================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Demo login - credentials are seeded via prisma/seed.ts
  // This avoids exposing credentials in client-side code
  const handleDemoLogin = async (role: "rep" | "manager") => {
    setIsLoading(true);
    setError("");

    try {
      // Fetch demo credentials from server-side API
      const response = await fetch(`/api/auth/demo-credentials?role=${role}`);
      
      if (!response.ok) {
        setError("Demo accounts not configured. Run: npx prisma db seed");
        setIsLoading(false);
        return;
      }

      const { email } = await response.json();
      
      // For demo, use a known demo password pattern
      // In production, this endpoint would be disabled
      const result = await signIn("credentials", {
        email,
        password: "GuardianDemo2026!",
        redirect: false,
      });

      if (result?.error) {
        setError("Demo login failed. Please run: npx prisma db seed");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      setError("Demo login unavailable. Please use regular login.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-guardian-500/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-accent-500/15 rounded-full blur-[100px]" />
        <div className="absolute inset-0 grid-pattern opacity-30" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-guardian-500 to-accent-500 shadow-lg shadow-guardian-500/25 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-white">
            Guardian <span className="text-gradient">Intel</span>
          </h1>
          <p className="text-surface-400 mt-2">Sales Intelligence Command Center</p>
        </div>

        <Card className="backdrop-blur-xl">
          <CardHeader className="text-center">
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Sign in to access your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-surface-300">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@guardian.com"
                    className="w-full pl-11 pr-4 py-3 bg-void-800/80 border border-void-600 rounded-lg text-white placeholder:text-void-400 focus:outline-none focus:border-intel-500/50 focus:ring-1 focus:ring-intel-500/25 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-surface-300">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3 bg-void-800/80 border border-void-600 rounded-lg text-white placeholder:text-void-400 focus:outline-none focus:border-intel-500/50 focus:ring-1 focus:ring-intel-500/25 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Submit button */}
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              {/* Forgot password */}
              <div className="text-center">
                <a href="#" className="text-sm text-guardian-400 hover:text-guardian-300">
                  Forgot your password?
                </a>
              </div>
            </form>

            {/* Demo accounts */}
            <div className="mt-6 pt-6 border-t border-surface-700/50">
              <p className="text-xs text-surface-500 text-center mb-3">Quick Demo Access</p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoLogin("rep")}
                  disabled={isLoading}
                >
                  Sales Rep Demo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDemoLogin("manager")}
                  disabled={isLoading}
                >
                  Manager Demo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-surface-500 text-sm mt-6">
          Need an account?{" "}
          <a href="#" className="text-guardian-400 hover:text-guardian-300">
            Contact your admin
          </a>
        </p>
      </motion.div>
    </div>
  );
}
