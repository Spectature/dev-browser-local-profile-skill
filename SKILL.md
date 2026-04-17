---
name: dev-browser-local-profile
description: Reuse a persistent local Chrome or Chromium profile with dev-browser so browser automation opens pages in an already logged-in session instead of a fresh managed browser. Use when opening local sites, internal tools, or authenticated web apps where preserving cookies, saved passwords, and existing tabs matters, especially on Windows, macOS, or Linux machines with a fixed remote-debugging port.
---

# Dev Browser Local Profile

Use this skill when browser automation should connect to a long-lived local browser profile instead of launching a fresh browser state.

## Core Rules

- Prefer `dev-browser --connect` over the default managed browser.
- Assume a persistent browser profile is the source of truth for login state.
- Prefer a fixed remote-debugging port. Default to `9222` unless the user says otherwise.
- Keep profile paths user-relative. Never hard-code machine-specific usernames.
- Open a new tab in the connected browser instead of replacing the user's current tab unless asked.

## Setup Workflow

### 1. Start Chrome or Chromium with a persistent profile

Use a fixed user data directory under the current user's home directory:

- Windows: `Join-Path $env:USERPROFILE 'chrome-dev-browser-profile'`
- macOS/Linux: `~/chrome-dev-browser-profile`

Use the bundled launcher script for cross-platform startup:

```bash
python scripts/start_chrome_debug.py
```

Useful options:

```bash
python scripts/start_chrome_debug.py --port 9222
python scripts/start_chrome_debug.py --profile-dir "C:\Users\name\chrome-dev-browser-profile"
python scripts/start_chrome_debug.py --chrome-path "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

### 2. Connect dev-browser to the existing browser

Prefer auto-discovery first:

```bash
dev-browser --connect
```

If auto-discovery fails and the debugging endpoint is known, connect explicitly:

```bash
dev-browser --connect http://127.0.0.1:9222
```

### 3. Open pages in a new tab

Use `browser.newPage()` for a fresh tab and `page.goto()` for normal URLs.

Example:

```javascript
const page = await browser.newPage();
await page.goto("http://localhost:9800/h5-bzzx/", { waitUntil: "domcontentloaded", timeout: 15000 });
await page.bringToFront();
console.log(JSON.stringify({ url: page.url(), title: await page.title() }, null, 2));
```

## Hash Route Handling

Do not rely on DevTools `json/new?...` or similar direct open flows for hash-routed URLs. The `#...` portion may be dropped.

For hash routes:

1. Open the origin or base route first.
2. Then set `window.location.href` or `window.location.hash` inside the page.

Example:

```javascript
const page = await browser.newPage();
await page.goto("http://localhost:9527/", { waitUntil: "domcontentloaded", timeout: 15000 });
await page.evaluate(() => {
  window.location.href = "http://localhost:9527/#/inspection/log/list?book_id=352";
});
await page.bringToFront();
```

## Verification Checklist

After opening a page, verify success explicitly:

- Check `page.url()` matches the expected route.
- Check `await page.title()` or a known selector if the page has dynamic titles.
- If the action appears silent, list pages or inspect the connected browser tabs before retrying.
- If login is missing, confirm the browser was started with the persistent profile and not a temporary profile.

## Failure Modes

### New browser opened without login state

Likely cause: dev-browser used its own managed browser or Chrome started with a temporary profile.

Fix:

- Restart Chrome with the persistent `--user-data-dir`.
- Reconnect with `dev-browser --connect`.

### New tab opened but route was wrong

Likely cause: hash route truncation.

Fix:

- Open the root URL first.
- Then set `window.location.href` or `window.location.hash`.

### Connect by URL failed

Likely cause: `http://127.0.0.1:9222` did not expose the expected endpoint directly.

Fix:

- Try `dev-browser --connect` without a URL first.
- Confirm Chrome is running with `--remote-debugging-port=<port>`.

## Scope

This skill is intentionally workflow-focused. It does not replace `dev-browser`; it standardizes how to use `dev-browser` when preserving local login state is more important than running against a fresh isolated browser.

