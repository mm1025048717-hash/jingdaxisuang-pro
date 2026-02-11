# 精打细算 Pro

> 生存规划 · AI 军师 · 机会雷达 · 钱紧不慌  
> [在线体验](https://jingdaxisuang-pro.vercel.app) | [产品原型](https://jingdaxisuang-pro.vercel.app/创业计划书.html)

---

## 一、仓库结构

```
穷人军师/
├── web/                    # 🌐 网页端（H5 / PWA）
│   ├── index.html          # 主入口
│   ├── app.js              # 主逻辑
│   ├── style.css
│   ├── rule-engine.js      # 规则引擎
│   ├── agent.js            # AI 军师
│   ├── auth.js
│   ├── api/                # Vercel Serverless
│   └── vercel.json
│
├── miniprogram/            # 📱 微信小程序（web-view 壳）
│   ├── app.json
│   ├── app.js
│   └── pages/index/        # 内嵌 H5
│
├── miniprogram-uniapp/     # 📱 微信小程序（uni-app 原生）
│   ├── pages/              # 原生页面
│   ├── utils/               # 规则引擎等
│   └── package.json
│
├── server/                 # 🖥️ Node 后端（可选）
├── docs/                   # 文档
└── scripts/                # 脚本
```

| 目录 | 说明 | 部署 |
|------|------|------|
| **web/** | 网页版主代码 | Vercel（根目录设为 `web`） |
| **miniprogram/** | 小程序 web-view 壳 | 微信开发者工具上传 |
| **miniprogram-uniapp/** | 小程序原生版 | 微信开发者工具 / H5 构建 |

---

## 二、快速开始

### 网页端（Web）

```bash
# 仅前端：直接打开 web/index.html

# 带后端（登录、同步、机会 API）
npm start
# 浏览器访问 http://localhost:3000
```

### 小程序（web-view）

1. 微信开发者工具打开 `miniprogram/`
2. 填写 `project.config.json` 中的 AppID
3. 企业主体需配置业务域名

### 小程序（uni-app 原生）

```bash
cd miniprogram-uniapp
npm install
npm run dev:h5          # H5 预览
npm run dev:mp-weixin   # 微信小程序（生成 dist/dev/mp-weixin）
```

---

## 三、部署到 GitHub

```bash
cd 穷人军师
git init                    # 若尚未初始化
git add .
git commit -m "feat: 区分 web 与小程序，完整仓库结构"
git branch -M main
git remote add origin https://github.com/你的用户名/jingdaxisuang-pro.git
git push -u origin main
```

### Vercel 部署（网页端）

1. 打开 [vercel.com](https://vercel.com) → Add New Project
2. 选择该 GitHub 仓库
3. **Root Directory** 设为 `web`
4. Deploy

### 微信小程序发布

- **miniprogram/**：企业主体 + 业务域名（需备案）
- **miniprogram-uniapp/**：个人/企业均可，见 [docs/微信小程序部署指南.md](docs/微信小程序部署指南.md)

---

## 四、文档

| 文件 | 说明 |
|------|------|
| [启动说明](启动说明.md) | 本地运行、环境变量 |
| [docs/微信小程序部署指南.md](docs/微信小程序部署指南.md) | 小程序发布流程 |
| [docs/uni-app开发说明.md](docs/uni-app开发说明.md) | uni-app 开发与移植 |
| [docs/机会雷达实时数据配置.md](docs/机会雷达实时数据配置.md) | 机会 API 配置 |

---

*精打细算 Pro v2.0*
