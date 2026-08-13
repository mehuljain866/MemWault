# Removed Features & Design Decisions

This document tracks features, UI elements, architectural choices, and functionality that have been removed or deliberately avoided in MemWault based on user feedback, account safety priorities, or design evolution.

---

## 🎨 UI & Frontend Removals

### 1. Timeline Date Filters (Removed: 2026-07-07)
- **What it was**: Native HTML date inputs (`<input type="date">`) for "From" and "To" filtering on the Timeline page.
- **Why it was removed**: The native browser date inputs displayed an unstyled placeholder ("mm/dd/yyyy") that cluttered the clean header bar and broke the glassmorphic aesthetic.
- **Where it was**: `frontend/src/pages/Timeline.jsx`

### 2. Music Icon Overlay on Story Player (Removed: 2026-07-07)
- **What it was**: A visual widget (`<MusicSticker>`) that overlaid album art and song details directly on top of story media in the Story Player.
- **Why it was removed**: Redundant because of the dedicated "Music" tab in the Story Detail view. More importantly, overlaying visual widgets over original story media compromised the authenticity of the archived memory.
- **Where it was**: `frontend/src/components/StoryPlayer.jsx`

### 3. Static Segmented Controls & Hardcoded Toggles (Removed: 2026-08-13)
- **What it was**: Static CSS button tabs for Zoom (`Years`/`Months`/`Days`), Media Types (`All`/`Photos`/`Videos`), Story Detail Tabs (`Info`/`Journal`/`Music`/`Viewers`/`Data`), Highlight Creator Tabs (`Memories`/`Reels`), and Settings Toggles (`Appearance`/`Map Style`).
- **Why it was removed**: Static buttons produced abrupt visual shifts during tab switches.
- **Replacement**: Upgraded all segmented tab controls to Framer Motion `<motion.span layoutId="..." />` sliding liquid spring indicators.

### 4. Full-Size Unconstrained README Screenshots (Removed: 2026-08-13)
- **What it was**: Raw, full-width screenshot images embedded sequentially in `README.md`.
- **Why it was removed**: Created an unstructured, unreadable GitHub landing page.
- **Replacement**: Replaced with clean 2x2 responsive Markdown/HTML tables showcasing real authenticated UI screenshots.

---

## 🛡️ Architecture & Security Removals

### 5. Automated Individual Viewer-List Scraping (Avoided/Removed: 2026-08-12)
- **What it was**: Attempting to fetch individual user profile lists for active Instagram stories via private endpoints.
- **Why it was removed/avoided**: Hitting Instagram's individual story viewer endpoints triggers anti-bot telemetry, leading to account locks or shadowbans. Furthermore, Instagram permanently deletes viewer lists after 48 hours.
- **Replacement**: Transitioned to **Archived Engagement Metrics** (`viewer_count` and `like_count`), maintaining the legacy `StoryViewer` DB schema/endpoints for reading historical archives only.

### 6. Direct `subprocess.Popen` Background Launches for Windows Explorer (Removed: 2026-08-13)
- **What it was**: Invoking `explorer.exe` or Chromium directly via raw python `subprocess.Popen("explorer.exe ...")`.
- **Why it was removed**: When backend server tasks run in background processes under Uvicorn/PowerShell, direct subprocess execution inherited non-interactive window stations, preventing Explorer windows and Playwright Chromium from popping up in the interactive desktop session.
- **Replacement**: Switched to `cmd.exe /c start "" explorer.exe ...` and Win32 `SetForegroundWindow` calls to guarantee interactive foreground window creation.

### 7. Filenames with Spaces in `screenshots/` (Removed: 2026-08-13)
- **What it was**: Image filenames containing unencoded spaces (e.g. `Spatial Map (Split Grid View).png`, `The dashboard home screen.jpg`).
- **Why it was removed**: GitHub Markdown parser and CDN (`camo.githubusercontent.com`) fail to resolve unencoded spaces in image `src` URLs, causing `404 Not Found` broken image icons on mobile and desktop browsers.
- **Replacement**: Standardized all screenshot asset filenames to clean, URL-safe `snake_case` (e.g., `map_split_grid.png`, `dashboard_home.jpg`).

### 8. OSI Open-Source Logo on PolyForm Noncommercial Badge (Removed: 2026-08-13)
- **What it was**: Displaying the Open Source Initiative (`logo=open-source-initiative`) icon next to the PolyForm Noncommercial License badge.
- **Why it was removed**: PolyForm Noncommercial is a standardized noncommercial license, not an OSI-approved open-source license. Displaying the OSI logo created misleading licensing messaging.
- **Replacement**: Used a clean, neutral PolyForm Noncommercial badge.
