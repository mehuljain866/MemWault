# MemWault — Bug Fixes

Two reported bugs, plus eleven found while tracing them. Everything below is
verified, not theorised — see **Verification** at the bottom.

Nothing was changed for style or preference. Every item is a real defect.

---

## The two reported bugs

### 1. "Connect with Instagram" never showed the login window

**Root cause:** the window was opening — it just went behind everything, and the
code then raised the *wrong* window.

`browser_login.py` picked which window to focus by matching its title:

```python
if "instagram" in title or "chrome" in title or "chromium" in title:
```

`EnumWindows` returns windows roughly front-to-back, so the first match is
normally **the user's own Chrome window — the one displaying MemWault**. The code
raised that and stopped enumerating. The real login window stayed hidden.

Two further problems in the same block:

- `SetForegroundWindow` is refused by Windows for a process that doesn't own the
  current foreground window. Without `AttachThreadInput`, the taskbar button just
  flashes. This is documented Windows behaviour, not a bug in Playwright.
- The `ctypes` calls had no `argtypes`/`restype`. ctypes defaults a return type to
  `c_int` (32-bit), so `GetForegroundWindow()` **truncates a 64-bit HWND** to
  garbage on 64-bit Windows.

**Fix:** the window is now identified by diffing the top-level window list
captured *before* launch — no title guessing — and raised via `AttachThreadInput`
with correct `argtypes`. Logic moved to `app/desktop.py` (`snapshot_windows`,
`raise_new_window`).

**Ruled out by testing:** the Windows event-loop policy. Playwright launches fine
from a FastAPI worker thread; that popular theory was wrong here.

### 2. "Open Local Media Folder" did nothing

Same underlying story — a background server process cannot reliably raise a GUI
window — plus the launch method itself was fragile:

```python
subprocess.Popen(f'cmd.exe /c start "" explorer.exe "{folder_path}"', shell=True)
```

**Fixes:**
- Uses `os.startfile()` on Windows, which goes through `ShellExecute` and *is*
  granted foreground rights. `Popen('explorer.exe')` is not.
- `shell=True` with an interpolated path was a **command-injection vector** — a
  path containing `&` or `"` would execute arbitrary commands. All launches now
  pass an argv list with no shell.
- The endpoint returns the resolved path, and the UI displays it, so if the
  window still lands behind the browser you can see *which* folder opened. That
  path is relative to the backend's working directory, which surprises people.
- `explorer.exe` **exits with code 1 even on success**, so return codes are never
  treated as a failure signal.

### Both: they now fail loudly instead of silently

Neither feature can work when the backend runs in Docker — no file manager, no
display. Previously the folder endpoint could return `{"status": "success"}` while
nothing happened. Both now detect the environment and return **HTTP 501** with an
explanation naming the fix.

---

## Critical bugs found while tracing

### 3. Editing a story's location was completely broken

`main.py` mounted `StaticFiles` at `/api/v1/media` **before** including the router.
Starlette matches routes in registration order and a `Mount` matches on prefix, so
the mount also swallowed `PUT /api/v1/media/{story_id}/location`, which returned
**405 Method Not Allowed**. Setting a location silently did nothing.

The mount was redundant with the router's own `GET /media/{path}` handler, and
worse, it ignored `MEMWAULT_STORAGE_LOCAL_DIR` (hardcoded `data/media`). Removed.

### 4. Unauthenticated arbitrary file read (path traversal)

`serve_local_media` built its path with no containment check:

```python
file_path = Path(settings.storage_local_dir) / rest_of_path
```

The endpoint is deliberately unauthenticated — browsers don't send the
`Authorization` header for `<img src>` — which makes containment essential.
`../../..` in the URL would read **any file the server process can**, including
`memwault.db` and the `.env` holding the JWT signing secret.

This was masked by the StaticFiles mount, so fixing #3 would have *exposed* it.
Now containment-checked with `is_relative_to` and logged on refusal.

### 5. A latent `NameError` that would have broken every image

`Path` was imported only *inside* three functions, never at module level — yet
`serve_local_media` used it. That route never executed (shadowed by the mount), so
the bug was invisible. Removing the mount would have made **every media request
return 500**. Caught during verification, before it shipped.

### 6. Settings and Dashboard 500 with two Instagram accounts

Three queries used `scalar_one_or_none()` on non-unique result sets:

- `GET /instagram/session`
- `POST /instagram/renew` (unfiltered — *any* user who ever connected a second
  account)
- `GET /dashboard/stats`

There is no unique constraint on `(user_id, ig_username)`, and `disconnect` only
flips `is_valid` rather than deleting. So a second account produces multiple rows
and `MultipleResultsFound` — a 500 on the Settings page and the dashboard. Now
ordered by `last_login` with `.limit(1)`.

---

## Configuration bugs (all silent)

### 7. `.env.example` was entirely inert

`config.py` sets `env_prefix = "MEMWAULT_"`, but the example file declared
`POSTGRES_USER`, `S3_ENDPOINT_URL`, `REDIS_URL`, `INSTAGRAM_USERNAME` **unprefixed**.
Pydantic ignores unrecognised names without warning, so every one of those was
discarded and the code default won. Only the two `MEMWAULT_`-prefixed lines did
anything.

It also defined `DATABASE_URL=postgresql+asyncpg://${POSTGRES_USER}...`, which is
doubly dead: pydantic-settings does not interpolate `${...}`, and `database_url` is
a computed `@property` that env vars cannot override.

> ⚠️ **If you have an existing `.env`, read this before adopting the new one.**
> Your settings have been ignored this whole time. Adding the `MEMWAULT_` prefix
> makes them *live* — if the file says postgres or s3, the app will switch backend
> and look like it lost every memory. It hasn't; it's reading a different database.

### 8. The Docker stack ignored Postgres and MinIO

`docker-compose.yml` started Postgres, Redis and MinIO but never set
`MEMWAULT_DATABASE_TYPE` or `MEMWAULT_STORAGE_TYPE`. Since `config.py` defaults to
`sqlite` + `local`, the whole stack ran on **SQLite and container-local disk** while
Postgres and MinIO sat idle.

`MEMWAULT_CELERY_ALWAYS_EAGER` also defaults to `true`, which points Celery at an
in-memory broker and runs tasks inline in the API process — so the `celery-worker`
and `celery-beat` containers did nothing at all. Both now set explicitly, via a
YAML anchor so the three services can't drift.

### 9. ExifTool never ran, on any platform

`metadata.py` looked for exactly one hardcoded path:

```python
exiftool_path = backend_dir / "exiftool_bin" / "exiftool.exe"
```

That is Windows-only, and `exiftool_bin/` is `.gitignore`d so it isn't in the repo.
EXIF/XMP embedding therefore silently no-opped everywhere. Now falls back to
`shutil.which("exiftool")` on `PATH`, is platform-correct, and logs one clear
warning when genuinely absent instead of an error per file.

### 10. Highlight cover uploads

- Saved to a hardcoded `data/media/covers`, ignoring `MEMWAULT_STORAGE_LOCAL_DIR`.
  Covers broke for anyone who configured a different media directory — and this
  had to be fixed for consistency with #3.
- The file extension was taken from the upload and reused verbatim. Covers are
  served back from your own origin, so an uploaded `.html` would run as same-origin
  script. Now restricted to an image allowlist.

### 11. `requirements.txt` was UTF-16

Encoded UTF-16LE with a BOM — the classic result of `pip freeze > requirements.txt`
in PowerShell 5.1, where `>` defaults to UTF-16. It renders as unreadable garbage
in editors and diffs. Re-encoded to UTF-8 (verified to still install cleanly).

### 12. README `celery` command named a module that doesn't exist

`celery -A app.worker worker` — there is no `app/worker.py`. The Celery app lives in
`app.scraper.tasks`, as `docker-compose.yml` already had correct.

Also documented: ExifTool as an optional dependency, that Redis is *not* required
by default (eager mode), and that the two desktop features need the backend on the
host OS.

---

## Verification

| Check | Result |
| :--- | :--- |
| `python -m compileall` on `app/` and `scripts/` | pass |
| FastAPI app imports; route table inspected | pass — no mounts, both `/media` routes present |
| End-to-end HTTP suite against the real app | **14 / 14 pass** |
| `PUT /media/{id}/location` no longer 405 | pass (404 "Story not found" — reaches the handler) |
| `GET /media/{path}` serves real bytes | pass (regression test for #5) |
| Path traversal, 5 encodings incl. `%2e%2e%2f` | all blocked and logged |
| `POST /storage/open-folder` | 200, returns resolved path, Explorer opened |
| Unauthenticated access still rejected | pass (403) |
| `pip install -r requirements.txt` | exit 0 |
| `npm run build` | exit 0 |
| `shell=True` / `eval` / `exec` / `pickle` remaining in backend | none |

### Files changed

```
techstack/backend/app/desktop.py              (new — desktop integration + window focus)
techstack/backend/app/main.py                 (StaticFiles mount removed)
techstack/backend/app/api/routes.py           (traversal, 405, MultipleResultsFound, injection, covers)
techstack/backend/app/scraper/browser_login.py(window targeting, clearer launch errors)
techstack/backend/app/scraper/metadata.py     (cross-platform exiftool lookup)
techstack/backend/.env.example                (MEMWAULT_ prefix)
techstack/backend/requirements.txt            (UTF-16 → UTF-8)
techstack/docker-compose.yml                  (db/storage/celery config)
techstack/frontend/src/pages/Settings.jsx     (show resolved folder path)
README.md                                     (celery command, prerequisites)
```

### Still worth doing

- No automated test suite exists. Bugs #3, #5 and #6 would all have been caught by
  one. The end-to-end script used here is a reasonable starting point.
- `disconnect` invalidates sessions but never deletes them, so
  `instagram_sessions` grows forever. A unique constraint on
  `(user_id, ig_username)` would prevent the duplicate-row class of bug at the
  schema level rather than per query.
- Frontend bundle is 1.88 MB (608 KB gzipped) in a single chunk.
