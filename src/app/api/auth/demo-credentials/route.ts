/**
 * Demo Credentials API
 * 
 * Generates secure, time-limited demo tokens for demo account access.
 * Tokens expire after 5 minutes and are single-use.
 * 
 * SECURITY:
 * - Tokens are cryptographically random (32 bytes)
 * - Tokens expire after 5 minutes
 * - Tokens can only be used once
 * - Disabled in production unless ALLOW_DEMO_LOGIN is set
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDemoToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Demo accounts (must match seed script)
const DEMO_ACCOUNTS = {
  rep: "demo.rep@guardian.com",
  manager: "demo.manager@guardian.com",
};

export async function GET(request: Request) {
  // Disable in production unless explicitly enabled
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_DEMO_LOGIN) {
    return NextResponse.json(
      { error: "Demo login disabled in production" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") as "rep" | "manager";

  if (!role || !DEMO_ACCOUNTS[role]) {
    return NextResponse.json(
      { error: "Invalid role. Use 'rep' or 'manager'" },
      { status: 400 }
    );
  }

  const email = DEMO_ACCOUNTS[role];

  // Verify the demo account exists in the database
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Demo account not found. Run: npx prisma db seed" },
      { status: 404 }
    );
  }

  // Generate a secure, time-limited token
  const demoToken = generateDemoToken(email);

  return NextResponse.json({
    email,
    demoToken,
    role,
    expiresIn: "5 minutes",
    note: "Token is single-use and expires in 5 minutes",
  });
}
