/* 精打细算 Pro - JSON 文件存储（无需 native 依赖） */
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'app.json');

function ensureDir() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

function load() {
  ensureDir();
  if (!fs.existsSync(dbPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch { return {}; }
}

function save(data) {
  ensureDir();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 0), 'utf8');
}

const data = load();

exports.get = (key) => {
  return data[key] !== undefined ? data[key] : null;
};

exports.set = (key, value) => {
  data[key] = typeof value === 'string' ? value : (typeof value === 'object' ? JSON.stringify(value) : String(value));
  save(data);
};

exports.del = (key) => {
  delete data[key];
  save(data);
};
