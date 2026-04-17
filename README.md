# dev-browser-local-profile-skill

Chinese docs: [README.zh-CN.md](README.zh-CN.md) and [SKILL.zh-CN.md](SKILL.zh-CN.md)

A Codex skill for using `dev-browser` with a persistent local Chrome or Chromium profile instead of a fresh managed browser.

## What it solves

When `dev-browser` launches its default managed browser, it does not reuse the browser session you already use day to day. That means local cookies, saved passwords, authenticated tabs, and internal tool login state are often missing.

This skill standardizes a different workflow:

- start Chrome/Chromium with a fixed remote-debugging port
- keep a persistent browser profile under the current user's home directory
- connect with `dev-browser --connect`
- open new tabs in the connected logged-in browser
- handle hash routes safely by navigating in two steps

## Included files

- `SKILL.md` - the skill instructions
- `agents/openai.yaml` - UI metadata
- `scripts/start_chrome_debug.py` - cross-platform launcher for Chrome/Chromium/Edge with a persistent profile

## Quick start

Start a persistent browser profile:

```bash
python scripts/start_chrome_debug.py
```

Connect dev-browser to that browser:

```bash
dev-browser --connect
```

## Install as a local skill

Copy or clone this repository so the skill folder is available under your Codex skills directory.

Example target:

```text
~/.codex/skills/dev-browser-local-profile
```

If you want to install directly from GitHub with your existing installer flow, point the installer at the repository root.

## Why hash routes need special handling

URLs like `http://localhost:9527/#/path?...` may be truncated when opened through some DevTools helper flows. This skill avoids that by opening the base origin first and then setting `window.location.href` or `window.location.hash` inside the page.

## License

MIT
