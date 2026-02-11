# 精打细算 Pro

面向经济困难人群的 AI 智能生存助手，集成生存计算、机会雷达、AI 军师等能力。

## 快速开始

### 本地运行（带后端）

```bash
cd server
npm install
node server.js
```

浏览器访问 http://localhost:3000 ，数据保存在 `server/data/app.json`。

### 仅前端

直接双击 `index.html` 或用浏览器打开，数据保存在 localStorage。

---

## 部署到 GitHub

1. 在 [GitHub](https://github.com/new) 新建仓库（如 `jingdaxisuang-pro`）
2. 在项目根目录执行：

```bash
git init
git add .
git commit -m "init: 精打细算 Pro"
git branch -M main
git remote add origin https://github.com/你的用户名/jingdaxisuang-pro.git
git push -u origin main
```

---

## 部署到 Vercel

1. 打开 [vercel.com](https://vercel.com) 并登录
2. 点击 **Add New Project**，选择 **Import Git Repository**
3. 选择你的 GitHub 仓库
4. 无需额外配置，直接 **Deploy**
5. 部署完成后会得到 `https://xxx.vercel.app` 访问地址

**说明**：Vercel 部署为纯静态站点，数据使用浏览器 localStorage。如需持久化存储，请在本地运行 `server` 或自行部署后端。

---

## 创业计划书

在 App 内「我的」页面点击「创业计划书」可查看完整商业计划，或直接打开 [创业计划书.html](创业计划书.html)。

---

## 技术栈

- 前端：HTML5 / CSS3 / JavaScript (PWA)
- AI：DeepSeek（Function Calling）
- 后端（可选）：Node.js + Express + JSON 文件存储
