# OpenClaw（小龙虾）联动调研

> 目标：将精打细算 Pro 与 OpenClaw 联动，让 AI 军师能借助 OpenClaw 帮用户操作手机/电脑，提升落地执行能力。

---

## 一、OpenClaw 是什么

**OpenClaw**（原名 Clawdbot/Moltbot，图标为小龙虾）是一款**开源免费的 AI 代理人**，核心能力包括：

| 能力 | 说明 |
|------|------|
| **自动化操作** | 自动点击 GUI、执行终端命令、操作文件 |
| **多渠道入口** | WhatsApp、Telegram、Discord、iMessage、Signal 等，用户用手机发消息即可触发 |
| **技能系统** | 通过 Markdown 技能文件扩展能力（700+ 社区技能） |
| **本地/云端** | 支持 Claude、ChatGPT、Gemini 或本地 Ollama |
| **移动节点** | 支持 iOS/Android 节点，语音唤醒、Live Canvas 等 |

**运行环境**：Linux、macOS、Windows（WSL2），需要 Node.js 22+，网关默认端口 `18789`。

**官方资源**：
- 中文文档：https://clawd.org.cn 、 https://www.howtouseopenclaw.com/zh
- 安装：`curl -fsSL https://clawd.org.cn/install.sh | bash`
- 引导：`openclaw-cn onboard --install-daemon`

---

## 二、联动场景设想

| 场景 | 精打细算 Pro 角色 | OpenClaw 角色 |
|------|-------------------|----------------|
| **军师推荐机会 → 自动打开链接** | 输出「58同城·视频剪辑」等机会卡片 | 用户手机发「帮我打开58同城」→ OpenClaw 在电脑上打开浏览器 |
| **军师给话术 → 自动复制/发送** | 输出「复制话术」按钮、谈判模板 | 用户说「把这个话术发给我」→ OpenClaw 通过 Telegram/WhatsApp 发回 |
| **军师定任务 → 自动提醒** | 「晚上整理3个视频剪辑作品」 | OpenClaw 的 Cron 技能定时提醒，或写入待办 |
| **联动记账** | 用户说「记一笔 50 元伙食」 | OpenClaw 通过 Webhook 调用精打细算的 API 记账 |
| **联动搜索** | 军师说「需要我帮你搜索兼职吗？」 | 用户确认 → OpenClaw 执行浏览器搜索并汇总结果 |

---

## 三、技术对接方式

### 1. OpenClaw → 精打细算（Webhook / HTTP）

OpenClaw 支持 **Exec 工具**、**Browser 工具**、**自定义 Skill**，可以：

- 调用精打细算的 HTTP API（如 `/api/expense` 记账、`/api/user-data` 同步）
- 需要精打细算暴露 REST 接口，或通过无头服务代理

### 2. 精打细算 → OpenClaw（OpenAI 兼容 API）

OpenClaw 网关可暴露 **OpenAI 兼容 HTTP API**：

- 精打细算可向 `http://localhost:18789/v1/chat/completions` 发请求
- 前提：用户本机已安装并运行 OpenClaw，且网关启用该 API
- 适合：桌面端用户，在同一台机器上同时用精打细算和 OpenClaw

### 3. 用户通过 IM 桥接

用户用手机在 **Telegram / WhatsApp** 与 OpenClaw 对话，同时用精打细算 Web：

1. 军师给出「去 58 同城搜视频剪辑」→ 用户复制指令发给 OpenClaw
2. 或：精打细算生成「可转发给 OpenClaw 的指令文本」，用户一键复制到 Telegram

### 4. 自定义 OpenClaw Skill（推荐）

在 OpenClaw 中安装一个 **「精打细算」Skill**，使 OpenClaw 能：

- 调用精打细算的 API 获取用户财务数据
- 根据用户说「我手头紧」等，返回生存建议、日预算、机会推荐
- 支持 Exec 调用 curl 请求本地或公网 API

Skill 示例目录结构：
```
~/.openclaw/skills/jingdaxisuan/
  SKILL.md    # 描述 + 工具说明
  ...
```

---

## 四、推荐实施路径

### Phase 1：引导与复制（最快落地）

1. 在精打细算中增加「**联动 OpenClaw**」入口和说明：
   - 什么是 OpenClaw、如何安装
   - 如何用 Telegram/WhatsApp 与小龙虾对话
2. 军师输出「**可转发指令**」：如「帮我搜索 58 同城 视频剪辑 兼职」，用户复制后发给 OpenClaw
3. 机会卡片增加「**复制搜索词**」按钮，一键生成发给 OpenClaw 的搜索指令

### Phase 2：API 与 Webhook

1. 精打细算后端暴露：
   - `POST /api/expense` 记账
   - `GET/POST /api/user-data` 同步（需鉴权）
2. 编写 OpenClaw Skill，通过 `exec` 或 HTTP 工具调用上述 API
3. 支持 OpenClaw 的 Hooks：如用户说「记一笔 50 伙食」→ 触发 Webhook 调用记账接口

### Phase 3：深度整合（可选）

1. 精打细算桌面版/Electron 集成：检测本地 OpenClaw 是否运行，可直接调用其 API
2. 双向同步：OpenClaw 执行的搜索、任务结果回写精打细算的「机会雷达」或任务列表
3. 如需「操作手机」：依赖 OpenClaw 的 iOS/Android 节点能力，需进一步查阅 Nodes 文档

---

## 五、参考资料

- [OpenClaw 中文社区](https://clawd.org.cn/)
- [开始使用](https://clawd.org.cn/start/getting-started.html)
- [技能目录（含金融类）](https://www.howtouseopenclaw.com/zh/skills/finance)
- [OpenAI HTTP API](https://www.howtouseopenclaw.com/zh/gateway/openai-http-api)
- [Hooks 钩子](https://www.howtouseopenclaw.com/zh/cli/hooks)

---

*文档创建：2025-02*
