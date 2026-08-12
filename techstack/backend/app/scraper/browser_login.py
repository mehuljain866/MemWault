"""
MemWault Browser Login Module
Opens a real Chromium browser window for the user to log into Instagram.
Captures all session cookies after successful login.
"""

import asyncio
import logging
from typing import Optional

logger = logging.getLogger("memwault.browser_login")

# Required cookies we need to extract
REQUIRED_COOKIES = ["sessionid", "ds_user_id"]
DESIRED_COOKIES = ["sessionid", "csrftoken", "mid", "ig_did", "ds_user_id", "rur"]

LOGIN_URL = "https://www.instagram.com/accounts/login/"
HOME_URL = "https://www.instagram.com/"
LOGIN_TIMEOUT_MS = 300_000  # 5 minutes max to log in


async def browser_login(timeout_ms: int = LOGIN_TIMEOUT_MS) -> dict:
    """
    Open a real Chromium browser, navigate to Instagram login,
    wait for the user to log in, then extract all cookies.

    Returns a dict with:
        - cookies: dict of cookie_name -> cookie_value
        - user_agent: the browser's User-Agent string
        - ig_username: the logged-in username (from ds_user_id or page)
    """
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        raise RuntimeError(
            "Playwright is not installed. Run: pip install playwright && playwright install chromium"
        )

    result = {}

    async with async_playwright() as p:
        # Launch a VISIBLE browser (not headless) so the user can interact
        launch_args = [
            "--disable-blink-features=AutomationControlled",
            "--no-first-run",
            "--no-default-browser-check",
            "--start-maximized",
        ]
        
        try:
            # Try launching system Google Chrome first for maximum compatibility
            browser = await p.chromium.launch(
                channel="chrome",
                headless=False,
                args=launch_args,
            )
        except Exception:
            # Fall back to Playwright bundled Chromium
            browser = await p.chromium.launch(
                headless=False,
                args=launch_args,
            )

        # Create a context that looks like a real browser
        context = await browser.new_context(
            viewport=None,  # Use full window size
            user_agent=None,  # Use Chromium's default real UA
            locale="en-US",
        )

        # Get the real user agent from the browser
        page = await context.new_page()
        try:
            await page.bring_to_front()
        except Exception:
            pass

        user_agent = await page.evaluate("navigator.userAgent")
        result["user_agent"] = user_agent

        logger.info("Browser opened. Navigating to Instagram login...")

        # Navigate to Instagram login page
        await page.goto(LOGIN_URL, wait_until="domcontentloaded")
        try:
            await page.bring_to_front()
        except Exception:
            pass

        # On Windows, force the browser window to the foreground using Win32 API.
        # Playwright's bring_to_front() only works inside the browser context;
        # for OS-level focus when launched from a background service we need ctypes.
        import sys as _sys
        if _sys.platform == "win32":
            import asyncio as _asyncio
            await _asyncio.sleep(0.8)  # brief pause for window to render
            try:
                import ctypes
                import ctypes.wintypes

                user32 = ctypes.windll.user32

                # Find the Chromium window — it will have "Instagram" in the title
                # after navigation completes. Enumerate all top-level windows.
                def _force_foreground():
                    hwnd_target = [None]

                    @ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
                    def enum_cb(hwnd, lparam):
                        length = user32.GetWindowTextLengthW(hwnd)
                        if length > 0:
                            buf = ctypes.create_unicode_buffer(length + 1)
                            user32.GetWindowTextW(hwnd, buf, length + 1)
                            title = buf.value.lower()
                            if "instagram" in title or "chrome" in title or "chromium" in title:
                                hwnd_target[0] = hwnd
                                return False  # stop enum once found
                        return True

                    user32.EnumWindows(enum_cb, 0)
                    if hwnd_target[0]:
                        user32.ShowWindow(hwnd_target[0], 9)   # SW_RESTORE=9
                        user32.SetForegroundWindow(hwnd_target[0])
                        user32.BringWindowToTop(hwnd_target[0])

                _force_foreground()
            except Exception as _e:
                logger.debug("Could not force foreground window: %s", _e)

        # Handle cookie consent dialog if it appears
        try:
            accept_btn = page.locator("button:has-text('Allow all cookies'), button:has-text('Accept All'), button:has-text('Allow essential and optional cookies')")
            await accept_btn.click(timeout=3000)
            logger.info("Dismissed cookie consent dialog")
        except Exception:
            pass  # No cookie dialog, that's fine

        logger.info("Waiting for user to log in (timeout: %d seconds)...", timeout_ms // 1000)

        # Wait for the user to successfully log in.
        # We detect login by waiting for the sessionid cookie to appear.
        try:
            await _wait_for_login(context, page, timeout_ms)
        except Exception as e:
            await browser.close()
            raise RuntimeError(f"Login timed out or failed: {e}")

        # Extract all cookies
        all_cookies = await context.cookies("https://www.instagram.com")
        cookie_dict = {}
        for cookie in all_cookies:
            if cookie["name"] in DESIRED_COOKIES:
                cookie_dict[cookie["name"]] = cookie["value"]

        # Validate we got the essentials
        missing = [c for c in REQUIRED_COOKIES if c not in cookie_dict]
        if missing:
            await browser.close()
            raise RuntimeError(f"Login succeeded but missing cookies: {missing}")

        result["cookies"] = cookie_dict

        # Try to extract the username from the page
        try:
            ig_username = await _extract_username(page)
            result["ig_username"] = ig_username
        except Exception:
            # Fall back to ds_user_id
            result["ig_username"] = cookie_dict.get("ds_user_id", "unknown")

        logger.info(
            "Login successful! Captured %d cookies for user %s",
            len(cookie_dict),
            result.get("ig_username"),
        )

        await browser.close()

    return result


async def _wait_for_login(context, page, timeout_ms: int):
    """
    Poll cookies every second until sessionid appears,
    or until timeout is reached.
    """
    import time

    start = time.time()
    timeout_sec = timeout_ms / 1000

    while True:
        elapsed = time.time() - start
        if elapsed > timeout_sec:
            raise TimeoutError(f"User did not log in within {timeout_sec} seconds")

        # Check if sessionid cookie exists
        cookies = await context.cookies("https://www.instagram.com")
        cookie_names = {c["name"] for c in cookies}

        if "sessionid" in cookie_names:
            # Give it a moment for all cookies to settle
            await asyncio.sleep(2)
            return

        # Also check if we've navigated away from login page (URL changed)
        current_url = page.url
        if "/accounts/login" not in current_url and "instagram.com" in current_url:
            # User might have been redirected after login
            cookies = await context.cookies("https://www.instagram.com")
            cookie_names = {c["name"] for c in cookies}
            if "sessionid" in cookie_names:
                await asyncio.sleep(2)
                return

        await asyncio.sleep(1)


async def _extract_username(page) -> str:
    """Try to extract the logged-in username from the Instagram page."""
    # Method 1: Check for the profile link in the navigation
    try:
        # Navigate to the profile page to get username from URL
        await page.goto("https://www.instagram.com/accounts/edit/", wait_until="domcontentloaded", timeout=10000)
        await asyncio.sleep(1)

        # Try to get username from the page content
        username = await page.evaluate("""
            () => {
                // Check for username in various places
                const meta = document.querySelector('meta[property="og:title"]');
                if (meta) {
                    const match = meta.content.match(/@?(\\w+)/);
                    if (match) return match[1];
                }
                // Check the URL for username
                const profileLinks = document.querySelectorAll('a[href*="/"][role="link"]');
                for (const link of profileLinks) {
                    const href = link.getAttribute('href');
                    if (href && href.match(/^\\/[a-zA-Z0-9._]+\\/$/)) {
                        return href.replace(/\\//g, '');
                    }
                }
                return null;
            }
        """)
        if username:
            return username
    except Exception:
        pass

    # Method 2: Use the Web API to get current user info
    try:
        resp = await page.evaluate("""
            async () => {
                const r = await fetch('/api/v1/users/web_profile_info/?username=', {
                    credentials: 'include'
                });
                return null;  // This won't work without a username
            }
        """)
    except Exception:
        pass

    raise ValueError("Could not extract username")


def run_browser_login(timeout_ms: int = LOGIN_TIMEOUT_MS) -> dict:
    """
    Synchronous wrapper for browser_login.
    Call this from a sync context (e.g., FastAPI background thread).
    """
    return asyncio.run(browser_login(timeout_ms))
