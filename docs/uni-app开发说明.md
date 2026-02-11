# uni-app 原生小程序方案 · 开发说明

## 推荐创建方式

官方推荐用脚手架生成，保证依赖正确：

```bash
# 使用 Vue 3 + Vite 模板
npx degit dcloudio/uni-preset-vue#vite miniprogram-uniapp-temp
cd miniprogram-uniapp-temp
npm install
```

然后将本项目的 `pages/`、`utils/`、`App.vue`、`pages.json`、`manifest.json` 等复制过去替换。

## 或使用 HBuilderX

1. 下载 [HBuilderX](https://www.dcloud.io/hbuilderx.html)
2. 文件 → 新建 → 项目 → uni-app
3. 选择 Vue3 + Vite 模板
4. 将本方案中的 `pages`、`utils` 等目录复制进去

## 当前已实现

- ✅ 引导页（index）
- ✅ 数据录入（input）
- ✅ 生存概览（dash）：规则引擎、KPI、快捷入口
- ⚠️ AI军师（advisor）：占位页，提示使用 H5 版
- ⚠️ 机会雷达（opps）：占位 + 静态「你适合的」列表
- ✅ 个人中心（profile）

## 待移植

1. **AI 军师**：从 `agent.js`、`app.js` 的 Advisor 逻辑移植，改用 `uni.request` 调 DeepSeek API
2. **机会雷达**：从 `rule-engine.js` 的 `getOpportunities`、`Opps` 移植，或对接 `/api/opportunities/search`
3. **债务谈判话术**：规则引擎中已有，可抽成单独接口

## 存储对照

| Web | uni-app |
|-----|---------|
| localStorage.setItem | uni.setStorageSync |
| localStorage.getItem | uni.getStorageSync |

## 请求对照

| Web | uni-app |
|-----|---------|
| fetch(url) | uni.request({ url }) |
