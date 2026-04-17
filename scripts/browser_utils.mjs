import { chromium } from "playwright-core";

export function parseArgs(argv) {
  const options = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      options._.push(token);
      continue;
    }

    const trimmed = token.slice(2);
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex >= 0) {
      const key = trimmed.slice(0, eqIndex);
      const value = trimmed.slice(eqIndex + 1);
      appendOption(options, key, value);
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      appendOption(options, trimmed, next);
      index += 1;
    } else {
      appendOption(options, trimmed, true);
    }
  }
  return options;
}

function appendOption(options, key, value) {
  if (options[key] === undefined) {
    options[key] = value;
    return;
  }
  if (Array.isArray(options[key])) {
    options[key].push(value);
    return;
  }
  options[key] = [options[key], value];
}

export function getStringOption(options, key, fallback = "") {
  const value = options[key];
  if (value === undefined || value === true || value === false) return fallback;
  if (Array.isArray(value)) return String(value[value.length - 1]);
  return String(value);
}

export function getMultiStringOption(options, key) {
  const value = options[key];
  if (value === undefined) return [];
  if (Array.isArray(value)) return value.map((item) => String(item));
  return [String(value)];
}

export function getNumberOption(options, key, fallback) {
  const value = options[key];
  const raw = Array.isArray(value) ? value[value.length - 1] : value;
  if (raw === undefined || raw === true || raw === false || raw === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric value for --${key}: ${raw}`);
  }
  return parsed;
}

export function getBooleanOption(options, key, fallback = false) {
  const value = options[key];
  const raw = Array.isArray(value) ? value[value.length - 1] : value;
  if (raw === undefined) return fallback;
  if (typeof raw === "boolean") return raw;
  const normalized = String(raw).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return true;
}

export function requireOption(options, key) {
  const value = getStringOption(options, key, "").trim();
  if (!value) {
    throw new Error(`Missing required option --${key}`);
  }
  return value;
}

export async function connectBrowser(options = {}) {
  const port = options.port ?? 9222;
  const endpoint = options.endpoint || `http://127.0.0.1:${port}`;
  try {
    const browser = await chromium.connectOverCDP(endpoint);
    return { browser, endpoint, port };
  } catch (error) {
    throw new Error(
      `Failed to connect to Chrome over CDP at ${endpoint}. Start Chrome with scripts/start_chrome_debug.py first. Original error: ${error.message}`
    );
  }
}

export async function getDefaultContext(browser) {
  const contexts = browser.contexts();
  if (contexts.length > 0) return contexts[0];
  return browser.newContext();
}

export async function collectPages(browser) {
  const items = [];
  const contexts = browser.contexts();
  for (let contextIndex = 0; contextIndex < contexts.length; contextIndex += 1) {
    const context = contexts[contextIndex];
    const pages = context.pages();
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
      const page = pages[pageIndex];
      let title = "";
      try {
        title = await page.title();
      } catch (error) {
        title = "";
      }
      items.push({ context, contextIndex, page, pageIndex, title, url: page.url() || "" });
    }
  }
  return items;
}

export async function resolvePage(browser, options = {}) {
  const pageIndex = options.pageIndex;
  const pageUrlContains = options.pageUrlContains || "";
  const pageTitleContains = options.pageTitleContains || "";
  const preferNewTab = options.preferNewTab === true;
  const pages = await collectPages(browser);

  if (Number.isInteger(pageIndex) && pageIndex >= 0) {
    const directMatch = pages.find((item) => item.pageIndex === pageIndex);
    if (directMatch) return directMatch;
  }

  if (pageUrlContains || pageTitleContains) {
    const match = pages.find((item) => {
      const urlOk = !pageUrlContains || item.url.includes(pageUrlContains);
      const titleOk = !pageTitleContains || item.title.includes(pageTitleContains);
      return urlOk && titleOk;
    });
    if (match) return match;
  }

  const context = await getDefaultContext(browser);
  if (!preferNewTab && context.pages().length > 0) {
    const page = context.pages()[0];
    return {
      context,
      contextIndex: browser.contexts().indexOf(context),
      page,
      pageIndex: 0,
      title: await safeTitle(page),
      url: page.url() || ""
    };
  }

  const page = await context.newPage();
  return {
    context,
    contextIndex: browser.contexts().indexOf(context),
    page,
    pageIndex: context.pages().indexOf(page),
    title: "",
    url: page.url() || ""
  };
}

export async function safeTitle(page) {
  try {
    return await page.title();
  } catch (error) {
    return "";
  }
}

export function hasHashRoute(rawUrl) {
  try {
    const target = new URL(rawUrl);
    return Boolean(target.hash);
  } catch (error) {
    return false;
  }
}

export function baseUrlWithoutHash(rawUrl) {
  const target = new URL(rawUrl);
  target.hash = "";
  return target.toString();
}

export async function navigatePage(page, rawUrl, options = {}) {
  const timeout = options.timeout ?? 15000;
  const waitUntil = options.waitUntil || "domcontentloaded";
  const settleMs = options.settleMs ?? 300;
  if (hasHashRoute(rawUrl)) {
    await page.goto(baseUrlWithoutHash(rawUrl), { timeout, waitUntil });
    await page.evaluate((targetUrl) => {
      window.location.href = targetUrl;
    }, rawUrl);
  } else {
    await page.goto(rawUrl, { timeout, waitUntil });
  }
  if (settleMs > 0) {
    await page.waitForTimeout(settleMs);
  }
  return page;
}

export async function describePage(page, extra = {}) {
  const title = await safeTitle(page);
  return {
    url: page.url() || "",
    title,
    ...extra
  };
}

export function coerceTaskArgValue(rawValue) {
  const text = String(rawValue);
  if (text === "true") return true;
  if (text === "false") return false;
  if (text === "null") return null;
  if (text !== "" && !Number.isNaN(Number(text))) return Number(text);
  return text;
}

export function buildTaskArgs(options) {
  const rawJson = getStringOption(options, "task-args-json", "").trim();
  let taskArgs = rawJson ? JSON.parse(rawJson) : {};
  if (taskArgs === null || Array.isArray(taskArgs) || typeof taskArgs !== "object") {
    throw new Error("--task-args-json must decode to an object");
  }

  for (const entry of getMultiStringOption(options, "task-arg")) {
    const eqIndex = entry.indexOf("=");
    if (eqIndex < 0) {
      taskArgs[entry] = true;
      continue;
    }
    const key = entry.slice(0, eqIndex).trim();
    const value = entry.slice(eqIndex + 1);
    if (!key) {
      throw new Error(`Invalid --task-arg entry: ${entry}`);
    }
    taskArgs[key] = coerceTaskArgValue(value);
  }

  return taskArgs;
}

export function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

export function printUsageAndExit(message) {
  if (message) {
    console.error(message);
  }
  console.error(`Usage:
  node scripts/browser_tools.mjs open --url <url> [--port 9222]
  node scripts/browser_tools.mjs list [--port 9222]
  node scripts/browser_tools.mjs screenshot --output <path> [--url <url>] [--port 9222]
  node scripts/run_task.mjs --task <file> [--port 9222] [--url <url>] [--task-arg key=value]`);
  process.exit(1);
}
