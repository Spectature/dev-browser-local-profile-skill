import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  buildTaskArgs,
  connectBrowser,
  describePage,
  getBooleanOption,
  getNumberOption,
  getStringOption,
  navigatePage,
  parseArgs,
  printJson,
  requireOption,
  resolvePage
} from "./browser_utils.mjs";

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const taskPath = requireOption(options, "task");
  const port = getNumberOption(options, "port", 9222);
  const timeout = getNumberOption(options, "timeout", 15000);
  const waitUntil = getStringOption(options, "wait-until", "domcontentloaded");
  const settleMs = getNumberOption(options, "settle-ms", 300);
  const url = getStringOption(options, "url", "");
  const preferNewTab = getBooleanOption(options, "new-tab", Boolean(url));
  const taskArgs = buildTaskArgs(options);
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

  const modulePath = pathToFileURL(path.resolve(taskPath)).href;
  const imported = await import(modulePath);
  const task = imported.default || imported.run;
  if (typeof task !== "function") {
    throw new Error(`Task module must export a default async function or named run(): ${taskPath}`);
  }

  const result = await task({
    browser,
    context: target.context,
    page: target.page,
    endpoint,
    taskArgs,
    helpers: {
      describePage,
      navigatePage,
      printJson
    }
  });

  printJson({
    ok: true,
    endpoint,
    page: await describePage(target.page, {
      contextIndex: target.contextIndex,
      pageIndex: target.context.pages().indexOf(target.page)
    }),
    result: result === undefined ? null : result
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
