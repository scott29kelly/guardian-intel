"""
NotebookLM Session Keeper

Refreshes Google PSIDRTS cookies by briefly loading NotebookLM in a headless
browser. The long-lived SID cookie (valid for months) allows Google to
auto-issue fresh PSIDRTS tokens without user interaction.

Run via Windows Task Scheduler every 2 hours:
  python scripts/notebooklm-session-keeper.py

Exit codes:
  0 — cookies refreshed (or still valid)
  1 — refresh failed (transient error, will retry next run)
  2 — SID expired, manual `notebooklm login` required
"""

import sys
import os
import json
import time
from pathlib import Path
from datetime import datetime

NOTEBOOKLM_HOME = Path.home() / ".notebooklm"
STORAGE_STATE = NOTEBOOKLM_HOME / "storage_state.json"
LOG_FILE = NOTEBOOKLM_HOME / "session-keeper.log"

# How far before expiry to proactively refresh (minutes)
REFRESH_BUFFER_MINUTES = 30


def log(msg: str):
    """Append to log file and print to stdout."""
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line)
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line + "\n")
        # Keep log file under 100KB
        if LOG_FILE.stat().st_size > 100_000:
            lines = LOG_FILE.read_text(encoding="utf-8").splitlines()
            LOG_FILE.write_text("\n".join(lines[-200:]) + "\n", encoding="utf-8")
    except Exception:
        pass


def check_cookies() -> bool:
    """Return True if PSIDRTS cookies are still valid."""
    if not STORAGE_STATE.exists():
        log("No storage_state.json found")
        return False

    try:
        state = json.loads(STORAGE_STATE.read_text(encoding="utf-8"))
        now = time.time()
        buffer = REFRESH_BUFFER_MINUTES * 60

        psidrts = next(
            (c for c in state.get("cookies", [])
             if c["name"] == "__Secure-1PSIDRTS" and c["domain"] == ".google.com"),
            None
        )

        if not psidrts:
            log("No PSIDRTS cookie found")
            return False

        remaining_min = round((psidrts["expires"] - now) / 60)
        if psidrts["expires"] < now + buffer:
            log(f"PSIDRTS {'expired' if remaining_min < 0 else 'expiring'} "
                f"({remaining_min}min {'ago' if remaining_min < 0 else 'remaining'})")
            return False

        log(f"PSIDRTS still valid ({remaining_min}min remaining) — no refresh needed")
        return True

    except Exception as e:
        log(f"Error reading cookies: {e}")
        return False


def refresh_cookies() -> int:
    """Launch headless browser to refresh PSIDRTS cookies. Returns exit code."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        log("ERROR: playwright not installed (pip install playwright)")
        return 1

    log("Starting headless cookie refresh...")
    start = time.time()

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(storage_state=str(STORAGE_STATE))
            page = context.new_page()

            # Navigate to NotebookLM — triggers PSIDRTS refresh
            page.goto(
                "https://notebooklm.google.com/",
                wait_until="networkidle",
                timeout=30000
            )

            url = page.url

            # Check if redirected to login (SID also expired)
            if "accounts.google.com" in url or "signin" in url.lower():
                log("SID cookie expired — manual 'notebooklm login' required")
                browser.close()
                return 2

            # Save refreshed cookies
            context.storage_state(path=str(STORAGE_STATE))
            browser.close()

            elapsed = round(time.time() - start, 1)
            log(f"Cookies refreshed successfully in {elapsed}s")
            return 0

    except Exception as e:
        elapsed = round(time.time() - start, 1)
        log(f"Refresh failed after {elapsed}s: {e}")
        return 1


def main():
    log("--- Session keeper run ---")

    # Skip if cookies are still fresh
    if check_cookies():
        sys.exit(0)

    exit_code = refresh_cookies()

    # Verify the refresh worked
    if exit_code == 0:
        if check_cookies():
            log("Verification passed")
        else:
            log("WARNING: Refresh reported success but cookies still invalid")
            exit_code = 1

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
