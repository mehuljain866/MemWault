Worked for 37s

Absolutely. I’d turn the latest MemWault identity sheet into an actual product design system specification, down to tokens, materials, typography, texture generation, icon construction, motion, component anatomy, asset sources, licensing, responsive behavior, and implementation architecture.

One important distinction first: the sheet is the visual reference, while the following is the ruleset that generates the visual language. That means the application does not become a giant copy of the sheet; it consistently behaves according to the same design logic.

MemWault Design System — Full Specification

0. Design thesis

The central idea

MemWault is a digital archive designed as though memories are physical things worth preserving.

The visual language combines:

private vault + personal archive + printed photograph + catalogue system + aged material

The interface should feel:

quiet, intimate, durable, tactile, archival, human, trustworthy.

It should not feel:

cybersecurity software, generic SaaS, futuristic AI, luxury-brand cosplay, or “fake skeuomorphism.”

The user should have the subconscious impression:

> “These are my things. They have history. They have been carefully kept.”



That is the fundamental design principle.

---

1. The four material worlds

The entire UI should be organized into four visual environments.

Material    Meaning    Primary use

Vault    protection, privacy, immersion    main viewer, navigation, dark surfaces
Paper    record, memory, context    metadata, journals, archive panels
Metal / Brass    permanence, mechanism, importance    accents, selected states, controls
Photographic media    emotion, life, memory    actual photos/videos and their dominant colors

This distinction is crucial.

The application is neutral.

The memories are colorful.

That keeps the UI from competing with the thing you're trying to preserve.

---

2. Exact core palette

The colors shown in the identity sheet should become first-class design tokens.

Vault

#181818

RGB: 24, 24, 24

Use for:

global dark background

viewer canvas

navigation

archive shell

deep overlays

application icon background

Raised Vault

#2C2C2C

RGB: 44, 44, 44

Use for:

elevated panels

active cards

drawers

controls sitting above the vault

Archive Paper

#E6E2D9

RGB: 230, 226, 217

Use for:

archival panels

notes

documentation

light surfaces

paper cards

empty states

Brass

#88744A

RGB: 136, 116, 74

Use sparingly.

This is not your generic “brand color.”

It represents:

hardware / preservation / selected / valuable.

Stone

#6F6A60

RGB: 111, 106, 96

Use for:

secondary text

inactive information

dividers

subdued icons

labels



---

3. Accessibility-aware color system

There is an important technical issue with this palette.

The palette is aesthetically excellent but not every pair is suitable for text.

For example, #181818 against #E6E2D9 is approximately 13.74:1, which is excellent. #6F6A60 against #E6E2D9 is roughly 4.16:1, which is slightly under WCAG AA's 4.5:1 requirement for normal text. #88744A against #181818 is about 3.93:1, so it should not be the sole color of ordinary text on that background. WCAG 2.2 sets 4.5:1 for normal text and 3:1 for large text; it also explicitly exempts logos/logotypes, but not ordinary UI text. 

Therefore add accessibility variants rather than changing the identity palette:

:root {
  --mw-vault: #181818;
  --mw-vault-raised: #2C2C2C;

  --mw-paper: #E6E2D9;

  --mw-brass: #88744A;
  --mw-brass-a11y: #A18C61;

  --mw-stone: #6F6A60;
  --mw-stone-a11y: #5F5A52;

  --mw-text-on-vault: #E6E2D9;
  --mw-text-on-paper: #181818;
}

The visual identity stays intact while functional text gets an appropriate contrast variant.

---

4. Semantic color tokens

Never scatter raw hex values throughout the application.

Use semantic variables:

--color-bg-vault
--color-bg-vault-raised
--color-bg-paper

--color-text-primary-dark
--color-text-secondary-dark

--color-text-primary-light
--color-text-secondary-light

--color-border-dark
--color-border-light

--color-accent-brass
--color-accent-brass-hover

--color-overlay
--color-scrim

This matters because later you may create:

desktop / mobile / light archive / dark archive / print-like view

without rewriting the application.

---

5. Typography system

The identity sheet pairs Recoleta + Inter.

That pairing should survive into the application, but with strict rules.

Recoleta

Use for:

major emotional headings

archive titles

landing pages

collection titles

moments that should feel editorial

Do not use it for:

buttons

timestamps

metadata

dense controls

navigation

Recoleta is a commercial typeface from Latinotype, and its licensing terms distinguish different uses including web/application embedding, so it should only be bundled after the appropriate license is obtained. 

Inter

Use for:

UI

metadata

navigation

body copy

controls

dates

filters

search

tables

keyboard shortcuts

Inter is designed for computer screens, has a tall x-height and variable-font/OpenType features, and is released under the SIL Open Font License. 

So:

--font-display: "Recoleta", Georgia, serif;
--font-ui: "Inter", system-ui, sans-serif;

---

6. Type scale

Use a deliberately restrained scale.

Display XL     64 / 0.98
Display L      48 / 1.00
Display M      36 / 1.05
Heading L      28 / 1.10
Heading M      22 / 1.15
Heading S      18 / 1.20

Body L         17 / 1.55
Body M         15 / 1.50
Body S         13 / 1.45

Metadata       12 / 1.30
Micro-label    10 / 1.20

Tracking

Display serif:

-0.02em to 0

Inter body:

0

Archive labels:

+0.10em to +0.16em

All-caps micro text should feel like catalogue indexing.

---

7. Typography hierarchy as an information architecture

The typography isn't merely visual.

It establishes:

WHAT THIS IS
   ↓
WHAT HAPPENED
   ↓
WHEN IT HAPPENED
   ↓
WHERE IT HAPPENED
   ↓
WHAT IT MEANS
   ↓
TECHNICAL CONTEXT

For example:

SUMMER TRIP

Recoleta 36px

16 MAY 2024 · SHILLONG

Inter 12px uppercase

The last trip before...

Inter 16px

MEDIA · 24 ITEMS · LOCATION · MUSIC · NOTES

Inter 11px

That hierarchy is the archive philosophy translated into typography.

---

8. The texture language

This is probably the most important implementation detail.

The reference image uses material texture, but the application should never look like it has an obvious texture overlay.

There are three texture families.

Texture A — Vault grain

Nearly invisible.

Properties:

frequency: medium/high
contrast: extremely low
opacity: ~2–4%
color: neutral
scale: 1x

It should be perceived rather than noticed.

SVG <feTurbulence> is a good implementation mechanism for procedural texture and is widely supported. MDN describes it as a way of synthesizing procedural textures including cloud/marble-like noise. 

Example:

<filter id="vault-grain">
  <feTurbulence
    type="fractalNoise"
    baseFrequency="0.75"
    numOctaves="3"
    seed="17"
  />
  <feColorMatrix
    values="
      1 0 0 0 0
      0 1 0 0 0
      0 0 1 0 0
      0 0 0 .035 0"
  />
</filter>

---

9. Paper texture

Paper needs more structure than the vault.

It should contain:

fine grain + extremely subtle fibers + low-frequency tonal variation

Avoid:

obvious brown paper

huge fibers

repeating photographic texture

grunge

distressing

The paper should feel like:

high-quality archival stock.

Not:

“vintage paper filter.”

---

10. Brass texture

Brass should be almost never visible as a full material.

Use:

extremely subtle noise

small tonal variation

tiny directional scratches only on large elements

no chrome reflection

no golden glow

It represents hardware, not wealth.

That distinction keeps MemWault away from “luxury fintech.”

---

11. Where to get textures

Poly Haven

Probably the strongest source for production-friendly physical material assets.

Their assets are CC0, including textures, HDRIs and models, and they explicitly permit commercial use without attribution. 

Use it for:

paper

cloth

stone

subtle metal

leather

wood

But don't directly dump huge textures into the web app.

Use:

4096 source
→ crop
→ normalize
→ compress
→ 512/1024 web texture

ambient-style PBR libraries

For physical-material reference, use reputable CC0/PBR libraries rather than random Pinterest images. For anything that you actually ship, verify the individual asset license rather than assuming an aggregator's terms.

Procedural texture

For MemWault specifically, I'd favor procedural SVG/CSS grain for most UI surfaces.

That gives:

zero image download

deterministic appearance

scalable output

no texture seams

no external licensing

easy dark/light tuning



---

12. Texture budget

Very important.

Never texture everything.

Texture intensity map

Vault background        3%
Raised vault            2%
Archive paper           4–6%
Memory paper cards      5–8%
Brass                    3%
Buttons                  0%
Navigation               1–2%
Photographs              0%

The UI becomes tactile through contrast between materials, not because every pixel has noise.

---

13. Surface system

Every surface belongs to one of these levels.

Surface 0
environment

Surface 1
base plane

Surface 2
raised panel

Surface 3
record/card

Surface 4
floating object

Surface 5
overlay

Example:

.mw-vault {
  background: #181818;
}

.mw-panel {
  background: #2C2C2C;
}

.mw-paper {
  background: #E6E2D9;
}

.mw-float {
  background: #2C2C2C;
  box-shadow: var(--mw-shadow-float);
}

---

14. Shadows

The shadows must imply physical separation.

Use fewer layers than typical SaaS interfaces.

--shadow-paper:
  0 2px 6px rgba(0,0,0,.08);

--shadow-card:
  0 6px 16px rgba(0,0,0,.12);

--shadow-float:
  0 14px 32px rgba(0,0,0,.20);

--shadow-modal:
  0 24px 60px rgba(0,0,0,.30);

Don't put box-shadow on every card.

No shadow can mean:

“This is printed onto the surface.”

A shadow means:

“This is physically above the surface.”

That's the skeuomorphic logic.

---

15. Borders

Two fundamental border systems.

Dark

rgba(230,226,217,.10)

Light

rgba(24,24,24,.10)

Never pure #444 or pure #DDD outlines everywhere.

They should feel like hairlines on archival paper.

---

16. Radius system

Don't let the whole interface become rounded SaaS.

2px   archival edge
4px   paper
6px   record
8px   control/card
12px  large panel
18px  application chrome
999px status/pill

The logo and vault architecture can have their own geometry independent of UI corner radii.

---

17. Spacing system

Use an 8pt foundation:

4
8
12
16
24
32
40
48
64
80
96
128

But allow optical exceptions.

This is important.

A design system is not a prison.

The identity has archival/editorial qualities, so sometimes:

31px
37px
53px

can be the correct visual spacing.

Use the system as a base rhythm, not as mathematical religion.

---

18. Grid

Desktop:

12-column
max-width: 1440px
gutter: 24–32px

Tablet:

8-column
gutter: 20–24px

Mobile:

4-column
gutter: 16px

Use generous breathing space.

MemWault shouldn't feel dense unless the user is actively searching through an archive.

---

19. The memory card

A standard memory card should have an anatomy.

┌─────────────────────────────┐
│ ARCHIVE LABEL               │
│                             │
│         MEDIA               │
│                             │
│                             │
├─────────────────────────────┤
│ DATE                        │
│ TITLE                       │
│ LOCATION                    │
│                             │
│ context · music · notes     │
└─────────────────────────────┘

The card should feel like:

a record that happens to contain media

instead of:

a photo with some metadata underneath it.

That distinction is fundamental to MemWault.

---

20. Memory stack

The logo's layered pages should become a UI pattern.

For a collection:

┌─────────────┐
│  photograph │
│             │
└─────────────┘
   ┌─────────────┐
   │ note        │
   └─────────────┘
      ┌─────────────┐
      │ music       │
      └─────────────┘

The layers represent context, not decoration.

Potential layers:

MEDIA
CAPTION
LOCATION
MUSIC
PEOPLE
NOTES
LINKS
ACTIVITY

---

21. The vault interaction model

The logo establishes the metaphor.

The app should use it carefully.

Opening a memory

The card expands.

Opening context

An archival panel unfolds.

Opening a collection

The layers separate.

Returning

The layers collapse back into the record.

Deleting

The object should feel like it is being removed from the archive, not just “fade out.”

This creates a consistent mental model.

---

22. Motion specification

Motion should communicate material behavior.

Micro interaction

120–180ms

Standard UI

180–280ms

Archive transition

300–450ms

Large viewer transition

400–600ms

Easing

Use restrained cubic easing rather than bouncy motion:

--ease-archive:
  cubic-bezier(.22,.61,.36,1);

--ease-enter:
  cubic-bezier(.16,1,.3,1);

--ease-exit:
  cubic-bezier(.4,0,1,1);

Avoid:

elastic overshoot

rubber-band effects

constant spring physics

giant zooms

glowing transitions

The interaction should feel weighty.

---

23. Reduced motion

Always respect:

@media (prefers-reduced-motion: reduce)

Disable:

folding

parallax

layer displacement

large zoom

prolonged transitions

Instead use:

opacity
small position shift
instant state change

---

24. Iconography

Lucide is a very good base library.

It currently provides more than 1,600 SVG icons and is licensed under ISC, which makes it usable in commercial applications. 

Use it for:

search

settings

share

download

calendar

location

music

folder

lock

archive

clock

bookmark

edit

But:

do not use Lucide for the MemWault logo or core proprietary symbols.

Lucide itself doesn't accept brand logos. 

Icon defaults

24px grid
1.75–2px stroke
round caps
round joins

At 16px:

1.5–1.75px

Don't mix outline and filled icons randomly.

---

25. Custom MemWault icon family

Create custom versions of:

archive
memory
preservation
context
timeline
vault
collection
record
journal
memory-stack

The icon family should borrow from the logo's:

arch

vertical memory layers

keyhole

M geometry

This creates a proprietary visual language without making every icon look like the logo.

---

26. App icon

The app icon should be treated independently from the full identity.

It should contain:

vault M + memory stack

and nothing else.

No:

wordmark

tagline

extra UI

decorative glow

At tiny sizes, the memory stack should collapse into three or four tonal layers, not six tiny literal objects.

---

27. Favicon

At 16×16 or 32×32:

remove:

photograph detail

keyhole detail if necessary

micro texture

tiny labels

Keep:

the M/vault silhouette.

You need a symbol, not a miniature illustration.

---

28. Logo asset package

I would keep:

brand/
├── memwault-symbol.svg
├── memwault-symbol-dark.svg
├── memwault-symbol-light.svg
├── memwault-primary.svg
├── memwault-primary-dark.svg
├── memwault-reversed.svg
├── memwault-monochrome.svg
├── memwault-favicon.svg
└── memwault-app-icon.svg

Plus PNG exports:

1024
512
256
128
64
32
16

SVG remains the canonical source.

---

29. Photo treatment

This is where the application should become emotionally powerful.

Do not filter user photographs into “MemWault colors.”

Instead:

preserve original color

preserve metadata

preserve aspect ratio

maintain image fidelity

let photos supply saturation

The UI is deliberately restrained so a photograph can suddenly introduce:

red, green, blue, yellow, cyan, sunset orange, skin tones, faded film tones.

That contrast becomes the emotional engine of the product.

---

30. Optional archival image treatment

For special historical materials, you can add an archival mode:

paper border
small catalogue number
date stamp
contact-sheet framing
subtle desaturation
slight grain

But this must be opt-in.

Do not automatically “vintage-ify” people's memories.

The archive should preserve the memory, not invent an aesthetic for it.

---

31. Metadata styling

Use small labels:

CAPTURED
LOCATION
PEOPLE
MUSIC
SOURCE
NOTES
ORIGINAL
ARCHIVED

Then values underneath.

Example:

CAPTURED
14 MAY 2024 · 17:32

LOCATION
SHILLONG, INDIA

SOURCE
INSTAGRAM STORY

Labels:

10–12px Inter
600
uppercase
0.12em tracking

Values:

13–15px Inter
400–500

---

32. Date language

Dates should be visually archival.

Instead of always:

2024-05-14

use:

14 MAY 2024

or:

MAY 14, 2024

depending on locale.

For technical metadata:

2024-05-14T17:32:04+05:30

can appear only in an expanded technical view.

---

33. Archive numbering

This would be a powerful recurring motif.

For example:

MEMORY 000184

ALBUM 00023

ENTRY 0194

This creates the subconscious feeling of a real collection.

But it should be informational, not decorative.

---

34. The “archive label” component

Create one reusable component:

<span class="archive-label">
  MEMORY 00124
</span>

CSS:

.archive-label {
  font-family: var(--font-ui);
  font-size: 10px;
  line-height: 1.2;
  font-weight: 600;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--mw-stone);
}

This tiny component could become one of the visual signatures of MemWault.

---

35. Buttons

Primary

Dark vault surface:

[ PRESERVE MEMORY ]

High-contrast paper text.

Secondary

Paper:

[ EDIT CONTEXT ]

Tertiary

Text/ghost:

VIEW DETAILS →

Brass

Only for meaningful preservation actions:

[ ARCHIVE ]

Don't turn every CTA copper.

---

36. Search

Search should feel like finding an item in a collection.

Potential copy:

Search your archive...

or:

Find a memory...

rather than:

Search everything

Results could be grouped:

MEMORIES
PEOPLE
PLACES
DATES
MUSIC
NOTES

That's much more aligned with the product.

---

37. Navigation

The navigation should be extremely quiet.

Potential structure:

MEMWAULT

Archive
Timeline
Collections
People
Places
Search

────────────

Recently added
Favorites
Unsorted

────────────

Storage
Settings

Use Inter.

Do not turn nav items into giant cards.

---

38. Dashboard philosophy

Do not make the home screen a generic:

Good evening, Mehul 👋
12 memories this week
Storage 46%

Instead:

YOUR ARCHIVE

AUGUST 2026

[ a few memories ]

12 NEW RECORDS
3 COLLECTIONS UPDATED

RECENTLY PRESERVED

The product should feel like opening your archive, not opening a productivity dashboard.

---

39. Empty states

Empty states should feel like a museum/archive.

For example:

NO MEMORIES HERE YET

The shelf is waiting for its first record.

Then:

[ PRESERVE A MEMORY ]

This is much more aligned than:

> “Nothing here! Let's get started 🚀”



---

40. Loading

Avoid generic spinner everywhere.

For archive operations:

PRESERVING…

or:

OPENING ARCHIVE…

or:

INDEXING MEMORY…

A tiny layered-stack animation can communicate the operation.

---

41. Error messages

Keep the personality understated.

Instead of:

> Oops! Something went wrong :(



Use:

THE RECORD COULD NOT BE PRESERVED

The original file remains untouched. Try again.

That creates trust.

---

42. Success messages

Instead of:

> Awesome! Uploaded successfully!



Use:

MEMORY PRESERVED

Your original record remains unchanged.

This is perfectly aligned with the product's philosophy.

---

43. Modal design

Modals should feel like documents placed on top of the archive.

Dark viewer:

dark surrounding environment

paper panel inside

Light workspace:

paper modal

dark text

thin divider

Don't use giant frosted-glass dialogs unless there is a specific reason.

---

44. Blur

Blur is not part of the core identity.

Use it only when you need:

backdrop separation

transient overlays

focus transitions

Don't use:

backdrop-filter: blur(30px);

as the application's entire personality.

The visual language is material, not glassmorphic.

---

45. Layered image interaction

A particularly strong MemWault pattern:

memory
│
├── media
├── caption
├── music
├── location
├── people
├── notes
└── source

When expanded, those layers can visually separate.

That makes the repository's deeper idea—the preservation of context—visible.

---

46. Archive drawers

A drawer should look like a physical file drawer conceptually, but remain simple.

Structure:

ARCHIVE
──────────────
2026
2025
2024
2023

COLLECTIONS
──────────────
Trips
School
Friends
Family

The drawer itself can have a subtle paper/metal treatment.

---

47. The “paper” component

I would literally create:

<Paper />

with variants:

paper
paper-raised
paper-record
paper-note
paper-label

This will let the whole application reuse the same material system.

---

48. The “vault” component

Likewise:

<VaultSurface />

Variants:

vault
vault-raised
vault-viewer
vault-overlay

This is important because the DOM should encode the design philosophy, not only the CSS.

---

49. Suggested DOM architecture

<App>

<VaultShell>

    <Navigation />
    
    <Archive>
    
      <ArchiveHeader />
    
      <ArchiveToolbar />
    
      <Timeline>
        <ArchiveSection>
          <ArchiveLabel />
          <MemoryGrid>
            <MemoryRecord>
              <MemoryMedia />
              <MemoryMeta />
              <MemoryContext />
            </MemoryRecord>
          </MemoryGrid>
        </ArchiveSection>
      </Timeline>
    
    </Archive>

</VaultShell>

</App>

Then a memory:

<MemoryRecord>
  <MemoryMedia />
  <MemoryIdentity />
  <MemoryContextStack>
    <ContextDate />
    <ContextLocation />
    <ContextPeople />
    <ContextMusic />
    <ContextNotes />
  </MemoryContextStack>
</MemoryRecord>

---

50. Design tokens file

I'd put the canonical tokens into one file:

/* =========================
   MEMWAULT DESIGN TOKENS
   ========================= */

:root {

  /* ---------- COLOR ---------- */

  --mw-vault: #181818;
  --mw-vault-raised: #2C2C2C;

  --mw-paper: #E6E2D9;

  --mw-brass: #88744A;
  --mw-brass-light: #A18C61;
  --mw-brass-dark: #665635;

  --mw-stone: #6F6A60;
  --mw-stone-light: #8B857B;

  /* ---------- TYPOGRAPHY ---------- */

  --mw-font-display: "Recoleta", Georgia, serif;
  --mw-font-ui: "Inter", system-ui, sans-serif;

  /* ---------- RADIUS ---------- */

  --mw-radius-archive: 2px;
  --mw-radius-paper: 4px;
  --mw-radius-record: 6px;
  --mw-radius-card: 8px;
  --mw-radius-panel: 12px;
  --mw-radius-app: 18px;

  /* ---------- SPACING ---------- */

  --mw-space-1: 4px;
  --mw-space-2: 8px;
  --mw-space-3: 12px;
  --mw-space-4: 16px;
  --mw-space-5: 24px;
  --mw-space-6: 32px;
  --mw-space-7: 40px;
  --mw-space-8: 48px;
  --mw-space-9: 64px;
  --mw-space-10: 80px;
  --mw-space-11: 96px;

  /* ---------- BORDER ---------- */

  --mw-border-dark:
    1px solid rgba(230,226,217,.10);

  --mw-border-light:
    1px solid rgba(24,24,24,.10);

  /* ---------- SHADOW ---------- */

  --mw-shadow-paper:
    0 2px 6px rgba(0,0,0,.08);

  --mw-shadow-card:
    0 6px 16px rgba(0,0,0,.12);

  --mw-shadow-float:
    0 14px 32px rgba(0,0,0,.20);

  --mw-shadow-modal:
    0 24px 60px rgba(0,0,0,.30);

  /* ---------- MOTION ---------- */

  --mw-ease-standard:
    cubic-bezier(.22,.61,.36,1);

  --mw-ease-enter:
    cubic-bezier(.16,1,.3,1);

  --mw-ease-exit:
    cubic-bezier(.4,0,1,1);

  --mw-duration-fast: 160ms;
  --mw-duration-standard: 240ms;
  --mw-duration-slow: 420ms;
}

---

51. Background implementation

Example:

.mw-vault-surface {
  position: relative;
  isolation: isolate;
  background: var(--mw-vault);
}

.mw-vault-surface::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: .03;
  mix-blend-mode: soft-light;
  background-image: url("/textures/vault-grain.svg");
}

mix-blend-mode is an appropriate compositing mechanism for this type of material overlay; just make sure your stacking contexts are intentionally controlled. MDN documents the compositing behavior and CSS implementation. 

---

52. Asset directory

I'd structure the actual project around this:

public/
└── brand/
    ├── logo/
    │   ├── memwault-symbol.svg
    │   ├── memwault-primary.svg
    │   ├── memwault-reversed.svg
    │   ├── memwault-monochrome.svg
    │   └── memwault-favicon.svg
    │
    ├── textures/
    │   ├── vault-grain.svg
    │   ├── paper-grain.svg
    │   ├── paper-fiber.webp
    │   ├── brass-fine.webp
    │   └── material-reference/
    │
    ├── icons/
    │   ├── archive.svg
    │   ├── preservation.svg
    │   ├── memory-stack.svg
    │   ├── context.svg
    │   └── vault.svg
    │
    ├── type/
    │   ├── Inter-Variable.woff2
    │   └── Recoleta/
    │
    └── app-icon/
        ├── 1024.png
        ├── 512.png
        ├── 256.png
        ├── 128.png
        ├── 64.png
        ├── 32.png
        └── 16.png

---

53. What should actually be downloaded vs generated

Download

licensed Recoleta files, if using it

Inter WOFF2

logo SVGs

any genuine photographic/material assets

app icon exports

custom illustrations

Generate

grain

noise

paper tonal variation

borders

shadows

overlays

state colors

most UI textures

User-provided

photographs

videos

scans

audio

memory content

This keeps the product lightweight.

---

54. Source and license registry

Put this in the repository:

docs/
└── DESIGN_ASSETS_LICENSES.md

Example:

MEMWAULT DESIGN ASSET REGISTER

Inter
Source: https://github.com/rsms/inter
License: SIL Open Font License 1.1
Usage: Application UI
Status: Approved

Recoleta
Source: Latinotype
License: Commercial font license
Usage: Editorial/display type
Status: License required

Lucide
Source: https://github.com/lucide-icons/lucide
License: ISC
Usage: UI icons
Status: Approved

Poly Haven
Source: https://polyhaven.com/
License: CC0
Usage: Optional material references/textures
Status: Approved

Inter's upstream repository explicitly permits commercial bundling under the SIL OFL, subject to the license conditions.  Lucide is ISC licensed and intended for both personal and commercial use.  Poly Haven assets are CC0 and explicitly usable commercially without attribution. 

---

55. What NOT to use

This should actually be written into the design guide.

NO neon gradients
NO purple/blue AI gradients
NO excessive glassmorphism
NO generic 24px rounded cards everywhere
NO random shadows
NO excessive blur
NO emoji icons
NO colorful icon packs
NO giant text-heavy dashboards
NO photorealistic vault illustration in every view
NO fake scratches
NO fake film grain over photographs
NO forced vintage treatment
NO decorative texture without semantic purpose
NO pure gold luxury aesthetic
NO excessive serif typography
NO every element having a border
NO every interaction being brass

This is how you prevent the visual language from drifting.

---

56. The anti-AI rule

Because of our previous discussion, I would literally add:

> Every visual element must have a reason.



For every effect:

Why is there grain?

Because it represents material.

Why is there a shadow?

Because the object is physically above the surface.

Why is there brass?

Because it represents archival hardware.

Why is there a serif?

Because it provides editorial/personal historical tone.

Why is the interface dark?

Because it represents the protected archive.

That test eliminates a tremendous amount of aesthetic noise.

---

57. Light mode

Light mode should not be a normal white theme.

It should be:

archive paper mode.

Base:

#E6E2D9

Text:

#181818

Secondary:

#6F6A60

Accent:

#88744A

Dark vault surfaces can still appear as contrast elements.

So the light theme feels like:

opening documents on a desk

rather than:

switching to Material Design Light Mode.

---

58. Dark mode

Dark mode is the canonical MemWault environment.

#181818
↓
#2C2C2C
↓
paper media
↓
brass accents
↓
photograph colors

Think:

dark room + archive objects illuminated inside it.

---

59. Full-screen memory viewer

This should be one of the strongest screens in the entire product.

Background:

#181818

Image:

maximum fidelity

Controls:

very quiet

Metadata:

small, paper-toned typography

Potential structure:

┌────────────────────────────────────────┐
│ MEMWAULT                         CLOSE │
│                                        │
│                                        │
│              [ PHOTO ]                 │
│                                        │
│                                        │
│  14 MAY 2024                           │
│  SHILLONG                              │
│                                        │
│  MUSIC · NOTES · PEOPLE · LOCATION     │
└────────────────────────────────────────┘

The user's image is the hero.

Everything else supports it.

---

60. Responsive rules

At smaller widths:

Desktop

Image + context panel.

Tablet

Image first, metadata underneath.

Mobile

Media dominates.

Context becomes:

layered sheets / bottom drawer

rather than squeezing into columns.

This is especially appropriate for MemWault because the mobile experience should feel like pulling an archival record upward.

---

61. Touch behavior

Targets should still be sufficiently large and accessible.

Avoid tiny archive labels becoming clickable.

Make the entire record surface interactive.

For example:

tap card
→ opens

tap metadata
→ expands context

swipe
→ browse memories

long press
→ actions

The visual language should never compromise usability.

---

62. Focus states

Do not use a random browser blue outline.

Design a MemWault focus treatment:

outline: 2px solid var(--mw-brass-light);
outline-offset: 3px;

but only after verifying contrast and visibility against the relevant surface.

WCAG specifically calls for visible keyboard focus as a separate concern from text contrast. 

---

63. Non-text contrast

For important UI controls and graphical information, don't rely solely on a subtle difference between #181818 and #2C2C2C.

WCAG 2.2's non-text contrast criterion is the relevant standard for meaningful interface components and graphical objects. 

So:

decorative divider: can be subtle

interactive control: must be distinguishable

selected state: must be obvious

drag handle: must be visible

---

64. Icon + text pairing

Don't use icons as standalone decoration wherever text is clearer.

Good:

◉  LOCATION

Bad:

[ mysterious icon ]

The archive metaphor should make the system feel thoughtful, not cryptic.

---

65. Color extraction from memories

This is an opportunity for MemWault.

Instead of adding brand gradients, generate contextual micro-accents from the memory itself.

For example:

photo dominant hue
→ subtle border tint
→ tiny timeline marker
→ contextual accent

But cap saturation aggressively.

Example:

photo orange
→ not neon orange
→ muted archival sienna

The identity remains intact while each memory gets subtle individuality.

---

66. Dynamic memory color token

Conceptually:

--memory-accent: var(--mw-brass);

Then for a particular memory:

--memory-accent: hsl(var(--memory-hue) 24% 45%);

The important part is:

low chroma.

We do not want Spotify-style bright dynamic theming.

---

67. Archive chronology

Use dates as structural separators.

2026
──────────────
AUGUST
[ memories ]

JULY
[ memories ]

JUNE
[ memories ]

The chronology becomes a visual organizing principle.

It reinforces that MemWault is fundamentally about time.

---

68. Timeline marker

The logo's vertical memory layers can inspire the timeline.

Think:

●
      │
  ┌───┼────┐
  │ MEMORY │
  └────────┘
      │
      ●

But use it sparingly.

It should be an archival filing axis, not a generic social timeline.

---

69. Album / collection design

Collections can feel like folders.

But don't draw literal manila folders everywhere.

Instead:

title + archive number + representative media stack.

Example:

SUMMER TRIP
COLLECTION 0021

24 MEMORIES
SHILLONG · 2024

with a layered image preview.

---

70. Music attachment

Because context is part of a memory, music should be treated as another archival record.

Example:

MUSIC
────────────────
Song title
Artist
Captured with memory

A small record sleeve motif could be used.

Avoid giant Spotify-style controls unless audio is actively playing.

---

71. Notes / journal

This is where Recoleta can become especially meaningful.

Example:

I don't remember the weather,
but I remember standing here
for nearly an hour.

Use:

Recoleta

for the personal writing.

That gives journaling emotional weight without turning the whole application into a serif-heavy design.

---

72. Security language

Security should be quiet.

Instead of giant:

AES-256 ENCRYPTED

everywhere, use subtle indicators:

PRIVATE ARCHIVE
SELF-HOSTED
ORIGINAL PRESERVED

Then expose technical details where useful.

The visual philosophy is:

trust through calmness.

---

73. Branding voice

The interface copy should be:

calm short specific human

Use:

> MEMORY PRESERVED



not:

> Your memory has been successfully uploaded!



Use:

> ARCHIVE OPEN



not:

> Welcome back to your dashboard!



Use:

> ORIGINAL KEPT UNCHANGED



not:

> We safely backed up your file!



---

74. The brand should have three densities

Quiet

Viewer / reading / memory.

Structured

Archive / search / timeline.

Technical

Settings / metadata / storage.

The material system stays the same, while information density changes.

---

75. Animation of the logo itself

The logo could become a motion identity.

Closed:

M / vault

Open:

M doors separate
↓
memory layers emerge

Then return.

This is an actual extension of the logo's concept rather than random logo animation.

---

76. Skeleton loading

Don't use shimmering gray rectangles.

Use archival silhouettes:

record placeholder
paper-toned blocks
subtle moving line

or no animation at all.

The user should feel:

the archive is being indexed.

---

77. Drag and rearrange

For the carousel-board interaction you previously envisioned, this visual language can be pushed further.

Memory cards can behave like physical records:

slight rotation while dragging

small elevation

neighboring cards move out of the way

release settles gently

no excessive spring

This becomes a genuine skeuomorphic interaction—not a decorative texture.

---

78. Print/export mode

MemWault should potentially have a “print/archive” representation.

Use:

paper background

Recoleta headings

archive labels

dates

subtle rules

photograph

archival numbering

The identity should be capable of becoming a physical artifact.

That's one of the strongest tests of a good archive identity.

---

79. Design-system component taxonomy

I'd formalize the components as:

FOUNDATION
├─ VaultSurface
├─ PaperSurface
├─ Grain
├─ Border
├─ Divider
├─ Shadow
└─ Typography

ARCHIVE
├─ ArchiveShell
├─ ArchiveHeader
├─ ArchiveLabel
├─ ArchiveSection
├─ ArchiveDivider
└─ ArchiveIndex

MEMORY
├─ MemoryRecord
├─ MemoryMedia
├─ MemoryStack
├─ MemoryContext
├─ MemoryMeta
├─ MemoryTimeline
└─ MemoryViewer

COLLECTION
├─ CollectionCard
├─ CollectionHeader
├─ CollectionStack
└─ CollectionIndex

INTERACTION
├─ Button
├─ IconButton
├─ Drawer
├─ Modal
├─ Search
├─ Filter
└─ CommandMenu

---

80. Recommended source stack

Typography

Inter — upstream GitHub, SIL OFL 1.1. 

Recoleta — Latinotype, commercial licensing required for web/application embedding as applicable. 

Icons

Lucide — 1,600+ SVG icons, ISC license. 

Textures/materials

Poly Haven — CC0 textures/models/HDRIs, including commercial use. 

Procedural texture

SVG feTurbulence — browser-supported procedural noise mechanism. 

Accessibility

W3C WCAG 2.2 — contrast, focus, non-text contrast. 

Platform design reference

Apple HIG — useful reference for treating materials, color and hierarchy as a system rather than decoration. 

---

81. One thing I would NOT source externally

Don't search for a “perfect MemWault texture.”

That's exactly how a coherent identity gets diluted.

The core grain should be ours.

Likewise:

logo

keyhole

memory stack

archive labels

custom dividers

motion behavior

should all be proprietary system elements.

External resources should support the system rather than define it.

---

82. Final visual formula

The whole identity can be reduced to this:

MEMWAULT

Dark vault
        +
Warm paper
        +
Muted brass
        +
Editorial serif
        +
Functional sans
        +
Archival metadata
        +
Layered records
        +
Subtle material texture
        +
Real photographs
        +
Physical-feeling motion
        =
A DIGITAL ARCHIVE THAT FEELS OWNED

And the most important implementation rule is:

> The UI should disappear behind the memory.



The visual system exists to make the user's archive feel important, permanent and personal. The moment the interface starts competing with the photographs, videos, journals and context, we've violated the philosophy.

That gives you a real design system, not just a palette copied from the logo sheet.
