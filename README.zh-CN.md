# dev-browser-local-profile-skill

英文原版: [README.md](README.md)

这是一个给 Codex 使用的 skill，用来让 `dev-browser` 连接本地长期使用的 Chrome 或 Chromium profile，而不是每次启动一个全新的托管浏览器。

## 这个 skill 解决什么问题

当 `dev-browser` 使用默认托管浏览器时，它不会复用你平时真实在用的浏览器会话。

这会带来几个典型问题：

- 本地 cookie 丢失
- 已保存账号密码不可用
- 已登录的内部系统状态丢失
- 每次调试都要重新登录

这个 skill 统一了一套更适合日常开发调试的流程：

- 使用固定的远程调试端口启动 Chrome/Chromium
- 在当前用户的 home 目录下保留一个持久化 profile
- 通过 `dev-browser --connect` 连接到这个已打开的浏览器
- 在已连接且已登录的浏览器里新开标签页
- 对 hash 路由页面使用更稳妥的两段式打开方式

## 仓库包含的文件

- `SKILL.md` - 英文版 skill 指令，实际入口文件
- `SKILL.zh-CN.md` - `SKILL.md` 的中文说明版
- `agents/openai.yaml` - skill 的 UI 元数据
- `scripts/start_chrome_debug.py` - 用于启动 Chrome/Chromium/Edge 持久化 profile 的跨平台脚本

## 快速开始

先启动一个持久化 profile 的浏览器：

```bash
python scripts/start_chrome_debug.py
```

然后让 `dev-browser` 连接这个浏览器：

```bash
dev-browser --connect
```

## 作为本地 skill 安装

把这个仓库复制或克隆到你的 Codex skills 目录下，让 skill 文件夹能被 Codex 发现。

例如：

```text
~/.codex/skills/dev-browser-local-profile
```

如果你有现成的安装器流程，也可以直接把 GitHub 仓库根目录作为安装来源。

## 为什么 hash 路由要特殊处理

像 `http://localhost:9527/#/path?...` 这种 URL，在某些 DevTools 辅助打开流程里，`#` 后面的部分可能会丢失。

这个 skill 的处理方式是：

1. 先打开站点根路径或基础 URL
2. 再在页面里设置 `window.location.href` 或 `window.location.hash`

这样能显著降低 hash 路由被截断的问题。

## License

MIT
