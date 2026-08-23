# Changelog

All notable changes to MemWault are documented in this file.

## [3.2.0]

### Added
- **Pocket Companion PWA (/pocket):** Mobile companion interface with panoramic pivot navigation across Start, Memories, Highlights, Feed, Journal, Music, and Settings.
- **Offline Storage & Caching:** IndexedDB and CacheStorage support for offline browsing and background media syncing.
- **QR Device Pairing:** Single-use QR pairing tickets that burn upon first scan and issue scoped companion tokens.
- **Real-Time Pairing Detection:** Live scan handshake that detects mobile pairing and displays connected companion devices.
- **Remote Tunneling:** Integrated Cloudflare quick tunnels to allow remote syncing over mobile data without port forwarding.
- **Single-Port Production Serving:** FastAPI backend serves pre-compiled SPA bundles directly from port 8000.
- **Journal App & Memory Picker:** Interactive memory picker to attach Markdown notes to archived moments.
- **Multi-Era Themes:** Handcrafted visual shells including Modern, Windows 98, Y2K, and Aqua.

## [3.1.0]

### Added
- **Mobile QR Upload Portal:** Direct mobile-to-desktop photo and video uploads over local Wi-Fi.
- **Hardware-Accelerated Widgets:** Matrix transform animations for desktop gadget dragging.

## [3.0.0]

### Added
- **Desktop Window Paradigm:** Interactive desktop environment with Start menu, taskbar, draggable windows, and active gadgets.
- **Multi-Era Design Architecture:** Theme engine supporting Modern, Windows 98, Y2K, and Aqua.

## [2.6.0]

### Added
- **Feed Posts & Carousels:** Ingestion pipeline for multi-slide carousels, video posts, and full-resolution master files.
- **RAW Master Versioning:** Swap between compressed social media copies and original camera files.

## [2.5.0]

### Added
- **Memory Object Model:** Standardized entity modeling for stories and contextual metadata.
- **Extended Documentation:** Detailed technical guides in /docs for architecture, authentication, storage, and APIs.
- **Docker Compose Setup:** Multi-container deployment configuration with PostgreSQL, Redis, MinIO, FastAPI, and Celery.

## [2.4.0]

### Added
- **Engagement Metrics:** Tracking for viewer counts and like counts.
- **EXIF/XMP Embedding:** Metadata tagging using ExifTool.

## [2.3.0]

### Added
- **Sidecar Journaling:** Contextual Markdown notes stored alongside media files on disk.
- **Dynamic Highlights:** Custom album covers with multi-image grid layouts.

## [2.2.0]

### Added
- **Archives & Trash:** Soft-delete and restore capabilities for stories.
- **Search Engine:** Full-text search across story captions and metadata.

## [2.1.0]

### Added
- **Highlight Albums:** Curate downloaded stories into custom collections.
- **S3 Pre-Signed URLs:** Support for decoupled object storage environments.

## [2.0.0]

### Added
- **Continuous Timeline:** Smooth semantic zoom across Years, Months, and Days views.
- **Spatial Map:** Geographic map view with marker clustering.
