Version:1.0StartHTML:00000097EndHTML:00053149StartFragment:00000153EndFragment:00053116

Yes — the important thing here is **not to recreate this Instagram profile screen literally**. What you want is the **visual language of late-90s/early-2000s desktop software, pixel-art interfaces, and early-web applications**, but applied to a modern app.

The image is essentially a **“retro computer operating system skin over a social/media application.”** The magic comes from the _system_, not from individual pixel icons.
Retro Windows / Pixel-Software UI Design System
===============================================

* * *

1. The Core Design Philosophy
   =============================

The style should feel like:

> **“A piece of software from 1998 that somehow has access to a modern database.”**

Not:

> “A modern app with pixel fonts.”

That's the distinction that will make or break the design.

The reference combines approximately five visual languages:

### ① Windows 95/98

* beveled controls
* grey system surfaces
* blue title bars
* hard 1px borders
* raised buttons
* inset panels
* tiny system icons
* dropdown arrows
* menu bars

### ② Early Web

* information-dense layouts
* hyperlinks
* tiny text
* rigid grids
* almost no whitespace
* tables
* counters
* rectangular controls

### ③ Pixel Art

* deliberately low-resolution icons
* hard edges
* 1-bit/limited-color artwork
* dithering
* chunky imagery

### ④ Early Digital Cameras / Multimedia Software

* bitmap thumbnails
* crude image previews
* metadata
* technical labels
* file-oriented terminology

### ⑤ Modern Social Media

* profiles
* posts
* followers
* media grids
* maps
* likes
* collections
* music

Your app should essentially be:

**Modern information architecture + vintage rendering language.**

* * *

2. The Most Important Rule
   ==========================

Don't make everything pixelated.

That usually produces:

> “Pixel-art website.”

Instead, make the **interface chrome** retro.

Your actual photographs/videos/memories should remain relatively high quality.

Think:
    ┌─────────────────────────────────────────┐
    │  TITLE BAR / SYSTEM CHROME              │
    ├─────────────────────────────────────────┤
    │  MENU                                   │
    ├─────────────────────────────────────────┤
    │                                         │
    │  MODERN CONTENT                         │
    │                                         │
    │  photos / videos / memories             │
    │                                         │
    ├─────────────────────────────────────────┤
    │  RETRO NAVIGATION                       │
    └─────────────────────────────────────────┘

That contrast is what makes it interesting.

* * *

3. The DOM Architecture
   =======================

I'd build the UI as a **design-system hierarchy**, rather than styling individual screens independently.

Something like:
    <App>
      <DesktopWindow>
        <TitleBar>
          <ApplicationIcon />
          <WindowTitle />
          <WindowControls />
        </TitleBar>

        <MenuBar>
          <MenuItem />
          <MenuItem />
          <MenuItem />
        </MenuBar>

        <ApplicationViewport>

          <PageHeader>
            <Avatar />
            <Identity />
            <Statistics />
            <PrimaryActions />
          </PageHeader>

          <Divider />

          <Toolbar>
            <ViewToggle />
            <ListView />
            <MapView />
            <ArchiveView />
          </Toolbar>

          <ContentArea>
            <Gallery />
          </ContentArea>

        </ApplicationViewport>

        <StatusBar />

      </DesktopWindow>
    </App>

The important part is that **everything becomes a piece of software UI**.

* * *

4. Window System
   ================

This is probably the single most important component.

Every major page should feel like a **window/application**, not a webpage.
Window anatomy
--------------

    ┌─────────────────────────────────────────────┐
    │ [ICON] MyApplication.exe       ─ □ X       │
    ├─────────────────────────────────────────────┤
    │ File   Edit   View   Options   Help         │
    ├─────────────────────────────────────────────┤
    │                                             │
    │              APPLICATION                   │
    │                                             │
    ├─────────────────────────────────────────────┤
    │ Ready                           124 items   │
    └─────────────────────────────────────────────┘

### Components

* `Window`
* `TitleBar`
* `WindowIcon`
* `WindowTitle`
* `MinimizeButton`
* `MaximizeButton`
* `CloseButton`
* `MenuBar`
* `MenuItem`
* `Viewport`
* `StatusBar`

* * *

5. Title Bar
   ============

Use an extremely simple treatment.

### Base

    background: #000080;
    color: white;

Classic navy:

**#000080**

But don't make every window navy.

You can create application-specific title bars:

| Application  | Title             |
| ------------ | ----------------- |
| Archive      | `Archive.exe`     |
| Memories     | `Memories.exe`    |
| Music        | `Music.exe`       |
| Camera       | `Camera.exe`      |
| Map          | `Map.exe`         |
| Story viewer | `StoryViewer.exe` |

This is a **really good opportunity for your app** because it turns different sections into pseudo-applications.

* * *

6. Window Buttons
   =================

Don't use normal modern SVG buttons.

The buttons should look like **physical UI controls**.
    ┌───────┐
    │   _   │
    └───────┘

or:
    ┌───────┐
    │  □    │
    └───────┘

Use:

* 1px dark border
* 1px white highlight
* grey fill
* hard edges
* no border radius

### Button construction

    background: #c0c0c0;
    
    border-top: 2px solid #ffffff;
    border-left: 2px solid #ffffff;
    border-right: 2px solid #404040;
    border-bottom: 2px solid #404040;

Pressed:
    border-top: 2px solid #404040;
    border-left: 2px solid #404040;
    border-right: 2px solid #ffffff;
    border-bottom: 2px solid #ffffff;

That tiny inversion creates the illusion that the button physically moves.

* * *

7. Absolutely NO Border Radius
   ==============================

This is critical.

Avoid:
    border-radius: 12px;

Avoid:
    border-radius: 999px;

Avoid modern floating cards.

Instead:
    border-radius: 0;

or occasionally **1–2px** if you deliberately want slightly modernized edges.

The original visual language is fundamentally **rectilinear**.

* * *

8. Surface System
   =================

You need multiple greys.

Don't use one generic grey everywhere.

I'd define:
    --system-white: #ffffff;
    --system-light: #dfdfdf;
    --system-surface: #c0c0c0;
    --system-mid: #808080;
    --system-dark: #404040;
    --system-black: #000000;

    --system-blue: #000080;

Then:

### Raised

    white
    ↓
    surface
    ↓
    dark

### Inset

    dark
    ↓
    surface
    ↓
    white

This gives you depth **without shadows**.

* * *

9. Shadows
   ==========

Don't use modern shadows like:
    box-shadow:
      0 10px 30px rgba(...);

Instead, use **structural shadows**.

For example:
    ████████████
    █ surface  █▓
    █          █▓
    ████████████▓
     ▓▓▓▓▓▓▓▓▓▓▓

Hard 1–2px edges.

This makes the interface look physically manufactured.

* * *

10. Typography
    ==============

This is another huge component.

You want **bitmap/system typography**, but I would actually use **two or three font categories**.
UI font
-------

Use something inspired by:

* MS Sans Serif
* Tahoma
* Microsoft Sans Serif
* System UI bitmap fonts

Good modern substitutes include:

* **MS Sans Serif**
* **Tahoma**
* **Pixelated UI fonts**
* **W95FA**
* **Departure Mono**
* **Tiny5**
* **Silkscreen**

But don't use a pixel font everywhere.

* * *

11. Recommended Typography Hierarchy
    ====================================

### System UI

Use:

**Tahoma / MS Sans Serif-style**

For:

* buttons
* menus
* labels
* metadata
* navigation

### Pixel display

Use something like:

**Silkscreen / Tiny5 / VT323**

For:

* timestamps
* technical data
* counters
* system messages
* file names
* status indicators

### Editorial / Memory content

Potentially use a more readable modern font.

This creates:
    SYSTEM UI
        ↓
    RETRO

    CONTENT
        ↓
    HUMAN

Which is extremely important for a memory/archive application.

* * *

12. Font Sizes
    ==============

Don't make everything tiny.

Use approximately:

| Element        | Size    |
| -------------- | ------- |
| Title bar      | 14–16px |
| Menu           | 14px    |
| Body           | 13–15px |
| Metadata       | 11–12px |
| System text    | 10–12px |
| Tiny labels    | 9–10px  |
| Large counters | 24–32px |
| Hero title     | 24–40px |

The reference gets its character from **density**, not simply small text.

* * *

13. Pixel Rendering
    ===================

For actual pixel assets:
    image-rendering: pixelated;
    image-rendering: crisp-edges;

And avoid anti-aliasing when rendering bitmap icons.

You want:
    ████
    ████
      ██
      ██

not:
    ▒▓██▓▒

* * *

14. Iconography
    ===============

This is where you should be extremely deliberate.

Don't mix:

* Material Icons
* Font Awesome
* Lucide
* random emoji
* modern SVG icons

all together.

That instantly destroys the visual language.

Instead, establish an **icon family**.
Recommended sources
-------------------

### 1. 98.css

This is one of the best references for Windows 98-style controls.

It gives you the conceptual language for:

* buttons
* checkboxes
* menus
* windows
* fields
* tabs
* typography

Even if you don't use the library directly, study its implementation.

* * *

### 2. Win95 Icons

Look for Windows 95/98 icon collections and pixel-art icon packs.

Good search terms:
    Windows 95 icons pixel art
    Windows 98 icons bitmap
    Win95 icon pack
    retro computer icon sprite sheet
    pixel UI icon pack

* * *

### 3. Iconoir / Lucide — only as source material

Modern icon libraries can still be useful for **finding the semantic icon you need**, but I would redraw or pixelate them rather than dropping the SVG directly into the UI.

* * *

15. Icon Size
    =============

Use a strict icon grid.

Primarily:
    8 × 8
    16 × 16
    20 × 20
    24 × 24
    32 × 32

The **16×16 grid** should probably become your default.

For example:
    16 × 16 floppy
    16 × 16 folder
    16 × 16 camera
    16 × 16 map
    16 × 16 heart
    16 × 16 music
    16 × 16 user
    16 × 16 archive

* * *

16. Asset Libraries
    ===================

For actual pixel assets, I'd investigate:

### OpenGameArt

Excellent for:

* pixel sprites
* UI assets
* textures
* icons
* decorative elements

### Kenney

Very useful for structured game/UI assets.

### itch.io asset packs

Search for:
    pixel UI
    retro UI
    computer UI
    Windows UI
    90s UI
    DOS UI

### Internet Archive

Potentially useful for **historical references**, screenshots, software manuals and vintage interface research.

Be careful with licensing when actually shipping assets.

* * *

17. Textures
    ============

This style should have **very subtle texture**.

Not:

> grunge website

but:

> CRT-era computer software.

Use:

### 1. Dithering

For example:
    ░░░░░░░░
    ░░▒░░▒░░
    ░░░░░░░░
    ░▒░░▒░░░

### 2. Noise

Very subtle 1–2% monochrome noise.

### 3. Scanlines

Only in specific places.
    ────────────────
    ────────────────
    ────────────────

Don't put scanlines over the entire UI. It becomes gimmicky.

### 4. Halftone

Great for:

* empty states
* thumbnails
* backgrounds
* decorative illustrations

* * *

18. Dithering Is Particularly Important
    =======================================

The reference image uses the aesthetic of limited-color rendering.

You can recreate this with:

* ordered dithering
* Bayer matrices
* Floyd–Steinberg
* 1-bit thresholding
* 4-color palettes

For images that need to become retro:
    Original photograph
            ↓
    contrast reduction
            ↓
    palette reduction
            ↓
    dithering
            ↓
    pixel scaling
            ↓
    retro thumbnail

But **do not destroy the original image**.

Store:
    original.jpg
    retro-preview.webp

That distinction would fit your archival application perfectly.

* * *

19. Color Philosophy
    ====================

The reference isn't actually monochrome.

It uses:

### System palette

    #000000  black
    #FFFFFF  white
    #C0C0C0  system grey
    #808080  mid grey
    #404040  dark grey
    #000080  navy

Then introduces **small high-saturation accent colors**.

Examples:
    teal
    lime
    cyan
    yellow
    magenta
    red
    blue

Your palette should therefore be:

**80% neutral system colors**

**15% image/content colors**

**5% accent colors**

* * *

20. Suggested Application Palette
    =================================

I'd make the base:
    --bg: #c0c0c0;
    --surface: #dfdfdf;
    --surface-light: #ffffff;
    --surface-dark: #808080;
    --border-dark: #404040;
    --black: #000000;

    --titlebar: #000080;
    --selection: #000080;

    --teal: #30b0a0;
    --lime: #70b020;
    --yellow: #f0d020;
    --red: #c03030;
    --cyan: #20a0c0;

Notice that these aren't perfectly modern "design-system" colors.

That's intentional.

* * *

21. Accent Color Should Behave Like Software State
    ==================================================

Don't use accent colors just because they look pretty.

Use them semantically.

### Blue

Selected item

### Green

Saved / archived

### Yellow

Warning / attention

### Red

Delete / destructive

### Teal

Media / creative

### Purple

Experimental / special

This makes the UI feel like an actual operating system.

* * *

22. Navigation
    ==============

The reference has an extremely interesting navigation model.

Instead of:
    Home
    Search
    Create
    Notifications
    Profile

you could create:
    ┌────┬────┬────┬────┬────┐
    │ 🏠 │ 🔍 │ 📷 │ ♥  │ 👤 │
    └────┴────┴────┴────┴────┘

But render those as **software toolbar buttons**.

For your archival application:
    [ HOME ] [ ARCHIVE ] [ CAMERA ] [ MAP ] [ MUSIC ]

or icon-only at smaller sizes.

* * *

23. Tabs
    ========

Tabs should look like **physical folder tabs**.

Not:
    Home    Archive    Memories
    ────────

Instead:
    ┌──────────┐
    │ Memories │
    └──────────┴─────────────────

Selected:
    ┌──────────┐
    │ MEMORIES │
    └──────────┐
               │
    ───────────┘

The selected tab should visually connect to the content surface.

* * *

24. Toolbars
    ============

Toolbars are extremely important to this aesthetic.

Use:
    ┌────┬────┬────┬────┬──────┬──────┐
    │ 💾 │ 📂 │ 🔍 │ 🗺 │ SORT │ VIEW │
    └────┴────┴────┴────┴──────┴──────┘

Each button is:

* rectangular
* bevelled
* compact
* icon + optional label
* no floating card
* no rounded corners

* * *

25. Dropdowns
    =============

Dropdowns should look like old OS controls.
    ┌─────────────────────────┬───┐
    │ Sort by Date             │ ▼ │
    └─────────────────────────┴───┘

Not:
    Sort by Date       ˅

with a modern floating popover.

* * *

26. Checkboxes
    ==============

Classic square checkbox:
    ┌───┐
    │ ✓ │
    └───┘

Never:
    ──────●

That's modern mobile UI.

* * *

27. Toggles
    ===========

For this design language, I'd actually **avoid modern switches**.

Instead:
    AUTOPLAY

    [ X ] Enabled

or:
    Autoplay: [ON ▼]

This makes the app feel like software rather than a phone settings page.

* * *

28. Cards
    =========

This is a major difference.

**Don't use modern cards everywhere.**

Instead of:
    ╭──────────────────╮
    │ PHOTO            │
    │                  │
    │ caption          │
    ╰──────────────────╯

use:
    ┌──────────────────┐
    │ PHOTO            │
    │                  │
    │                  │
    ├──────────────────┤
    │ IMG_0321.JPG     │
    │ 14 AUG 1998      │
    └──────────────────┘

Think **file manager**, not Pinterest.

* * *

29. Image Grid
    ==============

The reference's grid is excellent.

Use:
    ┌────────┬────────┬────────┐
    │        │        │        │
    │ IMAGE  │ IMAGE  │ IMAGE  │
    │        │        │        │
    ├────────┼────────┼────────┤
    │ IMAGE  │ IMAGE  │ IMAGE  │
    │        │        │        │
    └────────┴────────┴────────┘

Critically:

**No gaps or extremely tiny gaps.**

The grid itself becomes the visual structure.

* * *

30. Image Metadata
    ==================

This is where your archival concept can become really good.

Instead of only:

> 12 Aug 2025

show:
    IMG_8291.JPG
    12 AUG 2025
    18:43:21
    S24 FE
    4032 × 3024
    3.2 MB

Or:
    STORY_042
    INSTAGRAM
    12 AUG 2025
    MUSIC: ...

It makes memories feel like **archived digital artifacts**.

* * *

31. File Naming
    ===============

Lean into the filesystem aesthetic.

Examples:
    IMG_20240817_184201.JPG
    VID_20240817_190201.MP4
    STORY_0042.MEM
    MEM_000183
    CAMERA_001
    ARCHIVE_2025

This is especially powerful for your `.mem` concept.

The UI can make `.mem` feel like a genuine archival file format.

* * *

32. Status Bars
    ===============

You should use these **a lot**.

Bottom:
    ┌──────────────────────────────────────────┐
    │ 124 ITEMS     3.4 GB      READY          │
    └──────────────────────────────────────────┘

Or:
    [ARCHIVE]
    12,492 FILES
    98.3 GB
    SYNCED

This makes the application feel alive.

* * *

33. Scrollbars
    ==============

Do NOT use:
    thin modern scrollbar

Use:
    ┌──┐
    │ ▲│
    ├──┤
    │██│
    │██│
    │  │
    ├──┤
    │ ▼│
    └──┘

The scrollbar itself becomes part of the interface.

You can even make it intentionally oversized.

* * *

34. Modals
    ==========

A modal should look like another **window**.
    ┌──────────────────────────────────┐
    │ Confirm Delete             ─ □ X │
    ├──────────────────────────────────┤
    │                                  │
    │ Are you sure you want to delete  │
    │ this memory?                     │
    │                                  │
    │          [ YES ] [ CANCEL ]      │
    │                                  │
    └──────────────────────────────────┘

No blurred background.

No giant rounded modal.

No floating glass.

* * *

35. Context Menus
    =================

This style is perfect for right-click interactions.
    ┌─────────────────────┐
    │ Open                │
    │ Edit                │
    │ Duplicate           │
    ├─────────────────────┤
    │ Move to Archive     │
    │ Export .MEM         │
    ├─────────────────────┤
    │ Delete              │
    └─────────────────────┘

This would be **fantastic** for your memory system.

* * *

36. File Explorer Metaphor
    ==========================

I'd strongly recommend making your archive behave partly like a filesystem.

Example:
    ARCHIVE.EXE

    C:\MEMORIES\2025\AUGUST\

    📁 Trips
    📁 School
    📁 Friends
    📁 Stories
    📁 Camera
    📁 Screenshots

    124 files

But don't literally turn the whole app into a file manager.

Use the metaphor selectively.

* * *

37. Profile Pages
    =================

Your reference has the right basic structure.

I'd redesign it as:
    ┌───────────────────────────────────────────┐
    │ PROFILE.EXE                         ─ □ X │
    ├───────────────────────────────────────────┤
    │ File Edit View Options Help               │
    ├───────────────────────────────────────────┤
    │                                           │
    │  [AVATAR]    MEHUL                        │
    │              DIGITAL ARCHIVE              │
    │                                           │
    │  1,248 memories   382 albums   42GB       │
    │                                           │
    │  [ OPEN ARCHIVE ] [ MAP ] [ TIMELINE ]    │
    │                                           │
    ├───────────────────────────────────────────┤
    │ [GRID] [LIST] [MAP] [TIMELINE]            │
    ├───────────────────────────────────────────┤
    │                                           │
    │                CONTENT                    │
    │                                           │
    └───────────────────────────────────────────┘

* * *

38. The "Operating System" Concept
    ==================================

This is where I'd push your design further.

Instead of making your application look like:

> Instagram clone + pixel styling

make it feel like:

> **A fictional operating system for memories.**

For example:
    MEMOS 98

    DESKTOP

    ┌─────────┐
    │ 📁      │
    │ Archive │
    └─────────┘

    ┌─────────┐
    │ 📷      │
    │ Camera  │
    └─────────┘

    ┌─────────┐
    │ 🎵      │
    │ Music   │
    └─────────┘

    ┌─────────┐
    │ 🗺      │
    │ Places  │
    └─────────┘

That is much more distinctive.

* * *

39. Desktop Mode
    ================

You could even have an optional desktop.
    ┌─────────────────────────────────────────┐
    │                                         │
    │      📁              📷                 │
    │    ARCHIVE          CAMERA              │
    │                                         │
    │                                         │
    │              🎵                         │
    │             MUSIC                       │
    │                                         │
    │                                         │
    ├─────────────────────────────────────────┤
    │ START   │                     23:48      │
    └─────────────────────────────────────────┘

Clicking an icon opens an actual window.

This would be **insanely on-brand**.

* * *

40. CRT / Screen Treatment
    ==========================

Use this sparingly.

Possible global treatment:
    subtle pixel grid
    +
    tiny chromatic aberration
    +
    1% noise

But make it optional.

For example:

**Settings → Display → CRT Mode**
    CRT MODE: [X]
    SCANLINES: [ ]
    PIXEL GRID: [X]
    COLOR BLEED: [ ]

Now the aesthetic itself becomes configurable.

* * *

41. Image Treatment
    ===================

Your images should have three modes.

### Original

Normal high-resolution photo.

### Retro

    palette reduced
    dithered
    pixelated

### CRT

    retro
    +
    scanlines
    +
    slight bloom
    +
    color separation

This is far more interesting than applying a single "retro filter."

* * *

42. Motion
    ==========

Avoid modern:

* spring animations
* fluid morphing
* floating cards
* 300ms ease-in-out everything

Use **mechanical movement**.

### Button

    0ms
    raised
    
    50ms
    pressed

### Window

    scale 1 → 1
    clip reveal

### Menu

Instantly appears.

### Tab

Hard state switch.

### Loading

Use:
    [████████░░░░] 72%

rather than a circular spinner.

* * *

43. Progress Bars
    =================

Use old-school progress bars everywhere.
    COPYING FILE...

    ██████████████████░░░░ 78%

Or:
    IMPORTING STORY 24 / 38

    ████████████████████

This fits your archival workflows beautifully.

* * *

44. Loading States
    ==================

Instead of skeleton loaders:
    LOADING...
    PLEASE WAIT...

    [████░░░░░░░░░░░]

Or:
    INITIALIZING ARCHIVE...
    CHECKING MEDIA...
    INDEXING METADATA...

This creates character.

* * *

45. Error Messages
    ==================

Lean into old computer terminology.

Instead of:

> Something went wrong.

Use:
    ARCHIVE.EXE

    ERROR 0x0042

    Unable to decode media.

    [ OK ]

Or:
    WARNING

    The original media file could not be located.

    Expected:
    C:\MEMORIES\2024\IMG_0382.JPG

    [ SEARCH ] [ CANCEL ]

* * *

46. Empty States
    ================

This is a perfect opportunity.

Instead of:

> No memories yet.

Use:
    ARCHIVE EMPTY

    There are currently no files
    in this directory.

    C:\MEMORIES\

    [ IMPORT FILES ]

Potentially add a tiny pixel illustration.

* * *

47. Audio Player
    ================

Given your music integration, this aesthetic works **extremely well**.
    ┌─────────────────────────────────────────────┐
    │ MUSIC.EXE                              ─ □ X│
    ├─────────────────────────────────────────────┤
    │                                             │
    │  ◀  ▌◀  ▶  ▶▌       ♪ SONG TITLE           │
    │                                             │
    │  ████████████████░░░░░░░░░░░               │
    │                                             │
    │  01:23                       03:42          │
    │                                             │
    └─────────────────────────────────────────────┘

And your story player can behave like a little floating media utility.

* * *

48. Important: Audio Interaction
    ================================

Based on the interaction you're building, I'd make the state extremely explicit.

When a story is playing:
    STORY AUDIO
    ● PLAYING

When music widget opens:
    MUSIC.EXE
    [▶ PLAY]

Opening it **doesn't automatically start music**.

Clicking:
    ▶ PLAY

causes:
    STORY AUDIO → PAUSE
    MUSIC → PLAY

Then when music stops:
    MUSIC → STOP
    STORY AUDIO → RESUME

This fits the software metaphor nicely because the app is clearly showing which **audio process** currently owns playback.

* * *

49. Maps
    ========

Don't use a modern Google Maps-looking screen if you want consistency.

Create:
    MAP.EXE

    ┌─────────────────────────────┐
    │ WORLD VIEW                  │
    ├─────────────────────────────┤
    │                             │
    │       ·                     │
    │             ●               │
    │   ·                         │
    │                 ·           │
    │                             │
    ├─────────────────────────────┤
    │ 124 LOCATIONS               │
    └─────────────────────────────┘

The map itself can remain geographically accurate, while the controls are retro.

* * *

50. Timeline
    ============

This could be one of the strongest pages.
    TIMELINE.EXE

    1998 ───────●
                │
    2004 ───────●
                │
    2012 ───────●────●
                       │
    2018 ──────────────●
                       │
    2025 ──────────────●────●

Then clicking a point opens the memories.

* * *

51. Pixel Art Decorative Elements
    =================================

Use tiny decorations:

* floppy disk
* folder
* CRT
* camera
* cassette
* cursor
* globe
* telephone
* CD
* hard drive
* printer
* warning triangle
* star
* loading icon
* tiny arrows

But **don't sprinkle them randomly**.

They should communicate functionality.

* * *

52. Cursor
    ==========

This is underrated.

Use a **pixel cursor**.

Default:
    white arrow
    black outline

Hover:
    hand cursor

Busy:
    hourglass

Text:
    I-beam

This immediately reinforces the operating-system illusion.

* * *

53. Interaction States
    ======================

Every component should have at least:
    DEFAULT
    HOVER
    ACTIVE
    PRESSED
    DISABLED
    FOCUS
    SELECTED

Example:

### Button

    DEFAULT → raised
    
    HOVER → slightly brighter
    
    PRESSED → inset
    
    DISABLED → grey/dithered
    
    FOCUS → dotted outline

The **dotted focus rectangle** is particularly authentic.

* * *

54. Selection
    =============

Don't use:
    blue glowing border

Instead:
    ████████████████
    █ SELECTED     █
    ████████████████

Use navy:
    background: #000080;
    color: #ffffff;

or a dotted black focus outline.

* * *

55. Accessibility
    =================

Interestingly, the retro system can be very accessible if you do it correctly.

Maintain:

* sufficient contrast
* keyboard navigation
* visible focus
* readable body text
* accessible labels
* reduced motion
* screen-reader semantics

Don't sacrifice usability for authenticity.

* * *

56. Responsive Design
    =====================

Do **not** simply shrink desktop UI until everything becomes tiny.

Instead define three modes.
Desktop
-------

    WINDOWED
    multiple panels
    large toolbar
    dense metadata

Tablet
------

    single primary window
    condensed toolbar

Mobile
------

    FULLSCREEN WINDOW
    
    ┌───────────────────┐
    │ APP.EXE       X   │
    ├───────────────────┤
    │                   │
    │     CONTENT       │
    │                   │
    ├───────────────────┤
    │ HOME ARCHIVE MAP  │
    └───────────────────┘

The **visual language remains desktop-like**, even though the layout adapts.

* * *

57. CSS Architecture
    ====================

I'd create tokens first.
    :root {
      --ui-bg: #c0c0c0;

      --ui-light: #ffffff;
      --ui-mid: #dfdfdf;
      --ui-dark: #808080;
      --ui-shadow: #404040;
      --ui-black: #000000;

      --ui-blue: #000080;

      --accent-teal: #30b0a0;
      --accent-green: #70b020;
      --accent-yellow: #f0d020;
      --accent-red: #c03030;

      --border-width: 1px;
      --bevel-width: 2px;

      --pixel-grid: 4px;

      --font-ui: "MS Sans Serif", Tahoma, sans-serif;
      --font-pixel: "Silkscreen", monospace;
    }

Then build everything from those tokens.

* * *

58. Component Library
    =====================

Your component system should look something like:
    RetroUI/
    │
    ├── Window
    │   ├── TitleBar
    │   ├── WindowControls
    │   ├── MenuBar
    │   └── StatusBar
    │
    ├── Controls
    │   ├── Button
    │   ├── IconButton
    │   ├── Checkbox
    │   ├── Radio
    │   ├── Dropdown
    │   ├── Input
    │   ├── Select
    │   └── ProgressBar
    │
    ├── Navigation
    │   ├── Tabs
    │   ├── Toolbar
    │   ├── Breadcrumbs
    │   └── ContextMenu
    │
    ├── Media
    │   ├── PixelImage
    │   ├── Thumbnail
    │   ├── Gallery
    │   ├── MediaViewer
    │   └── AudioPlayer
    │
    ├── Archive
    │   ├── File
    │   ├── Folder
    │   ├── Metadata
    │   ├── Timeline
    │   └── MemoryCard
    │
    └── System
        ├── Dialog
        ├── Alert
        ├── Toast
        ├── Loading
        └── Error

This makes the visual language consistent throughout the entire application.

* * *

59. Asset Folder Structure
    ==========================

I'd actually structure your assets like this:
    /assets
    │
    ├── /icons
    │   ├── /16
    │   ├── /24
    │   ├── /32
    │   └── /system
    │
    ├── /cursors
    │
    ├── /textures
    │   ├── noise
    │   ├── dither
    │   ├── scanlines
    │   └── paper
    │
    ├── /illustrations
    │
    ├── /frames
    │
    ├── /fonts
    │
    ├── /sounds
    │   ├── click
    │   ├── error
    │   ├── open
    │   ├── close
    │   └── notification
    │
    └── /effects
        ├── crt
        ├── pixelate
        └── dither

* * *

60. Sound Design
    ================

This is another area where you can go **way beyond the reference**.

Give the UI tiny sounds.

For example:
    button click → tick
    window open → short mechanical sound
    error → classic two-tone beep
    notification → tiny digital chirp
    delete → click + descending tone
    camera → shutter
    save → floppy-drive sound

But keep them subtle.

The interface should feel like **a machine**, not a game.

* * *

61. Microcopy
    =============

The language should also feel like software.

Instead of:

> Save memory

use:

> SAVE FILE

Instead of:

> Uploading...

use:

> TRANSFERRING...

Instead of:

> Your memories

use:

> ARCHIVE

Instead of:

> Settings

use:

> OPTIONS

Instead of:

> Browse

use:

> VIEW

Instead of:

> Delete

use:

> DELETE FILE

* * *

62. Capitalization
    ==================

Don't capitalize everything.

Use different styles intentionally.

### System

    OPTIONS
    VIEW
    FILE
    EDIT

### File names

    IMG_20250817_1842.JPG

### Human content

    A day I'll never forget.

That contrast gives the application personality.

* * *

63. The "DOM" of a Memory
    =========================

I'd actually make each memory structurally resemble a file.
    <MemoryFile>

      <FileIcon />

      <Thumbnail />

      <FileHeader>
        <Filename />
        <FileType />
        <Timestamp />
      </FileHeader>

      <Metadata>
        <Location />
        <Device />
        <Dimensions />
        <Size />
      </Metadata>

      <Content />

      <FileActions>
        <Open />
        <Edit />
        <Export />
        <Delete />
      </FileActions>

    </MemoryFile>

This is much more interesting than a generic social-media card.

* * *

64. The Visual Hierarchy
    ========================

The entire application should roughly follow:
    SYSTEM CHROME
    ████████████████████████

    APPLICATION CONTEXT
    ████████████████████████

    CONTENT
    ████████████████████████

    METADATA
    ████████████████████████

    SYSTEM STATUS
    ████████████████████████

The **content gets the most visual attention**.

The retro styling belongs primarily to the surrounding machinery.

* * *

65. What NOT to Use
    ===================

This is just as important.

Avoid:

❌ glassmorphism  
❌ huge rounded cards  
❌ gradient buttons  
❌ neumorphism  
❌ giant shadows  
❌ floating pills  
❌ excessive blur  
❌ Material Design surfaces  
❌ iOS-style switches  
❌ excessive animation  
❌ excessive whitespace  
❌ giant hero sections  
❌ modern SaaS dashboards  
❌ gradient backgrounds  
❌ generic purple AI gradients  
❌ 3D glossy icons

Especially:

**Don't combine Windows 95 styling with modern SaaS UI patterns.**

That creates visual schizophrenia.

* * *

66. What You SHOULD Use
    =======================

Use:

✅ bevels  
✅ 1px borders  
✅ system grey  
✅ navy selection  
✅ bitmap icons  
✅ pixel art  
✅ dithering  
✅ compact typography  
✅ dense information  
✅ hard shadows  
✅ square controls  
✅ menus  
✅ toolbars  
✅ status bars  
✅ file metaphors  
✅ technical metadata  
✅ pixel cursors  
✅ mechanical animations  
✅ deliberate imperfection

* * *

67. Recommended Technology Stack
    ================================

If you're implementing this as a web application:

### Base

**React / Next.js**

### Styling

**CSS Modules / vanilla CSS / Tailwind only for layout**

I'd actually favor **plain CSS for the retro components**.

The visual system depends heavily on exact borders, pixels and pseudo-elements.

### Icons

Use your own pixel SVG/PNG set.

### Fonts

Use:

* Tahoma-like UI font
* Silkscreen
* Tiny5
* VT323
* bitmap fonts

### Image processing

For retro previews:

* Canvas
* WebGL
* custom shader
* Sharp/server-side preprocessing

### Effects

CSS + Canvas.

You don't need a giant animation library.

* * *

68. Libraries Worth Looking At
    ==============================

The most important one:

### 98.css

Then I'd look at:

### XP.css

Even if you don't use XP's exact style, it demonstrates how the old Windows component philosophy can be translated into CSS.

### 7.css

Useful for understanding the same concept at a later Windows aesthetic.

* * *

69. Don't Just Copy 98.css
    ==========================

This is important.

Your reference is **not purely Windows 98**.

If you literally build everything with 98.css, your app will look like:

> Windows 98 website.

Instead, use it as the **mechanical foundation**.

Then layer:
    Windows 95
          +
    Early Internet
          +
    Pixel Art
          +
    Digital Camera UI
          +
    Archival/File System
          +
    Modern Media

That becomes your unique design language.

* * *

70. A Better Name for the Style
    ===============================

I'd describe your target design system as:

> **Neo-Retro Personal Computing UI**

or more specifically:

> **Y2K Archival Computing**

The visual formula:
    Windows 95/98
          +
    Early Web
          +
    Pixel Art
          +
    Digital Camera
          +
    Personal Archive
          +
    Modern Media

* * *

71. The Golden Rule
    ===================

The application should constantly make the user feel:

> **“I'm using a weird little computer from 1999 that somehow contains my entire digital life.”**

That's the feeling you're after.

Not:

> “Someone put pixel fonts on Instagram.”

That distinction should guide **every component decision**.

* * *

72. The Final Design Stack
    ==========================

If I were turning this into the actual design system, I'd establish this hierarchy:
    ┌─────────────────────────────────────────────┐
    │             APPLICATION IDENTITY            │
    │              "ARCHIVE.EXE"                  │
    ├─────────────────────────────────────────────┤
    │ FILE   EDIT   VIEW   OPTIONS   HELP         │
    ├─────────────────────────────────────────────┤
    │                                             │
    │              TOOLBAR                        │
    │ [OPEN] [IMPORT] [SEARCH] [MAP] [VIEW]      │
    │                                             │
    ├─────────────────────────────────────────────┤
    │                                             │
    │             HUMAN CONTENT                   │
    │                                             │
    │    photos / videos / stories / memories     │
    │                                             │
    ├─────────────────────────────────────────────┤
    │                                             │
    │             MACHINE DATA                    │
    │                                             │
    │ IMG_0281.JPG | 12.4MB | S24 FE | 18:42     │
    │                                             │
    ├─────────────────────────────────────────────┤
    │ STATUS: READY               1,248 ITEMS     │
    └─────────────────────────────────────────────┘

That is the **core visual grammar** I'd use across the entire application.

And the really nice part is that you can make the retro layer **functional rather than decorative**: `.mem` files, archive directories, file metadata, executable-style modules, system errors, progress bars, status bars, music processes, timeline indexing, map databases, etc. all become natural parts of the UI instead of aesthetic gimmicks.

For the reference image specifically, I'd treat **98.css as the starting mechanical vocabulary**, **pixel-art assets as the icon/illustration vocabulary**, **limited palettes + dithering as the rendering vocabulary**, and your **memory/archive data as the content vocabulary**. That combination will get you much closer to the _feeling_ of this image than simply copying its layout.
