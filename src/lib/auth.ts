import { PrismaAdapter } from "@auth/prisma-adapter";
import { type NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { auditService } from "@/lib/services/audit";

/**
 * Wrapper around getServerSession for cleaner API route usage
 */
export async function auth() {
  return getServerSession(authOptions);
}

// =============================================================================
// DEV BYPASS: Mock user for development (controlled by env var)
// Remove NEXT_PUBLIC_DEV_AUTH_BYPASS from env or set to "false" for production
// =============================================================================
const DEV_BYPASS_USER = {
  id: "dev-user-001",
  email: "dev@guardian.local",
  name: "Dev User",
  role: "manager",
  image: null,
};

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
      },
      async authorize(credentials) {
        // =============================================================
        // DEV BYPASS: Skip authentication in development
        // =============================================================
        if (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "true") {
          console.log("[Auth] 🔓 DEV BYPASS ACTIVE - Skipping authentication");
          return DEV_BYPASS_USER;
        }
        // =============================================================

        if (!credentials?.email || !credentials?.password) {
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
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
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
