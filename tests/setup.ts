/**
 * Vitest Test Setup
 * 
 * Configures the testing environment with:
 * - Jest DOM matchers for React Testing Library
 * - Mock fetch and environment
 */

import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next-auth
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: {
      user: { id: "1", email: "test@guardian.com", name: "Test User" },
    },
    status: "authenticated",
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock environment variables
process.env.DATABASE_URL = "postgresql://test";
process.env.NEXTAUTH_SECRET = "test-secret-at-least-32-characters-long";

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
