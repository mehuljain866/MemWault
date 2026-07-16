
### 2026-07-08 18:03:12
- **Feature added**: Instagram Session Controls in Settings (Renew Login, Log Out).
- **Feature added**: Highlights Tab (iPad-style Album Grid UI) with bottom-pinned Sidebar placement.
- **Backend updated**: Alembic database migration to support `highlight_id` and `highlight_title`.
- **Bug fix applied**: Updated `instagrapi` engine to v2.18.3 to fix the missing thumbnails issue caused by recent Instagram API changes.

### 2026-07-13 18:30:00
- **Feature completed (Phase 2)**: Highlights Viewer UI built with a gallery timeline scrubber and integrated `StoryPlayer`.
- **Backend Architecture**: `Highlight` and `HighlightStoryLink` models added to database, with `sync_highlights` Celery task logic implemented.
- **Refactor**: Completely purged the global "ribbon pill" Header to allow native, integrated headers for each view.
- **Issue Tracked**: `instagrapi` is failing with a `LoginRequired` exception (403 Forbidden) on the `user_highlights` endpoint. Investigating the safest non-triggering workaround (possibly `Instaloader` or manual GraphQL fallback).
- **Planning**: Phase 3 (Bulk Actions & Mass-Selection) Implementation Plan was drafted and awaits user approval.
