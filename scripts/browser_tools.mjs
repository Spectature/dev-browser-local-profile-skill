import path from "node:path";
import {
  connectBrowser,
  describePage,
  getBooleanOption,
  getNumberOption,
  getStringOption,
  navigatePage,
  parseArgs,
  printJson,
  printUsageAndExit,
  requireOption,
  resolvePage
} from "./browser_utils.mjs";

async function openCommand(options) {
  const url = requireOption(options, "url");
  const port = getNumberOption(options, "port", 9222);
  const timeout = getNumberOption(options, "timeout", 15000);
  const waitUntil = getStringOption(options, "wait-until", "domcontentloaded");
  const settleMs = getNumberOption(options, "settle-ms", 300);
  const reuseCurrentPage = getBooleanOption(options, "reuse-current-page", true);
  const preferNewTab = options["new-tab"] === undefined
    ? !reuseCurrentPage
    : getBooleanOption(options, "new-tab", false);
  const { browser, endpoint } = await connectBrowser({ port });
  const target = await resolvePage(browser, { preferNewTab });
  await navigatePage(target.page, url, { timeout, waitUntil, settleMs });
  await target.page.bringToFront();
  printJson(await describePage(target.page, {
    endpoint,
    contextIndex: target.contextIndex,
    pageIndex: target.context.pages().indexOf(target.page)
  }));
}

async function listCommand(options) {
  const port = getNumberOption(options, "port", 9222);
  const { browser, endpoint } = await connectBrowser({ port });
  const contexts = browser.contexts();
  const items = [];
  for (let contextIndex = 0; contextIndex < contexts.length; contextIndex += 1) {
    const context = contexts[contextIndex];
    const pages = context.pages();
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
      const page = pages[pageIndex];
      items.push(await describePage(page, { endpoint, contextIndex, pageIndex }));
    }
  }
  printJson(items);
}

async function screenshotCommand(options) {
  const output = requireOption(options, "output");
  const url = getStringOption(options, "url", "");
  const port = getNumberOption(options, "port", 9222);
  const timeout = getNumberOption(options, "timeout", 15000);
  const waitUntil = getStringOption(options, "wait-until", "domcontentloaded");
  const settleMs = getNumberOption(options, "settle-ms", 300);
  const fullPage = getBooleanOption(options, "full-page", true);
  const reuseCurrentPage = getBooleanOption(options, "reuse-current-page", true);
  const preferNewTab = options["new-tab"] === undefined
    ? !reuseCurrentPage
    : getBooleanOption(options, "new-tab", false);
  const { browser, endpoint } = await connectBrowser({ port });
  const target = await resolvePage(browser, {
    preferNewTab,
    pageIndex: options["page-index"] === undefined ? undefined : getNumberOption(options, "page-index", 0),
    pageUrlContains: getStringOption(options, "page-url-contains", ""),
    pageTitleContains: getStringOption(options, "page-title-contains", "")
  });
  if (url) {
    await navigatePage(target.page, url, { timeout, waitUntil, settleMs });
  }
  const outputPath = path.resolve(output);
  await target.page.screenshot({ path: outputPath, fullPage });
  printJson(await describePage(target.page, {
    endpoint,
    output: outputPath,
    contextIndex: target.contextIndex,
    pageIndex: target.context.pages().indexOf(target.page)
  }));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const command = options._[0];
  if (!command) {
    printUsageAndExit();
  }

  if (command === "open") {
    await openCommand(options);
    return;
  }
  if (command === "list") {
    await listCommand(options);
    return;
  }
  if (command === "screenshot") {
    await screenshotCommand(options);
    return;
  }

  printUsageAndExit(`Unknown command: ${command}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message || String(error));
    process.exit(1);
  });
