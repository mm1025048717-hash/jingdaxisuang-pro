/* ==========================================================
   精打细算 Pro v2 — 主控制器
   ========================================================== */

/* ---- 通用工具（提前声明避免引用问题） ---- */
function $(id) { return document.getElementById(id); }
function v(id) { return parseFloat($(id)?.value) || 0; }
function fmt(n) { return n >= 10000 ? (n / 10000).toFixed(1) + '万' : Math.round(n).toLocaleString(); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function _escHtml(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

const App = {
  cur: 'pg-onboard',
  step: 0,
  steps: 4,
  hist: [],

  /* ---------- init ---------- */
  init() {
    AIService.init();

    // splash
    setTimeout(() => {
      const sp = document.getElementById('splash');
      sp.classList.add('out');
      setTimeout(() => { sp.style.display = 'none'; document.getElementById('app').classList.remove('hide'); }, 500);
      const saved = RuleEngine.loadUserData();
      if (saved) { this.go('pg-dash'); }
    }, 1800);

    this.bind();
    this.loadCfg();
    this.restoreForm();
    this.setGreeting();
  },

  /* ---------- events ---------- */
  bind() {
    // onboarding
    $('btnStart').onclick = () => this.go('pg-input');
    $('btnSkip').onclick = () => { RuleEngine.loadUserData() ? this.go('pg-dash') : this.go('pg-input'); };

    // onboarding slides
    let si = 0;
    const slides = document.querySelectorAll('.ob-slide');
    const dots = document.querySelectorAll('#obDots i');
    const showSlide = n => { slides.forEach(s => s.classList.remove('active')); dots.forEach(d => d.classList.remove('active')); slides[n].classList.add('active'); dots[n].classList.add('active'); };
    dots.forEach((d, i) => d.onclick = () => { si = i; showSlide(si); });
    setInterval(() => { if (this.cur !== 'pg-onboard') return; si = (si + 1) % 3; showSlide(si); }, 3500);

    // touch swipe for slides
    let tx = 0;
    const sl = $('obSlides');
    sl.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
    sl.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 50) { si = dx < 0 ? Math.min(si + 1, 2) : Math.max(si - 1, 0); showSlide(si); }
    }, { passive: true });

    // input steps
    $('btnNext').onclick = () => this.nextStep();
    $('btnPrev').onclick = () => this.prevStep();
    $('btnAddDebt').onclick = () => this.addDebt();

    // skill tags
    document.querySelectorAll('#skillTags b').forEach(t => {
      t.onclick = () => t.classList.toggle('on');
    });

    // filter tabs
    document.querySelectorAll('#filterBar b').forEach(b => {
      b.onclick = () => {
        document.querySelectorAll('#filterBar b').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        if (Opps.data && Opps.data.length) {
          Opps.render(b.dataset.f);
        }
      };
    });

    // chat enter
    $('chatInp').addEventListener('keypress', e => { if (e.key === 'Enter') Advisor.send(); });

    // settings
    $('setCfgProvider').onchange = e => {
      AIService.setProvider(e.target.value);
      $('rowApiKey').style.display = e.target.value === 'rule' ? 'none' : 'flex';
    };
    $('setCfgKey').onchange = e => AIService.setApiKey(e.target.value);
  },

  /* ---------- greeting ---------- */
  setGreeting() {
    const h = new Date().getHours();
    let g = '晚上好';
    if (h < 6) g = '夜深了';
    else if (h < 12) g = '早上好';
    else if (h < 14) g = '中午好';
    else if (h < 18) g = '下午好';
    $('greeting').textContent = g;
  },

  /* ---------- navigation ---------- */
  go(id, sub) {
    if (this.cur !== id) this.hist.push(this.cur);
    document.querySelectorAll('.pg').forEach(p => p.classList.remove('show'));
    $(id).classList.add('show');
    this.cur = id;
    this.syncTab(id);
    this.syncTabbar(id);

    if (id === 'pg-dash') this.updateDash();
    if (id === 'pg-opps') Opps.init();
    if (id === 'pg-advisor') this.updateAdvisorHeader();
    if (id === 'pg-profile') this.updateProfile();
    if (id === 'pg-memory') this.renderMemory();
    if (sub && id === 'pg-advisor') setTimeout(() => Advisor.start(sub), 250);
  },

  back() {
    if (this.hist.length) { const p = this.hist.pop(); document.querySelectorAll('.pg').forEach(x => x.classList.remove('show')); $(p).classList.add('show'); this.cur = p; this.syncTab(p); this.syncTabbar(p); if (p === 'pg-dash') this.updateDash(); }
  },

  tab(t) {
    const m = { dash: 'pg-dash', advisor: 'pg-advisor', opps: 'pg-opps', profile: 'pg-profile' };
    this.go(m[t]);
  },

  syncTab(id) {
    const m = { 'pg-dash': 'dash', 'pg-advisor': 'advisor', 'pg-opps': 'opps', 'pg-profile': 'profile' };
    document.querySelectorAll('.tb').forEach(t => t.classList.remove('active'));
    const n = m[id];
    if (n) { const el = document.querySelector(`.tb[data-t="${n}"]`); if (el) el.classList.add('active'); }
  },

  syncTabbar(id) {
    const tabPages = ['pg-dash', 'pg-advisor', 'pg-opps', 'pg-profile'];
    const tb = $('tabbar');
    if (tb) tb.style.display = tabPages.includes(id) ? 'flex' : 'none';
  },

  /* ---------- input steps ---------- */
  nextStep() {
    if (this.step < this.steps - 1) { this.step++; this.showStep(); }
    else this.submit();
  },
  prevStep() {
    if (this.step > 0) { this.step--; this.showStep(); }
  },
  showStep() {
    document.querySelectorAll('.inp-step').forEach(s => s.classList.remove('show'));
    document.querySelector(`.inp-step[data-step="${this.step}"]`).classList.add('show');
    $('btnPrev').style.visibility = this.step === 0 ? 'hidden' : 'visible';
    $('btnNext').innerHTML = this.step === this.steps - 1
      ? '开始分析 <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>'
      : '下一步 <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
    this.updateBar();
  },
  updateBar() {
    const n = this._filled();
    $('inpBar').style.width = (n / this.steps * 100) + '%';
    $('inpPct').textContent = n + ' / ' + this.steps;
  },
  _filled() {
    let c = 0;
    if (v('f-savings') || v('f-cash')) c++;
    if (v('f-rent') || v('f-food')) c++;
    if (v('f-income')) c++;
    const dn = document.querySelector('.d-name');
    if ((dn && dn.value) || document.querySelector('#skillTags b.on')) c++;
    return c;
  },
  addDebt() {
    const w = $('debtWrap');
    const d = document.createElement('div');
    d.className = 'debt-card';
    d.innerHTML = `
      <label class="field"><span>债主名称</span><div class="field-box"><input class="d-name" type="text" placeholder="如：张三 / 花呗"></div></label>
      <div class="field-row">
        <label class="field f1"><span>金额</span><div class="field-box"><i>¥</i><input class="d-amt" type="number" inputmode="decimal" placeholder="0"></div></label>
        <label class="field f1"><span>还款日</span><div class="field-box date"><input class="d-due" type="date"></div></label>
      </div>`;
    w.appendChild(d);
    this.toast('已添加', 'ok');
  },

  /* ---------- submit ---------- */
  submit() {
    const debts = [];
    document.querySelectorAll('.debt-card').forEach(c => {
      const n = c.querySelector('.d-name').value;
      const a = parseFloat(c.querySelector('.d-amt').value) || 0;
      const d = c.querySelector('.d-due').value;
      if (n || a) debts.push({ name: n, amount: a, due: d });
    });
    const skills = [];
    document.querySelectorAll('#skillTags b.on').forEach(b => skills.push(b.dataset.s));

    RuleEngine.setUserData({
      savings: v('f-savings'), cash: v('f-cash'), assets: v('f-assets'),
      rent: v('f-rent'), utilities: v('f-utilities'), food: v('f-food'),
      transport: v('f-transport'), otherExpense: v('f-other'),
      income: v('f-income'), payday: $('f-payday').value,
      tempIncome: v('f-temp'), debts, skills,
      createdAt: new Date().toISOString()
    });

    const u = JSON.parse(localStorage.getItem('usage') || '{}');
    if (!u.first) u.first = new Date().toISOString();
    u.last = new Date().toISOString();
    localStorage.setItem('usage', JSON.stringify(u));

    this.toast('数据已保存', 'ok');
    setTimeout(() => this.go('pg-dash'), 400);
  },

  /* ---------- dashboard ---------- */
  updateDash() {
    const s = RuleEngine.calculateSurvival();
    if (!s) return;
    const info = RuleEngine.getStatusText(s);

    // ring animation
    animNum($('heroDay'), s.survivalDays);
    const circ = 2 * Math.PI * 52;
    const off = circ * (1 - Math.min(s.survivalDays / 90, 1));
    setTimeout(() => { const r = $('heroRing'); r.style.transition = 'stroke-dashoffset 1.2s ease'; r.style.strokeDashoffset = off; }, 80);

    // status
    const st = $('heroStatus');
    st.textContent = info.status;
    st.className = 'hero-status ' + s.dangerLevel;
    $('heroDesc').textContent = info.summary;

    // KPIs
    $('kpiMoney').textContent = '¥' + fmt(s.totalMoney);
    $('kpiExp').textContent = '¥' + fmt(s.monthlyExpense);
    $('kpiBudget').textContent = '¥' + fmt(s.dailyBudget);
    $('kpiPay').textContent = s.daysToPayday !== null ? s.daysToPayday + '天' : '--';

    // alert
    const a = RuleEngine.getAlerts();
    const ab = $('alertBox');
    if (a) { ab.style.display = 'flex'; $('alertT').textContent = a.title; $('alertM').textContent = a.message; }
    else ab.style.display = 'none';

    // bills
    const bills = RuleEngine.getUpcomingBills();
    const bs = $('billSec');
    if (bills.length) {
      bs.style.display = 'block';
      $('billList').innerHTML = bills.map(b => `
        <div class="bill-row">
          <div><div class="bill-name">${b.name}</div><div class="bill-sub${b.isUrgent ? ' urg' : ''}">${b.daysLeft === 0 ? '今天到期' : b.daysLeft + '天后到期'}</div></div>
          <span class="bill-amt">¥${fmt(b.amount)}</span>
        </div>`).join('');
    } else bs.style.display = 'none';
  },

  /* ---------- profile ---------- */
  updateProfile() {
    const u = JSON.parse(localStorage.getItem('usage') || '{}');
    let d = 0;
    if (u.first) d = Math.max(1, Math.ceil((Date.now() - new Date(u.first)) / 864e5));
    $('psDay').textContent = d;
    $('psAI').textContent = localStorage.getItem('aiTotal') || '0';
    $('psTask').textContent = localStorage.getItem('tasksDone') || '0';

    const s = RuleEngine.calculateSurvival();
    if (s) {
      $('profLevel').textContent = s.dangerLevel === 'danger' ? '生存模式' : s.dangerLevel === 'warning' ? '战斗模式' : '稳健模式';
    }
    const memBadge = $('memCountBadge');
    if (memBadge && typeof AgentMemory !== 'undefined') memBadge.textContent = AgentMemory.getFactCount();
  },

  /* ---------- 记忆库 ---------- */
  renderMemory() {
    const list = $('memList');
    const empty = $('memEmpty');
    if (!list) return;

    if (typeof AgentMemory === 'undefined') {
      list.innerHTML = '';
      if (empty) { empty.style.display = 'block'; empty.querySelector('span').textContent = '记忆功能暂不可用'; }
      return;
    }

    const mem = AgentMemory.getAll();
    const facts = mem.facts || [];

    if (!facts.length) {
      list.innerHTML = '';
      if (empty) { empty.style.display = 'block'; empty.querySelector('span').textContent = '在军师对话中告诉我你的情况，AI 会自动记住'; }
      return;
    }

    if (empty) empty.style.display = 'none';

    const catNames = { background: '用户背景', preference: '偏好习惯', goal: '目标计划', skill: '技能特长', concern: '关注事项', general: '其他' };
    const grouped = {};
    facts.forEach(f => {
      const cat = catNames[f.category] || f.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(f);
    });

    let html = '';
    for (const [cat, items] of Object.entries(grouped)) {
      html += `<div class="mem-group"><div class="mem-group-hd">${cat}</div>`;
      items.forEach(f => {
        const safe = _escHtml(f.text);
        html += `<div class="mem-item" data-id="${f.id}"><span class="mem-text">${safe}</span><button class="mem-del" onclick="App.delMemory('${f.id}')">删除</button></div>`;
      });
      html += '</div>';
    }
    list.innerHTML = html;

    const memBadge = $('memCountBadge');
    if (memBadge) memBadge.textContent = facts.length;
  },

  delMemory(id) {
    if (typeof AgentMemory === 'undefined') return;
    if (!confirm('确定删除这条记忆？')) return;
    AgentMemory.removeFact(id);
    this.renderMemory();
    this.updateProfile();
    this.toast('已删除', 'ok');
  },

  updateQuota() {
    // kept for backward compat
  },

  updateAdvisorHeader() {
    // Update memory count in header
    const mc = $('memoryCount');
    if (mc && typeof AgentMemory !== 'undefined') {
      mc.textContent = AgentMemory.getFactCount();
    }
    // Update skill count
    const sc = $('skillCount');
    if (sc && typeof SkillRegistry !== 'undefined') {
      sc.textContent = SkillRegistry.list().length;
    }
    // Update welcome memory hint
    const hint = $('cwMemoryHint');
    if (hint && typeof AgentMemory !== 'undefined') {
      const fCount = AgentMemory.getFactCount();
      const cCount = AgentMemory.getConversationCount();
      if (fCount > 0) {
        hint.innerHTML = `已记住 <em>${fCount}</em> 条信息 · 对话 <em>${cCount}</em> 次 · 越用越懂你`;
        hint.style.display = '';
      } else {
        hint.innerHTML = '首次使用 · 开始对话后我会逐渐了解你';
        hint.style.display = '';
      }
    }
  },

  /* ---------- util ---------- */
  toast(msg, cls) {
    const t = $('toast');
    t.textContent = msg;
    t.className = 'toast on ' + (cls || '');
    setTimeout(() => t.className = 'toast', 2400);
  },

  showSub() { $('modalSub').style.display = 'flex'; },
  closeSub() { $('modalSub').style.display = 'none'; },

  exportData() {
    const d = RuleEngine.loadUserData();
    if (!d) { this.toast('暂无数据', 'err'); return; }
    const b = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = '精打细算_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    this.toast('已导出', 'ok');
  },

  clearData() {
    if (!confirm('确定清除所有数据？不可恢复。')) return;
    localStorage.clear(); location.reload();
  },

  loadCfg() {
    const p = localStorage.getItem('ai-provider') || 'deepseek';
    $('setCfgProvider').value = p;
    $('setCfgKey').value = localStorage.getItem('ai-apikey') || AIService.DEFAULT_KEY;
    $('rowApiKey').style.display = p === 'rule' ? 'none' : 'flex';
  },

  restoreForm() {
    const d = RuleEngine.loadUserData();
    if (!d) return;
    const map = { 'f-savings': d.savings, 'f-cash': d.cash, 'f-assets': d.assets, 'f-rent': d.rent, 'f-utilities': d.utilities, 'f-food': d.food, 'f-transport': d.transport, 'f-other': d.otherExpense, 'f-income': d.income, 'f-payday': d.payday, 'f-temp': d.tempIncome };
    for (const [id, val] of Object.entries(map)) { const el = $(id); if (el && val) el.value = val; }
    (d.skills || []).forEach(s => { const t = document.querySelector(`#skillTags b[data-s="${s}"]`); if (t) t.classList.add('on'); });
    if (d.debts && d.debts[0] && d.debts[0].name) {
      const fc = document.querySelector('.debt-card');
      fc.querySelector('.d-name').value = d.debts[0].name;
      fc.querySelector('.d-amt').value = d.debts[0].amount || '';
      fc.querySelector('.d-due').value = d.debts[0].due || '';
      for (let i = 1; i < d.debts.length; i++) {
        if (!d.debts[i].name && !d.debts[i].amount) continue;
        this.addDebt();
        const cards = document.querySelectorAll('.debt-card');
        const c = cards[cards.length - 1];
        c.querySelector('.d-name').value = d.debts[i].name || '';
        c.querySelector('.d-amt').value = d.debts[i].amount || '';
        c.querySelector('.d-due').value = d.debts[i].due || '';
      }
    }
    this.updateBar();
  }
};

/* ==========================================================
   Advisor
   ========================================================== */
const Advisor = {
  currentType: null,

  /* ---- 隐藏欢迎态 ---- */
  _hideWelcome() {
    const w = $('chatWelcome');
    if (w) w.style.display = 'none';
  },

  /* ---- 新对话 ---- */
  newChat() {
    const w = $('chatWelcome');
    if (w) w.style.display = '';
    const msgs = $('chatMsgs');
    if (msgs) msgs.innerHTML = '';
    this.currentType = null;
    App.toast('已开启新对话');
  },

  /* ==== 机会搜索（自然语言对话式） ==== */
  showSearch() {
    this._hideWelcome();
    addAI(renderAIMarkdown('【机会搜索】\n\n告诉我你想找什么，我会调用搜索技能帮你全网查找。\n\n比如直接说：\n· "帮我找适合在家做的兼职"\n· "日结工作有哪些"\n· "我会设计，有什么接单机会"\n· "最近有什么薅羊毛活动"'));
  },

  /* ---- 从机会雷达跳来问AI ---- */
  askAboutOpp(title, desc) {
    App.tab('advisor');
    setTimeout(() => {
      this._hideWelcome();
      const msg = '帮我分析这个机会：' + title + '（' + desc + '）——值不值得做？怎么操作最高效？';
      addUser(msg);
      this._doAICall(null, msg);
    }, 200);
  },

  async _doAICall(type, userPrompt) {
    const tid = showThinking();

    // 检查配额
    if (AIService.dailyUsed >= AIService.dailyLimit) {
      removeEl(tid);
      addAI('今日AI次数已用完，明天再来！');
      return;
    }

    // 规则引擎模式
    if (AIService.provider === 'rule') {
      removeEl(tid);
      AIService.incrementUsage();
      App.updateAdvisorHeader();
      bumpAI();
      this._doRuleEngine(type, userPrompt);
      return;
    }

    // 显示类型分析标签（让用户知道AI在做什么）
    if (type) {
      const tagLabels = { survival: '⚡ 财务分析', debt: '⚡ 债务分析', opportunity: '⚡ 机会扫描', skill: '⚡ 技能评估', save: '⚡ 财务分析' };
      addTypeTag(tagLabels[type] || '⚡ AI分析');
    }

    // 构建用户消息
    let agentMessage = userPrompt || '';
    if (type && !userPrompt) {
      const sessionTypes = { survival: '请分析我的财务状况并给出生存方案', debt: '请帮我制定债务还款策略和谈判话术', opportunity: '请帮我搜索适合我的赚钱机会', skill: '请推荐我适合学的技能并给出速成计划', save: '请帮我制定极限省钱方案' };
      agentMessage = sessionTypes[type] || '请分析我的情况';
    }
    // 自由输入时，若明显在问机会/赚钱，加意图提示确保调用正确工具
    if (!type && userPrompt && /机会|赚钱|兼职|搞钱|日结|找活/.test(userPrompt)) {
      agentMessage = '（用户想找赚钱机会，请调用 search_opportunities 搜索）\n\n' + agentMessage;
    }

    try {
      let aiContent = '';
      let executedSkills = [];

      // 优先尝试 AgentCore（带技能调度）
      let toolResults = [];
      if (typeof AgentCore !== 'undefined') {
        let toolPanelId = null;
        const result = await AgentCore.run(agentMessage, {
          onSkillStart(allCalls) {
            toolPanelId = showToolCallPanel(allCalls);
            if (toolPanelId && tid) removeEl(tid);
          },
          onEachSkill(allCalls, idx, status) { updateToolCallPanel(toolPanelId, allCalls); },
          onSkillDone(allCalls) { finalizeToolCallPanel(toolPanelId, allCalls); }
        });
        aiContent = result.content || '';
        executedSkills = result.executedSkills || [];
        toolResults = result.toolResults || [];
        if (toolPanelId) removeEl(toolPanelId);
      } else {
        // AgentCore 不可用，直接调 DeepSeek API（带超时）
        const context = RuleEngine.calculateSurvival();
        const sysPrompt = AIService._buildSystemPrompt(context);
        const userContent = type ? AIService._buildSessionPrompt(type) : (agentMessage + '\n\n（禁止Markdown语法。回复长度和复杂度匹配问题。）');
        const key = AIService.apiKey || AIService.DEFAULT_KEY;
        const controller = new AbortController();
        const tmId = setTimeout(() => controller.abort(), 30000);
        try {
          const resp = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: userContent }],
              max_tokens: 2000, temperature: 0.8, stream: false
            }),
            signal: controller.signal
          });
          clearTimeout(tmId);
          if (!resp.ok) throw new Error(`API ${resp.status}`);
          const data = await resp.json();
          if (!data.choices || !data.choices[0]) throw new Error('No response');
          aiContent = data.choices[0].message.content;
        } catch (fe) {
          clearTimeout(tmId);
          throw fe;
        }
      }

      AIService.incrementUsage();
      App.updateAdvisorHeader();
      bumpAI();
      removeEl(tid);

      // 显示已执行的技能标签
      if (executedSkills.length > 0) {
        renderSkillBadges(executedSkills);
      }

      // 机会搜索结果：与回复合并为同一气泡（卡片整张可点击）
      let cardsHtml = '';
      const oppIdx = executedSkills.indexOf('search_opportunities');
      if (oppIdx >= 0 && toolResults[oppIdx]) {
        try {
          const data = JSON.parse(toolResults[oppIdx].content);
          const opps = data.opportunities || [];
          if (opps.length > 0) {
            cardsHtml = opps.slice(0, 8).map(o => {
              const title = _escHtml(o.title || '');
              const pay = o.pay ? ` · ${_escHtml(o.pay)}` : '';
              const src = _escHtml(o.source || '');
              const url = (o.url || '').trim();
              if (url) {
                return `<a href="${_escHtml(url)}" target="_blank" rel="noopener" class="ai-opp-card"><div class="ai-opp-title">${title}</div><div class="ai-opp-meta">${src}${pay}</div></a>`;
              }
              return `<div class="ai-opp-card" style="cursor:default"><div class="ai-opp-title">${title}</div><div class="ai-opp-meta">${src}${pay}</div></div>`;
            }).join('');
            cardsHtml = `<div class="ai-opp-wrap">${cardsHtml}</div>`;
          }
        } catch (_) {}
      }

      // 单次 addAI：文本 + 卡片 + 跳转按钮 合并
      let fullHtml = renderAIMarkdown(aiContent);
      if (cardsHtml) fullHtml += cardsHtml;
      if (type === 'opportunity' || (userPrompt && /机会|赚钱|兼职|搞钱/.test(userPrompt))) {
        fullHtml += '<div class="ai-action-row"><button class="ai-action-btn" onclick="App.tab(\'opps\')">去机会雷达查看更多 →</button></div>';
      }
      addAI(fullHtml);
    } catch (e) {
      console.error('Agent error, falling back to RuleEngine:', e);
      removeEl(tid);
      AIService.incrementUsage();
      App.updateAdvisorHeader();
      bumpAI();
      this._doRuleEngine(type, userPrompt);
      const errMsg = e.name === 'AbortError' || (e.message && e.message.includes('超时'))
        ? '⚡ AI请求超时，已用本地引擎'
        : '⚡ AI暂不可用，已用本地引擎';
      addAI(`<p style="font-size:11px;color:var(--t3);margin-top:4px">${_escHtml(errMsg)}</p>`);
    }
  },

  /* ---- 规则引擎兜底 ---- */
  _doRuleEngine(type, userPrompt) {
    if (type) {
      const fn = { survival: 'generateSurvivalPlan', debt: 'generateDebtPlan', opportunity: 'generateOpportunities', skill: 'generateSkillPlan', save: 'generateSavingPlan' };
      addAI(RuleEngine[fn[type] || 'generateSurvivalPlan'](type === 'skill' ? '短视频剪辑' : undefined));
    } else {
      addAI(RuleEngine.generateFreeAnswer(userPrompt));
    }
  },

  async start(type) {
    this.currentType = type;
    this._hideWelcome();

    const labels = { survival: '生存方案', debt: '债务谈判', opportunity: '机会扫描', skill: '技能加速', save: '极限省钱' };
    addUser(labels[type] || type);
    await this._doAICall(type, null);
  },

  async send() {
    const inp = $('chatInp');
    const msg = inp.value.trim();
    if (!msg) return;
    inp.value = '';
    this._hideWelcome();
    addUser(msg);
    await this._doAICall(null, msg);
  },

  /** 从机会雷达跳转到军师，问AI关于某个机会 */
  askAboutOpp(title, desc) {
    App.tab('advisor');
    this._hideWelcome();
    const msg = `帮我分析一下这个机会：\n「${title}」${desc ? '——' + desc : ''}\n\n这个靠谱吗？具体怎么操作？有什么注意事项？`;
    addUser(msg);
    this._doAICall(null, msg);
  },

  /** 展示记忆内容 */
  showMemory() {
    this._hideWelcome();
    if (typeof AgentMemory === 'undefined') {
      addAI('记忆功能暂不可用');
      return;
    }
    const mem = AgentMemory.getAll();
    const facts = mem.facts || [];
    const convCount = mem.conversationCount || 0;

    if (!facts.length) {
      addAI(renderAIMarkdown('【我的记忆】\n\n目前还没有记住任何信息。\n\n在对话中告诉我你的情况，比如：\n· "我在北京做设计"\n· "我最近在找兼职"\n· "我每个月房租2000"\n\n我会自动记住这些信息，下次直接为你定制方案。'));
      return;
    }

    const catNames = {
      background: '用户背景', preference: '偏好习惯', goal: '目标计划',
      skill: '技能特长', concern: '关注事项', general: '其他信息'
    };
    const grouped = {};
    facts.forEach(f => {
      const cat = catNames[f.category] || f.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(f.text);
    });

    let text = `【我的记忆】\n已记住 ${facts.length} 条信息，累计对话 ${convCount} 次\n\n`;
    for (const [cat, items] of Object.entries(grouped)) {
      text += `【${cat}】\n`;
      items.forEach(item => { text += `· ${item}\n`; });
      text += '\n';
    }
    text += '你可以随时告诉我新的信息，我会持续更新记忆。\n也可以说"忘掉某某信息"来删除。';

    addAI(renderAIMarkdown(text));
  },

  copy(id) {
    const el = $(id);
    if (!el) return;
    const txt = el.textContent.trim();
    if (navigator.clipboard) navigator.clipboard.writeText(txt);
    else {
      const t = document.createElement('textarea');
      t.value = txt;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      document.body.removeChild(t);
    }
    App.toast('已复制', 'ok');
  }
};

/* ==========================================================
   Opportunities — 机会雷达（简洁版）
   ========================================================== */
const Opps = {
  data: [],
  isScanning: false,
  currentFilter: 'all',
  _inited: false,

  /* ---- 进入页面 ---- */
  async init() {
    this._showLocalData();
    if (!this._inited) {
      this._inited = true;
      this._tryAIEnhance();
    } else {
      const cache = OpportunityScanner.getCache();
      if (cache) {
        this.data = this._merge(this.data, cache.data);
        this.render();
      }
    }
  },

  _showLocalData() {
    const d = RuleEngine.loadUserData();
    const skills = d ? (d.skills || []) : [];
    this.data = OpportunityScanner._getFallbackData(skills);
    this.render();
  },

  /* ---- 简洁提示条 ---- */
  _hint(show, text) {
    const h = $('radarHint');
    if (!h) return;
    if (!show) { h.style.display = 'none'; return; }
    h.style.display = 'flex';
    const dot = h.querySelector('.radar-dot');
    const txt = $('radarHintTxt');
    if (txt) txt.textContent = text || 'AI 扫描中…';
    if (dot) dot.className = 'radar-dot scanning';
  },
  _hintDone(text) {
    const h = $('radarHint');
    if (!h) return;
    h.style.display = 'flex';
    const dot = h.querySelector('.radar-dot');
    const txt = $('radarHintTxt');
    if (dot) dot.className = 'radar-dot done';
    if (txt) txt.textContent = text;
    setTimeout(() => { h.style.display = 'none'; }, 3000);
  },

  /* ---- AI 增强 ---- */
  async _tryAIEnhance() {
    const cache = OpportunityScanner.getCache();
    if (cache) {
      this.data = this._merge(this.data, cache.data);
      this.render();
      return;
    }
    if (AIService.provider === 'rule') return;

    this.isScanning = true;
    this._hint(true, 'AI 正在从全网抓取最新机会…');

    try {
      const d = RuleEngine.loadUserData();
      const skills = d ? (d.skills || []) : [];
      const context = RuleEngine.calculateSurvival();
      const result = await OpportunityScanner.scan(skills, context, null, false);
      this.isScanning = false;

      if (result.success && result.data && result.data.length > 0 && !result.fallback) {
        this.data = this._merge(this.data, result.data);
        this._hintDone(`已更新 ${result.data.length} 条新机会`);
        this.render();
      } else {
        this._hint(false);
      }
    } catch (e) {
      console.error('AI scan failed:', e);
      this.isScanning = false;
      this._hint(false);
    }
  },

  _merge(local, ai) {
    const seen = new Set();
    const merged = [];
    for (const o of (ai || [])) { const k = (o.source||'')+':'+(o.title||''); if (!seen.has(k)) { seen.add(k); merged.push(o); } }
    for (const o of (local || [])) { const k = (o.source||'')+':'+(o.title||''); if (!seen.has(k)) { seen.add(k); merged.push(o); } }
    return merged;
  },

  /* ---- 渲染列表 ---- */
  render(filter) {
    this.currentFilter = filter || this.currentFilter || 'all';
    let list = this.data || [];
    if (this.currentFilter !== 'all') list = list.filter(o => o.type === this.currentFilter);

    const c = $('oppList');
    const em = $('oppEmpty');
    if (!c) return;

    if (!list.length) { c.innerHTML = ''; if (em) em.style.display = 'block'; return; }
    if (em) em.style.display = 'none';

    c.innerHTML = '';
    c.style.display = 'flex';

    list.forEach(o => {
      const card = document.createElement('div');
      card.className = 'opp-card';

      // 顶部：来源 + 类型标签
      const top = document.createElement('div');
      top.className = 'opp-top';
      const src = document.createElement('span');
      src.className = 'opp-src';
      src.textContent = o.source || '';
      const badge = document.createElement('span');
      badge.className = 'opp-badge ' + (o.type || '');
      badge.textContent = (o.badge || '').replace(/^[^\u4e00-\u9fff]+/, '');
      top.appendChild(src);
      top.appendChild(badge);
      card.appendChild(top);

      // 标题
      const title = document.createElement('div');
      title.className = 'opp-title';
      title.textContent = o.title;
      card.appendChild(title);

      // 描述
      const desc = document.createElement('p');
      desc.className = 'opp-desc';
      desc.textContent = o.desc;
      card.appendChild(desc);

      // 底部：金额 + 按钮
      const foot = document.createElement('div');
      foot.className = 'opp-foot';
      const pay = document.createElement('span');
      pay.className = 'opp-pay';
      pay.textContent = o.pay;

      const btns = document.createElement('div');
      btns.className = 'opp-btns';

      if (o.url) {
        const goBtn = document.createElement('a');
        goBtn.className = 'opp-go';
        goBtn.href = o.url;
        goBtn.target = '_blank';
        goBtn.rel = 'noopener';
        goBtn.textContent = '报名';
        btns.appendChild(goBtn);
      }

      const favBtn = document.createElement('button');
      favBtn.className = 'opp-fav';
      favBtn.textContent = '收藏';
      favBtn.onclick = () => { favBtn.textContent = '已收藏'; favBtn.disabled = true; App.toast('已收藏', 'ok'); };
      btns.appendChild(favBtn);

      foot.appendChild(pay);
      foot.appendChild(btns);
      card.appendChild(foot);
      c.appendChild(card);
    });
  },

  /* ---- 刷新 ---- */
  async refresh() {
    if (this.isScanning) { App.toast('正在刷新…'); return; }
    const btn = $('oppRefreshBtn');
    if (btn) btn.classList.add('spin');
    localStorage.removeItem(OpportunityScanner.CACHE_KEY);
    this._inited = false;
    this._showLocalData();
    await this._tryAIEnhance();
    if (btn) setTimeout(() => btn.classList.remove('spin'), 600);
  }
};

/* ==========================================================
   Helpers
   ========================================================== */

function animNum(el, target) {
  const from = parseInt(el.textContent) || 0;
  const diff = target - from;
  const dur = 900;
  const t0 = performance.now();
  (function tick(t) {
    const p = Math.min((t - t0) / dur, 1);
    el.textContent = Math.round(from + diff * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}

function addAI(html) {
  const c = $('chatMsgs');
  const d = document.createElement('div');
  d.className = 'msg msg-ai';
  d.innerHTML = `<div class="msg-ava"><span>⚡</span></div><div class="msg-bub">${html}</div>`;
  c.appendChild(d);
  scrollChat();
}

function addUser(text) {
  const c = $('chatMsgs');
  const d = document.createElement('div');
  d.className = 'msg msg-user';
  const safe = document.createElement('div');
  safe.textContent = text;
  d.innerHTML = `<div class="msg-bub">${safe.innerHTML}</div>`;
  c.appendChild(d);
  scrollChat();
}

function showThinking() {
  const id = 't_' + Date.now();
  const c = $('chatMsgs');
  const d = document.createElement('div');
  d.className = 'msg msg-ai';
  d.id = id;
  d.innerHTML = '<div class="msg-ava"><span>⚡</span></div><div class="msg-bub"><div class="dots"><i></i><i></i><i></i></div></div>';
  c.appendChild(d);
  scrollChat();
  return id;
}

function removeEl(id) { const el = $(id); if (el) el.remove(); }

/* ---- 类型标签（显示AI正在执行什么分析） ---- */
function addTypeTag(label) {
  const c = $('chatMsgs');
  if (!c) return;
  const d = document.createElement('div');
  d.className = 'ai-type-tag';
  d.textContent = label;
  c.appendChild(d);
  scrollChat();
}

/* ---- 工具调用面板（实时展示 Agent 调用了哪些技能） ---- */
const TOOL_ICONS = {
  analyze_finances: '📊', search_opportunities: '🔍', track_expense: '📝',
  get_expense_history: '📋', create_budget: '💰', check_bills: '📄',
  generate_script: '🗣️', learn_skill_plan: '📚', open_platform: '🔗',
  update_financial_data: '🔄', save_memory: '🧠', get_memory: '💭'
};

function showToolCallPanel(allCalls) {
  const id = 'tcp_' + Date.now();
  const c = $('chatMsgs');
  const d = document.createElement('div');
  d.className = 'msg msg-ai';
  d.id = id;

  let rows = allCalls.map((call, i) => {
    const icon = TOOL_ICONS[call.fnName] || '⚙️';
    return `<div class="tc-row" id="${id}_r${i}" data-status="pending">
      <span class="tc-icon">${icon}</span>
      <span class="tc-name">${_escHtml(call.displayName)}</span>
      <span class="tc-status tc-pending">等待中</span>
    </div>`;
  }).join('');

  d.innerHTML = `<div class="msg-ava"><span>⚡</span></div><div class="msg-bub"><div class="tc-panel">
    <div class="tc-hd">🛠️ Agent 正在调用工具</div>
    <div class="tc-body">${rows}</div>
    <div class="tc-foot" id="${id}_foot"><div class="tc-progress"><div class="tc-bar" id="${id}_bar"></div></div></div>
  </div></div>`;
  c.appendChild(d);
  scrollChat();
  return id;
}

function updateToolCallPanel(panelId, allCalls) {
  if (!panelId) return;
  const total = allCalls.length;
  let doneCount = 0;

  allCalls.forEach((call, i) => {
    const row = $(panelId + '_r' + i);
    if (!row) return;
    row.dataset.status = call.status;
    const statusEl = row.querySelector('.tc-status');
    if (!statusEl) return;

    if (call.status === 'running') {
      statusEl.className = 'tc-status tc-running';
      statusEl.innerHTML = '<i class="tc-spin"></i> 执行中';
    } else if (call.status === 'done') {
      statusEl.className = 'tc-status tc-done';
      statusEl.textContent = '✓ 完成';
      doneCount++;
    }
  });

  // 更新进度条
  const bar = $(panelId + '_bar');
  if (bar) bar.style.width = Math.round((doneCount / total) * 100) + '%';
  scrollChat();
}

function finalizeToolCallPanel(panelId, allCalls) {
  if (!panelId) return;
  updateToolCallPanel(panelId, allCalls);

  // 更新标题
  const panel = $(panelId);
  if (panel) {
    const hd = panel.querySelector('.tc-hd');
    if (hd) hd.textContent = '✅ 工具调用完成（共 ' + allCalls.length + ' 项）';
    const foot = $(panelId + '_foot');
    if (foot) foot.innerHTML = '<span class="tc-summary">数据已获取，正在生成回复…</span>';
  }
  scrollChat();
}

/* ---- 已执行技能标签渲染（保留在最终回复前） ---- */
function renderSkillBadges(executedSkills) {
  if (!executedSkills || !executedSkills.length) return;
  const names = (typeof AgentCore !== 'undefined' && AgentCore.SKILL_NAMES) ? AgentCore.SKILL_NAMES : {};
  const c = $('chatMsgs');
  const d = document.createElement('div');
  d.className = 'skill-badge-row';
  d.innerHTML = executedSkills.map(sk =>
    `<span class="skill-badge">${_escHtml(names[sk] || sk)}</span>`
  ).join('');
  c.appendChild(d);
  scrollChat();
}

function scrollChat() { const cb = $('chatBody'); if (cb) setTimeout(() => cb.scrollTop = cb.scrollHeight, 40); }

/* ==========================================================
   AI 回复渲染器 — 简约可视化卡片
   ========================================================== */

/* ---- 主渲染入口 ---- */
function renderAIMarkdown(text) {
  if (!text) return '';

  // 0. 清理 AI 输出中的各种非法内容
  let src = text;

  // 0a. DSML 工具调用残留（兼容 <|DSML|、< | DSML |、各种空格变体）
  // 完整 DSML 块（含闭合标签）
  src = src.replace(/<[^>]*DSML[^>]*function_calls[^>]*>[\s\S]*?<[^>]*(?:DSML|function_calls)[^>]*>/gi, '');
  // 无闭合标签的 DSML 块（截断到末尾——这是截图中最常见的情况）
  src = src.replace(/<[^>]*DSML[^>]*function_calls[^>]*>[\s\S]*$/gi, '');
  // 所有残留 DSML 标签
  src = src.replace(/<[^>]*DSML[^>]*>/gi, '');
  // invoke / function_call 标签
  src = src.replace(/<\/?[^>]*invoke[^>]*>/gi, '');
  src = src.replace(/<\/?function_call[^>]*>/gi, '');
  // function_calls 块
  src = src.replace(/<\/?function_calls>/gi, '');
  // 工具调用参数标签（<parameters>、<param>、<key>、<value>）
  src = src.replace(/<\/?parameters>/gi, '');
  src = src.replace(/<param\s+[^>]*>[^<]*<\/param>/gi, '');
  src = src.replace(/<key>[^<]*<\/key>/gi, '');
  src = src.replace(/<value>[^<]*<\/value>/gi, '');
  src = src.replace(/<\/?key>/gi, '');
  src = src.replace(/<\/?value>/gi, '');

  // 0b. 清理 AI 可能输出的 HTML 标签（防止 <b class="ai-money"> 之类的原始标签泄漏到文本中）
  src = src.replace(/<\/?\s*(?:b|i|em|strong|span|div|p|br|a|h[1-6]|ul|ol|li|table|tr|td|th|thead|tbody|img|code|pre|blockquote|hr|font|center|small|big|sub|sup|mark|del|ins|s|u)(?:\s+[^>]*)?\s*\/?>/gi, '');

  src = src.trim();
  if (!src) return '<p style="color:var(--t3);font-size:13px">正在分析中，请稍候…</p>';

  // 1. 清理 Markdown 语法，提取纯文本
  const clean = _stripMarkdown(src);

  // 2. 按【标题】切分段落
  const sections = _parseSections(clean);

  // 3. 用 DOM 安全地构建卡片
  const container = document.createElement('div');

  sections.forEach(sec => {
    const card = document.createElement('div');
    card.className = 'ai-card';

    if (sec.title) {
      const hd = document.createElement('div');
      hd.className = 'ai-card-hd';
      hd.textContent = sec.title;
      card.appendChild(hd);
    }

    const bd = document.createElement('div');
    bd.className = 'ai-card-bd';
    _renderBody(bd, sec.body);
    card.appendChild(bd);

    container.appendChild(card);
  });

  return container.innerHTML;
}

/* ---- 清理 Markdown ---- */
function _stripMarkdown(text) {
  return text
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    // 保留 [text](url) 供 _renderInline 转为可点击短链接
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/^-{3,}$/gm, '')
    .replace(/^\|(.+)\|$/gm, (m, c) => /^[\s\-:|]+$/.test(c) ? '' : c.split('|').map(x => x.trim()).filter(Boolean).join(' · '))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ---- 按【标题】解析段落 ---- */
function _parseSections(text) {
  const parts = text.split(/(?=【[^】]+】)/);
  const result = [];

  parts.forEach(part => {
    const m = part.match(/^【([^】]+)】\s*([\s\S]*)/);
    if (m) {
      result.push({ title: m[1].trim(), body: m[2].trim() });
    } else {
      const t = part.trim();
      if (t) result.push({ title: '', body: t });
    }
  });

  return result.length ? result : [{ title: '', body: text }];
}

/* ---- 渲染段落正文到 DOM ---- */
function _renderBody(container, text) {
  if (!text) return;

  const lines = text.split('\n');
  let currentList = null;  // 'ol' | 'ul' | null
  let listEl = null;

  lines.forEach(rawLine => {
    const line = rawLine.trim();
    if (!line) {
      // 空行：断开列表
      if (listEl) { container.appendChild(listEl); listEl = null; currentList = null; }
      return;
    }

    // ---- 编号列表 (1. 2. 3.) ----
    const olMatch = line.match(/^(\d+)[.、]\s*(.+)/);
    if (olMatch) {
      if (currentList !== 'ol') {
        if (listEl) container.appendChild(listEl);
        listEl = document.createElement('div');
        listEl.className = 'ai-list';
        currentList = 'ol';
      }
      const item = document.createElement('div');
      item.className = 'ai-list-item';
      const num = document.createElement('span');
      num.className = 'ai-list-num';
      num.textContent = olMatch[1];
      const txt = document.createElement('span');
      txt.className = 'ai-list-txt';
      _renderInline(txt, olMatch[2]);
      item.appendChild(num);
      item.appendChild(txt);
      listEl.appendChild(item);
      return;
    }

    // ---- 无序列表 (· - • ⊙) ----
    const ulMatch = line.match(/^[·•\-⊙]\s*(.+)/);
    if (ulMatch) {
      if (currentList !== 'ul') {
        if (listEl) container.appendChild(listEl);
        listEl = document.createElement('div');
        listEl.className = 'ai-list ai-list-ul';
        currentList = 'ul';
      }
      const item = document.createElement('div');
      item.className = 'ai-list-item';
      const dot = document.createElement('span');
      dot.className = 'ai-list-dot';
      dot.textContent = '•';
      const txt = document.createElement('span');
      txt.className = 'ai-list-txt';
      _renderInline(txt, ulMatch[1]);
      item.appendChild(dot);
      item.appendChild(txt);
      listEl.appendChild(item);
      return;
    }

    // 断开列表
    if (listEl) { container.appendChild(listEl); listEl = null; currentList = null; }

    // ---- 话术引用 (中文引号) ----
    const quoteMatch = line.match(/\u201c(.{8,})\u201d/);
    if (quoteMatch) {
      _addQuoteBlock(container, quoteMatch[1]);
      return;
    }

    // ---- 话术引用 (英文引号，只匹配中文内容) ----
    const enQuoteMatch = line.match(/^"([\u4e00-\u9fff].{8,})"$/);
    if (enQuoteMatch) {
      _addQuoteBlock(container, enQuoteMatch[1]);
      return;
    }

    // ---- 任务行 (✅ ☑ ✓) ----
    if (/^[✅☑✓]/.test(line)) {
      const task = document.createElement('div');
      task.className = 'ai-task-row';
      const icon = document.createElement('span');
      icon.className = 'ai-task-icon';
      icon.textContent = '✅';
      const txt = document.createElement('span');
      _renderInline(txt, line.replace(/^[✅☑✓]\s*/, ''));
      task.appendChild(icon);
      task.appendChild(txt);
      container.appendChild(task);
      return;
    }

    // ---- 警告行 (⚠️ 🔴 🟡 🔥) ----
    if (/^[⚠️🔴🟡🟢🔥]/.test(line)) {
      const alert = document.createElement('div');
      alert.className = 'ai-alert-line';
      _renderInline(alert, line);
      container.appendChild(alert);
      return;
    }

    // ---- 普通文本行 ----
    const p = document.createElement('div');
    p.className = 'ai-text-line';
    _renderInline(p, line);
    container.appendChild(p);
  });

  // 清理最后的列表
  if (listEl) container.appendChild(listEl);
}

/* ---- 渲染行内元素（金额高亮、时间加粗、链接规整） ---- */
function _renderInline(el, text) {
  // 安全设置文本，然后高亮关键内容
  const safe = document.createElement('span');
  safe.textContent = text;
  let html = safe.innerHTML;

  // 1. 链接规整：Markdown [文本](url) → 短链接
  html = html.replace(/\[([^\]]{1,30})\]\((https?:\/\/[^)\s]+)\)/g, (_, label, url) => {
    const safeUrl = _escHtml(url);
    const safeLabel = _escHtml(label.length > 14 ? label.slice(0, 12) + '…' : label);
    return `<a href="${safeUrl}" target="_blank" rel="noopener" class="ai-link">${safeLabel} →</a>`;
  });

  // 2. 链接规整：裸 URL → 短链接（显示平台名）
  const domainMap = { zhipin: 'BOSS直聘', goofish: '闲鱼', zhangmen: '掌门教育', '58': '58同城', m58: '58同城' };
  html = html.replace(/(https?:\/\/[^\s<]+)/g, (m) => {
    const url = m;
    const safeUrl = _escHtml(url);
    let label = '链接';
    try {
      const host = (url.match(/https?:\/\/(?:www\.|m\.)?([^\/]+)/) || [])[1] || '';
      label = Object.entries(domainMap).find(([k]) => host.includes(k))?.[1] || host.replace(/\.(com|cn|net).*$/, '').slice(0, 8) || '链接';
    } catch (_) {}
    return `<a href="${safeUrl}" target="_blank" rel="noopener" class="ai-link">${label} →</a>`;
  });

  // 金额高亮 ¥xxx
  html = html.replace(/(¥[\d,.]+(?:\s*[-~]\s*¥?[\d,.]+)?(?:\/[^\s<]*)?)/g, '<b class="ai-money">$1</b>');

  // 时间标签高亮
  html = html.replace(/((?:上午|下午|中午|晚上|早上|今[天日]|明[天日]|本周|本月|第\d+天?|第\d+[-~]\d+天?)\S{0,6})/g, '<b class="ai-time">$1</b>');

  // 平台名高亮
  html = html.replace(/((?:58同城|BOSS直聘|闲鱼|美团|饿了么|支付宝|微信|拼多多|淘宝|抖音|快手|小红书|猪八戒|知乎|豆瓣|B站|货拉拉|滴滴|闪送|1688|剪映)(?:APP|app)?)/g, '<b class="ai-platform">$1</b>');

  el.innerHTML = html;
}

/* ---- 添加话术引用块（安全方式） ---- */
function _addQuoteBlock(container, quoteText) {
  const block = document.createElement('div');
  block.className = 'ai-quote';

  const textEl = document.createElement('div');
  textEl.className = 'ai-quote-text';
  const qid = 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  textEl.id = qid;
  textEl.textContent = '\u201c' + quoteText + '\u201d';
  block.appendChild(textEl);

  const btn = document.createElement('button');
  btn.className = 'ai-copy-btn';
  btn.textContent = '复制话术';
  btn.setAttribute('onclick', `Advisor.copy('${qid}')`);
  block.appendChild(btn);

  container.appendChild(block);
}

/* ---- 根据标题匹配 emoji（精简） ---- */
function _pickEmoji(title) {
  // 不再为每个标题加 emoji，保持简洁
  return '';
}

function bumpAI() {
  const n = parseInt(localStorage.getItem('aiTotal') || '0') + 1;
  localStorage.setItem('aiTotal', n.toString());
}

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded', () => App.init());
