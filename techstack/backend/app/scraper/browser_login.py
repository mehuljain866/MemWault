"""
MemWault Browser Login Module
Opens a real Chromium browser window for the user to log into Instagram.
Captures all session cookies after successful login.
"""

import asyncio
import logging
from typing import Optional

from app.desktop import ensure_desktop_available, raise_new_window, snapshot_windows

logger = logging.getLogger("memwault.browser_login")

# Required cookies we need to extract
REQUIRED_COOKIES = ["sessionid"]
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

    # Fail immediately and explain why, rather than launching a browser nobody
    # can see (e.g. when the backend runs inside a container).
    ensure_desktop_available("Instagram browser login")

    result = {}

    # Snapshot existing windows so the new browser window can be identified by
    # difference afterwards, instead of by matching its title.
    windows_before = snapshot_windows()

    async with async_playwright() as p:
        # Launch a VISIBLE browser (not headless) so the user can interact.
        # We launch bundled Chromium as a dedicated standalone window so it never
        # merges into an existing running Chrome instance.
        launch_args = [
            "--disable-blink-features=AutomationControlled",
            "--no-first-run",
            "--no-default-browser-check",
            "--new-window",
            "--window-position=120,80",
            "--window-size=1280,850",
        ]
        
        try:
            browser = await p.chromium.launch(
                headless=False,
                args=launch_args,
            )
            logger.info("Launched standalone bundled Chromium for Instagram login")
        except Exception as chromium_exc:
            logger.info(
                "Bundled Chromium unavailable (%s); falling back to system Chrome",
                chromium_exc,
            )
            try:
                browser = await p.chromium.launch(
                    channel="chrome",
                    headless=False,
                    args=launch_args,
                )
                logger.info("Launched system Google Chrome for Instagram login")
            except Exception as chrome_exc:
                raise RuntimeError(
                    "Could not open a browser window: neither Playwright's bundled "
                    "Chromium nor system Google Chrome could be started. Run "
                    "'playwright install chromium' inside the backend virtualenv. "
                    f"Underlying error: {chromium_exc} / {chrome_exc}"
                ) from chrome_exc

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

        # Raise the new browser window to the foreground. Playwright's
        # bring_to_front() only reorders tabs within the browser - it cannot give
        # the window OS-level focus when uvicorn launched it from the background.
        #
        # The window is identified by diffing against the snapshot taken before
        # launch. Matching on the title instead (the previous approach) picked
        # whichever window contained "chrome" - normally the user's own browser,
        # the one displaying MemWault - so the login window stayed hidden behind it.
        await asyncio.sleep(0.8)  # brief pause for the window to render
        if not raise_new_window(windows_before, title_hint="instagram"):
            logger.warning(
                "Could not bring the Instagram login window to the front - "
                "it is open, check the taskbar."
            )

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

        # Extract all cookies from context (broad search across instagram.com domain)
        all_cookies = await context.cookies()
        cookie_dict = {}
        for cookie in all_cookies:
            domain = cookie.get("domain", "")
            if "instagram.com" in domain or not domain:
                cookie_dict[cookie["name"]] = cookie["value"]

        # Validate we got sessionid
        if "sessionid" not in cookie_dict:
            await browser.close()
            raise RuntimeError("Login completed but sessionid cookie was not found.")

        # Ensure ds_user_id is present (parse from sessionid if omitted as an independent cookie)
        if "ds_user_id" not in cookie_dict:
            import urllib.parse
            unquoted = urllib.parse.unquote(cookie_dict["sessionid"])
            uid = unquoted.split(":")[0].split("%3A")[0]
            if uid.isdigit():
                cookie_dict["ds_user_id"] = uid

        result["cookies"] = cookie_dict

        # Try to extract the username from the current page without navigating away
        try:
            ig_username = await _extract_username(page)
            if ig_username:
                result["ig_username"] = ig_username
            else:
                result["ig_username"] = cookie_dict.get("ds_user_id", "unknown")
        except Exception as exc:
            logger.info("Could not extract username from page (%s); falling back to ds_user_id", exc)
            result["ig_username"] = cookie_dict.get("ds_user_id", "unknown")

        logger.info(
            "Login successful! Captured %d cookies for user %s",
            len(cookie_dict),
            result.get("ig_username"),
        )

        # Extract rich profile metrics (avatar, stats, bio) directly while authenticated session is active
        try:
            profile_data = await _extract_profile_data(page, result.get("ig_username", ""))
            result["profile"] = profile_data

            # Pre-download profile picture to local storage
            pic_url = profile_data.get("profile_pic_url")
            if pic_url and pic_url.startswith("http"):
                try:
                    from app.config import get_settings
                    settings = get_settings()
                    media_dir = settings.storage_local_dir_resolved
                    media_dir.mkdir(parents=True, exist_ok=True)

                    resp = await context.request.get(pic_url)
                    if resp.ok:
                        pic_bytes = await resp.body()
                        uid = cookie_dict.get("ds_user_id", "")
                        if uid:
                            with open(media_dir / f"profile_pic_{uid}.jpg", "wb") as f:
                                f.write(pic_bytes)
                        logger.info("Downloaded and cached profile avatar for %s", result.get("ig_username"))
                except Exception as dl_err:
                    logger.warning("Could not pre-download profile picture: %s", dl_err)
        except Exception as prof_err:
            logger.warning("Profile extraction failed: %s", prof_err)
            result["profile"] = {}

        # Brief pause to let any background cookie sync finish before closing browser
        await asyncio.sleep(1.5)
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

        # Check if browser was closed by user
        if page.is_closed():
            raise RuntimeError("Browser window was closed before login completed.")

        # Check if sessionid cookie exists
        try:
            cookies = await context.cookies()
            cookie_names = {c["name"] for c in cookies}
        except Exception:
            cookie_names = set()

        if "sessionid" in cookie_names:
            # Dismiss any 'Save Your Login Info' or 'Turn on Notifications' modals if present
            for label in ["Not Now", "Not now", "Cancel"]:
                try:
                    btn = page.locator(f"button:has-text('{label}'), div[role='button']:has-text('{label}')")
                    if await btn.count() > 0:
                        await btn.first.click(timeout=1000)
                        logger.info("Dismissed post-login prompt: '%s'", label)
                        break
                except Exception:
                    pass
            # Give it a moment for all cookies to settle
            await asyncio.sleep(2)
            return

        # Also check if we've navigated away from login page (URL changed)
        try:
            current_url = page.url
            if "/accounts/login" not in current_url and "instagram.com" in current_url:
                cookies = await context.cookies()
                cookie_names = {c["name"] for c in cookies}
                if "sessionid" in cookie_names:
                    await asyncio.sleep(2)
                    return
        except Exception:
            pass

        await asyncio.sleep(1)


async def _extract_username(page) -> Optional[str]:
    """Try to extract the logged-in username from the current Instagram page without navigating away."""
    try:
        # Check current page URL first
        current_url = page.url
        import re
        m = re.search(r"instagram\.com/([a-zA-Z0-9._]+)/?", current_url)
        if m:
            candidate = m.group(1).lower()
            if candidate not in {"accounts", "explore", "reels", "direct", "stories", "emails", "challenge"}:
                return m.group(1)
    except Exception:
        pass

    try:
        username = await page.evaluate("""
            () => {
                const reserved = new Set([
                    'explore', 'reels', 'direct', 'stories', 'accounts', 'emails', 
                    'challenge', 'legal', 'about', 'help', 'developer', 'api', 'directory', 
                    'terms', 'privacy', 'login', 'signup', '', 'p'
                ]);
                // 1. Check profile link in navigation / sidebar
                const links = Array.from(document.querySelectorAll('a[role="link"], a[href^="/"]'));
                for (const a of links) {
                    const href = a.getAttribute('href') || '';
                    const match = href.match(/^\\/([a-zA-Z0-9._]+)\\/?$/);
                    if (match) {
                        const candidate = match[1].toLowerCase();
                        if (!reserved.has(candidate)) {
                            if (a.querySelector('img') || (a.textContent && a.textContent.toLowerCase().includes('profile'))) {
                                return match[1];
                            }
                        }
                    }
                }
                // 2. Check embedded script tags for username
                const scripts = Array.from(document.querySelectorAll('script'));
                for (const s of scripts) {
                    const text = s.textContent || '';
                    const m = text.match(/"username":"([a-zA-Z0-9._]+)"/);
                    if (m && m[1] && !reserved.has(m[1].toLowerCase())) {
                        return m[1];
                    }
                }
                return null;
            }
        """)
        if username:
            return username
    except Exception as e:
        logger.debug("DOM extraction of username failed: %s", e)

async def _extract_profile_data(page, username: str) -> dict:
    """Extract profile metadata (avatar, bio, follower/following/post counts) from the open browser."""
    profile = {
        "username": username,
        "full_name": None,
        "profile_pic_url": None,
        "biography": None,
        "follower_count": None,
        "following_count": None,
        "media_count": None,
    }
    if not username or username == "unknown" or username.isdigit():
        return profile

    try:
        # If Instagram presents an intermediate 'Continue as...' dialog, click it
        btn = await page.query_selector('button:has-text("Continue"), [role="button"]:has-text("Continue")')
        if btn:
            try:
                await btn.click()
                await asyncio.sleep(1.0)
            except Exception:
                pass

        current_url = page.url
        if f"/{username}" not in current_url:
            await page.goto(f"https://www.instagram.com/{username}/", wait_until="domcontentloaded", timeout=12000)
            await asyncio.sleep(1.5)

        data = await page.evaluate("""
            () => {
                const res = {};
                // 1. Profile Picture
                const img = document.querySelector('header img[alt*="profile"], header img');
                if (img && img.src && !img.src.includes('data:image')) {
                    res.profile_pic_url = img.src;
                }

                // 2. Full Name & Bio
                const nameEl = document.querySelector('header section:nth-of-type(4) span, header h1, header h2, header section span');
                if (nameEl && nameEl.innerText && nameEl.innerText.trim() !== username) {
                    res.full_name = nameEl.innerText.trim();
                }

                // 3. Stat counts from header list items
                const lis = Array.from(document.querySelectorAll('header section ul li, header ul li'));
                for (const li of lis) {
                    const text = (li.innerText || '').trim();
                    const numMatch = text.replace(/,/g, '').match(/([0-9.]+[kKmM]?)/);
                    if (numMatch) {
                        const rawNum = numMatch[1].toUpperCase();
                        let count = parseFloat(rawNum);
                        if (rawNum.endsWith('K')) count *= 1000;
                        if (rawNum.endsWith('M')) count *= 1000000;
                        count = Math.round(count);

                        if (/post/i.test(text)) res.media_count = count;
                        else if (/follower/i.test(text)) res.follower_count = count;
                        else if (/following/i.test(text)) res.following_count = count;
                    }
                }

                // 4. Fallback to meta tags if counts/image missing
                const metaDesc = document.querySelector('meta[name="description"], meta[property="og:description"]');
                if (metaDesc && metaDesc.content) {
                    const m = metaDesc.content.match(/([0-9,]+)\\s+Followers?,\\s+([0-9,]+)\\s+Following,\\s+([0-9,]+)\\s+Posts?/i);
                    if (m) {
                        if (res.follower_count == null) res.follower_count = parseInt(m[1].replace(/,/g, ''), 10);
                        if (res.following_count == null) res.following_count = parseInt(m[2].replace(/,/g, ''), 10);
                        if (res.media_count == null) res.media_count = parseInt(m[3].replace(/,/g, ''), 10);
                    }
                }
                const metaImg = document.querySelector('meta[property="og:image"]');
                if (!res.profile_pic_url && metaImg && metaImg.content) {
                    res.profile_pic_url = metaImg.content;
                }
                const metaTitle = document.querySelector('meta[property="og:title"]');
                if (metaTitle && metaTitle.content) {
                    const tm = metaTitle.content.match(/^(.*?)\\s*\\(@[a-zA-Z0-9._]+\\)/);
                    if (tm && tm[1]) res.full_name = tm[1].trim();
                }

                return res;
            }
        """)
        if data and isinstance(data, dict):
            profile.update({k: v for k, v in data.items() if v is not None})
            logger.info("Extracted profile data for @%s: %s", username, profile)
    except Exception as e:
        logger.warning("Could not extract profile data from browser for @%s: %s", username, e)

    return profile


def run_browser_login(timeout_ms: int = LOGIN_TIMEOUT_MS) -> dict:
    """
    Synchronous wrapper for browser_login.
    Call this from a sync context (e.g., FastAPI background thread).
    """
    return asyncio.run(browser_login(timeout_ms))
