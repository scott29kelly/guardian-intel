/**
 * NotebookLM Cookie Refresh
 *
 * Google's PSIDRTS (rotating session tokens) expire every ~12 hours.
 * The notebooklm-py CLI stores cookies in ~/.notebooklm/storage_state.json
 * but has no built-in refresh mechanism.
 *
 * This module uses Python's Playwright (already installed as a dep of
 * notebooklm-py) to headlessly visit NotebookLM with the still-valid
 * SID cookie. Google auto-issues fresh PSIDRTS tokens in the browser
 * session, which we then save back to storage_state.json.
 */

import { execFile } from "child_process";
import * as path from "path";
import * as os from "os";
import * as fs from "fs/promises";

const NOTEBOOKLM_HOME = path.join(os.homedir(), ".notebooklm");
const STORAGE_STATE_PATH = path.join(NOTEBOOKLM_HOME, "storage_state.json");
const BROWSER_PROFILE_PATH = path.join(NOTEBOOKLM_HOME, "browser_profile");

interface StorageCookie {
  name: string;
  value: string;
  domain: string;
  expires: number;
}

interface StorageState {
  cookies: StorageCookie[];
  origins?: unknown[];
}

/**
 * Check if PSIDRTS cookies are expired or expiring within a buffer window.
 * Returns true if cookies are still valid, false if refresh is needed.
 */
async function areCookiesValid(bufferMinutes: number = 30): Promise<boolean> {
  try {
    const raw = await fs.readFile(STORAGE_STATE_PATH, "utf-8");
    const state: StorageState = JSON.parse(raw);
    const now = Date.now() / 1000;
    const buffer = bufferMinutes * 60;

    const psidrts = state.cookies.find(
      (c) => c.name === "__Secure-1PSIDRTS" && c.domain === ".google.com"
    );

    if (!psidrts) {
      console.log("[AuthRefresh] No PSIDRTS cookie found — refresh needed");
      return false;
    }

    if (psidrts.expires < now + buffer) {
      const expiredAgo = Math.round((now - psidrts.expires) / 60);
      console.log(
        `[AuthRefresh] PSIDRTS cookie expired ${expiredAgo} minutes ago — refresh needed`
      );
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[AuthRefresh] Could not read storage state:", err);
    return false;
  }
}

/**
 * Refresh NotebookLM cookies by running a headless Playwright browser session.
 *
 * The SID cookie (valid for months) allows Google to auto-authenticate the
 * session and issue fresh PSIDRTS tokens without user interaction.
 *
 * Uses Python's Playwright (installed as a dependency of notebooklm-py).
 */
export async function refreshNotebookLMCookies(): Promise<boolean> {
  // First check if refresh is actually needed
  const valid = await areCookiesValid();
  if (valid) {
    console.log("[AuthRefresh] Cookies still valid, no refresh needed");
    return true;
  }

  console.log("[AuthRefresh] Starting headless cookie refresh via Playwright...");

  // Python script that uses Playwright to refresh cookies
  // Uses the existing storage_state.json (SID cookie is still valid)
  const pythonScript = `
import sys, json, os
storage_path = ${JSON.stringify(STORAGE_STATE_PATH.replace(/\\/g, "/"))}

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("ERROR: playwright not installed", file=sys.stderr)
    sys.exit(1)

if not os.path.exists(storage_path):
    print("ERROR: storage_state.json not found", file=sys.stderr)
    sys.exit(1)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(storage_state=storage_path)
    page = context.new_page()

    # Navigate to NotebookLM — Google will auto-refresh PSIDRTS tokens
    page.goto("https://notebooklm.google.com/", wait_until="networkidle", timeout=30000)

    # Check if we got redirected to login (means SID also expired)
    url = page.url
    if "accounts.google.com" in url or "signin" in url.lower():
        print("ERROR: SID cookie also expired — manual login required", file=sys.stderr)
        browser.close()
        sys.exit(2)

    # Save refreshed cookies
    context.storage_state(path=storage_path)
    browser.close()
    print("OK: Cookies refreshed successfully")
`.trim();

  return new Promise((resolve) => {
    const pythonCmd = process.env.NOTEBOOKLM_PYTHON_CMD || "python";

    execFile(
      pythonCmd,
      ["-c", pythonScript],
      {
        timeout: 45_000, // 45 seconds for headless browser
        maxBuffer: 1024 * 1024,
        env: { ...process.env },
      },
      (error, stdout, stderr) => {
        const output = stdout?.toString().trim() || "";
        const errOutput = stderr?.toString().trim() || "";

        if (error) {
          const exitCode = (error as NodeJS.ErrnoException & { code?: number }).code;

          if (exitCode === 2) {
            console.error(
              "[AuthRefresh] SID cookie also expired — manual re-login required"
            );
          } else {
            console.error(
              "[AuthRefresh] Cookie refresh failed:",
              errOutput || output || error.message
            );
          }
          resolve(false);
          return;
        }

        if (output.startsWith("OK:")) {
          console.log(`[AuthRefresh] ${output}`);
          resolve(true);
        } else {
          console.warn("[AuthRefresh] Unexpected output:", output);
          resolve(false);
        }
      }
    );
  });
}

/**
 * Delete the browser profile directory to force a truly fresh login.
 * Call this before running `notebooklm login` when automatic refresh fails.
 */
export async function cleanLoginProfile(): Promise<void> {
  try {
    await fs.rm(BROWSER_PROFILE_PATH, { recursive: true, force: true });
    console.log("[AuthRefresh] Browser profile deleted — ready for fresh login");
  } catch (err) {
    console.warn("[AuthRefresh] Could not delete browser profile:", err);
  }
}
