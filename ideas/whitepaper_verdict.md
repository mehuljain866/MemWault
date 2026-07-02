# MemWault: Technical Design Document & Architecture Verdict
*A portable, user-owned memory preservation layer.*

---

## I. Vision: MemWault and the Memory Object Model (MOM)

MemWault is a user-owned digital archive designed to address the transient nature of modern social media. Currently, platforms like Instagram serve as de facto memory scrapbooks, yet they fail to guarantee the longevity of that media. Licensed music tracks disappear, reposts from deactivated accounts break, and destructive server-side compression flattens creative composition.

MemWault decouples the **creation** of memories from the **hosting** platforms. Instead of trying to build a new story editor, MemWault acts as a silent archivist, leaving Instagram as the public, transient layer while saving the original high-resolution creative elements and structural layouts locally.

### The Memory Object Model (MOM)
The core architecture is built around the **Memory Object Model (MOM)**. Instead of treating a backup as a folder of media files, MOM organizes data around **moments**. A single "Memory" is a container that links:
*   **Original Assets:** RAW images, videos, and motion photos before upload compression.
*   **Published Renders:** The finished MP4/JPEG downloaded from the platform (with filters, stickers, and music baked in).
*   **Creative Manifest:** A layout "recipe" (.mem) containing coordinates, layers, fonts, and texts of interactive elements.
*   **Contextual Metadata:** Locations, mentions, timestamps, captions, and links.
*   **Social Context:** Responses, polls, and views (while active).

```
                  Memory Object Model (MOM)
                             │
       ┌─────────────────────┼─────────────────────┐
       ▼                     ▼                     ▼
Original Assets       Published Renders     Creative Manifest (.mem)
(RAWs, Motion Photos)   (CDN Video/Image)     (JSON Layout & Layers)
```

---

## II. Feasibility Matrix (Comprehensive Feature Set)

Below is the feasibility status of the proposed features under the strict constraints of a **non-rooted phone** and a **cloud-polling / background execution** architecture.

| Feature Category | Feature | Status | Mechanism / Alternative |
| :--- | :--- | :--- | :--- |
| **Archiving** | Compressed Story Media Download | **Green** | Automated scraping of Instagram's CDN endpoints via private/public API. |
| **Archiving** | Sticker & Layout Scraping | **Green** | Parsing coordinates, fonts, and rotation data from `reels_media` API JSON responses. |
| **Archiving** | Music Track Info & Timestamps | **Green** | Extracted from `story_music_stickers` payload inside the API response. |
| **Archiving** | Interactive State Capture (Static) | **Green** | Storing final poll percentages and quiz answers as metadata. |
| **Archiving** | Original (Uncompressed) Asset Sync | **Green** | Requires a phone gallery watcher app that uploads files matching story timestamps. |
| **Android** | Background Monitoring (Silent) | **Yellow** | Restricted by OS battery optimization. Requires a foreground service with notification or `WorkManager` tasks. |
| **Android** | Accessing `/Android/data` Cache | **Red** | **Impossible without Root or Shizuku**. Standard background apps are sandboxed. Shizuku cannot run persistently on reboot without ADB shell launch. |
| **Android** | UI Tree Scraping (Accessibility) | **Yellow** | Requires active user permission. Only works when Instagram is open in foreground; cannot run in background. |
| **iOS** | Background App Interception | **Red** | iOS sandboxing prevents background execution and file access completely. |
| **iOS** | Photo Gallery Watcher | **Yellow** | Uses `PHPersistentChangeToken` but is only triggered when the user opens the MemWault companion app. |
| **Networking** | Cloud-based API Polling | **Yellow** | High risk of Meta IP blocks/bans. Requires residential proxies or local home server execution. |
| **Networking** | Network Traffic Interception | **Red** | SSL Pinning in modern Instagram versions rejects user certificates on non-rooted devices. |
| **Interactivity** | Re-functioning Active Polls | **Red** | Server-side database tables are closed and proprietary. Only final static states can be saved. |

---

## III. Instagram Internal Pipeline (Scraping vs. On-Device Cache)

When you post an Instagram Story:
1.  **Selection:** You select or capture media.
2.  **Compilation & Cache:** The app writes temporary files (images, audio fragments, cropped videos) to its private folder `/data/data/com.instagram.android/cache/`.
3.  **Local Rendering:** The media is rendered and compressed locally (usually downscaled to 1080x1920 pixels and compressed to a low bitrate MP4/JPEG).
4.  **Upload:** The compiled file is uploaded to Meta's servers.

### The Access Problem
On a non-rooted phone, the temporary cache folder `/data/data/com.instagram.android/` is completely sandboxed. Neither your code nor standard file managers can read it. 

### The Solution: The Private API Endpoint
Instead of sniffing files on-device, MemWault queries Instagram’s mobile API endpoints directly. When you request the active stories for a user, Instagram returns a detailed JSON object containing:
*   `taken_at`: The exact UNIX timestamp.
*   `media_type`: 1 for image, 2 for video.
*   `image_versions2` / `video_versions`: Direct CDN URLs to download the compiled media.
*   `story_music_stickers`: Contains track details, artist, start time in milliseconds, and play duration.
*   `story_link_stickers`: URLs embedded in the story.
*   `reel_mentions`: Details of accounts tagged.
*   `story_locations`: Full location objects with GPS coordinates.

By pulling this JSON object, we reconstruct the **layout recipe** without needing local file access.

---

## IV. Platform Investigations (Non-Rooted Constraints)

### Android
*   **WorkManager & Foreground Services:** To monitor the gallery, a local background app uses Android's `WorkManager` or a foreground service with a persistent notification. It observes the `MediaStore` for new files added to the `Instagram` directory (which happens if the user enables "Save Original Photos" in Instagram settings).
*   **Accessibility Services:** While an Accessibility Service can read text from the screen (e.g. typing text on a story), it cannot reliably read coordinate layouts of custom-drawn graphics (like canvas-based stickers). It is also battery-heavy and requires intrusive user permissions.
*   **Shizuku:** While Shizuku permits file access in the public storage directory `/Android/data/`, Instagram's uploads and caches live in the secure `/data/data/` system directory, which is off-limits to ADB/Shizuku permissions.

### iOS
*   **Sandbox Limits:** iOS prevents background execution except for very specific use cases (audio, GPS, push notifications). A background daemon that polls APIs or watches folders is impossible.
*   **PhotoKit Change Tokens:** iOS provides the PhotoKit framework. The MemWault companion app can request a `PHPersistentChangeToken` when launched. This allows it to scan the photo library and upload any new pictures taken or edited in Instagram since the last launch.

---

## V. Database & System Architecture

MemWault uses a **hybrid client-server architecture** to deliver a "zero-interaction" experience while maintaining high-quality local backups.

```
┌────────────────────────────────────────────────────────┐
│                      YOUR PHONE                        │
│ ┌──────────────┐         ┌───────────────────────────┐ │
│ │  Instagram   │         │    MemWault Companion   │ │
│ │  (Official)  │         │ (Background Gallery Sync) │ │
│ └──────┬───────┘         └─────────────┬─────────────┘ │
└────────┼───────────────────────────────┼───────────────┘
         │ Uploads Compressed Story      │ Uploads Original Media
         ▼                               ▼
┌────────┴───────────────────────────────┴───────────────┐
│                      CLOUD WORKER                      │
│ ┌────────────────────────┐   ┌───────────────────────┐ │
│ │    Instagram API       │   │   MemWault Engine   │ │
│ │ (Scraper/Private API)  │   │   (Database & Storage)│ │
│ └──────────┬─────────────┘   └───────────┬───────────┘ │
└────────────┼─────────────────────────────┼─────────────┘
             └──────────────┬──────────────┘
                            ▼
                     [ PostgreSQL ]
                     [ Object Storage ]
```

1.  **Cloud Database (PostgreSQL):** Stores MOM metadata, user profiles, proxy configurations, and paths to assets.
2.  **Object Storage (S3/MinIO):** Stores the downloaded story MP4s, original high-res JPEGs, and `.mem` bundles.
3.  **Local Sync Engine (SQLite):** Used in the optional mobile companion app to cache sync states, file hashes, and queue uploads.

---

## VI. Designing the `.mem` File Format

The `.mem` format is a self-contained, open-standard archive (ZIP container) that stores everything required to reconstruct a memory:

### File Structure
```
story_2026-06-30_23-52.mem (ZIP Container)
├── manifest.json         # Layout positioning, text layers, music timestamps
├── metadata.json         # EXIF, camera data, locations, mentions
├── original/             # Uncompressed assets (RAW / JPG / MP4)
│   └── raw_sunset.dng
├── final/                # The final rendered story video
│   └── story_output.mp4
└── assets/               # Local fonts, stickers, and static assets used
    └── custom_sticker.png
```

### `manifest.json` Structure
```json
{
  "version": 1.0,
  "canvas": { "width": 1080, "height": 1920 },
  "timeline": {
    "duration_ms": 15000,
    "music": {
      "track_id": "spotify:track:45xYv...",
      "title": "Space Song",
      "artist": "Beach House",
      "start_time_ms": 42000,
      "volume": 0.8
    }
  },
  "layers": [
    {
      "type": "video",
      "source": "original/raw_sunset.dng",
      "transform": { "x": 0, "y": 0, "scale": 1.0, "rotation": 0 }
    },
    {
      "type": "text",
      "content": "Probably one of the best sunsets this year.",
      "font": "InstagramNeo",
      "color": "#FFFFFF",
      "transform": { "x": 0.5, "y": 0.7, "scale": 1.2, "rotation": -5 }
    },
    {
      "type": "mention",
      "username": "@aarav",
      "user_id": "184029482",
      "transform": { "x": 0.3, "y": 0.2, "scale": 1.0, "rotation": 0 }
    }
  ]
}
```

---

## VII. Gallery Metadata Integration & Visibility

To ensure the preserved files are fully portable and readable even without the MemWault application installed, MemWault injects its structured metadata directly into the media files (JPEGs and MP4s) using industry-standard headers (EXIF, IPTC, XMP, and QuickTime user data atoms).

### 1. What Metadata is Written into the Files?

MemWault embeds both standard photographic tags and a complete, nested JSON representation of the story properties directly inside the file headers. This makes the file 100% self-contained and future-proof.

#### The Embedded JSON Schema (Stored in EXIF `UserComment` & MP4 `uuid` Custom Box)
This JSON contains **everything** about the story context:
*   **Music Data:**
    *   `song_title`: Name of the track.
    *   `artist_name`: Name of the musician.
    *   `audio_asset_id`: Instagram’s audio ID.
    *   `start_time_ms`: Exact millisecond offset where the music starts playing.
    *   `play_duration_ms`: Duration of the clip.
    *   `spotify_track_id` / `apple_music_track_id`: Deep links to play the track on major streaming services.
*   **Stickers & Coordinates:**
    *   Coordinates (`x`, `y`, `width`, `height`, `rotation`, `z_index`) for every element.
    *   Interactive sticker configurations (e.g., location names, links, question prompts, and poll voting options).
*   **Static Interactivity Snapshots:**
    *   Final results of polls (percent option A vs. option B) and quiz options tallies at the time of archiving.
*   **Social & Engagement Metrics:**
    *   `replies`: Stored text logs of DMs/replies to this story.
    *   `viewer_count`: Total views.
    *   `viewers_list`: Array of user profiles that viewed the story (retrieved prior to story expiration).
*   **Original Creators (for Reposts):**
    *   `original_creator_username` & `original_creator_id`.
    *   Cached profile picture URLs of the original creator.

#### Photo Assets (JPEG/HEIC) Mapping:
*   **EXIF `DateTimeOriginal`:** Written with the exact timestamp when the story was *posted* on Instagram.
*   **EXIF `GPSLatitude` & `GPSLongitude`:** Populated from the location metadata of the Instagram location sticker (if present).
*   **EXIF `UserComment`:** Holds the complete **Embedded JSON Schema** containing all music, sticker, analytics, and repost data.
*   **IPTC `Caption-Abstract`:** Stores the text caption of the story.
*   **IPTC `Keywords` / `Subject`:** Stores a list of tagged usernames (e.g. `["@aarav", "@ishita"]`) and hashtags.
*   **XMP Custom Namespace (`xmlns:sv="http://ns.memwault.app/sv/1.0/"`):** Duplicate backup of the layout metrics.

#### Video Assets (MP4) Mapping:
*   **QuickTime Creation Date (`mdhd` / `mvhd`):** Set to the story posting timestamp.
*   **QuickTime Location (`©xyz`):** Populated with the ISO 6709 coordinates of the location tag.
*   **QuickTime Description (`©des`):** Contains the story's caption text, music track details (Song - Artist), list of tagged users, and a clickable link to the original Instagram story URL.
*   **QuickTime Artist / Author (`©ART`):** The username of the user who posted the story.
*   **QuickTime `udta` (User Data) Custom `uuid` Box:** Holds the complete **Embedded JSON Schema** containing all music, sticker, analytics, and repost data.

---

### 2. What Will Be Visible in Your Native Phone Gallery?

When you open a photo or video in a native gallery app (Samsung Gallery, Google Photos, or Apple Photos) and **swipe up** to view details, the following properties become visible:

#### A. Samsung Gallery (Android)
*   **Interactive Location Map:** The GPS coordinates trigger Samsung's built-in map UI, showing the exact location where the story's location sticker was set.
*   **Description Field with Clickable Links:** The story text caption and the original Instagram URL (written to EXIF `UserComment` or `ImageDescription`) are displayed in the info panel. On modern Samsung devices running One UI, the URL in the description is rendered as a clickable hyperlink that opens Instagram directly.
*   **Searchable Tags:** Tagged usernames (e.g., `@aarav`) appear in the Samsung search tag list. Tapping them groups all media containing that tag.

#### B. Google Photos (Android & iOS)
*   **Detailed Info Panel:** Swiping up shows the date/time the story was posted, the device name, and location details.
*   **Description Box:** Shows the story description/caption, music track details (Song - Artist), and the clickable link to the original story.
*   **Search Engine Indexing:** Google Photos indexes IPTC keywords and captions, allowing you to search `@aarav`, the song name, or a location name directly in the gallery's search bar to find that specific story.

#### C. Apple Photos (iOS)
*   **Visual Map:** Displays the story location on the native "Places" map.
*   **Caption Field:** Displays the custom caption text.
*   **Search Indexing:** People tags and location names are searchable natively within the gallery.

---

## VIII. Replay Engine & Re-Editing

The Replay Engine uses a web-based Canvas/WebGL renderer (compatible with HTML5 and PWAs) to parse the `.mem` container.
*   **Reconstructive Replay:** It loads the original background media and overlays the text elements, mentions, and locations at their exact coordinate ratios.
*   **Dynamic Audio Overlay:** If the main video's audio is missing or muted due to copyright, the engine queries the manifest's music metadata and plays the track from a connected streaming service (Spotify/YouTube) starting at the exact timestamp.
*   **Re-Editing (Future Layer):** Since layers are saved as vectors in the JSON manifest, users can drag text, change font sizes, substitute files, and export a new MP4 using client-side FFmpeg.wasm.

---

## IX. PWA vs. Native Android Application (The Airbud Model)

A key architectural question is whether to build MemWault as a **Progressive Web App (PWA)** or a **Native Android Application**.

### 1. The Airbud/Spotify Paradigm (Cloud-Polling API)
Your comparison to **Airbud** is spot-on. Airbud monitors Spotify listening activity across devices (phone, laptop, tablet) not by running a background monitor on your device, but by communicating directly with **Spotify’s cloud API** using your account connection.

MemWault can function in the exact same way:
*   **The Cloud Scraping Worker:** Instead of running on your phone, the scraping agent runs 24/7 on a cloud server (or a local home server). It polls Instagram’s cloud API using your session cookies.
*   **Zero Phone Overhead:** You post on Instagram normally. You do not need to open any app, and your phone does not need to run any background task or drain battery. The cloud server intercepts the story post, downloads the media, and parses the metadata.
*   **The PWA Console:** The PWA is simply a cross-platform visual timeline. Whenever you launch it (on phone, tablet, or laptop), it retrieves the archived memories directly from your cloud database.

---

### 2. PWA vs. Native App Comparison

| Capability | PWA + Cloud Server | Native Android App |
| :--- | :--- | :--- |
| **Routine Preservation (Zero touch)** | **Yes.** Stories are downloaded in the cloud automatically. | **Yes.** Background task polls and syncs locally. |
| **Cross-Device Accessibility** | **Yes.** Works instantly on Android, iOS, Windows, Mac, and Linux via a browser link. | **No.** Requires separate builds for Android, iOS, and PC. |
| **Deployment Complexity** | **Low.** Deploy once in the cloud; no app store approval or APK installs needed. | **Medium/High.** Requires sideloading APKs, managing OS version updates, and background service permissions. |
| **Silent Gallery Harvesting (Original RAWs)** | **No.** PWAs are sandboxed and cannot access your local photo gallery in the background when the app is closed. | **Yes.** Can register a foreground service or `WorkManager` task to silently watch storage and upload RAW files. |
| **Battery & CPU Consumption** | **Zero.** Processing runs entirely on the cloud server. | **Low to Medium.** Continuous gallery indexing and local background tasks consume battery. |

---

### 3. Architectural Verdict: Choose PWA + Cloud Server

For your goal of **preserving your existing routines** while keeping it **easy to deploy across devices**, the **PWA + Cloud Server** architecture is the optimal path.

*   **How it handles the MVP features:** The cloud server handles 100% of the scraping, media downloading, music timestamp indexing, and sticker parsing in the background. The PWA gives you a beautiful, platform-agnostic interface to replay the memories.
*   **How it handles High-Res Originals:** To bypass the PWA background gallery limitation, you can:
    1.  **Manual Sync:** Open the PWA, view a story, and tap a button to manually upload the original RAW from your gallery.
    2.  **External Gallery Sync (Optional):** Use a standard, non-rooted sync service (like Google Photos API, Nextcloud, or Syncthing) to back up your gallery folder. The cloud server can scan that backup folder and automatically replace the compressed story asset with the high-res file by matching timestamps.

---

## X. V-1 MVP Implementation Scope & Suffixing Rules

To establish a highly stable V-1 prototype and bypass operating system storage limitations, we are defining a specific subset of features for the initial implementation:

### 1. Scope Boundaries for V-1
*   **No Active Gallery Crawling:** The V-1 MVP will bypass all background gallery observer tasks, local storage notifications, and on-device crawlers.
*   **Pure Cloud Polling:** The pipeline will rely entirely on the cloud worker polling the Instagram API via session cookies to retrieve and back up active stories.
*   **Asset Type:** MemWault will archive the compressed photos and videos downloaded directly from Instagram's CDN.
*   **Uncompromised Metadata:** Although the media asset is compressed, the final files will still have the comprehensive metadata (nested JSON layout manifest, music IDs, locations, mentions) injected directly into their file headers.

### 2. Naming Suffix Rule for V-1 Files
To differentiate downloaded CDN assets from future uncompressed RAW files, any media downloaded by the V-1 scraper will be formatted as follows:
*   **Naming Format:** `story_[YYYY-MM-DD]_[STORY_ID] (Compressed).[ext]`
*   *Example:* `story_2026-07-01_18392049283 (Compressed).mp4`

---

## XI. Tech Stack & API Specifications

To implement the **PWA + Cloud Server** architecture, the following technology stack and API endpoints are specified:

### 1. The Technology Stack

#### A. Frontend (Progressive Web Application)
*   **Framework:** React with Vite. Vite is extremely lightweight, compiles instantly, and has excellent first-party templates for PWAs.
*   **PWA Integrator:** Vite PWA Plugin (`vite-plugin-pwa`) which automates Service Worker generation, configures Workbox caching strategies, and sets up the offline-first web manifest.
*   **Styling & UI:** Vanilla CSS with custom properties (CSS variables) for HSL colors, glassmorphism UI structures, and dark-mode optimization.
*   **Interactive Replay Canvas:** PixiJS (HTML5/WebGL 2D rendering library) to accurately position and animate vectors, texts, and location stickers over the video/photo container.
*   **Client Database:** IndexedDB (via the `idb` wrapper library) for client-side caching of the story timeline structure.

#### B. Backend Engine (Cloud Worker)
*   **Runtime:** Node.js (TypeScript) or Python 3.11.
    *   *Recommendation:* **Python** is selected for V-1 because of its highly mature and continuously maintained Instagram private API libraries (`instagrapi`) and native metadata wrapper tools.
*   **Relational Database:** PostgreSQL (stores users, session cookie caches, story nodes, sticker coordinates, and logs).
*   **Object Storage (Media Storage):** MinIO (an open-source S3-compliant container for self-hosting) or Amazon S3.
*   **Task Queue & Cron:** Celery with Redis as the broker to manage the 15-minute background polling cron loop.
*   **Metadata Writer:** `ExifTool` wrapped in Python (`PyExifTool`). `ExifTool` is the industry-standard binary capable of injecting custom nested XMP namespaces, IPTC keywords, and QuickTime `uuid` boxes into JPEGs and MP4 containers without corrupting the files.

---

### 2. Required API Endpoints

MemWault integrates three distinct categories of APIs:

#### A. Instagram Private Mobile APIs (Cloud Scraper Layer)
These endpoints are polled by the cloud worker to fetch stories and metadata:
*   **Authentication API (`POST /api/v1/accounts/login/`):** Logs in using credentials and generates/caches session cookies (`sessionid`, `ds_user_id`, `csrftoken`).
*   **Active Stories Reel Feed (`GET /api/v1/feed/reels_media/`):** Request payload contains target `user_ids`. Returns active stories containing CDN download URLs, GPS location details, links, text components, and viewer interaction metrics.
*   **Reel Viewer Feed (`GET /api/v1/media/{media_id}/list_reel_media_viewer/`):** Returns the list of users who have viewed your active story before the 24-hour expiration window.
*   **Media Detail API (`GET /api/v1/media/{media_id}/info/`):** Resolves information for specific historical stories or highlights.

#### B. Streaming Music Integrations (Optional Meta Matching Layer)
*   **Spotify Web API (`GET /v1/search`):** Queried using the scraped song name and artist name from `story_music_stickers`. Returns the exact Spotify Track ID and URL, which is written to the metadata.
*   **YouTube Music API:** Fallback lookup to retrieve audio links if the song is not indexed in Spotify's regional catalog.

#### C. Web PWA Browser APIs (Client-side Layer)
*   **Share Target API:** Allows users to share historical posts, profiles, or highlights directly from the official Instagram app into the MemWault PWA (using the "Share To..." function). This is used **exclusively for importing older archived memories or highlights on-demand**. Active daily stories are scraped **100% automatically** via the cloud-polling worker, requiring no manual sharing.
*   **Background Sync API / Background Fetch API:** Defer uploads of original gallery assets or manual metadata updates when offline.
*   **Geolocation API:** Reads local coordinates to cross-reference location stickers.

---

## XII. Threat Model & Future-Proofing

1.  **Instagram API Changes:** Instagram frequently modifies its private API response format.
    *   *Mitigation:* The scraper parser relies on a translation layer. If a field name changes, the cloud backend can be patched without updating the mobile companion app.
2.  **Anti-Scraping / Account Security:** Meta actively flags automated activity from cloud servers.
    *   *Mitigation:* Instead of logging in from AWS/GCP, the background requests are routed through a home server IP or the user's phone background worker. The requests match the user's authentic device headers and geographic location.
3.  **OS Sandboxing Hardening:** Google and Apple regularly restrict background sync.
    *   *Mitigation:* If background execution is terminated by the OS, MemWault falls back to a PWA interface where the user manually triggers a quick sync when they open the app.

---

## XIII. Business & SaaS Potential

*   **Self-Hosted Community (GitHub):** An open-source Docker-compose bundle containing the cloud worker, Postgres database, and PWA dashboard. Ideal for tech-savvy developers and privacy enthusiasts.
*   **Managed SaaS (Pixel Labs):** A premium service that manages server deployment, provides secure residential proxies to eliminate ban risks, handles automated cloud storage backups, and generates monthly AI summaries.

---

## XIV. Phased Implementation Roadmap

1.  **Phase 1: MVP (Cloud Archive & PWA Timeline):** Build local cache harvester scripts for Android, configure the cloud worker to fetch stories, and output files with the `(Compressed)` suffix format. Define the metadata mapping schema.
2.  **Phase 2: Alpha/Beta (The MOM Engine):** Integrate the `.mem` hybrid container and deploy local OCR/face clustering models.
3.  **Phase 3: SaaS and Distributed Scaling:** Launch managed cloud hosting (Pixel Labs) and automated off-site backup.

---

## XV. Verdict: The Best Path Forward

To achieve the user's request for a **non-rooted phone** setup that runs **silently in the cloud** with **zero day-to-day user interaction**:

### Recommended Architecture: The Cloud-Polling Scraper with Residential Proxies

```
  ┌────────────────────────────────────────────────────────┐
  │ 1. User posts story on official Instagram app normally │
  └───────────────────────────┬────────────────────────────┘
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 2. Cloud Server polls Instagram API via cookies        │
  └───────────────────────────┬────────────────────────────┘
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 3. Cloud Server downloads story media & JSON metadata  │
  └───────────────────────────┬────────────────────────────┘
                              ▼
  ┌────────────────────────────────────────────────────────┐
  │ 4. Cloud Server files metadata and media into MOM DB   │
  └────────────────────────────────────────────────────────┘
```

*   **How it works:** You host a small scraper instance in the cloud (or on a local machine/PC). It uses your Instagram session cookies. Every 15 minutes, it checks your profile. When you post a story, it automatically saves the video/image and all sticker metadata without you ever opening our app.
*   **Limitations:** This method will **only** capture the compressed version posted to Instagram. It cannot fetch the original uncompressed photo/video from your camera roll unless a background companion app is added to the phone.

### The Hybrid Alternative: The Phone Background Worker (Android Only)
*   **How it works:** A background app runs on your phone using standard WorkManager. When you post, it pulls your story data locally (using your phone's network connection, avoiding cloud IP bans) and checks your gallery for the original files, uploading both to the cloud.

---

### Open Questions for Design Verification

1.  **Account Lock Risks vs. Convenience:** Are you comfortable utilizing your personal Instagram session cookies in a cloud-polling system, knowing there is a small risk of triggering password resets or temporary locks by Meta, or would you prefer a safer local phone-based background worker?
2.  **Original Assets:** Is it acceptable if the cloud-only system preserves *only* the compressed, compiled story, or is having a lightweight background app on your phone to upload the uncompressed gallery files critical to your vision?
3.  **Setup Complexity:** Would you prefer to deploy this on a local machine/Raspberry Pi at home (safer for IP verification) or run it entirely on a cloud provider?
