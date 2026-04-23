#!/usr/bin/env python3
import argparse
import os
import platform
import shutil
import socket
import subprocess
import sys
from pathlib import Path


def default_profile_dir() -> Path:
    return Path.home() / "chrome-dev-browser-profile"


def candidate_browsers():
    system = platform.system()
    if system == "Windows":
        paths = [
            Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "Google/Chrome/Application/chrome.exe",
            Path(os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)")) / "Google/Chrome/Application/chrome.exe",
            Path(os.environ.get("LOCALAPPDATA", "")) / "Google/Chrome/Application/chrome.exe",
            Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "Microsoft/Edge/Application/msedge.exe",
        ]
    elif system == "Darwin":
        paths = [
            Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
            Path.home() / "Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            Path("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"),
            Path("/Applications/Chromium.app/Contents/MacOS/Chromium"),
        ]
    else:
        names = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge"]
        paths = [Path(shutil.which(name)) for name in names if shutil.which(name)]
    return [path for path in paths if path and path.exists()]


def resolve_browser(explicit: str | None) -> Path:
    if explicit:
        path = Path(explicit).expanduser()
        if path.exists():
            return path
        raise FileNotFoundError(f"Browser not found: {path}")
    paths = candidate_browsers()
    if not paths:
        raise FileNotFoundError("Could not find Chrome/Chromium/Edge. Pass --chrome-path explicitly.")
    return paths[0]


def build_command(browser_path: Path, port: int, profile_dir: Path):
    command = [
        str(browser_path),
        f"--remote-debugging-port={port}",
        f"--user-data-dir={profile_dir}",
        "--no-first-run",
        "--no-default-browser-check",
    ]
    return command


def can_connect_cdp(port: int, host: str = "127.0.0.1", timeout: float = 0.5) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except OSError:
        return False


def main():
    parser = argparse.ArgumentParser(description="Launch Chrome/Chromium with a persistent local automation profile.")
    parser.add_argument("--port", type=int, default=9222)
    parser.add_argument("--profile-dir", default=str(default_profile_dir()))
    parser.add_argument("--chrome-path")
    parser.add_argument("--print-command", action="store_true")
    args = parser.parse_args()

    browser_path = resolve_browser(args.chrome_path)
    profile_dir = Path(args.profile_dir).expanduser()
    profile_dir.mkdir(parents=True, exist_ok=True)
    command = build_command(browser_path, args.port, profile_dir)

    if args.print_command:
        print(" ".join(command))
        return

    if can_connect_cdp(args.port):
        print(f"CDP endpoint already available at http://127.0.0.1:{args.port}. Reusing existing browser.")
        print(f"Profile: {profile_dir}")
        print(f"Port: {args.port}")
        return

    kwargs = {}
    if platform.system() == "Windows":
        kwargs["creationflags"] = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
        kwargs["close_fds"] = True
    else:
        kwargs["start_new_session"] = True
        kwargs["stdout"] = subprocess.DEVNULL
        kwargs["stderr"] = subprocess.DEVNULL

    subprocess.Popen(command, **kwargs)
    print(f"Launched: {browser_path}")
    print(f"Profile: {profile_dir}")
    print(f"Port: {args.port}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)

