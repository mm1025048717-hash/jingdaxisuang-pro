/* 精打细算 Pro - 后端服务 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const os = require('os');
const { spawn } = require('child_process');
const db = require('./db');
const jwt = require('jsonwebtoken');
const { aggregateOpportunities } = require('./opportunities');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND = path.join(__dirname, '..', 'web');
const JWT_SECRET = process.env.JWT_SECRET || 'jingdaxisuang-dev-secret-change-in-prod';
const WECHAT_APP_ID = process.env.WECHAT_APP_ID || '';
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || '';

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// 静态文件（前端）
app.use(express.static(FRONTEND, { index: 'index.html' }));

// 从 Authorization 解析 userId，无则返回 null
function getUserId(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    return payload.userId || null;
  } catch { return null; }
}
function userKey(userId, key) { return userId ? `u${userId}_${key}` : key; }

// ========== API：认证 ==========
app.post('/api/auth/phone/send', (req, res) => {
  try {
    const phone = String(req.body.phone || '').replace(/\D/g, '').slice(-11);
    if (phone.length !== 11) return res.status(400).json({ ok: false, error: '请输入11位手机号' });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    db.setCode(phone, code);
    // 生产环境请对接阿里云/腾讯云/容联云短信，此处仅开发用（控制台输出）
    if (!process.env.SMS_PROVIDER) {
      console.log('[DEV] 验证码:', phone, code);
    }
    res.json({ ok: true, message: '验证码已发送' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/auth/phone/verify', (req, res) => {
  try {
    const phone = String(req.body.phone || '').replace(/\D/g, '').slice(-11);
    const code = String(req.body.code || '').trim();
    if (phone.length !== 11 || !code) return res.status(400).json({ ok: false, error: '手机号或验证码无效' });
    if (!db.verifyCode(phone, code)) return res.status(400).json({ ok: false, error: '验证码错误或已过期' });
    let user = db.findUserByPhone(phone);
    if (!user) user = db.createUser({ phone });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ ok: true, token, user: { id: user.id, phone: phone.slice(0, 3) + '****' + phone.slice(-4) } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/auth/wechat', (req, res) => {
  if (!WECHAT_APP_ID) return res.status(503).json({ ok: false, error: '微信登录未配置' });
  const base = req.headers['x-forwarded-proto'] ? `${req.headers['x-forwarded-proto']}://${req.headers.host}` : `http://localhost:${PORT}`;
  const redirectUri = encodeURIComponent(base + '/api/auth/wechat/callback');
  const state = req.query.from || '';
  const url = `https://open.weixin.qq.com/connect/qrconnect?appid=${WECHAT_APP_ID}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;
  res.redirect(url);
});

app.get('/api/auth/wechat/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !WECHAT_APP_ID || !WECHAT_APP_SECRET) {
      return res.redirect('/?auth=wechat_fail');
    }
    const resp = await fetch(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}&code=${code}&grant_type=authorization_code`);
    const json = await resp.json();
    if (json.errcode) return res.redirect('/?auth=wechat_fail');
    let user = db.findUserByWechat(json.openid);
    if (!user) user = db.createUser({ wechatOpenId: json.openid });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    const frontend = state ? decodeURIComponent(state) : '/';
    res.redirect(frontend + (frontend.includes('?') ? '&' : '?') + `token=${encodeURIComponent(token)}`);
  } catch (e) {
    res.redirect('/?auth=wechat_fail');
  }
});

app.get('/api/auth/me', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ ok: false });
  const raw = db.get('_users');
  if (!raw) return res.status(401).json({ ok: false });
  let u;
  try { u = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return res.status(401).json({ ok: false }); }
  const user = u.list && u.list[userId];
  if (!user) return res.status(401).json({ ok: false });
  res.json({ ok: true, user: { id: user.id, phone: user.phone ? user.phone.slice(0, 3) + '****' + user.phone.slice(-4) : null } });
});

// ========== API：KV 存储（兼容 localStorage） ==========
app.get('/api/kv/:key', (req, res) => {
  try {
    const val = db.get(req.params.key);
    res.json({ ok: true, value: val });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/kv/:key', (req, res) => {
  try {
    const value = req.body.value !== undefined ? (typeof req.body.value === 'string' ? req.body.value : JSON.stringify(req.body.value)) : req.body;
    db.set(req.params.key, value);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.delete('/api/kv/:key', (req, res) => {
  try {
    db.del(req.params.key);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ========== API：机会雷达 - 实时聚合（对接开放平台 API） ==========
app.get('/api/opportunities/search', async (req, res) => {
  try {
    const keyword = String(req.query.keyword || '').trim();
    const city = String(req.query.city || '').trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(10, parseInt(req.query.limit, 10) || 30));
    const result = await aggregateOpportunities({ keyword, city, page, limit });
    res.json({ ok: true, ...result });
  } catch (e) {
    console.error('[API] opportunities/search:', e);
    res.status(500).json({ ok: false, error: e.message, data: [], sources: [], fromRealAPI: false });
  }
});

// ========== API：批量同步（前端启动时拉取） ==========
app.get('/api/sync', (req, res) => {
  try {
    const userId = getUserId(req);
    const prefix = userKey(userId, '');
    const keys = ['userData', 'agent-memory', 'usage', 'aiTotal', 'tasksDone', 'ai-provider', 'ai-apikey', 'ai-daily-used', 'ai-last-reset', 'opp-scanner-cache', 'expense-records'];
    const data = {};
    keys.forEach(k => {
      const v = db.get(prefix ? prefix + k : k);
      if (v !== null) data[k] = v;
    });
    res.json({ ok: true, data, userId: userId || null });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ========== API：批量保存（前端定期/退出时同步） ==========
app.post('/api/sync', (req, res) => {
  try {
    const userId = getUserId(req);
    const prefix = userKey(userId, '');
    const { data } = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ ok: false, error: 'data required' });
    }
    for (const [k, v] of Object.entries(data)) {
      db.set(prefix ? prefix + k : k, typeof v === 'string' ? v : JSON.stringify(v));
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`精打细算 Pro 后端已启动: http://localhost:${PORT}`);
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  手机访问: http://${net.address}:${PORT} （与电脑同一 WiFi）`);
        break;
      }
    }
  }
  // 自动启动 OpenClaw（用户无需手动操作，打开产品即联动）
  if (process.env.OPENCLAW_AUTO_START !== '0' && process.env.OPENCLAW_AUTO_START !== 'false') {
    const isWin = process.platform === 'win32';
    const cmd = isWin ? 'npx.cmd' : 'npx';
    const token = process.env.OPENCLAW_GATEWAY_TOKEN || 'local-dev-123';
    const args = ['openclaw@latest', 'gateway', '--port', '18789', '--allow-unconfigured', '--token', token];
    try {
      const proc = spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true });
      proc.unref();
      proc.on('error', () => {});
      setTimeout(() => {
        http.get('http://localhost:18789', () => console.log('[OpenClaw] 已自动启动')).on('error', () => {});
      }, 5000);
    } catch (_) {}
  }
});
