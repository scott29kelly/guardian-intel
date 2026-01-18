import { PrismaAdapter } from "@auth/prisma-adapter";
import { type NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { auditService } from "@/lib/services/audit";
import crypto from "crypto";

/**
 * Wrapper around getServerSession for cleaner API route usage
 */
export async function auth() {
  return getServerSession(authOptions);
}

// =============================================================================
// DEMO TOKEN SYSTEM: Secure, time-limited tokens for demo access
// Tokens expire after 5 minutes and are single-use
// =============================================================================

// In-memory store for demo tokens (in production, use Redis or similar)
const demoTokens = new Map<string, { email: string; expiresAt: number; used: boolean }>();

/**
 * Generate a secure demo token for a user
 * Token is valid for 5 minutes and single-use
 */
export function generateDemoToken(email: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  
  demoTokens.set(token, { email, expiresAt, used: false });
  
  // Cleanup expired tokens
  for (const [key, value] of demoTokens.entries()) {
    if (value.expiresAt < Date.now()) {
      demoTokens.delete(key);
    }
  }
  
  return token;
}

/**
 * Validate a demo token and return the associated email
 * Returns null if token is invalid, expired, or already used
 */
export function validateDemoToken(token: string): string | null {
  const tokenData = demoTokens.get(token);
  
  if (!tokenData) {
    return null;
  }
  
  if (tokenData.expiresAt < Date.now()) {
    demoTokens.delete(token);
    return null;
  }
  
  if (tokenData.used) {
    return null;
  }
  
  // Mark as used (single-use token)
  tokenData.used = true;
  
  return tokenData.email;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        demoToken: { label: "Demo Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email) {
          throw new Error("Invalid credentials");
        }

        // Demo token authentication (secure, time-limited tokens)
        if (credentials.demoToken) {
          // Only allow in non-production or when explicitly enabled
          if (process.env.NODE_ENV === "production" && !process.env.ALLOW_DEMO_LOGIN) {
            throw new Error("Demo login disabled in production");
          }

          const validEmail = validateDemoToken(credentials.demoToken);
          if (!validEmail || validEmail !== credentials.email) {
            throw new Error("Invalid or expired demo token");
          }

          // Find the demo user
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            throw new Error("Demo account not found. Run: npx prisma db seed");
          }

          // Check if account is active (same check as password auth)
          if (!user.isActive) {
            throw new Error("Account is disabled");
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.avatarUrl,
          };
        }

        // Standard password authentication
        if (!credentials.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        if (!user.isActive) {
          throw new Error("Account is disabled");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as { id: string }).id = token.id as string;
        (session.user as unknown as { role: string }).role = token.role as string;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      // Audit log user login
      if (user?.id) {
        try {
          await auditService.logLogin(user.id, {
            method: "credentials",
          });
        } catch (error) {
          // Don't block login on audit failure
          console.error("[Auth] Failed to log sign-in event:", error);
        }
      }
    },
    async signOut({ token }) {
      // Audit log user logout
      if (token?.id) {
        try {
          await auditService.logLogout(token.id as string);
        } catch (error) {
          // Don't block logout on audit failure
          console.error("[Auth] Failed to log sign-out event:", error);
        }
      }
    },
  },
};

// Helper to hash passwords
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Helper to verify passwords
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}
