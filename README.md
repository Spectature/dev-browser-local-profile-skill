# dev-browser-local-profile-skill

Chinese docs: [README.zh-CN.md](README.zh-CN.md) and [SKILL.zh-CN.md](SKILL.zh-CN.md)

A standalone Codex skill for browser automation against a persistent local Chrome or Chromium profile.

It does not require `dev-browser`.

## Attribution

This project was adapted from [dev-browser](https://github.com/SawyerHood/dev-browser), originally created by Sawyer Hood.

The current repository keeps the persistent-profile browser workflow as its starting point, but restructures it into a standalone Playwright-over-CDP skill that does not require the original `dev-browser` CLI.

## What it solves

When browser automation launches a fresh managed browser, it does not reuse the browser session you already use day to day. That means local cookies, saved passwords, authenticated tabs, and internal tool login state are often missing.

This skill standardizes a different workflow:

- start Chrome or Chromium with a fixed remote-debugging port
- keep a persistent browser profile under the current user's home directory
- connect with Playwright over CDP
- reuse the connected browser/page by default (new tab only when requested)
- run standalone automation tasks without `dev-browser`
- handle hash routes safely by navigating in two steps

Default page reuse behavior:

- `--reuse-current-page` defaults to `true`
- `--new-tab` is still supported for compatibility and takes precedence when explicitly passed

## Included files

- `SKILL.md` - the skill instructions
- `SKILL.zh-CN.md` - the Chinese skill guide
- `agents/openai.yaml` - UI metadata
- `package.json` - local Node dependency definition
- `scripts/start_chrome_debug.py` - cross-platform launcher for Chrome/Chromium/Edge with a persistent profile
- `scripts/browser_tools.mjs` - standalone commands for open/list/screenshot
- `scripts/run_task.mjs` - generic Playwright task runner over CDP

## Quick start

Install dependencies:

```bash
npm install
```

Start a persistent browser profile:

```bash
python scripts/start_chrome_debug.py
```

Open a page (reuses current page by default):

```bash
node scripts/browser_tools.mjs open --url "http://localhost:9800/h5-bzzx/"

# Explicit controls:
# force reuse current page
node scripts/browser_tools.mjs open --url "http://localhost:9800/h5-bzzx/" --reuse-current-page true
# force open a new tab
node scripts/browser_tools.mjs open --url "http://localhost:9800/h5-bzzx/" --new-tab true
```

## Custom automation

Run a custom task file:

```bash
node scripts/run_task.mjs --task ./my-task.mjs --url "http://localhost:9800/h5-bzzx/" --task-arg mode=debug
```

Example task module:

```javascript
export default async function ({ page }) {
  await page.waitForLoadState("domcontentloaded");
  return {
    title: await page.title(),
    url: page.url()
  };
}
```

## Install as a local skill

Copy or clone this repository so the skill folder is available under your Codex skills directory.

Example target:

```text
~/.codex/skills/dev-browser-local-profile
```

## Why hash routes need special handling

URLs like `http://localhost:9527/#/path?...` may be truncated when opened through some helper flows. This skill avoids that by opening the base URL first and then setting `window.location.href` inside the page.

## License

MIT
