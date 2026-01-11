/**
 * Utility Function Tests
 * 
 * Tests for common utility functions used throughout the app.
 */

import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (classnames merge)", () => {
  it("should merge class names", () => {
    const result = cn("px-4", "py-2");
    expect(result).toBe("px-4 py-2");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const result = cn("base", isActive && "active");
    expect(result).toContain("active");
  });

  it("should override conflicting Tailwind classes", () => {
    // tailwind-merge should override px-2 with px-4
    const result = cn("px-2", "px-4");
    expect(result).toBe("px-4");
  });

  it("should handle undefined and null", () => {
    const result = cn("base", undefined, null, "extra");
    expect(result).toBe("base extra");
  });

  it("should handle arrays", () => {
    const result = cn(["flex", "items-center"]);
    expect(result).toBe("flex items-center");
  });
});

describe("formatCurrency", () => {
  it("should format numbers as USD", () => {
    const formatCurrency = (value: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);

    expect(formatCurrency(1000)).toBe("$1,000");
    expect(formatCurrency(14500)).toBe("$14,500");
    expect(formatCurrency(0)).toBe("$0");
  });
});

describe("formatPhoneNumber", () => {
  it("should format phone numbers", () => {
    const formatPhone = (phone: string) => {
      const cleaned = phone.replace(/\D/g, "");
      if (cleaned.length !== 10) return phone;
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    };

    expect(formatPhone("2155551234")).toBe("(215) 555-1234");
    expect(formatPhone("215-555-1234")).toBe("(215) 555-1234");
    expect(formatPhone("invalid")).toBe("invalid");
  });
});

describe("truncateText", () => {
  it("should truncate long text", () => {
    const truncate = (text: string, maxLength: number) =>
      text.length > maxLength ? text.slice(0, maxLength) + "..." : text;

    expect(truncate("Hello World", 5)).toBe("Hello...");
    expect(truncate("Hi", 10)).toBe("Hi");
  });
});

describe("slugify", () => {
  it("should create URL-safe slugs", () => {
    const slugify = (text: string) =>
      text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    expect(slugify("Hello World")).toBe("hello-world");
    expect(slugify("Roof Repair 2026")).toBe("roof-repair-2026");
    expect(slugify("Storm Alert!!!")).toBe("storm-alert");
  });
});

describe("debounce", () => {
  it("should delay function execution", async () => {
    let callCount = 0;
    
    const debounce = <T extends (...args: unknown[]) => void>(
      fn: T,
      delay: number
    ) => {
      let timeoutId: ReturnType<typeof setTimeout>;
      return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delay);
      };
    };

    const increment = () => {
      callCount++;
    };

    const debouncedIncrement = debounce(increment, 50);

    // Call multiple times rapidly
    debouncedIncrement();
    debouncedIncrement();
    debouncedIncrement();

    // Should not have been called yet
    expect(callCount).toBe(0);

    // Wait for debounce
    await new Promise((r) => setTimeout(r, 100));

    // Should have been called once
    expect(callCount).toBe(1);
  });
});
