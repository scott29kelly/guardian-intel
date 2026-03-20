const DEV_FALLBACK_SECRET = "guardian-intel-dev-secret-not-for-production";

/**
 * NextAuth requires a secret to sign and verify session tokens.
 * In local development we provide a stable fallback so demo access works
 * before `.env.local` is configured. Production must still provide a real secret.
 */
export const authSecret =
  process.env.NEXTAUTH_SECRET ||
  (process.env.NODE_ENV === "production" ? undefined : DEV_FALLBACK_SECRET);
