# Tactile Memory Artifacts & Scrapbook Studio — Architectural Plan

This document records the user-requested product vision, architectural specifications, and interaction designs for transforming MemWault's digital archives into physical-metaphor tactile artifacts.

---

## 1. Core Vision & Philosophy

MemWault is a distraction-free sanctuary for personal reflection. Beyond browsing linear grids and playing back videos, users can transform their preserved memories (Stories, Carousels, Posts) into tangible, physical-format artifacts that can be customized, annotated, scribbled on, and experienced as real-world objects.

---

## 2. Feature Specifications

### 🎞️ A. Photo Booth Strip Generator (From Carousels & Stories)
- **Concept**: Converts a multi-photo Instagram Carousel or 3–5 selected story photos into a classic vertical film/photo booth strip.
- **Visual Styles**:
  - Classic Matte White, Glossy Photopaper Black, Vintage Sepia, and Retro Neon.
  - Authentic photo strip border spacing with punch holes, vintage bar code or film stock numbering (KODAK 400 - 024).
- **Customizable Metadata Margins**:
  - Timestamp (e.g., AUG 22, 2026 · 10:47 PM).
  - Geolocation Venue stamp.
  - Tagged friends and mentions (@username).
  - Custom user captions.
- **Companion Stylus & Touch Annotations**:
  - Pair a mobile phone or tablet via the local Wi-Fi QR Portal / Pocket PC companion.
  - The phone/tablet screen acts as a real-time wireless drawing tablet / touch stylus.
  - Draw freehand doodles, hearts, stamps, and handwritten text directly onto the desktop's photo strip canvas.
- **Export & Storage**:
  - Lossless 300 DPI PNG/PDF export for physical printing.
  - Save as a new composite memory object in the database.

---

### 📸 B. Polaroid Studio & Handwritten Chin
- **Concept**: Transform any memory snapshot or video freeze-frame into an authentic Polaroid with a thick bottom margin ( the chin).
- **Writing & Scribbling**:
  - **Typewriter Mode**: Authentic vintage monospaced mechanical typewriter text.
  - **Freehand Scribble Mode**: Draw directly onto the chin using a stylus/touch/mouse with realistic ink opacity and pen pressure.
  - **Auto-Metadata Stamp**: Date, time, location, temperature, and filter details rendered as subtle stamp ink.
- **Interactive 3D Flip**:
  - Click to flip the Polaroid over with 3D perspective (otateY(180deg)).
  - The reverse side reveals the cardboard texture with the memory's Markdown journal note, EXIF camera details, and original audio soundtrack info.

---

### 🪵 C. The Scatter Table (Tactile Memory Surface)
- **Concept**: A full-screen physical desktop surface (dark walnut wood, marble desk, or darkroom cutting mat) where memories are physically scattered freely rather than arranged in rigid grids.
- **Physics & Interactions**:
  - **Natural Scattering**: Polaroids, photostrips, ticket stubs, and stickers appear with subtle randomized angles (-12° to +15°) and drop shadows.
  - **Drag, Toss & Inertia**: Pick up photos, fling them across the table with inertia physics (Framer Motion / Canvas drag physics).
  - **Stacking & Piles**: Drag related photos onto each other to form organized piles that can be clicked to fan out smoothly.
  - **Zoom & Inspect**: Double-click any item to lift it up to eye level, inspect full resolution, and trigger its soundtrack audio.

---

### 📖 D. Skeuomorphic Flip-Book Scrapbook (Notebook Journal)
- **Concept**: An interactive hardcover memory book with rich leather, linen, or cloth textures, offering a skeuomorphic diary experience in addition to the standard notes view.
- **Page-Turn Physics**:
  - Realistic 2D/3D page curls and flips with realistic paper sounds (page_turn.wav).
  - Book opening animation (unlatching buckle) and closing animation.
- **Multi-Media Scrapbook Pages**:
  - Embedded photos with washi tape graphics, paper clips, and sticker stamps.
  - Embedded looping video players right inside the scrapbook pages.
  - Rich Markdown journaling formatted cleanly around media.
- **Data Sovereignty**:
  - Every page maps to a standard human-readable .md Markdown file and standard .jpg/.mp4 files on the local filesystem.

---

## 3. Technical Architecture & Tech Stack

1. **Drawing & Canvas Layer**: HTML5 Canvas API + Konva.js / SVG overlay for lossless drawing path synchronization and 300 DPI image compositing.
2. **WebSockets / Local WebRTC**: Instant sub-10ms touch event transmission between mobile tablet stylus and desktop viewer.
3. **Turn.js / StPageFlip (or Framer Motion 3D)**: Realistic page curling and flipping physics with custom CSS mesh gradients for light reflection.
4. **Local File Persistence**: Output artifacts saved in data/artifacts/ or data/media/polaroids/ with metadata records in SQLite.
