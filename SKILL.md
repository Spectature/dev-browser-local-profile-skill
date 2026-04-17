---
name: dev-browser-local-profile
description: Standalone browser automation for a persistent local Chrome or Chromium profile using Playwright over CDP. Use when you need to open local sites, internal tools, or authenticated web apps in an already logged-in browser session without relying on dev-browser.
---

# Dev Browser Local Profile

Use this skill when browser automation should connect to a long-lived local browser profile instead of launching a fresh browser state.

This project was adapted from [dev-browser](https://github.com/SawyerHood/dev-browser), but the current skill runs standalone and does not require `dev-browser`.

## Core Rules

- Use the bundled Playwright-over-CDP scripts instead of `dev-browser`.
- Assume a persistent browser profile is the source of truth for login state.
- Prefer a fixed remote-debugging port. Default to `9222` unless the user says otherwise.
- Keep profile paths user-relative. Never hard-code machine-specific usernames.
- Open a new tab by default instead of replacing the user's current tab unless asked.

## Setup Workflow

### 1. Install dependencies

Run this once inside the skill directory:

```bash
npm install
```

This installs `playwright-core` only. It does not download a separate managed browser.

### 2. Start Chrome or Chromium with a persistent profile

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

### 3. Use the standalone browser tools

Open a URL in a new tab:

```bash
node scripts/browser_tools.mjs open --url "http://localhost:9800/h5-bzzx/"
```

List current tabs:

```bash
node scripts/browser_tools.mjs list
```

Take a screenshot:

```bash
node scripts/browser_tools.mjs screenshot --url "http://localhost:9800/h5-bzzx/" --output "./page.png"
```

### 4. Run custom automation tasks

Use the generic task runner for more than simple open/list/screenshot flows:

```bash
node scripts/run_task.mjs --task ./my-task.mjs --url "http://localhost:9800/h5-bzzx/" --task-arg mode=debug
```

Task modules should export a default async function or named `run` function.

Example:

```javascript
export default async function ({ page, helpers, taskArgs }) {
  await page.waitForLoadState("domcontentloaded");
  return {
    title: await page.title(),
    url: page.url(),
    taskArgs
  };
}
```

## Hash Route Handling

Do not rely on `json/new?...` or similar direct DevTools open flows for hash-routed URLs. The `#...` portion may be dropped.

For hash routes, the bundled scripts already use a two-step navigation strategy:

1. Open the base URL first.
2. Then set `window.location.href` inside the page.

Example:

```bash
node scripts/browser_tools.mjs open --url "http://localhost:9527/#/inspection/log/list?book_id=352"
```

## Verification Checklist

After opening a page, verify success explicitly:

- Check the JSON output `url` matches the expected route.
- Check `title` or a known selector if the page has dynamic titles.
- If the action appears silent, run `node scripts/browser_tools.mjs list` before retrying.
- If login is missing, confirm Chrome was started with the persistent profile and not a temporary profile.

## Failure Modes

### Browser tools could not connect

Likely cause: Chrome is not running with `--remote-debugging-port=<port>`.

Fix:

- Restart Chrome with `python scripts/start_chrome_debug.py`.
- Confirm the port matches the one passed to the scripts.

### New tab opened but route was wrong

Likely cause: hash route truncation in an external tool or a manually shortened URL.

Fix:

- Use the bundled open command.
- Pass the full hash-route URL.

### Login state is missing

Likely cause: Chrome started with a different profile directory.

Fix:

- Restart Chrome with the persistent `--user-data-dir`.
- Reuse that same profile directory consistently.

## Scope

This skill is intentionally workflow-focused. It standardizes a standalone browser automation setup for persistent local login state using Playwright over CDP.
