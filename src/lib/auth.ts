import { PrismaAdapter } from "@auth/prisma-adapter";
import { type NextAuthOptions, getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { auditService } from "@/lib/services/audit";
import { authSecret } from "@/lib/auth-secret";

/**
 * Wrapper around getServerSession for cleaner API route usage
 */
export async function auth() {
  return getServerSession(authOptions);
}

/**
 * Get a typed session or null. Use in API routes for auth + ownership checks.
 */
export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  return session as {
    user: { id: string; role: string; email: string; name: string; image?: string | null };
  };
}

/**
 * Minimal session shape required by `assertCustomerAccess`. Pulled from `requireSession`.
 */
export interface AuthorizedSession {
  user: { id: string; role: string };
}

/**
 * Minimal customer shape required by `assertCustomerAccess`. Use a structural type
 * so callers can pass either a full Prisma Customer or a `select`-narrowed projection.
 */
export interface CustomerOwnershipFields {
  assignedRepId: string | null;
}

/**
 * Rep-ownership authorization for customer-scoped resources.
 *
 * Rule (from Phase 7 D-04 / D-05):
 *   - admin or manager → always allowed
 *   - rep → allowed only if customer.assignedRepId === session.user.id
 *
 * Returns `true` if access is allowed, `false` otherwise.
 *
 * Callers should respond with `NextResponse.json({ error: "Forbidden" }, { status: 403 })`
 * when this returns false. We return a boolean (not throw) so route handlers can keep
 * their try/catch blocks focused on real errors rather than authorization control flow.
 */
export function assertCustomerAccess(
  session: AuthorizedSession,
  customer: CustomerOwnershipFields,
): boolean {
  const role = session.user.role;
  if (role === "admin" || role === "manager") return true;
  if (customer.assignedRepId && customer.assignedRepId === session.user.id) return true;
  return false;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  secret: authSecret,
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
