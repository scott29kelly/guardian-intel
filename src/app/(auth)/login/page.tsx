"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Activity, Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
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
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Demo login - populates email + password fields for quick access
  const handleDemoLogin = (role: "rep" | "manager") => {
    const demoEmails = {
      rep: "demo.rep@guardian.com",
      manager: "demo.manager@guardian.com",
    };
    setEmail(demoEmails[role]);
    setPassword("admin");
    setError("");
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-accent-primary text-white rounded-xl p-2 mb-4">
            <Activity className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">
            TradePulse Intel
          </h1>
          <p className="text-text-muted mt-2">Sales Intelligence Command Center</p>
        </div>

        <Card className="bg-surface-primary border border-border rounded-xl shadow-sm">
          <CardHeader className="text-center">
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>Sign in to access your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full pl-11 pr-4 py-3 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3 bg-surface-secondary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                    aria-label={showPassword ? "Hide password" : "Show password"}
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
                  role="alert"
                  className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Submit button */}
              <Button type="submit" className="w-full bg-accent-primary text-white hover:opacity-90 rounded-lg py-2.5 font-medium transition-opacity" size="lg" disabled={isLoading}>
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
                <button type="button" className="text-sm text-accent-primary hover:opacity-80">
                  Forgot your password?
                </button>
              </div>
            </form>

            {/* Demo accounts */}
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-text-muted text-center mb-3">Quick Demo Access</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleDemoLogin("rep")}
                  disabled={isLoading}
                  className="border border-border bg-transparent text-text-primary hover:bg-surface-hover rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Sales Rep Demo
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin("manager")}
                  disabled={isLoading}
                  className="border border-border bg-transparent text-text-primary hover:bg-surface-hover rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Manager Demo
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-text-muted text-sm mt-6">
          Need an account?{" "}
          <button type="button" className="text-accent-primary hover:opacity-80">
            Contact your admin
          </button>
        </p>
      </motion.div>
    </div>
  );
}
