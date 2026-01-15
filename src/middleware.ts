/**
 * Next.js Middleware for Route Protection
 * 
 * Protects all dashboard routes and requires authentication.
 * Redirects unauthenticated users to /login.
 */

export const runtime = "nodejs";

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Additional middleware logic can go here
    // For example, role-based access control
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Manager-only routes
    const managerRoutes = ["/settings/team", "/analytics/team"];
    if (managerRoutes.some(route => path.startsWith(route))) {
      if (token?.role !== "manager" && token?.role !== "admin") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    // Admin-only routes
    const adminRoutes = ["/settings/system", "/settings/integrations"];
    if (adminRoutes.some(route => path.startsWith(route))) {
      if (token?.role !== "admin") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

// Protect all dashboard routes
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - /login (auth page)
     * - /api/auth (NextAuth endpoints)
     * - /api/notifications/vapid-key (public - needed before auth for PWA)
     * - /_next (Next.js internals)
     * - /favicon.ico, /robots.txt, /manifest.json, /sw*.js (PWA assets)
     * - /icons/* (PWA icons)
     */
    "/((?!login|api/auth|api/notifications/vapid-key|_next/static|_next/image|favicon\\.ico|favicon\\.svg|robots\\.txt|manifest\\.json|sw.*\\.js|icons/).*)",
  ],
};
