# MemWault Design System & Aesthetic Principles
> *Incorporating Claude Frontend Design & UI/UX Pro Max Guidelines*

---

## 1. Core Design Philosophy: Beyond Generic AI Aesthetics

MemWault avoids generic, flat AI design tropes (cookie-cutter purple gradients, default system fonts, flat borderless cards) in favor of **tangible materiality, architectural hierarchy, and contextual richness**.

Our visual language is rooted in the metaphor of an **Archival Memory Vault** — balancing physical permanence (skeuomorphism, fine paper grain, warm brass) with fluid, modern digital craftsmanship (glass blurs, spring physics, high-contrast typography).

---

## 2. The 4-Permutation Design Matrix

MemWault supports 4 distinct, fully-realized aesthetic environments toggleable independently via **Settings**:

| Permutation | Atmosphere | Palette Tokens | Textures & Surfaces |
| :--- | :--- | :--- | :--- |
| **Skeuomorphic + Dark** *(The Vault)* | Deep archival safe, physical brass hardware, velvet darkroom. | `#181818` (Vault), `#2C2C2C` (Raised), `#E6E2D9` (Parchment ink), `#88744A` (Brass) | 4-octave procedural SVG metal grain overlay (`mix-blend-mode: overlay`), multi-layer debossed & raised shadows. |
| **Skeuomorphic + Light** *(Archival Desk)* | Fine parchment, museum archive catalog, tactile paper. | `#E6E2D9` (Desk paper), `#F3EFE6` (Cards), `#181818` (Ink), `#88744A` (Brass) | Organic fiber paper grain overlay (`mix-blend-mode: multiply`), soft warm ambient shadows, letterpress borders. |
| **Modern + Dark** *(OLED Glass)* | Ultra-clean minimalist dark room, crisp glassmorphic panels. | `#000000` (Pitch canvas), `#1C1C1E` (OLED Card), `#FFFFFF` (Primary Text), `#007AFF` (iOS Blue) | Translucent frosted glass (`backdrop-filter: blur(20px)`), razor-thin 1px borders, subtle neon glow accents. |
| **Modern + Light** *(Clean Studio)* | Bright, airy Scandinavian design, high-contrast studio canvas. | `#F2F2F7` (Off-white), `#FFFFFF` (Solid Card), `#000000` (Primary Text), `#007AFF` (iOS Blue) | Clean elevated drop shadows, subtle border delineations, high WCAG contrast. |

---

## 3. Typography Hierarchy

We use intentional font pairing to balance functional speed with editorial elegance:

- **Editorial Headers & Archival Titles**: `Cinzel`, `Newsreader`, `Playfair Display`
  - Used for vault titles, journal memory dates, and high-impact hero headings.
- **Functional Interface & Data**: `Inter`, `-apple-system`, `SF Pro Text`
  - Used for buttons, navigation items, metrics, and micro-labels.
- **Technical Metadata & Code**: `ui-monospace`, `SFMono-Regular`, `Consolas`
  - Used for EXIF data, file sizes, resolutions, and raw coordinates.

---

## 4. UI/UX Pro Max Standards Applied

### A. Surface & Contrast Integrity (Zero Bleed / Zero Invisibility)
- Every component strictly references CSS semantic variables:
  - `var(--ios-bg-app)` for root canvas.
  - `var(--ios-bg-card)` for container cards and modals.
  - `var(--ios-text-primary)` and `var(--ios-text-secondary)` for text.
  - `var(--ios-border)` for structural dividing lines.
  - `var(--ios-accent)` and `var(--ios-accent-hover)` for interactive actions.
- Hardcoded solid hex colors (`#fff`, `#000`) are forbidden on general text and surfaces, preventing inverted light/dark mode contrast bugs.

### B. Motion & Spring Physics
- **Fast Spring**: `0.3s cubic-bezier(0.25, 1, 0.5, 1)` for button taps, dropdowns, and hover states.
- **Bouncy Spring**: `0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)` for card lifts and modal entrances.
- Smooth layout animations via Framer Motion without layout thrashing.

### C. Bento Grid & Spatial Rhythm
- Asymmetrical card heights and varied bento layouts (e.g. 1:1 square, 4:5 portrait, dual-column metadata inspect pane).
- Generous internal padding (24px cards, 16px badges) with consistent 8px/12px border radii.
