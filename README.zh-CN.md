# dev-browser-local-profile-skill

英文原版: [README.md](README.md)

这是一个给 Codex 使用的独立 skill，用来对接本地长期使用的 Chrome 或 Chromium profile。

它不依赖 `dev-browser`。

## 致谢与来源

本项目由 [dev-browser](https://github.com/SawyerHood/dev-browser) 改造而来，原项目作者为 Sawyer Hood。

当前仓库保留了“连接本地长期使用的浏览器 profile”这一工作流方向，但已经重构为一个独立的、基于 Playwright over CDP 的 skill，不再依赖原始 `dev-browser` CLI。

## 这个 skill 解决什么问题

当浏览器自动化使用全新的托管浏览器时，它不会复用你平时真实在用的浏览器会话。

这会带来几个典型问题：

- 本地 cookie 丢失
- 已保存账号密码不可用
- 已登录的内部系统状态丢失
- 每次调试都要重新登录

这个 skill 统一了一套更适合日常开发调试的流程：

- 使用固定的远程调试端口启动 Chrome/Chromium
- 在当前用户的 home 目录下保留一个持久化 profile
- 通过 Playwright over CDP 连接到这个已打开的浏览器
- 在已连接且已登录的浏览器里新开标签页
- 不依赖 `dev-browser` 也能执行自动化任务
- 对 hash 路由页面使用更稳妥的两段式打开方式

## 仓库包含的文件

- `SKILL.md` - 英文版 skill 指令，实际入口文件
- `SKILL.zh-CN.md` - `SKILL.md` 的中文说明版
- `agents/openai.yaml` - skill 的 UI 元数据
- `package.json` - 本地 Node 依赖定义
- `scripts/start_chrome_debug.py` - 用于启动 Chrome/Chromium/Edge 持久化 profile 的跨平台脚本
- `scripts/browser_tools.mjs` - 独立的打开页面、列出页签、截图命令
- `scripts/run_task.mjs` - 通用自动化任务执行器

## 快速开始

先安装依赖：

```bash
npm install
```

再启动一个持久化 profile 的浏览器：

```bash
python scripts/start_chrome_debug.py
```

然后打开页面：

```bash
node scripts/browser_tools.mjs open --url "http://localhost:9800/h5-bzzx/"
```

## 自定义自动化

运行一个自定义任务文件：

```bash
node scripts/run_task.mjs --task ./my-task.mjs --url "http://localhost:9800/h5-bzzx/" --task-arg mode=debug
```

示例任务模块：

```javascript
export default async function ({ page }) {
  await page.waitForLoadState("domcontentloaded");
  return {
    title: await page.title(),
    url: page.url()
  };
}
```

## 作为本地 skill 安装

把这个仓库复制或克隆到你的 Codex skills 目录下，让 skill 文件夹能被 Codex 发现。

例如：

```text
~/.codex/skills/dev-browser-local-profile
```

## 为什么 hash 路由要特殊处理

像 `http://localhost:9527/#/path?...` 这种 URL，在某些辅助打开流程里，`#` 后面的部分可能会丢失。

这个 skill 的处理方式是：

1. 先打开站点根路径或基础 URL
2. 再在页面里设置 `window.location.href`

这样能显著降低 hash 路由被截断的问题。

## License

MIT
