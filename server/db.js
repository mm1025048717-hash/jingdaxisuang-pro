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

// ========== 用户与验证码 ==========
function getUsers() {
  const raw = data['_users'];
  if (!raw) return { nextId: 1, byPhone: {}, byWechat: {}, list: {} };
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return { nextId: 1, byPhone: {}, byWechat: {}, list: {} }; }
}
function setUsers(u) {
  data['_users'] = JSON.stringify(u);
  save(data);
}

exports.findUserByPhone = (phone) => {
  const u = getUsers();
  const id = u.byPhone[phone];
  return id ? u.list[id] : null;
};
exports.findUserByWechat = (openid) => {
  const u = getUsers();
  const id = u.byWechat[openid];
  return id ? u.list[id] : null;
};
exports.createUser = (opts) => {
  const u = getUsers();
  const id = 'u' + (u.nextId++);
  const user = { id, phone: opts.phone || null, wechatOpenId: opts.wechatOpenId || null, createdAt: new Date().toISOString() };
  u.list[id] = user;
  if (user.phone) u.byPhone[user.phone] = id;
  if (user.wechatOpenId) u.byWechat[user.wechatOpenId] = id;
  setUsers(u);
  return user;
};
exports.linkPhoneToUser = (userId, phone) => {
  const u = getUsers();
  const user = u.list[userId];
  if (!user) return null;
  if (u.byPhone[phone]) return null; // phone taken
  user.phone = phone;
  u.byPhone[phone] = userId;
  setUsers(u);
  return user;
};

// 验证码（5分钟有效）
exports.setCode = (phone, code) => {
  data['_code_' + phone] = JSON.stringify({ code, expire: Date.now() + 5 * 60 * 1000 });
  save(data);
};
exports.verifyCode = (phone, code) => {
  const raw = data['_code_' + phone];
  if (!raw) return false;
  try {
    const { code: stored, expire } = JSON.parse(raw);
    delete data['_code_' + phone];
    save(data);
    return expire > Date.now() && stored === code;
  } catch { return false; }
};
