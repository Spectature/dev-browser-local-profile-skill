# Dev Browser Local Profile

英文原版: [SKILL.md](SKILL.md)

这是一份中文说明文档，用于解释 `SKILL.md` 的内容。

实际会被 Codex 当作 skill 入口读取的仍然是英文版 `SKILL.md`。保留英文入口是为了兼容当前 skill 发现和触发流程。

## 使用场景

当浏览器自动化应该连接到一个长期使用的本地浏览器 profile，而不是每次拉起一个全新浏览器状态时，使用这个 skill。

典型场景包括：

- 本地开发站点调试
- 内网系统调试
- 需要复用登录态的后台系统
- 需要保留 cookies、保存密码、已有页签状态的网页自动化

## 核心规则

- 优先使用 `dev-browser --connect`，不要优先走默认托管浏览器。
- 认为持久化浏览器 profile 才是登录态的真实来源。
- 优先使用固定远程调试端口。默认端口用 `9222`，除非用户另有要求。
- profile 路径必须写成与当前用户相关的通用路径，不要硬编码机器上的用户名。
- 默认在已连接的浏览器里新开标签页，不要直接覆盖用户当前标签页，除非用户明确要求。

## 标准流程

### 1. 用持久化 profile 启动 Chrome 或 Chromium

把浏览器用户数据目录放到当前用户 home 目录下，例如：

- Windows: `Join-Path $env:USERPROFILE 'chrome-dev-browser-profile'`
- macOS/Linux: `~/chrome-dev-browser-profile`

优先使用仓库自带的跨平台启动脚本：

```bash
python scripts/start_chrome_debug.py
```

常见参数：

```bash
python scripts/start_chrome_debug.py --port 9222
python scripts/start_chrome_debug.py --profile-dir "C:\Users\name\chrome-dev-browser-profile"
python scripts/start_chrome_debug.py --chrome-path "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

### 2. 让 dev-browser 连接到已打开的浏览器

先优先尝试自动发现：

```bash
dev-browser --connect
```

如果自动发现失败，并且已知调试端点地址，则显式连接：

```bash
dev-browser --connect http://127.0.0.1:9222
```

### 3. 在已连接浏览器里新开标签页

使用 `browser.newPage()` 新开一个标签页，再用 `page.goto()` 打开普通 URL。

示例：

```javascript
const page = await browser.newPage();
await page.goto("http://localhost:9800/h5-bzzx/", { waitUntil: "domcontentloaded", timeout: 15000 });
await page.bringToFront();
console.log(JSON.stringify({ url: page.url(), title: await page.title() }, null, 2));
```

## Hash 路由处理方式

不要依赖 DevTools 的 `json/new?...` 或类似的直接打开流程去处理 hash 路由 URL，因为 `#...` 这一段可能会被丢掉。

对于 hash 路由，正确流程是：

1. 先打开站点根路径或基础 URL
2. 再在页面上下文中设置 `window.location.href` 或 `window.location.hash`

示例：

```javascript
const page = await browser.newPage();
await page.goto("http://localhost:9527/", { waitUntil: "domcontentloaded", timeout: 15000 });
await page.evaluate(() => {
  window.location.href = "http://localhost:9527/#/inspection/log/list?book_id=352";
});
await page.bringToFront();
```

## 打开后如何确认成功

页面打开后要显式验证，不要只看命令没有报错：

- 检查 `page.url()` 是否和目标路由一致
- 检查 `await page.title()` 或页面中的关键选择器
- 如果看起来像是“没反应”，先列出当前已连接浏览器里的页签再判断
- 如果登录态缺失，先确认浏览器是否真的是用持久化 profile 启动的，而不是临时 profile

## 常见失败模式

### 打开了新浏览器，但没有登录状态

可能原因：

- `dev-browser` 连到的是自己的托管浏览器
- Chrome 启动时使用的是临时 profile

处理方式：

- 用持久化 `--user-data-dir` 重启 Chrome
- 再执行一次 `dev-browser --connect`

### 新标签页开了，但路由不对

可能原因：

- hash 路由被截断

处理方式：

- 先打开根路径
- 再设置 `window.location.href` 或 `window.location.hash`

### 按 URL 连接失败

可能原因：

- `http://127.0.0.1:9222` 暴露的端点形式和预期不一致

处理方式：

- 先尝试不带 URL 的 `dev-browser --connect`
- 确认 Chrome 确实带着 `--remote-debugging-port=<port>` 启动了

## 范围说明

这个 skill 的目标不是替代 `dev-browser`，而是把“如何在需要保留本地登录态时正确使用 `dev-browser`”这件事标准化。

也就是说，它关注的是一套稳定工作流，而不是重新实现浏览器工具本身。
