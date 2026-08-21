"""
MemWault Desktop Integration

Some MemWault features must launch a GUI program on the machine the user is
sitting in front of: "Show in Folder" opens the native file manager, and the
Instagram browser login opens a real Chromium window.

These only work when the backend process runs inside the user's own desktop
session. Inside Docker there is no file manager and no display server, so the
features cannot work no matter how the call is made. This module centralises
that detection so the API can fail with an explanation instead of returning
"success" while nothing visibly happens.

It also handles raising a window to the foreground on Windows, which needs more
than SetForegroundWindow (see _force_foreground below).
"""

import logging
import os
import subprocess
import sys
from pathlib import Path

logger = logging.getLogger("memwault.desktop")

SW_RESTORE = 9


class DesktopUnavailable(RuntimeError):
    """Raised when the host has no desktop session to launch GUI apps into."""


# ── Environment detection ────────────────────────────────
def in_container() -> bool:
    """Best-effort detection of Docker / Podman / Kubernetes."""
    if os.environ.get("MEMWAULT_IN_CONTAINER", "").lower() in ("1", "true", "yes"):
        return True
    if Path("/.dockerenv").exists():
        return True
    try:
        cgroup = Path("/proc/1/cgroup")
        if cgroup.exists():
            content = cgroup.read_text(errors="ignore")
            if any(m in content for m in ("docker", "containerd", "kubepods", "podman")):
                return True
    except Exception:
        pass
    return False


def has_display() -> bool:
    """Whether a GUI can plausibly be shown from this process."""
    if sys.platform in ("win32", "darwin"):
        # Windows/macOS always have a window server when not containerised.
        return not in_container()
    return bool(os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY"))


def describe_environment() -> dict:
    """Diagnostic snapshot, surfaced in API errors and logs."""
    return {
        "platform": sys.platform,
        "in_container": in_container(),
        "has_display": has_display(),
        "cwd": str(Path.cwd()),
    }


def ensure_desktop_available(feature: str) -> None:
    """
    Raise DesktopUnavailable with an actionable message when `feature` cannot
    possibly work in the current environment.
    """
    env = describe_environment()
    if env["in_container"]:
        raise DesktopUnavailable(
            f"{feature} needs the backend to run on your own computer, but it is "
            f"running inside a container. Containers have no file manager or "
            f"desktop to open windows on. Start the backend on the host instead "
            f"(techstack/backend: uvicorn app.main:app --port 8000), or use "
            f"start.bat."
        )
    if not env["has_display"]:
        raise DesktopUnavailable(
            f"{feature} needs a desktop session, but no display was detected "
            f"(DISPLAY/WAYLAND_DISPLAY are unset). This usually means the backend "
            f"is running over SSH or as a headless service."
        )


# ── Opening files and folders ────────────────────────────
def open_folder(folder: Path) -> str:
    """
    Open `folder` in the native file manager.

    Arguments are passed as an argv list rather than through a shell, so paths
    containing spaces, quotes or '&' cannot be interpreted as commands.
    """
    ensure_desktop_available("Opening the media folder")
    folder = Path(folder).resolve()
    folder.mkdir(parents=True, exist_ok=True)

    logger.info("Opening folder in file manager: %s", folder)

    if sys.platform == "win32":
        try:
            os.startfile(str(folder))
        except Exception as e:
            logger.warning("os.startfile failed (%s), running explorer.exe", e)
            subprocess.Popen(f'explorer.exe "{str(folder)}"', shell=True)
        return "Opened in File Explorer"

    if sys.platform == "darwin":
        _run_gui(["open", str(folder)])
        return "Opened in Finder"

    _run_gui(["xdg-open", str(folder)])
    return "Opened in file manager"


def reveal_file(file_path: Path) -> str:
    """
    Open the native file manager with `file_path` selected, falling back to
    simply opening its parent folder when the file is missing.
    """
    ensure_desktop_available("Showing a file in the file manager")
    file_path = Path(file_path).resolve()

    if not file_path.exists():
        logger.warning("reveal_file: %s does not exist, opening parent", file_path)
        parent = file_path.parent
        return open_folder(parent if parent.exists() else Path.cwd())

    logger.info("Revealing file in file manager: %s", file_path)

    if sys.platform == "win32":
        # explorer.exe requires /select,"<path>" as a command line string.
        # Passing as a list ["explorer.exe", "/select,path"] causes CreateProcess
        # to quote the whole flag as "/select,C:\...", which explorer cannot parse
        # and defaults to opening Documents.
        clean_path = str(file_path).replace('"', '')
        subprocess.run(f'explorer.exe /select,"{clean_path}"', check=False)
        return "Revealed in File Explorer"

    if sys.platform == "darwin":
        _run_gui(["open", "-R", str(file_path)])
        return "Revealed in Finder"

    try:
        _run_gui(["nautilus", "--select", str(file_path)])
    except DesktopUnavailable:
        _run_gui(["xdg-open", str(file_path.parent)])
    return "Revealed in file manager"


def _run_gui(argv: list[str]) -> None:
    """Launch a GUI helper, converting 'command not installed' into a clear error."""
    try:
        subprocess.Popen(argv)
    except FileNotFoundError as exc:
        raise DesktopUnavailable(
            f"'{argv[0]}' is not installed on this machine, so MemWault cannot "
            f"open your file manager."
        ) from exc


# ── Windows foreground handling ──────────────────────────
def snapshot_windows() -> set:
    """
    Capture the set of top-level window handles that exist right now.

    Diffing against this after launching a browser identifies that browser's
    window precisely, instead of guessing from window titles - the previous
    approach matched any title containing "chrome", which reliably picked the
    user's own browser (the one displaying MemWault) rather than the new one.
    """
    if sys.platform != "win32":
        return set()
    try:
        import ctypes
        import ctypes.wintypes

        user32 = ctypes.windll.user32
        user32.EnumWindows.argtypes = [ctypes.c_void_p, ctypes.wintypes.LPARAM]
        user32.EnumWindows.restype = ctypes.c_bool

        found = set()

        @ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
        def _cb(hwnd, _lparam):
            found.add(hwnd)
            return True

        user32.EnumWindows(ctypes.cast(_cb, ctypes.c_void_p), 0)
        return found
    except Exception as exc:  # pragma: no cover - diagnostics only
        logger.debug("snapshot_windows failed: %s", exc)
        return set()


def raise_new_window(before: set, title_hint: str = "") -> bool:
    """
    Bring a window created since `before` to the foreground.

    Returns True if a window was raised. Never raises - failing to focus a
    window must not fail the login itself.
    """
    if sys.platform != "win32":
        return False
    try:
        import ctypes
        import ctypes.wintypes

        user32 = ctypes.windll.user32
        kernel32 = ctypes.windll.kernel32

        # Explicit argtypes/restype are required: ctypes defaults restype to
        # c_int, which truncates 64-bit HWNDs to garbage on 64-bit Windows.
        user32.EnumWindows.argtypes = [ctypes.c_void_p, ctypes.wintypes.LPARAM]
        user32.EnumWindows.restype = ctypes.c_bool
        user32.GetWindowTextLengthW.argtypes = [ctypes.wintypes.HWND]
        user32.GetWindowTextLengthW.restype = ctypes.c_int
        user32.GetWindowTextW.argtypes = [ctypes.wintypes.HWND, ctypes.c_wchar_p, ctypes.c_int]
        user32.IsWindowVisible.argtypes = [ctypes.wintypes.HWND]
        user32.IsWindowVisible.restype = ctypes.c_bool
        user32.GetForegroundWindow.restype = ctypes.wintypes.HWND
        user32.GetWindowThreadProcessId.argtypes = [ctypes.wintypes.HWND, ctypes.c_void_p]
        user32.GetWindowThreadProcessId.restype = ctypes.wintypes.DWORD
        user32.SetForegroundWindow.argtypes = [ctypes.wintypes.HWND]
        user32.SetWindowPos.argtypes = [
            ctypes.wintypes.HWND, ctypes.wintypes.HWND,
            ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int,
            ctypes.wintypes.UINT
        ]
        user32.SetWindowPos.restype = ctypes.c_bool

        IGNORED_TITLES = {"", "default ime", "msctfime ui", "chrome legacy window", "gdi+ window"}
        candidates = []

        @ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.wintypes.HWND, ctypes.wintypes.LPARAM)
        def _cb(hwnd, _lparam):
            if hwnd in before or not user32.IsWindowVisible(hwnd):
                return True
            length = user32.GetWindowTextLengthW(hwnd)
            if length <= 0:
                return True
            buf = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buf, length + 1)
            val = buf.value.strip()
            if val.lower() not in IGNORED_TITLES:
                candidates.append((hwnd, val))
            return True

        user32.EnumWindows(ctypes.cast(_cb, ctypes.c_void_p), 0)

        if not candidates:
            logger.debug("raise_new_window: no new top-level windows appeared")
            return False

        # Prefer a new window whose title matches the hint; otherwise take the
        # first valid non-ignored window.
        target = candidates[0][0]
        if title_hint:
            hint = title_hint.lower()
            for hwnd, title in candidates:
                if hint in title.lower():
                    target = hwnd
                    break

        # SetForegroundWindow only succeeds for the process owning the current
        # foreground window. Attaching our input queue to that thread grants the
        # rights; without this the taskbar button merely flashes.
        fg = user32.GetForegroundWindow()
        fg_tid = user32.GetWindowThreadProcessId(fg, None) if fg else 0
        our_tid = kernel32.GetCurrentThreadId()

        attached = False
        if fg_tid and fg_tid != our_tid:
            attached = bool(user32.AttachThreadInput(our_tid, fg_tid, True))
        try:
            HWND_TOPMOST = ctypes.wintypes.HWND(-1)
            HWND_NOTOPMOST = ctypes.wintypes.HWND(-2)
            SWP_FLAGS = 0x0001 | 0x0002 | 0x0040  # SWP_NOSIZE | SWP_NOMOVE | SWP_SHOWWINDOW

            user32.ShowWindow(target, SW_RESTORE)
            user32.SetWindowPos(target, HWND_TOPMOST, 0, 0, 0, 0, SWP_FLAGS)
            user32.SetWindowPos(target, HWND_NOTOPMOST, 0, 0, 0, 0, SWP_FLAGS)
            user32.BringWindowToTop(target)
            user32.SetForegroundWindow(target)
        finally:
            if attached:
                user32.AttachThreadInput(our_tid, fg_tid, False)

        logger.info("Raised browser window to foreground (hwnd=%s)", target)
        return True
    except Exception as exc:  # pragma: no cover - diagnostics only
        logger.debug("raise_new_window failed: %s", exc)
        return False
