/**
 * Contract Stats API - Stub (Contract model not in schema)
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    success: true,
    data: { total: 0, pending: 0, signed: 0, expired: 0 },
    message: "Contract stats coming soon",
  });
}
