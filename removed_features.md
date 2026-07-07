# Removed Features

This document tracks features, UI elements, and functionality that have been removed from MemWault based on user feedback or design evolution. Keeping track of these helps maintain a record of design decisions and ensures we don't accidentally re-add things we specifically decided against.

## UI / Frontend Removals

### 1. Timeline Date Filters (Removed: 2026-07-07)
- **What it was**: HTML native date inputs (`<input type="date">`) for "From" and "To" on the Timeline page.
- **Why it was removed**: The native date inputs displayed an annoying "mm/dd/yyyy" placeholder (the "ADDYY MM thingy") that cluttered the interface and did not fit the aesthetic.
- **Where it was**: `frontend/src/pages/Timeline.jsx`

### 2. Music Icon Overlay on Story Player (Removed: 2026-07-07)
- **What it was**: A visual widget (`<MusicSticker>`) that overlaid album art and song details directly on top of the story media in the Story Player.
- **Why it was removed**: It was redundant since there is already a dedicated "Music" tab on the side of the Story Detail view. More importantly, overlaying our own UI elements over the story broke the authenticity and raw feel of the original story media.
- **Where it was**: `frontend/src/components/StoryPlayer.jsx`
