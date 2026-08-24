"""
MemWault Cloudflare Remote Tunnel Manager
Allows mobile devices on 4G/5G mobile data to connect to the local laptop vault
via a secure, zero-config HTTPS quick tunnel (trycloudflare.com).
"""

import os
import re
import sys
import time
import json
import shutil
import logging
import threading
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any

logger = logging.getLogger("memwault.tunnel")

class TunnelManager:
    _instance: Optional['TunnelManager'] = None
    
    def __init__(self):
        self.process: Optional[subprocess.Popen] = None
        self.tunnel_url: Optional[str] = None
        self.is_running: bool = False
        self.started_at: Optional[float] = None
        self.lock = threading.Lock()
        self.output_logs = []

    @classmethod
    def get_instance(cls) -> 'TunnelManager':
        if cls._instance is None:
            cls._instance = TunnelManager()
        return cls._instance

    def _find_cloudflared(self) -> Optional[str]:
        # 1. Project tools directory
        base_dir = Path(__file__).resolve().parent.parent.parent.parent
        project_tool = base_dir / "tools" / "cloudflared.exe"
        if project_tool.exists():
            return str(project_tool)
        
        # 2. System PATH
        which_path = shutil.which("cloudflared")
        if which_path:
            return which_path
            
        return None

    def start_tunnel(self, target_port: int = 8000, timeout: float = 20.0, force_restart: bool = False) -> Dict[str, Any]:
        with self.lock:
            if not force_restart and self.is_running and self.tunnel_url and self.process and self.process.poll() is None:
                return {
                    "status": "active",
                    "url": self.tunnel_url,
                    "target_port": target_port,
                    "started_at": self.started_at
                }

            # Stop and terminate any lingering previous process
            if self.process:
                try:
                    self.process.terminate()
                    self.process.wait(timeout=2)
                except Exception:
                    try:
                        self.process.kill()
                    except Exception:
                        pass
                self.process = None

            self.is_running = False
            self.tunnel_url = None

            binary_path = self._find_cloudflared()
            if not binary_path:
                raise FileNotFoundError("cloudflared binary not found in tools/ or system PATH.")

            logger.info("Starting Cloudflare quick tunnel targeting port %d with %s", target_port, binary_path)
            
            cmd = [binary_path, "tunnel", "--url", f"http://127.0.0.1:{target_port}", "--http-host-header", f"localhost:{target_port}"]
            
            try:
                self.process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                    creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
                )
            except Exception as e:
                logger.error("Failed to launch cloudflared: %s", e)
                raise RuntimeError(f"Failed to launch cloudflared: {e}")

            self.tunnel_url = None
            self.is_running = True
            self.started_at = time.time()
            self.output_logs = []

            url_found_event = threading.Event()

            def reader_thread():
                url_pattern = re.compile(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com')
                try:
                    for line in iter(self.process.stdout.readline, ''):
                        if not line:
                            break
                        clean_line = line.strip()
                        self.output_logs.append(clean_line)
                        if len(self.output_logs) > 100:
                            self.output_logs.pop(0)

                        match = url_pattern.search(clean_line)
                        if match and not self.tunnel_url:
                            self.tunnel_url = match.group(0)
                            logger.info("Cloudflare tunnel established: %s", self.tunnel_url)
                            url_found_event.set()
                except Exception as ex:
                    logger.debug("Tunnel reader exception: %s", ex)
                finally:
                    self.is_running = False

            t = threading.Thread(target=reader_thread, daemon=True)
            t.start()

            found = url_found_event.wait(timeout=timeout)
            if not found or not self.tunnel_url:
                if not self.is_running:
                    error_msg = "\n".join(self.output_logs[-5:]) if self.output_logs else "Process exited unexpectedly."
                    raise RuntimeError(f"Cloudflare tunnel failed to start: {error_msg}")
                raise TimeoutError("Timed out waiting for Cloudflare quick tunnel URL.")

            state_file = Path(__file__).resolve().parent.parent / "data" / "tunnel_state.json"
            try:
                state_file.parent.mkdir(parents=True, exist_ok=True)
                with open(state_file, "w") as f:
                    json.dump({"url": self.tunnel_url, "started_at": self.started_at, "pid": self.process.pid if self.process else None}, f)
            except Exception:
                pass

            return {
                "status": "active",
                "url": self.tunnel_url,
                "target_port": target_port,
                "started_at": self.started_at
            }

    def stop_tunnel(self) -> Dict[str, Any]:
        with self.lock:
            if self.process:
                try:
                    self.process.terminate()
                    self.process.wait(timeout=3)
                except Exception:
                    try:
                        self.process.kill()
                    except Exception:
                        pass
                self.process = None
                
            self.is_running = False
            self.tunnel_url = None
            self.started_at = None
            state_file = Path(__file__).resolve().parent.parent / "data" / "tunnel_state.json"
            if state_file.exists():
                try:
                    state_file.unlink()
                except Exception:
                    pass
            logger.info("Cloudflare tunnel stopped.")
            return {"status": "stopped"}

    def _is_pid_alive(self, pid: Optional[int]) -> bool:
        if not pid:
            return False
        try:
            import os
            os.kill(pid, 0)
            return True
        except (OSError, SystemError, ProcessLookupError):
            return False
        except Exception:
            return False

    def get_status(self) -> Dict[str, Any]:
        with self.lock:
            if self.process and self.process.poll() is not None:
                self.is_running = False
                self.tunnel_url = None
                
            if not self.tunnel_url:
                state_file = Path(__file__).resolve().parent.parent / "data" / "tunnel_state.json"
                if state_file.exists():
                    try:
                        with open(state_file, "r") as f:
                            data = json.load(f)
                            pid = data.get("pid")
                            if pid and self._is_pid_alive(pid) and data.get("url"):
                                return {
                                    "status": "active",
                                    "url": data["url"],
                                    "started_at": data.get("started_at"),
                                    "available": True
                                }
                            else:
                                # Stale state file from dead process - remove it
                                try:
                                    state_file.unlink()
                                except Exception:
                                    pass
                    except Exception:
                        pass

            return {
                "status": "active" if (self.is_running and self.tunnel_url) else "inactive",
                "url": self.tunnel_url if self.is_running else None,
                "started_at": self.started_at if self.is_running else None,
                "available": self._find_cloudflared() is not None
            }


tunnel_manager = TunnelManager.get_instance()
