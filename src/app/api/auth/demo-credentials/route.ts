/**
 * Demo Credentials API
 * 
 * Returns demo account email based on role.
 * Only returns email, never password (password is known pattern for seeded accounts).
 * 
 * This endpoint should be disabled in production.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Demo accounts (must match seed script)
const DEMO_ACCOUNTS = {
  rep: "demo.rep@guardian.com",
  manager: "demo.manager@guardian.com",
};

export async function GET(request: Request) {
  // Disable in production
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

  return NextResponse.json({
    email: DEMO_ACCOUNTS[role],
    role,
    note: "Use npx prisma db seed to create demo accounts",
  });
}
