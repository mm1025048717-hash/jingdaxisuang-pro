# 精打细算 Pro · GitHub 部署说明

## 一、仓库结构

| 目录 | 说明 |
|------|------|
| **web/** | 网页端（H5 + PWA），部署到 Vercel |
| **miniprogram/** | 微信小程序 web-view 壳 |
| **miniprogram-uniapp/** | 微信小程序 uni-app 原生版 |
| **server/** | Node 后端（可选，自托管） |

---

## 二、推送到 GitHub

### 首次推送

```bash
cd 穷人军师
git init
git add .
git commit -m "feat: 区分 web 与小程序，完整仓库结构"
git branch -M main
git remote add origin https://github.com/你的用户名/jingdaxisuang-pro.git
git push -u origin main
```

### 已有仓库，更新推送

```bash
git add .
git commit -m "refactor: 区分 web 与小程序代码"
git push origin main
```

---

## 三、Vercel 部署（网页端）

1. 登录 [vercel.com](https://vercel.com)
2. Add New Project → Import Git Repository
3. 选择 `jingdaxisuang-pro` 仓库
4. **重要**：在 Settings 中设置 **Root Directory** 为 `web`
5. Deploy

部署完成后，访问 `https://xxx.vercel.app`。

---

## 四、微信小程序

### miniprogram/（web-view）

- 需企业主体
- 配置业务域名（已备案 HTTPS）
- 微信开发者工具打开 `miniprogram/` 目录上传

### miniprogram-uniapp/（原生）

- 个人/企业均可
- 微信开发者工具打开 `miniprogram-uniapp/dist/dev/mp-weixin`
- 详见 [微信小程序部署指南.md](微信小程序部署指南.md)

---

## 五、本地运行

```bash
# 网页端 + 后端
npm start
# http://localhost:3000

# 仅打开网页（无后端）
# 直接双击 web/index.html，或静态服务器
npx serve web
```
