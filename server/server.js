/* 精打细算 Pro - 后端服务 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND = path.join(__dirname, '..');

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// 静态文件（前端）
app.use(express.static(FRONTEND, { index: 'index.html' }));

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

// ========== API：批量同步（前端启动时拉取） ==========
app.get('/api/sync', (req, res) => {
  try {
    const keys = ['userData', 'agent-memory', 'usage', 'aiTotal', 'tasksDone', 'ai-provider', 'ai-apikey', 'ai-daily-used', 'ai-last-reset', 'opp-scanner-cache', 'expense-records'];
    const data = {};
    keys.forEach(k => {
      const v = db.get(k);
      if (v !== null) data[k] = v;
    });
    res.json({ ok: true, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ========== API：批量保存（前端定期/退出时同步） ==========
app.post('/api/sync', (req, res) => {
  try {
    const { data } = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ ok: false, error: 'data required' });
    }
    for (const [k, v] of Object.entries(data)) {
      db.set(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`精打细算 Pro 后端已启动: http://localhost:${PORT}`);
});
