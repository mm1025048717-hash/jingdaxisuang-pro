# 精打细算 Pro · uni-app 原生小程序版

一套代码，同时输出 **H5** 和 **微信小程序**。

## 项目结构

```
miniprogram-uniapp/
├── pages/           # 页面
│   ├── index/       # 引导页
│   ├── input/       # 数据录入
│   ├── dash/        # 生存概览
│   ├── advisor/     # AI军师（占位，完整版需接 API）
│   ├── opps/        # 机会雷达（占位）
│   └── profile/     # 我的
├── utils/           # 工具
│   ├── rule-engine.js   # 规则引擎（已适配 uni.storage）
│   └── util.js
├── static/          # 静态资源
├── App.vue
├── main.js
├── pages.json
├── manifest.json
└── vite.config.js
```

## 快速开始

### 1. 安装依赖

```bash
cd miniprogram-uniapp
npm install
```

### 2. 运行 H5

```bash
npm run dev:h5
```

浏览器打开 http://localhost:5173

### 3. 运行微信小程序

```bash
npm run dev:mp-weixin
```

用微信开发者工具打开生成的 `dist/dev/mp-weixin` 目录。

### 4. 构建发布

```bash
# H5
npm run build:h5

# 微信小程序
npm run build:mp-weixin
```

## 配置小程序 AppID

编辑 `manifest.json`，将 `mp-weixin.appid` 改为你的小程序 AppID。

## 与 Web 版的差异

| 功能       | Web 版 | uni-app 版 |
|------------|--------|------------|
| 生存概览   | ✅     | ✅         |
| 数据录入   | ✅     | ✅ 简化版  |
| 规则引擎   | ✅     | ✅         |
| AI 军师    | ✅ 完整 | ⚠️ 占位，需接 API |
| 机会雷达   | ✅ 完整 | ⚠️ 占位，静态数据 |

AI 与机会雷达的完整逻辑需从 Web 版 `app.js`、`agent.js`、`rule-engine.js` 逐步移植，并改用 `uni.request` 等小程序 API。

## 依赖说明

当前使用 Vue 3 + Vite + uni-app 3.x。若 `npm install` 报错，可尝试：

```bash
npm install @dcloudio/uni-app@3.0.0-4010520240510001 --save
```

或参考 [uni-app 官方文档](https://uniapp.dcloud.net.cn/) 使用最新稳定版。
