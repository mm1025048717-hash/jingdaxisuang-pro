/* 精打细算 Pro - 认证模块 */
const Auth = {
  TOKEN_KEY: 'auth_token',
  USER_KEY: 'auth_user',

  getToken() { return localStorage.getItem(this.TOKEN_KEY); },
  getUser() {
    try { return JSON.parse(localStorage.getItem(this.USER_KEY) || 'null'); } catch { return null; }
  },
  setToken(t) { localStorage.setItem(this.TOKEN_KEY, t); },
  setUser(u) { localStorage.setItem(this.USER_KEY, JSON.stringify(u || null)); },
  clear() { localStorage.removeItem(this.TOKEN_KEY); localStorage.removeItem(this.USER_KEY); },

  isLoggedIn() { return !!this.getToken(); },

  /** 登录后同步本地数据到云端 */
  syncToCloud() {
    const API_KEYS = ['userData', 'agent-memory', 'usage', 'aiTotal', 'tasksDone', 'ai-provider', 'ai-apikey', 'ai-daily-used', 'ai-last-reset', 'opp-scanner-cache', 'expense-records'];
    const data = {};
    API_KEYS.forEach(k => { const v = localStorage.getItem(k); if (v !== null) data[k] = v; });
    if (Object.keys(data).length === 0) return;
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.getToken() },
      body: JSON.stringify({ data })
    }).catch(() => {});
  },

  /** 从 URL 解析 token（微信回调用） */
  parseTokenFromUrl() {
    const p = new URLSearchParams(location.search);
    const t = p.get('token');
    if (t) {
      this.setToken(t);
      this.setUser({ id: '?', phone: null });
      const u = new URL(location.href); u.searchParams.delete('token'); u.searchParams.delete('auth');
      history.replaceState({}, '', u.pathname + u.search);
      fetch('/api/sync', { headers: { 'Authorization': 'Bearer ' + t } })
        .then(r => r.json())
        .then(d => { if (d.ok && d.data) { for (const k of Object.keys(d.data)) localStorage.setItem(k, d.data[k]); } })
        .catch(() => {});
      return true;
    }
    return false;
  },

  /** 检查登录状态并拉取用户信息 */
  async checkMe() {
    const token = this.getToken();
    if (!token) return null;
    try {
      const r = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } });
      const d = await r.json();
      if (d.ok && d.user) { this.setUser(d.user); return d.user; }
      this.clear(); return null;
    } catch { return this.getUser(); }
  },

  wechatLogin(e) {
    e.preventDefault();
    const from = encodeURIComponent(location.origin + location.pathname);
    location.href = '/api/auth/wechat?from=' + from;
  },

  logout() {
    if (!confirm('确定退出登录？')) return;
    this.clear();
    if (typeof App !== 'undefined') {
      App.go('pg-profile');
      App.updateProfile();
      App.toast('已退出', 'ok');
    }
  },

  refreshProfileUI() {
    const loginCard = document.getElementById('profLoginCard');
    const userCard = document.getElementById('profUserCard');
    const userPhone = document.getElementById('profUserPhone');
    const updateUI = (user) => {
      if (loginCard) loginCard.style.display = user ? 'none' : 'block';
      if (userCard) userCard.style.display = user ? 'flex' : 'none';
      if (userPhone && user) userPhone.textContent = user.phone || '微信用户';
    };
    if (this.isLoggedIn()) {
      this.checkMe().then(u => updateUI(u || this.getUser()));
    } else {
      updateUI(null);
    }
  },

  init() {
    this.parseTokenFromUrl();
    this.refreshProfileUI();
    this.bindLoginPage();
    return this;
  },

  bindLoginPage() {
    const phoneInp = document.getElementById('loginPhone');
    const codeInp = document.getElementById('loginCode');
    const btnSend = document.getElementById('btnSendCode');
    const btnLogin = document.getElementById('btnPhoneLogin');
    const btnWechat = document.getElementById('btnWechatLogin');
    if (!btnSend || !btnLogin) return;

    let countdown = 0;
    btnSend.onclick = async () => {
      const phone = (phoneInp?.value || '').replace(/\D/g, '').slice(-11);
      if (phone.length !== 11) { if (typeof App !== 'undefined') App.toast('请输入11位手机号', 'err'); return; }
      if (countdown > 0) return;
      try {
        const r = await fetch('/api/auth/phone/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone })
        });
        const d = await r.json();
        if (!d.ok) throw new Error(d.error || '发送失败');
        if (typeof App !== 'undefined') App.toast('验证码已发送');
        countdown = 60;
        const t = setInterval(() => {
          countdown--;
          btnSend.textContent = countdown > 0 ? countdown + 's 后重发' : '获取验证码';
          if (countdown <= 0) clearInterval(t);
        }, 1000);
      } catch (e) {
        if (typeof App !== 'undefined') App.toast(e.message || '发送失败', 'err');
      }
    };

    btnLogin.onclick = async () => {
      const phone = (phoneInp?.value || '').replace(/\D/g, '').slice(-11);
      const code = (codeInp?.value || '').trim();
      if (phone.length !== 11 || !code) { if (typeof App !== 'undefined') App.toast('请输入手机号和验证码', 'err'); return; }
      try {
        const r = await fetch('/api/auth/phone/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, code })
        });
        const d = await r.json();
        if (!d.ok) throw new Error(d.error || '登录失败');
        this.setToken(d.token);
        this.setUser(d.user);
        Auth.syncToCloud();
        if (typeof App !== 'undefined') {
          App.go('pg-profile');
          App.updateProfile();
          App.toast('登录成功', 'ok');
        }
      } catch (e) {
        if (typeof App !== 'undefined') App.toast(e.message || '登录失败', 'err');
      }
    };

    if (btnWechat) btnWechat.onclick = (e) => { e.preventDefault(); this.wechatLogin(e); };
  }
};
