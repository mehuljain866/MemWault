# MemWault — Metadata & Sidecar Architecture

MemWault treats the original media file and its surrounding contextual metadata as an indivisible archival unit.

---

## 📄 What Gets Preserved

For every single memory archived, MemWault extracts and stores:

| Component | Attribute | Description |
| :--- | :--- | :--- |
| **Media Asset** | Raw File | Uncompressed photo (`.jpg`) or original video (`.mp4`) |
| **Timestamp** | Capture Time | Exact UTC timestamp of creation |
| **Caption** | Story Text | Original sticker captions and overlay text |
| **Music Track** | Soundtrack | Song title, artist name, and 30s preview audio URL |
| **Location** | Geolocation | Named location venue & GPS latitude/longitude coordinates |
| **Mentions** | Tagged Users | Usernames tagged in the story |
| **Engagement** | Metrics | Viewer Count & Story Like Count |
| **Journal** | Sidecar Note | User-authored markdown journal saved as `.md` file |
| **Highlight** | Album Membership | Custom album collections & dynamic cover positions |

---

## 📝 Portable Sidecar Format

When a journal note is edited in MemWault, it is auto-synced as a human-readable Markdown file right next to the media file:

```markdown
---
id: "1786600791480"
timestamp: "2026-07-13T19:12:00Z"
location: "Tokyo, Japan"
latitude: 35.6762
longitude: 139.6503
music_title: "Daylight"
music_artist: "David Kushner"
viewer_count: 142
like_count: 28
mentions: ["nicnelsonn", "joshjanssenn"]
---

# Tokyo Rain Evening

I had been trying to get this shot for weeks, but I finally got it on a rainy Tuesday in Shinjuku.
```
