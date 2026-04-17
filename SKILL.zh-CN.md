# Dev Browser Local Profile

英文原版: [SKILL.md](SKILL.md)

这是一份中文说明文档，用于解释 `SKILL.md` 的内容。

实际会被 Codex 当作 skill 入口读取的仍然是英文版 `SKILL.md`。保留英文入口是为了兼容当前 skill 发现和触发流程。

这个 skill 由 [dev-browser](https://github.com/SawyerHood/dev-browser) 改造而来，但当前版本已经可以独立运行，不依赖 `dev-browser`。

## 使用场景

当浏览器自动化应该连接到一个长期使用的本地浏览器 profile，而不是每次拉起一个全新浏览器状态时，使用这个 skill。

典型场景包括：

- 本地开发站点调试
- 内网系统调试
- 需要复用登录态的后台系统
- 需要保留 cookies、保存密码、已有页签状态的网页自动化

## 核心规则

- 使用仓库自带的 Playwright over CDP 脚本，不要依赖 `dev-browser`。
- 认为持久化浏览器 profile 才是登录态的真实来源。
- 优先使用固定远程调试端口。默认端口用 `9222`，除非用户另有要求。
- profile 路径必须写成与当前用户相关的通用路径，不要硬编码机器上的用户名。
- 默认在已连接的浏览器里新开标签页，不要直接覆盖用户当前标签页，除非用户明确要求。

## 标准流程

### 1. 安装依赖

进入 skill 目录执行一次：

```bash
npm install
```

这里安装的是 `playwright-core`，不会额外下载一个托管浏览器。

### 2. 用持久化 profile 启动 Chrome 或 Chromium

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

### 3. 使用独立浏览器工具脚本

新开标签页打开页面：

```bash
node scripts/browser_tools.mjs open --url "http://localhost:9800/h5-bzzx/"
```

列出当前页签：

```bash
node scripts/browser_tools.mjs list
```

截图：

```bash
node scripts/browser_tools.mjs screenshot --url "http://localhost:9800/h5-bzzx/" --output "./page.png"
```

### 4. 运行自定义自动化任务

对于更复杂的自动化流程，使用通用任务执行器：

```bash
node scripts/run_task.mjs --task ./my-task.mjs --url "http://localhost:9800/h5-bzzx/" --task-arg mode=debug
```

任务模块应导出默认异步函数或命名为 `run` 的函数。

示例：

```javascript
export default async function ({ page, taskArgs }) {
  await page.waitForLoadState("domcontentloaded");
  return {
    title: await page.title(),
    url: page.url(),
    taskArgs
  };
}
```

## Hash 路由处理方式

不要依赖某些直接打开 DevTools URL 的方式去处理 hash 路由，因为 `#...` 这一段可能会被丢掉。

对于 hash 路由，这个 skill 自带脚本会自动走两段式导航：

1. 先打开基础 URL
2. 再在页面上下文中设置 `window.location.href`

示例：

```bash
node scripts/browser_tools.mjs open --url "http://localhost:9527/#/inspection/log/list?book_id=352"
```

## 打开后如何确认成功

页面打开后要显式验证，不要只看命令没有报错：

- 检查 JSON 输出中的 `url` 是否和目标路由一致
- 检查 `title` 或页面中的关键选择器
- 如果看起来像是“没反应”，先执行 `node scripts/browser_tools.mjs list`
- 如果登录态缺失，先确认浏览器是否真的是用持久化 profile 启动的，而不是临时 profile

## 常见失败模式

### 工具无法连接浏览器

可能原因：

- Chrome 没有带 `--remote-debugging-port=<port>` 启动

处理方式：

- 重新执行 `python scripts/start_chrome_debug.py`
- 确认端口和脚本里使用的一致

### 新标签页开了，但路由不对

可能原因：

- URL 被外部工具截断
- hash 路由没有完整传入

处理方式：

- 使用仓库自带的 open 命令
- 传入完整 hash 路由 URL

### 登录态缺失

可能原因：

- Chrome 使用了别的 profile 目录

处理方式：

- 用持久化 `--user-data-dir` 重启 Chrome
- 后续一直复用同一个 profile 目录

## 范围说明

这个 skill 的目标是提供一套独立的、基于 Playwright over CDP 的本地浏览器自动化工作流，重点是复用长期存在的登录态。
