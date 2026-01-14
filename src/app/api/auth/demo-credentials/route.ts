/**
 * Demo Credentials API
 *
 * Generates time-limited demo tokens for demo accounts.
 * Tokens are validated server-side and expire after 5 minutes.
 *
 * This endpoint should be disabled in production.
 */

import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Demo accounts (must match seed script)
const DEMO_ACCOUNTS = {
  rep: "demo.rep@guardian.com",
  manager: "demo.manager@guardian.com",
} as const;

// In-memory token store with expiration (5 minutes)
// In production, use Redis or database
const tokenStore = new Map<string, { email: string; expiresAt: number }>();

// Clean up expired tokens periodically
function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of tokenStore.entries()) {
    if (data.expiresAt < now) {
      tokenStore.delete(token);
    }
  }
}

/**
 * Generate a secure demo token
 */
function generateDemoToken(email: string): string {
  const randomPart = randomBytes(32).toString("hex");
  const timestamp = Date.now().toString();
  const token = createHash("sha256")
    .update(`${randomPart}${email}${timestamp}`)
    .digest("hex");

  // Token expires in 5 minutes
  tokenStore.set(token, {
    email,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });

  // Cleanup old tokens
  cleanupExpiredTokens();

  return token;
}

/**
 * Validate a demo token and return the email if valid
 */
export function validateDemoToken(token: string): string | null {
  const data = tokenStore.get(token);
  if (!data) return null;

  if (data.expiresAt < Date.now()) {
    tokenStore.delete(token);
    return null;
  }

  // One-time use: delete after validation
  tokenStore.delete(token);
  return data.email;
}

export async function GET(request: Request) {
  // Disable in production unless explicitly allowed
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_DEMO_LOGIN) {
    return NextResponse.json(
      { error: "Demo login disabled in production" },
      { status: 403 }
    );
  }

  // Rate limit demo token generation
  const rateLimitResponse = await rateLimit(request, "auth");
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") as "rep" | "manager";

  if (!role || !DEMO_ACCOUNTS[role]) {
    return NextResponse.json(
      { error: "Invalid role. Use 'rep' or 'manager'" },
      { status: 400 }
    );
  }

  const email = DEMO_ACCOUNTS[role];
  const demoToken = generateDemoToken(email);

  return NextResponse.json({
    email,
    role,
    demoToken,
    expiresIn: 300, // 5 minutes in seconds
    note: "Token is one-time use and expires in 5 minutes",
  });
}
