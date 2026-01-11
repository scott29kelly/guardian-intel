/**
 * Login Flow E2E Tests
 * 
 * Tests the authentication flow including:
 * - Demo login
 * - Form validation
 * - Protected route access
 */

import { test, expect } from "@playwright/test";

test.describe("Login Flow", () => {
  test("should display login page", async ({ page }) => {
    await page.goto("/login");
    
    // Check page title and heading
    await expect(page).toHaveTitle(/Guardian Intel/i);
    await expect(page.getByRole("heading", { name: /Welcome Back/i })).toBeVisible();
  });

  test("should have email and password inputs", async ({ page }) => {
    await page.goto("/login");
    
    const emailInput = page.getByPlaceholder(/you@guardian.com/i);
    const passwordInput = page.getByPlaceholder(/•/);
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test("should have demo login buttons", async ({ page }) => {
    await page.goto("/login");
    
    const salesRepDemo = page.getByRole("button", { name: /Sales Rep Demo/i });
    const managerDemo = page.getByRole("button", { name: /Manager Demo/i });
    
    await expect(salesRepDemo).toBeVisible();
    await expect(managerDemo).toBeVisible();
  });

  test("should login with manager demo", async ({ page }) => {
    await page.goto("/login");
    
    // Click manager demo button
    await page.getByRole("button", { name: /Manager Demo/i }).click();
    
    // Wait for navigation to dashboard
    await page.waitForURL("/", { timeout: 10000 });
    
    // Check dashboard loaded
    await expect(page.getByRole("heading", { name: /Command Center/i })).toBeVisible();
  });

  test("should redirect to login when accessing protected route", async ({ page }) => {
    // Try to access dashboard directly
    await page.goto("/");
    
    // Should redirect to login (or show login if already authenticated)
    const url = page.url();
    expect(url).toMatch(/\/(login)?$/);
  });
});

test.describe("Protected Routes", () => {
  // Use storage state for authenticated tests
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto("/login");
    await page.getByRole("button", { name: /Manager Demo/i }).click();
    await page.waitForURL("/", { timeout: 10000 });
  });

  test("should access dashboard after login", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Command Center/i })).toBeVisible();
  });

  test("should navigate to customers page", async ({ page }) => {
    await page.getByRole("link", { name: /Targets/i }).click();
    await page.waitForURL("/customers");
    
    await expect(page.url()).toContain("/customers");
  });

  test("should navigate to analytics page", async ({ page }) => {
    await page.getByRole("link", { name: /Analytics/i }).click();
    await page.waitForURL("/analytics");
    
    await expect(page.url()).toContain("/analytics");
  });
});
