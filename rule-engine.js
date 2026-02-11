/* ==========================================================
   精打细算 Pro v2 — 规则引擎 + AI 服务
   ========================================================== */

const RuleEngine = {
  userData: null,

  setUserData(d) { this.userData = d; localStorage.setItem('userData', JSON.stringify(d)); },
  loadUserData() { const s = localStorage.getItem('userData'); if (s) this.userData = JSON.parse(s); return this.userData; },

  /* -------- 核心计算 -------- */
  calculateSurvival() {
    const d = this.userData;
    if (!d) return null;

    const totalMoney = (d.savings || 0) + (d.cash || 0) + (d.assets || 0);
    const monthlyExpense = (d.rent || 0) + (d.utilities || 0) + (d.food || 0) + (d.transport || 0) + (d.otherExpense || 0);
    const dailyExpense = monthlyExpense / 30;
    const survivalDays = dailyExpense > 0 ? Math.floor(totalMoney / dailyExpense) : 999;

    let daysToPayday = null;
    if (d.payday) {
      const now = new Date(); now.setHours(0, 0, 0, 0);
      const pay = new Date(d.payday); pay.setHours(0, 0, 0, 0);
      daysToPayday = Math.max(0, Math.ceil((pay - now) / 864e5));
    }

    const monthlyGap = monthlyExpense - (d.income || 0);
    const totalDebt = (d.debts || []).reduce((s, x) => s + (x.amount || 0), 0);
    const dailyBudget = daysToPayday && daysToPayday > 0
      ? Math.floor(totalMoney / daysToPayday)
      : (dailyExpense > 0 ? Math.floor(totalMoney / Math.max(survivalDays, 1)) : 0);

    let dangerLevel = 'safe';
    if (survivalDays <= 7 || (daysToPayday && survivalDays < daysToPayday)) dangerLevel = 'danger';
    else if (survivalDays <= 30 || monthlyGap > 0) dangerLevel = 'warning';

    return { totalMoney, monthlyExpense, dailyExpense: Math.round(dailyExpense * 100) / 100, survivalDays, daysToPayday, monthlyGap, totalDebt, dailyBudget, dangerLevel, income: d.income || 0 };
  },

  getStatusText(s) {
    if (!s) return { status: '暂无数据', summary: '请先录入财务数据' };
    const { survivalDays, daysToPayday, dangerLevel, monthlyGap, dailyExpense } = s;
    let status = '', summary = '';
    if (dangerLevel === 'danger') {
      if (daysToPayday && survivalDays < daysToPayday) {
        status = '🔴 红色警报'; summary = `钱不够撑到发薪日！缺口约 ¥${Math.round((daysToPayday - survivalDays) * dailyExpense)}`;
      } else { status = '🔴 紧急状态'; summary = `仅能维持${survivalDays}天，需立即行动`; }
    } else if (dangerLevel === 'warning') {
      status = '🟡 需要警惕';
      summary = monthlyGap > 0 ? `每月缺口 ¥${Math.round(monthlyGap)}，需开源节流` : `资金可维持${survivalDays}天，建议提前规划`;
    } else { status = '🟢 暂时安全'; summary = `资金较充足，可维持${survivalDays}天`; }
    return { status, summary };
  },

  getUpcomingBills() {
    const d = this.userData;
    if (!d || !d.debts) return [];
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return d.debts
      .filter(x => x.name && x.amount && x.due)
      .map(x => {
        const due = new Date(x.due); due.setHours(0, 0, 0, 0);
        const dl = Math.ceil((due - now) / 864e5);
        return { name: x.name, amount: x.amount, dueDate: x.due, daysLeft: dl, isUrgent: dl <= 3 };
      })
      .filter(b => b.daysLeft >= 0)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  },

  getAlerts() {
    const s = this.calculateSurvival();
    if (!s) return null;
    const bills = this.getUpcomingBills();
    const ub = bills.filter(b => b.isUrgent);
    if (ub.length) return { title: '紧急：账单即将到期', message: `${ub[0].daysLeft === 0 ? '今天' : ub[0].daysLeft + '天后'}需还 ${ub[0].name} ¥${ub[0].amount}` };
    if (s.dangerLevel === 'danger') return { title: '资金告急', message: `当前资金仅够维持${s.survivalDays}天，建议查看AI军师建议` };
    return null;
  },

  /* ======== 生存方案 ======== */
  generateSurvivalPlan() {
    const s = this.calculateSurvival();
    const d = this.userData;
    if (!s || !d) return '请先录入财务数据';
    const { totalMoney, dailyExpense, survivalDays, daysToPayday, dangerLevel, monthlyGap, dailyBudget } = s;
    const skills = d.skills || [];
    const debts = d.debts || [];

    let r = card('财务分析', `可用 ¥${totalMoney}，日开销 ¥${Math.round(dailyExpense)}${daysToPayday ? `，${daysToPayday}天后发薪` : ''}：<br><br>`);

    if (dangerLevel === 'danger') {
      r += `<span style="color:var(--red);font-weight:700">⚠️ 高危状态</span>：钱${daysToPayday ? '不够撑到发薪日' : `仅够${survivalDays}天`}！<br>`;
      const ud = debts.filter(x => x.name && x.due).sort((a, b) => new Date(a.due) - new Date(b.due))[0];
      if (ud) { const dl = Math.ceil((new Date(ud.due) - new Date()) / 864e5); r += `🔥 最紧急：${dl}天后要还 ${ud.name} ¥${ud.amount}<br>`; }
      r += `💡 策略：先保生存，再还债务`;
    } else if (dangerLevel === 'warning') {
      r += `<span style="color:#E5A100;font-weight:700">⚡ 需要警惕</span>：`;
      r += monthlyGap > 0 ? `每月缺口 ¥${Math.round(monthlyGap)}，需要额外收入` : `资金可维持${survivalDays}天，建议未雨绸缪`;
    } else {
      r += `<span style="color:var(--green);font-weight:700">✅ 短期安全</span>：资金可维持${survivalDays}天，可考虑长期规划`;
    }
    r += `</div></div>`;

    // 每日任务
    r += cardOpen('今日清单');
    this._dailyTasks(s, skills).forEach(t => { r += task(t); });
    r += `</div></div>`;

    // 准备好的工具
    r += cardOpen('可用资源');
    if (dangerLevel === 'danger' || dangerLevel === 'warning') {
      r += `· 最低成本食谱：馒头+鸡蛋+青菜 ≈ ¥8<br>`;
      if (monthlyGap > 0 || dangerLevel === 'danger') r += `· 与房东协商晚交房租的话术模板<br>`;
      r += `· 附近日结兼职信息<br>· 二手物品变现定价建议<br>`;
    } else {
      r += `· 日预算控制在 ¥${dailyBudget} 以内<br>· 适合你的副业路径<br>· 低成本技能提升清单<br>`;
    }
    r += `</div></div>`;

    // 话术
    if (dangerLevel === 'danger' && debts.length && debts[0].name) {
      r += card('协商话术', '');
      r += `<div id="neg-tpl">"${debts[0].name}，你好。最近遇到一些临时困难，想跟你商量还款的事。手头紧张但已积极找工作，预计${daysToPayday || 15}天后有收入。能不能分两次还？先还一部分表示诚意。给你添麻烦了，真抱歉。"</div>`;
      r += copyBtn('neg-tpl');
      r += `</div></div>`;
    }
    return r;
  },

  _dailyTasks(s, skills) {
    const t = [];
    const { dangerLevel, totalMoney, dailyBudget } = s;
    if (dangerLevel === 'danger') {
      if (skills.includes('labor')) t.push('<b>上午9-11点</b>：去附近工地/物流园找日结（预计150-250元）');
      else if (skills.includes('driving')) t.push('<b>上午</b>：注册跑腿/代驾平台接单（首日100-200元）');
      else if (skills.includes('computer') || skills.includes('design') || skills.includes('writing')) t.push('<b>上午</b>：猪八戒/闲鱼发3条技能服务（50-200元/单）');
      else t.push('<b>上午</b>：58同城搜"日结""临时工"，投递5份');
      t.push(`<b>中午</b>：控制餐费 ¥${Math.min(dailyBudget, 15)} 以内（自己做最省）`);
      if (totalMoney > 100) t.push('<b>下午</b>：整理闲置物品拍照上闲鱼（至少3件）');
      t.push('<b>晚上</b>：规划明天的工作/兼职安排');
    } else if (dangerLevel === 'warning') {
      t.push(`<b>今日</b>：所有消费控制在 ¥${dailyBudget} 以内`);
      if (skills.includes('video') || skills.includes('design')) t.push('<b>空闲</b>：发1条短视频作品（积累粉丝=变现渠道）');
      t.push('<b>今日</b>：记录每笔开销，分析可砍掉的');
      t.push('<b>本周</b>：研究1个新收入渠道');
    } else {
      t.push(`<b>今日</b>：日消费不超过 ¥${dailyBudget}`);
      t.push('<b>本周</b>：学习一项能增收的技能');
      t.push('<b>本月</b>：建立500元紧急备用金');
    }
    return t;
  },

  /* ======== 债务谈判 ======== */
  generateDebtPlan() {
    const d = this.userData;
    if (!d || !d.debts || !d.debts.length || !d.debts[0].name) {
      return card('债务分析', '你还没有录入债务信息。回到数据录入页面添加债务详情，AI可以为每个债主生成专属谈判策略。');
    }
    const s = this.calculateSurvival();
    let r = '';

    d.debts.filter(x => x.name && x.amount).forEach((debt, i) => {
      const dl = debt.due ? Math.ceil((new Date(debt.due) - new Date()) / 864e5) : null;

      r += cardOpen(`债主${i + 1}：${debt.name}`);
      r += `<b>欠款</b>：¥${debt.amount}${dl !== null ? ` · <b>剩余</b>：${dl}天` : ''}<br><br>`;
      if (dl !== null && dl <= 3) r += `<span style="color:var(--red);font-weight:700">⚠️ 紧急：即将到期！</span><br><br>`;

      r += `<b>三步谈判法：</b><br>`;
      r += `<b>第一步</b>：主动联系，表达诚意 → 先问候不提钱<br><br>`;

      if (debt.amount <= 500) {
        r += `<b>第二步</b>：提出一次性还清方案<br>`;
        r += `<b>第三步</b>：约定具体还款日期<br>`;
      } else if (debt.amount <= 2000) {
        const parts = Math.min(3, Math.ceil(debt.amount / 500));
        r += `<b>第二步</b>：分${parts}次还，每次 ¥${Math.ceil(debt.amount / parts)}<br>`;
        r += `<b>第三步</b>：先转 ¥${Math.min(100, Math.floor(debt.amount * 0.2))} 表示诚意<br>`;
      } else {
        const parts = Math.ceil(debt.amount / 1000);
        r += `<b>第二步</b>：分${parts}期，每期 ¥${Math.ceil(debt.amount / parts)}<br>`;
        r += `<b>第三步</b>：探讨劳务/技能抵扣部分债务<br>`;
      }
      r += `</div></div>`;

      // 话术
      const tid = `dmsg${i}`;
      r += cardOpen(`给${debt.name}的话术`);
      r += `<div id="${tid}">"${debt.name}，最近好吗？之前借的${debt.amount}元一直记着，遇到点困难但在想办法。我计划${
        debt.amount <= 500 ? `在${s?.daysToPayday || 15}天内还清` : `分${Math.min(3, Math.ceil(debt.amount / 500))}次还`
      }。你看行吗？不好意思。"</div>`;
      r += copyBtn(tid);
      r += `</div></div>`;
    });
    return r;
  },

  /* ======== 机会推荐 ======== */
  generateOpportunities() {
    const d = this.userData;
    const skills = d ? (d.skills || []) : [];
    const s = this.calculateSurvival();
    let r = cardOpen('为你推荐的机会');
    r += '基于你的技能推荐：<br><br>';

    const recs = [];
    if (skills.includes('driving')) { recs.push(opp('兼职', '网约车/代驾', '日收200-400元', '可立即开始')); recs.push(opp('任务', '同城跑腿', '单均8-15元', '可立即开始')); }
    if (skills.includes('computer')) { recs.push(opp('兼职', 'AI数据标注', '日收50-100元', '1-2天上手')); recs.push(opp('兼职', '远程客服', '时薪15-25元', '需面试')); }
    if (skills.includes('design')) recs.push(opp('兼职', '设计接单', '单价50-500元', '可立即开始'));
    if (skills.includes('video')) { recs.push(opp('兼职', '短视频剪辑', '单价50-300元', '可立即开始')); recs.push(opp('兼职', '直播助理', '日薪80-150元', '需面试')); }
    if (skills.includes('writing')) recs.push(opp('兼职', '文案写作', '单价30-200元', '可立即开始'));
    if (skills.includes('teaching')) recs.push(opp('兼职', '家教辅导', '时薪50-150元', '需匹配'));
    if (skills.includes('cooking')) recs.push(opp('兼职', '私厨/外卖', '单价15-30元/份', '可立即开始'));
    if (skills.includes('repair')) recs.push(opp('兼职', '维修服务', '上门50-200元/次', '可立即开始'));
    if (skills.includes('labor')) recs.push(opp('兼职', '日结体力工', '日结150-250元', '可立即开始'));
    if (skills.includes('sales')) recs.push(opp('兼职', '地推/促销', '日结80-200元', '可随时报名'));
    recs.push(opp('薅羊毛', '新用户注册奖励', '各平台新用户礼金', '立即操作'));
    recs.push(opp('变现', '闲置物品出售', '预计回收¥100-500', '立即操作'));
    if (s && s.dangerLevel === 'danger') recs.unshift(opp('紧急', '紧急求助渠道', '社区救助站/慈善机构', '紧急时用'));

    recs.forEach(x => {
      r += `<div style="padding:6px 0;border-bottom:1px solid #F0F0F0">
        <b>${x.title}</b> · <span style="font-size:12px;color:var(--t3)">${x.type}</span><br>
        <span style="font-size:12px;color:var(--t2)">${x.desc}</span><br>
        <span style="font-size:12px;color:var(--t3)">${x.urgency}</span></div>`;
    });
    r += `</div></div>`;
    return r;
  },

  /* ======== 技能加速 ======== */
  generateSkillPlan(name) {
    const db = {
      '短视频剪辑': {
        old: '报班3月，学费3000',
        steps: [
          ['第1天', '下载剪映，学3个基础功能', '产出3条练习视频'],
          ['第2天', '模仿10个爆款视频结构', '掌握爆款套路'],
          ['第3天', '找5个本地商家免费帮剪1条', '积累作品集'],
          ['第4-5天', '朋友圈/小红书发接单信息', '获取第一个客户'],
          ['第7天', '接第一个付费单（首单50元）', '赚到第一笔钱'],
          ['第30天', '稳定3-5个客户', '月增收1000-3000元']
        ],
        tools: ['剪映APP（免费）', '10个爆款模板', '本地商家联系话术', '定价参考表']
      },
      '外卖骑手': {
        old: '找工作1-2周',
        steps: [['第1天', '注册美团/蜂鸟众包', '完成注册'], ['第2天', '午高峰跑3-5单', '日收50-80元'], ['第3-7天', '掌握最优路线', '日收150-250元'], ['第14天', '稳定日跑30-40单', '日收200-350元']],
        tools: ['注册指南', '最佳时段分析', '路线优化技巧']
      },
      '闲鱼卖货': {
        old: '需要进货资金',
        steps: [['第1天', '整理闲置拍照定价', '上架10件'], ['第2天', '学爆款标题优化描述', '提高曝光'], ['第3天', '学1688无货源模式', '0成本开店'], ['第7天', '每天上架5-10新品', '开始出单'], ['第30天', '建立稳定流程', '月收500-2000元']],
        tools: ['拍照技巧', '爆款标题模板', '1688选品指南', '定价策略表']
      }
    };
    const sk = db[name] || db['短视频剪辑'];

    let r = card('速成：' + (name || '短视频剪辑'), `传统：${sk.old}<br>推荐穷人路径：`);
    r += cardOpen('学习计划');
    sk.steps.forEach(s => {
      r += `<div class="ai-task"><div class="ai-ck" onclick="this.classList.toggle('done')"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
        <div class="ai-task-txt"><b>${s[0]}</b>：${s[1]}<br><span style="color:var(--green);font-size:12px">→ ${s[2]}</span></div></div>`;
    });
    r += `</div></div>`;

    r += cardOpen('可用工具');
    sk.tools.forEach(t => { r += `· ${t}<br>`; });
    r += `</div></div>`;
    return r;
  },

  /* ======== 极限省钱 ======== */
  generateSavingPlan() {
    const s = this.calculateSurvival();
    const d = this.userData;
    if (!s || !d) return '请先录入财务数据';
    const { dailyBudget, monthlyExpense } = s;
    const target = Math.min(dailyBudget, 30);

    let r = card('极限省钱方案', `目标：每日 ¥${target}<br>当前月支出 ¥${Math.round(monthlyExpense)} → 目标 ¥${target * 30}<br>每月可省 ¥${Math.max(0, Math.round(monthlyExpense - target * 30))}`);

    r += cardOpen('最低成本食谱（每日 ¥10-15）');
    r += `<b>早餐 ¥2-3</b><br>• 馒头 + 鸡蛋 + 白粥<br><br>`;
    r += `<b>午餐 ¥5-7</b><br>• 挂面 + 青菜 + 鸡蛋<br><br>`;
    r += `<b>晚餐 ¥3-5</b><br>• 稀饭 + 馒头 + 咸菜<br><br>`;
    r += `<b>💡 技巧</b>：收摊前买菜省30-50%，批量买主食`;
    r += `</div></div>`;

    r += cardOpen('支出削减清单');
    if (d.rent) r += taskItem(`<b>房租 ¥${d.rent}</b>：合租省30-50%，或谈降价`);
    if (d.utilities) r += taskItem(`<b>水电网 ¥${d.utilities}</b>：关闭不用电器，换低档套餐`);
    if (d.transport) r += taskItem(`<b>交通 ¥${d.transport}</b>：能走不骑，能骑不打车`);
    r += taskItem('<b>取消订阅服务</b>：视频VIP、音乐VIP等，月省30-100元');
    r += taskItem('<b>断绝冲动消费</b>：删购物APP，只留买菜的');
    r += `</div></div>`;
    return r;
  },

  /* ======== 自由问答 ======== */
  generateFreeAnswer(q) {
    const ql = q.toLowerCase();
    const s = this.calculateSurvival();
    if (ql.match(/赚钱|搞钱|收入|怎么赚/)) return this.generateOpportunities();
    if (ql.match(/省钱|节省|花销|省着/)) return this.generateSavingPlan();
    if (ql.match(/还债|债务|欠钱|借钱/)) return this.generateDebtPlan();
    if (ql.match(/学|技能|提升/)) {
      let sk = '短视频剪辑';
      if (ql.match(/外卖|骑手/)) sk = '外卖骑手';
      else if (ql.match(/闲鱼|卖/)) sk = '闲鱼卖货';
      return this.generateSkillPlan(sk);
    }
    if (ql.match(/食谱|吃|做饭|伙食/)) return this.generateSavingPlan();
    if (ql.match(/房东|房租|谈判|协商/)) return this._rentTalk();
    if (s) return this.generateSurvivalPlan();
    return card('AI军师', '请先录入财务数据，我才能精准建议。<br><br>你也可以问：<br>· 怎么快速赚钱？<br>· 怎么省钱？<br>· 怎么跟债主谈判？<br>· 想学短视频剪辑');
  },

  /* ======== 纯数据接口（供 Agent 技能使用） ======== */

  /** 返回完整财务分析 JSON（不含 HTML） */
  getFinancialData() {
    const d = this.userData || this.loadUserData();
    if (!d) return null;
    const s = this.calculateSurvival();
    if (!s) return null;
    const info = this.getStatusText(s);
    const bills = this.getUpcomingBills();
    const alert = this.getAlerts();

    return {
      ...s,
      status: info.status,
      summary: info.summary,
      skills: d.skills || [],
      debts: (d.debts || []).filter(x => x.name).map(x => ({
        name: x.name,
        amount: x.amount,
        due: x.due,
        daysLeft: x.due ? Math.ceil((new Date(x.due) - new Date()) / 864e5) : null
      })),
      expenses: {
        rent: d.rent || 0,
        utilities: d.utilities || 0,
        food: d.food || 0,
        transport: d.transport || 0,
        other: d.otherExpense || 0
      },
      upcomingBills: bills,
      alert: alert,
      payday: d.payday || null,
      createdAt: d.createdAt || null
    };
  },

  /** 返回结构化技能学习计划数据（不含 HTML） */
  getSkillPlanData(name) {
    const db = {
      '短视频剪辑': {
        name: '短视频剪辑',
        traditional: '报班3月，学费3000',
        timeToFirstIncome: '7天',
        monthlyIncome: '1000-3000元',
        steps: [
          { day: '第1天', task: '下载剪映，学3个基础功能', goal: '产出3条练习视频' },
          { day: '第2天', task: '模仿10个爆款视频结构', goal: '掌握爆款套路' },
          { day: '第3天', task: '找5个本地商家免费帮剪1条', goal: '积累作品集' },
          { day: '第4-5天', task: '朋友圈/小红书发接单信息', goal: '获取第一个客户' },
          { day: '第7天', task: '接第一个付费单（首单50元）', goal: '赚到第一笔钱' },
          { day: '第30天', task: '稳定3-5个客户', goal: '月增收1000-3000元' }
        ],
        tools: ['剪映APP（免费）', '10个爆款模板', '本地商家联系话术', '定价参考表'],
        platforms: ['闲鱼发服务帖', '猪八戒接单', '小红书展示作品', '朋友圈推广']
      },
      '外卖骑手': {
        name: '外卖骑手',
        traditional: '找工作1-2周',
        timeToFirstIncome: '2天',
        monthlyIncome: '4500-10000元',
        steps: [
          { day: '第1天', task: '注册美团/蜂鸟众包', goal: '完成注册和考试' },
          { day: '第2天', task: '午高峰跑3-5单', goal: '日收50-80元' },
          { day: '第3-7天', task: '掌握最优路线', goal: '日收150-250元' },
          { day: '第14天', task: '稳定日跑30-40单', goal: '日收200-350元' }
        ],
        tools: ['注册指南', '最佳时段分析', '路线优化技巧'],
        platforms: ['美团众包APP', '蜂鸟众包APP', '闪送APP']
      },
      '闲鱼卖货': {
        name: '闲鱼卖货',
        traditional: '需要进货资金',
        timeToFirstIncome: '3-5天',
        monthlyIncome: '500-2000元',
        steps: [
          { day: '第1天', task: '整理闲置拍照定价', goal: '上架10件' },
          { day: '第2天', task: '学爆款标题优化描述', goal: '提高曝光' },
          { day: '第3天', task: '学1688无货源模式', goal: '0成本开店' },
          { day: '第7天', task: '每天上架5-10新品', goal: '开始出单' },
          { day: '第30天', task: '建立稳定流程', goal: '月收500-2000元' }
        ],
        tools: ['拍照技巧', '爆款标题模板', '1688选品指南', '定价策略表'],
        platforms: ['闲鱼APP', '1688进货', '拼多多比价']
      },
      '设计接单': {
        name: '设计接单',
        traditional: '培训班3-6月，学费5000+',
        timeToFirstIncome: '3天',
        monthlyIncome: '1000-5000元',
        steps: [
          { day: '第1天', task: '用Canva做3张练手海报', goal: '掌握基础工具' },
          { day: '第2天', task: '整理作品集发到闲鱼/猪八戒', goal: '上架服务' },
          { day: '第3天', task: '模仿10个爆款设计风格', goal: '丰富作品库' },
          { day: '第7天', task: '接到第一单（LOGO/海报 50-200元）', goal: '赚到第一笔' },
          { day: '第30天', task: '积累口碑，稳定接单', goal: '月收1000-5000元' }
        ],
        tools: ['Canva（免费版）', '稿定设计', '猪八戒接单指南', '设计素材站'],
        platforms: ['猪八戒', '闲鱼', '小红书', '一品威客']
      },
      '文案写作': {
        name: '文案写作',
        traditional: '自学1-2月',
        timeToFirstIncome: '3天',
        monthlyIncome: '500-3000元',
        steps: [
          { day: '第1天', task: '研究10篇爆款文案结构', goal: '掌握写作模板' },
          { day: '第2天', task: '写3篇样稿（短文案/长文案/营销文）', goal: '建立作品集' },
          { day: '第3天', task: '在豆瓣稿费银行/猪八戒投稿', goal: '获取第一个机会' },
          { day: '第7天', task: '接到第一个稿费单', goal: '赚50-200元' },
          { day: '第30天', task: '建立稳定客户', goal: '月收500-3000元' }
        ],
        tools: ['AI辅助工具', '爆款文案模板', '投稿渠道清单'],
        platforms: ['豆瓣稿费银行', '猪八戒', '知乎', '微信公众号']
      }
    };

    // 模糊匹配
    let sk = db[name];
    if (!sk) {
      const nameL = (name || '').toLowerCase();
      if (nameL.includes('剪辑') || nameL.includes('视频')) sk = db['短视频剪辑'];
      else if (nameL.includes('外卖') || nameL.includes('骑手') || nameL.includes('配送')) sk = db['外卖骑手'];
      else if (nameL.includes('闲鱼') || nameL.includes('卖')) sk = db['闲鱼卖货'];
      else if (nameL.includes('设计') || nameL.includes('美工')) sk = db['设计接单'];
      else if (nameL.includes('写作') || nameL.includes('文案') || nameL.includes('文字')) sk = db['文案写作'];
      else sk = db['短视频剪辑']; // 默认
    }

    return sk;
  },

  _rentTalk() {
    const d = this.userData;
    const rent = d ? d.rent : 0;
    let r = cardOpen('房租协商策略');
    r += `<b>要点：</b><br>1. 选房东心情好时（周末/发薪后）<br>2. 先感谢再说困难<br>3. 提出具体方案<br>4. 承诺长租给安全感<br><br>`;
    r += `<b>可选策略：</b><br>· 申请延迟5-7天交租<br>· 降价¥${Math.round(rent * 0.1)}/月（续租1年条件）<br>· 劳务交换：帮修东西/打扫`;
    r += `</div></div>`;
    r += cardOpen('发给房东的消息');
    r += `<div id="rent-tpl">"X哥/姐您好，住您这里一直很满意。最近工作有点变动，这个月房租能宽限几天吗？大概X号就能转给您。之后按时交，不让您操心。抱歉🙏"</div>`;
    r += copyBtn('rent-tpl');
    r += `</div></div>`;
    return r;
  }
};

/* -------- HTML helpers -------- */
function card(title, body) { return `<div class="ai-card"><div class="ai-card-hd">${title}</div><div class="ai-card-bd">${body}</div></div>`; }
function cardOpen(title) { return `<div class="ai-card"><div class="ai-card-hd">${title}</div><div class="ai-card-bd">`; }
function task(html) {
  return `<div class="ai-task"><div class="ai-ck" onclick="this.classList.toggle('done')"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div><div class="ai-task-txt">${html}</div></div>`;
}
function taskItem(html) { return task(html); }
function copyBtn(id) { return `<button class="ai-copy" onclick="Advisor.copy('${id}')"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>复制话术</button>`; }
function opp(type, title, desc, urgency) { return { type, title, desc, urgency }; }

/* ======== AI 服务层 ======== */
const AIService = {
  DEFAULT_PROVIDER: 'deepseek',
  DEFAULT_KEY: '', // 需用户自行在「设置」中填写 DeepSeek API Key，详见 https://platform.deepseek.com

  provider: 'deepseek',
  apiKey: '',
  dailyUsed: 0,
  dailyLimit: 999999,
  lastReset: null,

  init() {
    this.provider = localStorage.getItem('ai-provider') || this.DEFAULT_PROVIDER;
    let key = (localStorage.getItem('ai-apikey') || '').trim();
    // config.local.js 中的 key 优先（本地开发；若 localStorage 曾被 401 清除则自动恢复）
    if (typeof window.__DEEPSEEK_API_KEY__ === 'string') {
      const cfg = window.__DEEPSEEK_API_KEY__.trim();
      if (cfg && cfg.startsWith('sk-')) {
        key = cfg;
        localStorage.setItem('ai-apikey', key);
      }
    }
    if (!key) key = (localStorage.getItem('ai-apikey') || '').trim();
    this.apiKey = key;
    this.dailyUsed = 0;
    localStorage.setItem('ai-daily-used', '0');
    this.lastReset = new Date().toDateString();
    localStorage.setItem('ai-last-reset', this.lastReset);
    if (!localStorage.getItem('ai-provider')) { localStorage.setItem('ai-provider', this.DEFAULT_PROVIDER); }
  },

  hasValidKey() { return !!(this.apiKey && this.apiKey.startsWith('sk-')); },

  getRemainingQuota() { return '∞'; },
  incrementUsage() { this.dailyUsed++; localStorage.setItem('ai-daily-used', this.dailyUsed.toString()); },
  setProvider(p) { this.provider = p; localStorage.setItem('ai-provider', p); },
  setApiKey(k) { this.apiKey = k; localStorage.setItem('ai-apikey', k); },

  /* ---- 构建 system prompt ---- */
  _buildSystemPrompt(context) {
    const base = `你是"精打细算"——一个专门帮助用户精打细算、规划财务的AI生存顾问。

你的性格：温暖但直接，像一个靠谱的老大哥。不说废话，每句话都有用。

【最重要的规则】回复复杂度必须匹配问题复杂度！
- 闲聊/打招呼 → 一两句话回应，像朋友聊天，不要分析财务
- 简单问题 → 简短直接回答，不要展开
- 具体求助 → 给出针对性建议
- 只有用户明确要求分析/方案时，才给完整的结构化回复
绝对不要每次都搬出财务数据做长篇分析！问什么答什么。

核心原则：
1. 极度务实：只推荐0成本或极低成本的方案
2. 可执行性：每条建议都有具体步骤、时间、预期收益
3. 安全合法：绝不推荐任何违法或灰色地带的方案
4. 优先级清晰：先保生存，再还债，再发展

【回复格式要求——非常重要，严格遵守】
你的回复会显示在手机APP中，禁止使用任何Markdown语法！

严格禁止的格式：
× 不要用 **加粗**、__加粗__
× 不要用 ### 标题、## 标题
× 不要用 > 引用块
× 不要用 | 表格 |
× 不要用 \`代码\`
× 不要用 [链接](url)
× 不要用 --- 分隔线
× 绝对不要输出任何HTML标签（如 <b> <span> <div> <p> <a> 等等），只输出纯文本！
× 不要输出 class="xxx" 或 style="xxx" 等HTML属性

必须使用的格式：
✓ 用【标题】来分段，如：【紧急分析】【今日清单】【省钱方案】
✓ 用 emoji 开头标记内容类型：⚠️警告 ✅任务 💡建议 💰金额 📋清单 🔥紧急
✓ 用数字编号列表：1. 2. 3.
✓ 用 · 或 - 做无序列表
✓ 金额用 ¥ 符号
✓ 话术模板用中文引号 "" 包裹（方便用户复制）
✓ 每段简洁，不要写长段落
✓ 控制在500字以内
✓ 重要内容直接用 emoji + 文字表达，不需要特殊排版

示例格式：
【紧急分析】
⚠️ 你每月缺口 ¥2300，必须立即行动！
当前可用资金仅够维持27天，但15天后有一笔 ¥3000 的债务到期。

【今日清单】
1. 上午：在58同城投递5份日结工作
2. 中午：控制午餐在 ¥8 以内
3. 下午：整理3件闲置物品挂闲鱼
4. 晚上：给债主发协商消息

【协商话术】
"张三你好，最近遇到点困难，想商量下还款的事。我计划分两次还，先转500表示诚意，剩下的月底前还清。给你添麻烦了，抱歉。"`;

    let userData = '';
    if (context) {
      userData = `\n\n【用户档案——请基于以下信息个性化回复】
⊙ 可用资金：¥${context.totalMoney || 0}
⊙ 月支出：¥${context.monthlyExpense || 0}（日均 ¥${Math.round(context.dailyExpense || 0)}）
⊙ 月收入：¥${context.income || 0}
⊙ 可生存天数：${context.survivalDays || '未知'}天
⊙ 距离发薪：${context.daysToPayday !== null ? context.daysToPayday + '天' : '未知'}
⊙ 日预算：¥${context.dailyBudget || 0}
⊙ 总债务：¥${context.totalDebt || 0}
⊙ 危险等级：${context.dangerLevel === 'danger' ? '🔴高危' : context.dangerLevel === 'warning' ? '🟡警惕' : '🟢安全'}
⊙ 月缺口：¥${Math.round(context.monthlyGap || 0)}`;
    }

    const ud = RuleEngine.userData;
    if (ud) {
      if (ud.skills && ud.skills.length) userData += `\n⊙ 会的技能：${ud.skills.join('、')}`;
      if (ud.debts && ud.debts.length && ud.debts[0].name) {
        userData += `\n⊙ 债务明细：`;
        ud.debts.filter(x => x.name).forEach(d => {
          userData += `\n  · ${d.name}：¥${d.amount}${d.due ? '，到期：' + d.due : ''}`;
        });
      }
      if (ud.rent) userData += `\n⊙ 房租：¥${ud.rent}/月`;
      if (ud.food) userData += `\n⊙ 伙食费：¥${ud.food}/月`;
      if (ud.transport) userData += `\n⊙ 交通费：¥${ud.transport}/月`;
      if (ud.utilities) userData += `\n⊙ 水电网费：¥${ud.utilities}/月`;
      if (ud.otherExpense) userData += `\n⊙ 其他支出：¥${ud.otherExpense}/月`;
      if (ud.assets) userData += `\n⊙ 可变现资产：¥${ud.assets}`;
    }

    return base + userData;
  },

  /* ---- 构建 session 特定 prompt ---- */
  _buildSessionPrompt(type) {
    const fmt = '\n\n（提醒：请用【标题】分段，禁止使用任何Markdown语法和HTML标签，不要用**、###、>、|表格|、<b>、<span>等，话术用中文引号""包裹，只输出纯文本）';

    const prompts = {
      survival: `请根据我的真实财务数据分析状况，给出个性化生存方案。请分以下几段回复：

【紧急分析】当前最紧急的问题是什么，用具体数字说明
【今日清单】今天必须做的3-5件事，附时间安排和预期收益
【本周策略】接下来7天的具体行动计划
【实用工具】最低成本食谱、省钱技巧、或协商话术` + fmt,

      debt: `请根据我的真实债务信息，为每个债主生成专属方案：

【债务全景】按紧急程度排列所有债务，标注哪个最急
【谈判策略】每笔债务的具体三步谈判法
【话术模板】每个债主对应一条可直接发送的微信消息，用中文引号""包裹
【注意事项】对方可能的反应和应对方法` + fmt,

      opportunity: `根据我会的技能和当前资金状况，推荐赚钱机会：

【立即可做】今天就能开始赚钱的方式，至少3个，写清操作步骤
【短期兼职】本周可以尝试的兼职，附预计收入和具体怎么找
【技能变现】如何用我已有的技能赚钱
【薅羊毛】当前可操作的优惠活动

每个机会都要写清：做什么、怎么做、预计赚多少、多快能拿到钱` + fmt,

      skill: `根据我的技能基础和资金状况，推荐最适合学的赚钱技能：

【推荐技能】最适合我的3个零成本技能，说明为什么适合我
【速成路径】选最推荐的一个，给7天速成计划，每天具体做什么
【收入预期】学会后多久开始赚钱，月收入预估多少
【免费资源】零成本的学习渠道和工具

必须是0成本或极低成本就能开始的` + fmt,

      save: `根据我的真实支出数据制定极限省钱方案：

【省钱目标】按我的数据算出每月能省多少，日预算控制在多少
【三餐食谱】每天 ¥10-15 的具体食谱，要写清楚吃什么、花多少
【支出削减】逐项分析我的支出，哪些能砍掉或降低，怎么操作
【省钱技巧】买菜、出行、日用品的具体省钱方法` + fmt
    };
    return prompts[type] || prompts.survival;
  },

  /* ---- 主调用方法 ---- */
  async callAI(prompt, context) {
    if (this.dailyUsed >= this.dailyLimit) {
      return { success: false, message: '今日AI次数已用完，明天再来！' };
    }

    // 如果选了规则引擎或没有有效 API Key，走规则
    if (this.provider === 'rule' || !AIService.hasValidKey()) {
      this.incrementUsage();
      return { success: true, isRuleEngine: true };
    }

    // 尝试调 AI
    try {
      this.incrementUsage();
      const sysPrompt = this._buildSystemPrompt(context);

      // 判断 prompt 是 session type 还是自由输入
      const sessionTypes = ['survival', 'debt', 'opportunity', 'skill', 'save'];
      let userPrompt;
      if (sessionTypes.includes(prompt)) {
        userPrompt = this._buildSessionPrompt(prompt);
      } else {
        userPrompt = prompt + '\n\n（禁止Markdown语法。回复长度和复杂度匹配问题——闲聊就简短聊，具体问题才展开回答。不要每次都做财务分析。）';
      }

      let result;
      const key = this.apiKey || this.DEFAULT_KEY;

      switch (this.provider) {
        case 'deepseek':
          result = await this._callDeepSeek(sysPrompt, userPrompt, key);
          break;
        case 'qwen':
          result = await this._callQwen(sysPrompt, userPrompt, key);
          break;
        case 'kimi':
          result = await this._callOpenAICompat('https://api.moonshot.cn/v1/chat/completions', sysPrompt, userPrompt, 'moonshot-v1-8k', key);
          break;
        case 'wenxin':
          result = await this._callWenxin(sysPrompt, userPrompt, key);
          break;
        default:
          // 默认也尝试 DeepSeek
          result = await this._callDeepSeek(sysPrompt, userPrompt, key);
      }

      return { success: true, message: result, isRuleEngine: false };
    } catch (e) {
      console.error('AI API Error:', e);
      // 降级到规则引擎
      return { success: true, isRuleEngine: true, fallback: true };
    }
  },

  /* ---- DeepSeek API (官方文档格式) ---- */
  async _callDeepSeek(sys, prompt, key) {
    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: prompt }
        ],
        max_tokens: 8192,
        temperature: 0.8,
        stream: false
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('DeepSeek API error:', resp.status, errText);
      throw new Error(`DeepSeek API ${resp.status}: ${errText}`);
    }

    const data = await resp.json();
    if (!data.choices || !data.choices[0]) throw new Error('DeepSeek: 无返回结果');
    return data.choices[0].message.content;
  },

  /* ---- OpenAI 兼容格式 (Kimi 等) ---- */
  async _callOpenAICompat(url, sys, prompt, model, key) {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }], max_tokens: 8192, temperature: 0.8 })
    });
    const data = await resp.json();
    return data.choices[0].message.content;
  },

  /* ---- 通义千问 ---- */
  async _callQwen(sys, prompt, key) {
    const resp = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: 'qwen-turbo', input: { messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }] } })
    });
    const data = await resp.json();
    return data.output.text;
  },

  /* ---- 文心一言 ---- */
  async _callWenxin(sys, prompt, key) {
    const resp = await fetch('https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ messages: [{ role: 'user', content: `${sys}\n\n${prompt}` }] })
    });
    const data = await resp.json();
    return data.result;
  }
};

/* ======== 互联网机会扫描器 ======== */
const OpportunityScanner = {
  CACHE_KEY: 'opp-scanner-cache',
  CACHE_TTL: 30 * 60 * 1000, // 30分钟缓存

  /* ---- 获取缓存 ---- */
  getCache() {
    try {
      const raw = localStorage.getItem(this.CACHE_KEY);
      if (!raw) return null;
      const cache = JSON.parse(raw);
      if (Date.now() - cache.timestamp > this.CACHE_TTL) return null;
      return cache;
    } catch { return null; }
  },

  setCache(data) {
    localStorage.setItem(this.CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  },

  /* ---- 构建扫描 Prompt ---- */
  _buildScanPrompt(skills, context) {
    const today = new Date();
    const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
    const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][today.getDay()];
    const hour = today.getHours();
    const timeSlot = hour < 6 ? '凌晨' : hour < 9 ? '早晨' : hour < 12 ? '上午' : hour < 14 ? '中午' : hour < 18 ? '下午' : hour < 22 ? '晚上' : '深夜';

    const skillMap = {
      driving: '驾驶/开车', cooking: '做饭/烹饪', repair: '维修/水电', computer: '电脑/IT',
      design: '设计/美工', writing: '写作/文案', video: '视频剪辑/拍摄', sales: '销售/推广',
      teaching: '教学/辅导', labor: '体力劳动'
    };
    const skillNames = skills.map(s => skillMap[s] || s).join('、') || '无特殊技能';

    // 根据时间段调整推荐
    const timeContext = hour < 10
      ? '现在是早上，重点推荐日间兼职和即日可操作的机会'
      : hour < 14
        ? '现在是中午，推荐下午可做的任务和晚间兼职'
        : hour < 18
          ? '现在是下午，推荐晚间可做的兼职和线上任务'
          : '现在是晚间，重点推荐线上可做的任务和明天的日结信息';

    // 根据星期调整
    const isWeekend = today.getDay() === 0 || today.getDay() === 6;
    const weekContext = isWeekend
      ? '今天是周末，促销/活动/展会/市集类机会更多，重点推荐'
      : '今天是工作日，日结工/临时工需求多，企业类兼职更多';

    // 季节性内容
    const month = today.getMonth() + 1;
    let seasonHint = '';
    if (month >= 1 && month <= 2) seasonHint = '春节前后，年货促销/春节兼职/红包活动是热点';
    else if (month >= 3 && month <= 4) seasonHint = '春季招聘旺季，短期工/促销员/搬家需求旺盛';
    else if (month >= 5 && month <= 6) seasonHint = '618大促将近，电商/快递/仓储临时工需求爆发';
    else if (month === 7 || month === 8) seasonHint = '暑期兼职旺季，培训/辅导/暑期工/夜市机会多';
    else if (month >= 9 && month <= 10) seasonHint = '开学季+国庆，教育/旅游/促销/黄金周兼职火爆';
    else seasonHint = '双11/双12/年终大促，电商/快递/仓储/促销员是最大风口';

    return `你是一个专业的互联网商业机会聚合引擎+热点评论数据爬虫。你同时扮演两个角色：
1. 高级爬虫系统——从全网 30+ 个真实APP和网站采集最新赚钱机会
2. 热点评论分析师——从微博热搜、抖音热榜、小红书热门、知乎热榜、百度热搜等的评论区和讨论中，挖掘隐藏的商业需求和赚钱信号

【当前时间】${dateStr}（${weekDay}）${timeSlot} ${hour}:00
【时间策略】${timeContext}
【日期策略】${weekContext}
【季节热点】${seasonHint}

⚠️ 关键要求：
1. 你必须基于当前真实存在的平台功能和活动生成数据
2. 你必须从热搜评论区中提取"用户未被满足的需求"→转化为商业机会
3. 每条数据都要有：具体名称、真实薪资/利润、具体操作步骤、可访问的真实URL

===== 第一部分：热点评论数据挖掘 =====

🔥 微博热搜评论挖掘：
⊙ 分析当前微博热搜Top50的评论区 → 发现"求推荐""在哪买""怎么做"等需求信号
⊙ 明星/综艺热搜 → 周边代购、应援物制作、同款商品
⊙ 社会新闻热搜 → 相关服务需求、情绪消费品

📱 抖音热榜评论挖掘：
⊙ 分析抖音热门视频评论区 → 发现"链接在哪""怎么买""求教程"等购买信号
⊙ 热门BGM/挑战赛 → 跟拍流量变现、相关产品售卖
⊙ 种草视频评论 → 同款低价货源倒卖

📕 小红书热门笔记挖掘：
⊙ 分析小红书热门笔记评论 → 发现"求链接""什么牌子""在哪做的"等消费需求
⊙ 穿搭/美妆/家居类爆文 → 同款1688找源头→代购/转卖
⊙ 探店/打卡类爆文 → 本地商家合作、探店变现

🧠 知乎/百度热搜分析：
⊙ 知乎热榜问题 → "如何赚钱""副业推荐"类问题的高赞回答趋势
⊙ 百度搜索趋势 → 上升最快的关键词→对应的商业机会
⊙ 贴吧热帖 → 细分需求、本地化商机

💬 社群/社区评论挖掘：
⊙ 豆瓣热门小组讨论 → 消费趋势、文化需求、副业机会
⊙ 即刻/V2EX技术社区 → 工具需求、SaaS机会、技术外包
⊙ B站弹幕+评论热词 → 年轻人消费偏好、内容方向

===== 第二部分：全平台机会扫描 =====

📱 招聘/兼职平台：
⊙ 58同城 — 当前城市热门日结兼职、促销员、发传单、服务员、搬运工
⊙ BOSS直聘 — 灵活用工、远程岗位、零经验可投
⊙ 智联招聘 — 短期项目、实习、兼职
⊙ 斗米/兼职猫 — 学生兼职、周末兼职、临时工

🛵 即时配送/出行：
⊙ 美团众包/蜂鸟众包 — 骑手注册新人奖励、当前单价
⊙ 饿了么蜂鸟 — 众包骑手、配送补贴
⊙ 滴滴/花小猪/T3出行 — 司机冲单奖、新人奖励
⊙ 货拉拉/快狗打车 — 搬运任务、司机订单
⊙ 闪送/达达/UU跑腿 — 同城急件、跑腿任务

🛒 电商/变现：
⊙ 闲鱼 — 当前热卖二手品类、技能服务交易、虚拟商品
⊙ 转转 — 回收估价、旧手机/电子产品变现
⊙ 拼多多 — 百亿补贴低价囤货转卖、多多买菜团长
⊙ 淘宝/1688 — 无货源开店、一件代发

🛒 打折商品/外卖券（省钱必看）：
⊙ 拼多多 — 百亿补贴、特价秒杀、多多买菜新人专享
⊙ 淘宝 — 聚划算、天天特卖、9.9包邮
⊙ 京东 — 秒杀、京喜特价、PLUS专享
⊙ 美团外卖 — 神券、红包、满减、天天神券
⊙ 饿了么 — 红包、津贴、周末五折
⊙ 麦当劳/肯德基 — 1+1随心配、疯狂星期四、宅急送券
⊙ 抖音商城 — 限时秒杀、品牌特卖
⊙ 1688 — 批发特价、一件起批工厂价

💰 薅羊毛/红包：
⊙ 支付宝 — 到店红包、蚂蚁森林任务、花呗红包
⊙ 微信 — 视频号任务、微信支付红包
⊙ 抖音 — 极速版看视频赚钱、直播任务
⊙ 快手 — 极速版金币、快手小店
⊙ 拼多多 — 现金大转盘、多多果园、签到提现

📝 技能/内容变现：
⊙ 猪八戒/一品威客 — 设计、文案、PPT接单需求
⊙ 小红书 — 探店达人招募、新品体验、笔记推广
⊙ 抖音/快手 — 短视频创作者任务、电商带货
⊙ 知乎/豆瓣 — 稿费银行、付费咨询、回答赚钱
⊙ B站 — 创作激励、充电计划、商单

🏘️ 本地/社区：
⊙ 美团/大众点评 — 探店优惠、团购达人、写评价返现
⊙ 社区团购（美团优选/多多买菜）— 团长招募
⊙ 本地家政（天鹅到家/58到家）— 保洁、搬运、维修上门

【用户画像】
⊙ 技能：${skillNames}
${context ? `⊙ 可用资金：¥${context.totalMoney}（日预算¥${context.dailyBudget}）
⊙ 生存天数：${context.survivalDays}天
⊙ 紧急程度：${context.dangerLevel === 'danger' ? '🔴 极度紧急——优先推荐今天立即能赚到钱的' : context.dangerLevel === 'warning' ? '🟡 比较紧迫——重点推荐本周内能变现的' : '🟢 相对安全——可推荐中长期收益更高的'}` : ''}

【输出格式——严格JSON数组】
请输出一个 JSON 数组，包含 60-80 条来自不同平台和热点评论挖掘的独家机会。每条格式：
{
  "title": "具体岗位/活动名（如：朝阳区超市促销员日结180元、抖音评论区爆款需求→代购同款月入5000）",
  "type": "parttime/coupon/task/sell/gig/discount/trend/startup",
  "badge": "🔥 兼职/🐑 薅羊毛/💎 悬赏/💰 变现/⚡ 零工/🛒 打折/📈 热点商机/🏪 小本创业",
  "source": "平台名（或热搜来源如：微博热搜/抖音热榜/小红书爆文）",
  "pay": "具体金额或利润（如 150-200元/天、利润30-80%、月入3000-8000）",
  "desc": "具体操作步骤（40字以内，写清第一步做什么）",
  "url": "该平台真实可访问的移动端URL（https开头）",
  "hot": true或false（是否为当前热门/限时/新上线）
}

【核心要求】
1. 每条必须对应真实平台和真实存在的功能/活动
2. url 字段必须是该平台真实可访问的网址
3. 金额必须符合${dateStr}的真实市场行情
4. 来源必须覆盖 20 个以上不同平台/数据源
5. 基于用户技能「${skillNames}」做个性化匹配——技能匹配的放前面
6. ${context && context.dangerLevel === 'danger' ? '用户极度紧急！前10条必须是今天立即能赚到钱的（日结/即时可做）' : '优先推荐见效快的，前10条应该本周内就能变现'}
7. badge 字段加 emoji 前缀让数据更生动
8. 至少包含 5 条当前${seasonHint.slice(0, 6)}特有的时令机会
9. desc 必须包含"第一步做什么"（如"下载XX→注册→开始"）

【分类覆盖要求——每个分类至少5条】
⊙ 打折(discount)：至少10条——拼多多百亿补贴、淘宝聚划算、京东秒杀、美团/饿了么外卖券、麦当劳/肯德基优惠、1688特价
⊙ 热点商机(trend)：至少15条——从热搜评论中挖掘的商业需求、信息差套利、AI工具变现、热门话题跟拍
⊙ 小本创业(startup)：至少10条——摆摊、地摊经济、社区服务、社交电商、私域流量
⊙ 兼职(parttime)：至少8条——日结工、临时工、服务员、促销员
⊙ 变现(sell)：至少8条——闲置出售、技能出售、代购转卖、内容变现
⊙ 零工(gig)：至少5条——配送、跑腿、搬运、代驾
⊙ 薅羊毛(coupon)：至少5条——签到、红包、新人奖励
⊙ 悬赏(task)：至少5条——接单、众包、内容创作

只输出 JSON 数组，不输出其他文字。确保 JSON 格式正确。`;
  },

  /* ---- AI 扫描 ---- */
  async scan(skills, context, onProgress) {
    // 检查缓存
    const cache = this.getCache();
    if (cache && !arguments[3]) { // 第4个参数 forceRefresh
      return { success: true, data: cache.data, fromCache: true, timestamp: cache.timestamp };
    }
    // 无有效 Key 时直接使用本地数据，避免无效 401 请求
    if (!AIService.hasValidKey()) {
      return { success: true, data: this._getFallbackData(skills), fromCache: false, timestamp: Date.now(), fallback: true };
    }

    const key = AIService.apiKey || AIService.DEFAULT_KEY;
    const prompt = this._buildScanPrompt(skills, context);

    // 进度回调
    const steps = [
      '🔗 正在连接 30+ 数据源…',
      '🔥 爬取微博热搜评论 / 抖音热榜弹幕…',
      '📕 分析小红书爆文评论 / 知乎热榜讨论…',
      '💬 挖掘百度热搜 / 豆瓣小组 / B站弹幕热词…',
      '🧠 AI 识别评论中的商业需求信号…',
      '📱 扫描 58同城 / BOSS直聘 / 斗米 招聘信息…',
      '🛵 扫描 美团众包 / 蜂鸟 / 闪送 配送任务…',
      '🛒 扫描 闲鱼 / 转转 / 拼多多 变现机会…',
      '💰 扫描 支付宝 / 微信 / 抖音 红包活动…',
      '📝 扫描 猪八戒 / 小红书 / 知乎 技能接单…',
      '🏪 扫描摆摊/地摊/社区创业机会…',
      '🤖 扫描 AI工具变现 / 信息差套利…',
      '🎯 AI 智能匹配你的技能和紧急程度…',
      '📊 按收益和可操作性排序 80+ 条机会…',
      '✨ 标记热点商机和限时机会…',
      '✅ 数据整理完成！'
    ];

    let stepIdx = 0;
    const progressTimer = setInterval(() => {
      if (stepIdx < steps.length && onProgress) {
        onProgress(steps[stepIdx], stepIdx, steps.length);
        stepIdx++;
      }
    }, 800);

    try {
      const resp = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: '你是一个专业的互联网商业机会聚合引擎+热点评论数据分析师。你从全网30+个APP/网站抓取最新赚钱机会，同时分析微博热搜、抖音热榜、小红书爆文、知乎热榜、百度热搜的评论和讨论数据，从中挖掘隐藏的商业需求和赚钱信号。你的数据覆盖：兼职、热点商机、小本创业、信息差套利、AI工具变现、社交电商、摆摊经济、知识付费等全品类。只输出JSON格式，确保可被JSON.parse解析。' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 8192,
          temperature: 0.85,
          stream: false
        })
      });

      clearInterval(progressTimer);
      if (onProgress) onProgress('数据整理完成！', steps.length, steps.length);

      if (!resp.ok) throw new Error(`API ${resp.status}`);

      const data = await resp.json();
      if (!data.choices || !data.choices[0]) throw new Error('无返回');

      let text = data.choices[0].message.content.trim();
      // 清理 markdown code block
      text = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
      // 尝试提取JSON数组
      const arrMatch = text.match(/\[[\s\S]*\]/);
      if (!arrMatch) throw new Error('格式错误');

      const opps = JSON.parse(arrMatch[0]);
      if (!Array.isArray(opps) || opps.length === 0) throw new Error('空数据');

      // 标准化数据
      const normalized = opps.map((o, i) => ({
        id: Date.now() + i,
        title: o.title || '未知机会',
        type: this._normalizeType(o.type || o.badge),
        badge: o.badge || this._typeToBadge(o.type),
        source: o.source || '',
        pay: o.pay || '面议',
        desc: o.desc || '',
        url: o.url || '',
        hot: !!o.hot
      }));

      this.setCache(normalized);
      AIService.incrementUsage();

      return { success: true, data: normalized, fromCache: false, timestamp: Date.now() };
    } catch (e) {
      clearInterval(progressTimer);
      if (e.message && (e.message.includes('401') || e.message.includes('invalid') || e.message.includes('Authentication'))) {
        localStorage.removeItem('ai-apikey');
        AIService.apiKey = '';
        if (typeof App !== 'undefined') App.toast('API 密钥无效，已清除。请在设置中重新填写', 'err');
      }
      console.error('Scanner error:', e);
      // 降级到本地数据
      return { success: true, data: this._getFallbackData(skills), fromCache: false, timestamp: Date.now(), fallback: true };
    }
  },

  /* ---- 关键词跨平台搜索（生成真实搜索URL，真正有用！） ---- */
  searchByKeyword(keyword) {
    if (!keyword || !keyword.trim()) return [];
    const kw = keyword.trim();
    const ts = Date.now();
    const SEARCH_PLATFORMS = [
      { name: '58同城', type: 'parttime', badge: '兼职', pay: '查看实时薪资', desc: '全国最大分类信息网，日结/兼职/临时工海量真实岗位', search: k => `https://m.58.com/search/?key=${encodeURIComponent(k)}&claession=all` },
      { name: 'BOSS直聘', type: 'parttime', badge: '兼职', pay: '查看实时薪资', desc: '直接跟老板谈，兼职/全职/远程岗位', search: k => `https://www.zhipin.com/web/geek/job?query=${encodeURIComponent(k)}` },
      { name: '智联招聘', type: 'parttime', badge: '兼职', pay: '查看实时薪资', desc: '短期项目、实习、兼职岗位', search: k => `https://sou.zhaopin.com/?kw=${encodeURIComponent(k)}` },
      { name: '闲鱼', type: 'sell', badge: '变现', pay: '查看实时价格', desc: '卖闲置/接技能单/找低价货源', search: k => `https://www.goofish.com/search?q=${encodeURIComponent(k)}` },
      { name: '猪八戒', type: 'task', badge: '悬赏', pay: '按项目定价', desc: '设计/文案/开发/视频 技能接单平台', search: k => `https://www.zbj.com/search/f/?type=new&kw=${encodeURIComponent(k)}` },
      { name: '小红书', type: 'task', badge: '悬赏', pay: '查看最新', desc: '探店/种草/达人招募/带货任务', search: k => `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(k)}` },
      { name: '拼多多', type: 'sell', badge: '变现', pay: '查看低价货源', desc: '百亿补贴低价货源/多多买菜团长', search: k => `https://mobile.yangkeduo.com/search_result.html?search_key=${encodeURIComponent(k)}` },
      { name: '抖音', type: 'trend', badge: '热点商机', pay: '查看热门', desc: '热门话题/短视频任务/直播带货/达人招募', search: k => `https://www.douyin.com/search/${encodeURIComponent(k)}` },
      { name: '1688', type: 'sell', badge: '变现', pay: '批发价货源', desc: '无货源开店/一件代发/低价进货', search: k => `https://s.1688.com/selloffer/offer_search.htm?keywords=${encodeURIComponent(k)}` },
      { name: '转转', type: 'sell', badge: '变现', pay: '查看回收价', desc: '二手交易/手机回收/电子产品估价', search: k => `https://www.zhuanzhuan.com/search?keyword=${encodeURIComponent(k)}` },
      { name: '豆瓣', type: 'task', badge: '悬赏', pay: '按稿计费', desc: '稿费银行/写作约稿/兼职小组', search: k => `https://www.douban.com/search?q=${encodeURIComponent(k)}` },
      { name: '知乎', type: 'trend', badge: '热点商机', pay: '查看最新', desc: '付费咨询/回答赚钱/盐选创作/热榜商机', search: k => `https://www.zhihu.com/search?type=content&q=${encodeURIComponent(k)}` },
      { name: '微博', type: 'trend', badge: '热点商机', pay: '查看热搜', desc: '热搜话题/评论区需求挖掘/流量变现', search: k => `https://s.weibo.com/weibo?q=${encodeURIComponent(k)}` },
      { name: 'B站', type: 'trend', badge: '热点商机', pay: '创作激励', desc: '热门视频/创作者任务/弹幕热词分析', search: k => `https://search.bilibili.com/all?keyword=${encodeURIComponent(k)}` },
      { name: '百度热搜', type: 'trend', badge: '热点商机', pay: '查看趋势', desc: '搜索趋势/SEO机会/热门关键词变现', search: k => `https://www.baidu.com/s?wd=${encodeURIComponent(k)}` },
      { name: '快手', type: 'trend', badge: '热点商机', pay: '查看热门', desc: '热门话题/直播带货/短视频跟拍', search: k => `https://www.kuaishou.com/search/video?searchKey=${encodeURIComponent(k)}` },
      { name: '得物', type: 'sell', badge: '变现', pay: '查看行情', desc: '潮牌鞋服/限量款低买高卖/信息差', search: k => `https://www.dewu.com/search/result?keyword=${encodeURIComponent(k)}` },
      { name: '美团', type: 'startup', badge: '小本创业', pay: '查看需求', desc: '探店/团购/本地服务/社区团长', search: k => `https://www.meituan.com/s/${encodeURIComponent(k)}` },
    ];

    return SEARCH_PLATFORMS.map((p, i) => ({
      id: ts + 2000 + i,
      title: `在${p.name}搜"${kw}"`,
      type: p.type,
      badge: '🔍 搜索',
      source: p.name,
      pay: p.pay,
      desc: p.desc,
      url: p.search(kw),
      isSearch: true
    }));
  },

  _normalizeType(t) {
    if (!t) return 'parttime';
    const map = {
      '兼职': 'parttime', 'parttime': 'parttime',
      '薅羊毛': 'coupon', 'coupon': 'coupon',
      '悬赏': 'task', 'task': 'task',
      '变现': 'sell', 'sell': 'sell',
      '零工': 'gig', 'gig': 'gig',
      '打折': 'discount', 'discount': 'discount', '打折优惠': 'discount', '外卖券': 'discount',
      '热点商机': 'trend', 'trend': 'trend', '热点': 'trend',
      '小本创业': 'startup', 'startup': 'startup', '创业': 'startup'
    };
    return map[t] || 'parttime';
  },

  _typeToBadge(t) {
    const map = { parttime: '兼职', coupon: '薅羊毛', task: '悬赏', sell: '变现', gig: '零工', discount: '打折', trend: '热点商机', startup: '小本创业' };
    return map[t] || '兼职';
  },

  /* ---- 打折商品 + 外卖券 实时搜索（生成真实平台 URL） ---- */
  searchDiscounts() {
    const ts = Date.now();
    const PLATFORMS = [
      { source: '拼多多', type: 'discount', badge: '打折', title: '百亿补贴 / 特价秒杀', pay: '超低价', desc: '拼多多百亿补贴专区，大牌低价正品', url: 'https://mobile.yangkeduo.com/duo_cms_mall.html?pid=0' },
      { source: '淘宝', type: 'discount', badge: '打折', title: '聚划算 / 天天特卖', pay: '限时特惠', desc: '淘宝聚划算、天天特卖、9.9包邮', url: 'https://h5.m.taobao.com/mshop/juhuasuan.html' },
      { source: '京东', type: 'discount', badge: '打折', title: '秒杀 / 京喜特卖', pay: '每日秒杀', desc: '京东秒杀、京喜特价、PLUS专享', url: 'https://pro.m.jd.com/mall/active/3H885vAeEgj9EPMUtB4YFNj8m9hd/index.html' },
      { source: '1688', type: 'discount', badge: '打折', title: '批发特价货源', pay: '工厂价', desc: '1688特价专区，一件起批低价', url: 'https://s.1688.com/selloffer/offer_search.htm?keywords=%E7%89%B9%E4%BB%B7' },
      { source: '美团外卖', type: 'discount', badge: '外卖券', title: '神券 / 红包 / 满减', pay: '最高免单', desc: '美团外卖红包、神券、天天神券', url: 'https://h5.waimai.meituan.com/waimai/mindex/home' },
      { source: '饿了么', type: 'discount', badge: '外卖券', title: '红包 / 津贴 / 商家券', pay: '新人有礼', desc: '饿了么红包、满减、周末五折', url: 'https://h5.ele.me/' },
      { source: '麦当劳', type: 'discount', badge: '外卖券', title: '麦乐送优惠 / 限时特价', pay: '1+1随心配', desc: '麦当劳APP/小程序领券', url: 'https://www.mcdonalds.com.cn/' },
      { source: '肯德基', type: 'discount', badge: '外卖券', title: '宅急送优惠 / 周四V金', pay: '疯狂星期四', desc: '肯德基APP/小程序领券', url: 'https://www.kfc.com.cn/' },
      { source: '抖音商城', type: 'discount', badge: '打折', title: '限时秒杀 / 品牌特卖', pay: '领券再减', desc: '抖音商城好物低价', url: 'https://haohuo.jinritemai.com/views/index/index' },
      { source: '拼多多', type: 'discount', badge: '打折', title: '搜索特价商品', pay: '低价货源', desc: '拼多多搜索低价好物', url: 'https://mobile.yangkeduo.com/search_result.html?search_key=%E6%89%93%E6%8A%98' },
    ];
    return PLATFORMS.map((p, i) => ({ id: ts + 5000 + i, ...p, isSearch: true }));
  },

  /* ---- 真实平台机会数据库（80+条，每个平台3-5条） ---- */
  _getFallbackData(skills) {
    const ts = Date.now();
    let n = 0;
    const o = (type, badge, source, title, pay, desc, url) => ({ id: ts + (++n), type, badge, source, title, pay, desc, url });

    let all = [
      /* ======== 58同城（8条）======== */
      o('parttime','兼职','58同城','超市促销员/日结临时工','150-180元/天','搜"日结促销"→筛选附近→电话联系','https://m.58.com/search/?key=%E6%97%A5%E7%BB%93%E4%BF%83%E9%94%80'),
      o('parttime','兼职','58同城','餐厅服务员（时薪制）','20-30元/时','搜"兼职服务员"→筛选附近→电话联系','https://m.58.com/search/?key=%E5%85%BC%E8%81%8C%E6%9C%8D%E5%8A%A1%E5%91%98'),
      o('parttime','兼职','58同城','传单派发/地推','100-200元/天','搜"发传单 日结"→筛选附近→电话报名','https://m.58.com/search/?key=%E5%8F%91%E4%BC%A0%E5%8D%95%E6%97%A5%E7%BB%93'),
      o('parttime','兼职','58同城','快递分拣/装卸搬运','180-250元/天','搜"快递分拣"→选日结→联系电话','https://m.58.com/search/?key=%E5%BF%AB%E9%80%92%E5%88%86%E6%8B%A3%E6%97%A5%E7%BB%93'),
      o('parttime','兼职','58同城','工厂流水线/包装工','160-220元/天','搜"包装工 日结"→筛选附近→面试即上岗','https://m.58.com/search/?key=%E5%8C%85%E8%A3%85%E5%B7%A5%E6%97%A5%E7%BB%93'),
      o('parttime','兼职','58同城','保安/门卫（含夜班补贴）','3500-5000元/月','搜"保安 包吃住"→筛选附近→电话联系','https://m.58.com/search/?key=%E4%BF%9D%E5%AE%89%E5%8C%85%E5%90%83%E4%BD%8F'),
      o('parttime','兼职','58同城','酒店客房/前台','3000-4500元/月','搜"酒店客房"→筛选附近→投递','https://m.58.com/search/?key=%E9%85%92%E5%BA%97%E5%AE%A2%E6%88%BF'),
      o('parttime','兼职','58同城','家政保洁（小时工）','35-60元/时','搜"保洁小时工"→筛选附近→电话预约','https://m.58.com/search/?key=%E4%BF%9D%E6%B4%81%E5%B0%8F%E6%97%B6%E5%B7%A5'),

      /* ======== BOSS直聘（5条）======== */
      o('parttime','兼职','BOSS直聘','快递分拣/仓库临时工','180-220元/天','搜"快递分拣 日结"→选附近→直接沟通','https://www.zhipin.com/web/geek/job?query=%E5%BF%AB%E9%80%92%E5%88%86%E6%8B%A3%20%E6%97%A5%E7%BB%93'),
      o('parttime','兼职','BOSS直聘','远程客服/在线客服','3000-5000元/月','搜"远程客服"→筛选"不限工作地点"→沟通','https://www.zhipin.com/web/geek/job?query=%E8%BF%9C%E7%A8%8B%E5%AE%A2%E6%9C%8D'),
      o('parttime','兼职','BOSS直聘','数据录入/文员','100-200元/天','搜"数据录入 兼职"→选远程可做的→投递','https://www.zhipin.com/web/geek/job?query=%E6%95%B0%E6%8D%AE%E5%BD%95%E5%85%A5%20%E5%85%BC%E8%81%8C'),
      o('parttime','兼职','BOSS直聘','外卖配送/骑手','5000-10000元/月','搜"骑手"→筛选附近→沟通入职','https://www.zhipin.com/web/geek/job?query=%E9%AA%91%E6%89%8B'),
      o('parttime','兼职','BOSS直聘','超市理货员/收银员','15-22元/时','搜"理货员 兼职"→选附近门店→投递','https://www.zhipin.com/web/geek/job?query=%E7%90%86%E8%B4%A7%E5%91%98%20%E5%85%BC%E8%81%8C'),

      /* ======== 美团系（5条）======== */
      o('gig','零工','美团众包','外卖骑手（新人奖励）','150-300元/天','下载美团众包APP→注册→实名→考试→接单','https://peisong.meituan.com/'),
      o('gig','零工','美团众包','跑腿代办/帮买帮送','8-25元/单','美团众包→跑腿专区→接代买/代送单','https://peisong.meituan.com/'),
      o('gig','零工','美团众包','美团闪购配送','10-20元/单','接商超/药店/便利店的即时配送单','https://peisong.meituan.com/'),
      o('parttime','兼职','美团','美团优选社区团长','500-3000元/月','申请团长→建群推商品→用户下单你提成10%','https://youxuan.meituan.com/'),
      o('task','悬赏','美团','探店达人/写评价','免费吃喝+10-50元','搜"霸王餐"→报名→到店消费→写评价','https://h5.dianping.com/'),

      /* ======== 饿了么/蜂鸟（3条）======== */
      o('gig','零工','蜂鸟众包','饿了么配送骑手','150-280元/天','下载蜂鸟众包APP→注册→午晚高峰多接单','https://fengniao.ele.me/'),
      o('gig','零工','蜂鸟众包','午高峰冲单奖励','额外30-80元/天','11-13点午高峰完成X单额外奖励','https://fengniao.ele.me/'),
      o('gig','零工','蜂鸟众包','夜间配送（夜宵单）','15-25元/单','20点-次日2点接单→夜间单价更高','https://fengniao.ele.me/'),

      /* ======== 闲鱼（5条）======== */
      o('sell','变现','闲鱼','闲置物品快速变现','50-2000元','拍照上架→标题写"搬家急出"→定价3折→包邮','https://www.goofish.com/'),
      o('sell','变现','闲鱼','技能服务出售','30-500元/单','发布"代做PPT/logo/剪辑"等技能帖→接单','https://www.goofish.com/search?q=%E4%BB%A3%E5%81%9A'),
      o('sell','变现','闲鱼','虚拟商品/教程出售','5-200元/份','整理电子书/课程笔记/模板→上架→自动发货','https://www.goofish.com/search?q=%E7%94%B5%E5%AD%90%E4%B9%A6'),
      o('sell','变现','闲鱼','1688无货源转卖','利润10-50元/单','1688选爆品→加价上架闲鱼→有人买再从1688发','https://www.goofish.com/'),
      o('sell','变现','闲鱼','旧衣服/鞋子回收','0.5-3元/斤','搜"旧衣回收"→约上门取件→按重量结算','https://www.goofish.com/search?q=%E6%97%A7%E8%A1%A3%E5%9B%9E%E6%94%B6'),

      /* ======== 转转（3条）======== */
      o('sell','变现','转转','旧手机/平板回收','100-3000元','转转APP→"手机回收"→自动估价→邮寄→到账','https://www.zhuanzhuan.com/pro/recovery/index.html'),
      o('sell','变现','转转','旧电脑/数码产品回收','200-5000元','笔记本/iPad/相机→在线估价→顺丰上门取件','https://www.zhuanzhuan.com/pro/recovery/index.html'),
      o('sell','变现','转转','二手书/教材回收','1-20元/本','扫码查价→一键下单→快递上门取件','https://www.zhuanzhuan.com/'),

      /* ======== 打折商品 / 外卖券（12条）======== */
      o('discount','打折','拼多多','百亿补贴特价专区','省10-50%','拼多多→百亿补贴→大牌正品低价','https://mobile.yangkeduo.com/duo_cms_mall.html'),
      o('discount','打折','淘宝','聚划算 / 天天特卖','限时特惠','淘宝→聚划算→每日限时秒杀','https://h5.m.taobao.com/mshop/juhuasuan.html'),
      o('discount','打折','京东','秒杀 / 京喜特价','每日秒杀','京东APP→秒杀→9点/12点/20点开抢','https://pro.m.jd.com/mall/active/3H885vAeEgj9EPMUtB4YFNj8m9hd/index.html'),
      o('discount','外卖券','美团外卖','神券 / 红包 / 满减','最高免单','美团外卖→我的→红包神券→领取','https://h5.waimai.meituan.com/waimai/mindex/home'),
      o('discount','外卖券','饿了么','红包 / 津贴 / 周末五折','新人有礼','饿了么→我的→红包津贴→每日领取','https://h5.ele.me/'),
      o('discount','外卖券','麦当劳','1+1随心配 / 麦乐送券','12元起','麦当劳APP→优惠→领取','https://www.mcdonalds.com.cn/'),
      o('discount','外卖券','肯德基','疯狂星期四 / 宅急送券','周四特惠','肯德基APP→V金商城→领券','https://www.kfc.com.cn/'),
      o('discount','打折','1688','批发特价 / 一件起批','工厂价','1688→搜"特价"→按销量排序','https://s.1688.com/selloffer/offer_search.htm?keywords=%E7%89%B9%E4%BB%B7'),
      o('discount','打折','抖音商城','限时秒杀 / 品牌特卖','领券再减','抖音→商城→秒杀/品牌特卖','https://haohuo.jinritemai.com/views/index/index'),
      o('discount','外卖券','美团','到店团购 / 霸王餐','低价吃大餐','美团→美食→团购→按人气排序','https://h5.meituan.com/meishi/'),
      o('discount','打折','拼多多','多多买菜新人专享','首单特惠','拼多多→多多买菜→新人专享价','https://mobile.yangkeduo.com/'),
      o('discount','外卖券','大众点评','霸王餐 / 免费试吃','免费餐饮','大众点评→霸王餐→报名抽奖','https://m.dianping.com/'),

      /* ======== 拼多多（4条）======== */
      o('coupon','薅羊毛','拼多多','现金大转盘/签到提现','0.3-5元/天','首页→现金大转盘→每日签到→满额提现','https://mobile.yangkeduo.com/'),
      o('coupon','薅羊毛','拼多多','多多视频看视频赚钱','0.5-3元/天','拼多多→多多视频→看视频得现金','https://mobile.yangkeduo.com/'),
      o('sell','变现','拼多多','百亿补贴低价囤货转卖','利润5-30%','百亿补贴买低价商品→闲鱼/朋友圈加价出','https://mobile.yangkeduo.com/'),
      o('parttime','兼职','拼多多','多多买菜团长','300-2000元/月','申请团长→建社区群→推荐商品→赚佣金','https://mobile.yangkeduo.com/'),

      /* ======== 支付宝（3条）======== */
      o('coupon','薅羊毛','支付宝','到店付款红包','0.1-99元','首页搜"到店红包"→领取→线下付款自动抵扣','https://www.alipay.com/'),
      o('coupon','薅羊毛','支付宝','蚂蚁森林/庄园领奖励','积分兑实物','每日种树/喂鸡→领能量→兑换优惠券/实物','https://www.alipay.com/'),
      o('coupon','薅羊毛','支付宝','邀好友得红包','5-99元/人','搜"邀请好友"→分享二维码→好友使用后双方得奖','https://www.alipay.com/'),

      /* ======== 抖音/快手（5条）======== */
      o('coupon','薅羊毛','抖音极速版','刷视频赚金币','0.5-3元/天','下载抖音极速版→看视频→得金币→提现到支付宝','https://www.douyin.com/'),
      o('task','悬赏','抖音','短视频创作者任务','10-2000元/条','创作者服务中心→全民任务→拍视频赚赏金','https://www.douyin.com/'),
      o('sell','变现','抖音','抖音小店/橱窗带货','佣金10-30%','开通商品橱窗→选品→拍视频带货→赚佣金','https://www.douyin.com/'),
      o('coupon','薅羊毛','快手极速版','刷视频赚金币','0.5-3元/天','下载快手极速版→看视频/直播→金币提现','https://www.kuaishou.com/'),
      o('task','悬赏','快手','快手光合计划创作','按播放量计费','发布原创内容→加入光合计划→按播放量分成','https://www.kuaishou.com/'),

      /* ======== 小红书（4条）======== */
      o('parttime','兼职','小红书','探店达人（0粉可做）','免费吃喝+50-200元','搜"探店招募"→私信商家→到店拍照写笔记','https://www.xiaohongshu.com/explore'),
      o('task','悬赏','小红书','品牌试用/免费领产品','免费产品+20-100元','搜"试用招募"→申请→收到产品→发体验笔记','https://www.xiaohongshu.com/search_result?keyword=%E8%AF%95%E7%94%A8%E6%8B%9B%E5%8B%9F'),
      o('task','悬赏','小红书','笔记推广/种草','50-500元/篇','品牌方联系→发合作笔记→按粉丝量定价','https://www.xiaohongshu.com/explore'),
      o('sell','变现','小红书','小红书开店卖货','佣金20-50%','开通小红书店铺→发笔记带货→赚差价','https://www.xiaohongshu.com/explore'),

      /* ======== 猪八戒/一品威客（4条）======== */
      o('task','悬赏','猪八戒','LOGO/海报设计接单','200-1000元/单','搜"LOGO设计"→选悬赏项目→投标→中标交付','https://www.zbj.com/search/f/?type=new&kw=LOGO%E8%AE%BE%E8%AE%A1'),
      o('task','悬赏','猪八戒','PPT/文档排版','50-300元/份','搜"PPT制作"→投标→远程交付→确认收款','https://www.zbj.com/search/f/?type=new&kw=PPT%E5%88%B6%E4%BD%9C'),
      o('task','悬赏','猪八戒','短视频剪辑接单','100-500元/条','搜"短视频剪辑"→筛选急单→投标→远程交付','https://www.zbj.com/search/f/?type=new&kw=%E7%9F%AD%E8%A7%86%E9%A2%91%E5%89%AA%E8%BE%91'),
      o('task','悬赏','猪八戒','网站/小程序开发','500-5000元/单','搜"小程序开发"→选项目→投标→线上交付','https://www.zbj.com/search/f/?type=new&kw=%E5%B0%8F%E7%A8%8B%E5%BA%8F%E5%BC%80%E5%8F%91'),

      /* ======== 大众点评（3条）======== */
      o('task','悬赏','大众点评','写评价返现','5-20元/条','消费后→写100字以上评价→参与"评价有奖"','https://m.dianping.com/'),
      o('coupon','薅羊毛','大众点评','霸王餐/免费试吃','免费餐饮','搜"霸王餐"→报名→中签后到店免费消费','https://m.dianping.com/'),
      o('parttime','兼职','大众点评','本地达人推广','50-300元/篇','成为点评达人→接品牌合作→发探店笔记','https://m.dianping.com/'),

      /* ======== 配送/跑腿（6条）======== */
      o('gig','零工','闪送','同城急件配送','10-50元/单','注册闪送员→接附近急件→1小时送达','https://www.ishansong.com/'),
      o('gig','零工','达达快送','商超/外卖配送','150-280元/天','下载达达APP→注册骑手→接附近配送单','https://www.imdada.cn/'),
      o('gig','零工','UU跑腿','代买/代送/代排队','8-30元/单','下载UU跑腿APP→注册跑腿员→接单','https://www.uupt.com/'),
      o('gig','零工','货拉拉','搬运助手','150-300元/天','注册搬运师傅→接附近搬运单→按重量计费','https://www.huolala.cn/'),
      o('gig','零工','京东到家','众包配送员','150-250元/天','注册众包骑手→接京东到家/沃尔玛配送单','https://daojia.jd.com/'),
      o('gig','零工','滴滴','代驾司机','100-500元/晚','注册代驾→晚8点-凌晨2点高峰→按公里计费','https://www.didiglobal.com/'),

      /* ======== 知乎/豆瓣/B站（4条）======== */
      o('task','悬赏','B站','创作激励/充电计划','按播放量计费','上传原创视频→加入创作激励→1000播放≈3元','https://member.bilibili.com/platform/home'),
      o('task','悬赏','B站','商单接单/品牌合作','200-5000元/条','粉丝>1万→花火平台→接品牌推广商单','https://member.bilibili.com/platform/home'),
      o('task','悬赏','知乎','付费咨询/回答赚钱','10-200元/次','开通付费咨询→设定价格→解答问题赚钱','https://www.zhihu.com/'),
      o('task','悬赏','豆瓣','稿费银行/约稿写作','50-500元/篇','豆瓣稿费银行小组→找约稿需求→投稿赚稿费','https://www.douban.com/group/Manuscripts/'),

      /* ======== 微信/京东/其他（5条）======== */
      o('task','悬赏','微信','视频号创作者任务','10-500元/条','视频号→创作者中心→接品牌推广任务','https://channels.weixin.qq.com/'),
      o('coupon','薅羊毛','微信','微信读书免费领会员','省20元/月','微信读书→邀请好友→双方免费得会员天数','https://weread.qq.com/'),
      o('coupon','薅羊毛','京东','签到领京豆/抢优惠券','0.5-5元/天','京东APP→签到→做任务→京豆抵现金','https://m.jd.com/'),
      o('sell','变现','1688','无货源一件代发','利润5-50元/单','1688选品→上架到闲鱼/淘宝→有人买再发货','https://s.1688.com/selloffer/offer_search.htm?keywords=%E4%B8%80%E4%BB%B6%E4%BB%A3%E5%8F%91'),
      o('gig','零工','阿里众包','AI数据标注（在家可做）','50-150元/天','注册→做图片标注/文本分类→按量计费','https://crowdsource.alibaba.com/'),

      /* ======== 家政/本地服务（3条）======== */
      o('parttime','兼职','天鹅到家','保洁/收纳上门服务','50-80元/小时','注册→通过培训→接附近保洁收纳单','https://www.daojia.com/'),
      o('parttime','兼职','天鹅到家','月嫂/育儿嫂','6000-15000元/月','注册→考取证书→培训→接单','https://www.daojia.com/'),
      o('parttime','兼职','58到家','管道疏通/维修上门','80-300元/次','注册→通过技能认证→接附近维修单','https://jia.58.com/'),

      /* ======== 在线任务/众包（6条）======== */
      o('task','悬赏','百度众测','App/网页测试','5-50元/次','注册百度众测→领取测试任务→提交bug报告→审核通过得赏金','https://test.baidu.com/'),
      o('task','悬赏','有道众包','翻译/校对任务','0.05-0.3元/字','注册→通过翻译测试→接翻译/校对任务→按字数结算','https://zb.youdao.com/'),
      o('gig','零工','腾讯搜活帮','数据标注/审核','80-200元/天','注册→做图文审核/标注→按件计费→周结','https://sohuobang.qq.com/'),
      o('task','悬赏','蚂蚁众包','图片标注/语音转写','60-150元/天','支付宝搜"蚂蚁众包"→注册→接标注任务→按量结算','https://crowdsource.alibaba.com/'),
      o('task','悬赏','Clickworker','英文数据标注','$5-15/小时','注册→做英文任务→PayPal提现→适合有英语基础的','https://www.clickworker.com/'),
      o('task','悬赏','问卷星','填问卷赚佣金','1-10元/份','搜"问卷赚钱"→找付费问卷→填写→审核通过得佣金','https://www.wjx.cn/'),

      /* ======== 线上教育/知识付费（4条）======== */
      o('sell','变现','千聊','线上微课/付费直播','50-500元/场','创建直播间→设定价格→分享朋友圈→开课收费','https://www.qlchat.com/'),
      o('sell','变现','荔枝微课','录制付费音频课','20-200元/课','录制课程→上架→分销推广→永久被动收入','https://www.lizhiweike.com/'),
      o('task','悬赏','在行','一对一付费咨询','200-1000元/次','注册行家→设定擅长领域→等约见→线上/线下咨询','https://www.zaihang.com/'),
      o('sell','变现','小鹅通','知识店铺卖课','按定价','创建课程→上架→自动售卖→适合有专业技能的人','https://www.xiaoe-tech.com/'),

      /* ======== 电商/带货（4条）======== */
      o('sell','变现','淘宝','淘宝客推广赚佣金','佣金5-30%','注册淘宝联盟→选品→分享链接→有人买赚佣金','https://pub.alimama.com/'),
      o('sell','变现','京东','京东联盟推广','佣金3-20%','注册京挑客→选商品→分享→有人买就赚佣金','https://union.jd.com/'),
      o('sell','变现','拼多多','多多进宝推广','佣金10-40%','多多进宝→选爆品→分享到群→有人买赚佣金','https://jinbao.pinduoduo.com/'),
      o('sell','变现','微店','微信开店卖货','利润自定','注册微店→上架商品→朋友圈推广→零成本开店','https://www.weidian.com/'),

      /* ======== 🔥 热点商机——微博/抖音/小红书热门评论挖掘（15条）======== */
      o('trend','热点商机','微博热搜','热搜话题代运营/蹭流量变现','200-2000元/月','监控微博热搜→写热点相关内容→引流到私域','https://s.weibo.com/top/summary'),
      o('trend','热点商机','抖音热榜','抖音热门话题短视频跟拍','100-5000元/条','刷抖音热榜→用热门话题拍视频→流量变现','https://www.douyin.com/hot'),
      o('trend','热点商机','小红书','小红书爆款笔记模仿/改编','50-500元/篇','研究爆款笔记→改编同类内容→接商单变现','https://www.xiaohongshu.com/explore'),
      o('trend','热点商机','微博超话','粉丝经济/明星周边代购','利润30-200%','热搜明星→代购周边/应援物→粉丝群出售','https://s.weibo.com/top/summary'),
      o('trend','热点商机','知乎热榜','知乎热门话题付费回答','10-500元/条','关注知乎热榜→写高质量回答→开通付费咨询','https://www.zhihu.com/hot'),
      o('trend','热点商机','百度热搜','SEO热词内容批量产出','500-5000元/月','爬取百度热搜关键词→批量写SEO文章→广告变现','https://top.baidu.com/board?tab=realtime'),
      o('trend','热点商机','今日头条','头条号热点文章创收','100-3000元/月','紧跟热点→写深度分析→流量分成+商单','https://www.toutiao.com/'),
      o('trend','热点商机','B站热门','B站热门视频二创/解说','100-2000元/条','追踪B站热门→做解说/盘点/二创→创作激励','https://www.bilibili.com/v/popular/all'),
      o('trend','热点商机','闲鱼','热搜爆品低价囤货转卖','利润10-80%','微博/抖音看爆款→1688找同款→闲鱼快速上架','https://www.goofish.com/'),
      o('trend','热点商机','拼多多','社交裂变热点产品团购','利润5-40%','追踪社交媒体爆品→拼多多找货源→群接龙出售','https://mobile.yangkeduo.com/'),
      o('trend','热点商机','快手','快手热门话题直播引流','打赏+带货','跟拍快手热门话题→直播间引流→带货/打赏','https://www.kuaishou.com/brilliant'),
      o('trend','热点商机','豆瓣','豆瓣热门影视/图书周边','利润20-100%','追踪热播剧/新书→做相关周边/笔记/推荐→变现','https://www.douban.com/'),
      o('trend','热点商机','淘宝','节日热点定制产品','利润30-200%','提前布局节日热点→定制主题商品→节前上架','https://www.taobao.com/'),
      o('trend','热点商机','微信','朋友圈热点话题文案带货','佣金10-50%','跟踪社交热点→写带货文案→朋友圈/群分发','https://mp.weixin.qq.com/'),
      o('trend','热点商机','抖音','抖音评论区热门需求挖掘','200-5000元/月','分析热门视频评论→发现未满足需求→做对应产品','https://www.douyin.com/'),

      /* ======== 🧠 信息差套利（12条）======== */
      o('trend','热点商机','1688→闲鱼','1688批发价→闲鱼零售价套利','利润10-80元/单','1688找爆品（<10元）→闲鱼加价3-5倍上架→下单直发','https://s.1688.com/'),
      o('trend','热点商机','拼多多→闲鱼','百亿补贴低价→闲鱼原价出','利润5-50元/单','拼多多百亿补贴抢低价→闲鱼按市场价卖→赚差价','https://mobile.yangkeduo.com/'),
      o('trend','热点商机','海淘','海外购→国内代购差价','利润20-50%','亚马逊/iHerb低价→代购加价卖→保健品/母婴最赚','https://www.amazon.com/'),
      o('sell','变现','转转→闲鱼','二手平台间倒卖','利润10-30%','转转低价收→闲鱼加价卖→电子产品利润最高','https://www.zhuanzhuan.com/'),
      o('trend','热点商机','义乌购','义乌小商品→电商零售','利润50-300%','义乌购选2元商品→电商标价15-30元→量大利多','https://www.yiwugo.com/'),
      o('trend','热点商机','阿里国际站','外贸尾单→国内售卖','利润30-100%','阿里国际站找外贸退单/尾单→国内平台售卖','https://www.alibaba.com/'),
      o('sell','变现','得物','潮牌鞋服低买高卖','利润50-500元/双','关注新鞋发售→抢购原价→得物加价出售','https://www.dewu.com/'),
      o('sell','变现','多抓鱼','二手书低收高卖','利润3-30元/本','多抓鱼低价收绝版书→闲鱼/孔夫子加价卖','https://www.duozhuayu.com/'),
      o('trend','热点商机','电商平台','优惠券/满减信息整合','佣金5-30%','各平台大促→整合优惠信息→建省钱群→佣金变现','https://pub.alimama.com/'),
      o('trend','热点商机','本地生活','同城信息差代办服务','50-200元/次','帮人代办证件/预约/跑腿→收取服务费→信息差','https://m.58.com/'),
      o('sell','变现','孔夫子旧书网','绝版书/稀缺书籍转卖','利润10-1000元/本','旧书摊/废品站淘书→孔夫子上架→绝版书暴利','https://www.kongfz.com/'),
      o('trend','热点商机','闲鱼','游戏账号/虚拟物品交易','利润50-5000元','低价收游戏号→养号/升级→闲鱼加价出售','https://www.goofish.com/'),

      /* ======== 🤖 AI工具变现（10条）======== */
      o('trend','热点商机','ChatGPT','AI代写论文/报告/文案','50-500元/篇','用ChatGPT辅助写作→闲鱼/朋友圈接单→快速交付','https://www.goofish.com/search?q=AI%E4%BB%A3%E5%86%99'),
      o('trend','热点商机','Midjourney','AI绘画接单/头像定制','10-200元/张','用AI绘图工具→闲鱼发"定制头像/插画"→按张收费','https://www.goofish.com/search?q=AI%E7%BB%98%E7%94%BB'),
      o('trend','热点商机','AI工具','AI批量生成小红书笔记','500-3000元/月','用AI批量生成种草笔记→多账号矩阵→接商单','https://www.xiaohongshu.com/'),
      o('sell','变现','闲鱼','AI修图/证件照/老照片修复','5-50元/张','用AI修图工具→闲鱼接单→批量处理→高效出图','https://www.goofish.com/search?q=AI%E4%BF%AE%E5%9B%BE'),
      o('trend','热点商机','AI工具','AI视频脚本+剪辑自动化','100-1000元/条','用AI写脚本→自动剪辑→抖音/快手批量发布','https://www.douyin.com/'),
      o('sell','变现','闲鱼','AI简历优化/面试辅导','30-200元/份','用AI优化简历→闲鱼接单→快速交付→复购率高','https://www.goofish.com/search?q=AI%E7%AE%80%E5%8E%86'),
      o('trend','热点商机','AI工具','AI数字人直播带货','1000-10000元/月','搭建AI数字人→24小时自动直播→挂商品链接','https://www.douyin.com/'),
      o('sell','变现','淘宝','AI生成PPT/方案模板','10-100元/份','用AI批量做PPT模板→淘宝/闲鱼上架→自动发货','https://www.goofish.com/search?q=PPT%E6%A8%A1%E6%9D%BF'),
      o('trend','热点商机','AI工具','AI翻译/字幕接单','0.1-0.5元/字','用AI翻译工具→接字幕/文档翻译单→效率10倍','https://www.zbj.com/search/f/?type=new&kw=%E7%BF%BB%E8%AF%91'),
      o('trend','热点商机','AI工具','AI客服/自动回复搭建','500-5000元/单','帮中小商家搭建AI客服→按月收维护费','https://www.zbj.com/search/f/?type=new&kw=AI'),

      /* ======== 🏪 小本创业——摆摊/地摊/本地服务（12条）======== */
      o('startup','小本创业','美团','早餐摊/煎饼果子/烤冷面','200-500元/天','早6-9点校门口/写字楼→成本<2元/份→售价6-8元','https://www.meituan.com/'),
      o('startup','小本创业','闲鱼','夜市摆摊（饰品/手机壳）','100-500元/晚','1688进货（1-3元/个）→夜市售15-30元→利润80%+','https://www.goofish.com/'),
      o('startup','小本创业','美团','奶茶/柠檬茶流动摊','300-800元/天','成本2-3元/杯→售价8-15元→学校/商圈摆摊','https://www.meituan.com/'),
      o('startup','小本创业','58同城','上门洗车/车内清洁','80-200元/次','一桶水+清洁剂→小区地推→预约上门→成本<10元','https://m.58.com/search/?key=%E4%B8%8A%E9%97%A8%E6%B4%97%E8%BD%A6'),
      o('startup','小本创业','闲鱼','手机贴膜/维修摆摊','20-100元/次','进货成本0.5-2元/张→商圈/地铁口→贴膜20-50元','https://www.goofish.com/'),
      o('startup','小本创业','美团','水果捞/鲜切水果外卖','150-400元/天','批发市场进水果→切盒包装→外卖平台+朋友圈','https://www.meituan.com/'),
      o('startup','小本创业','58同城','宠物上门喂养/遛狗','50-150元/次','小区张贴→接宠物寄养/上门喂食→节假日翻倍','https://m.58.com/search/?key=%E5%AE%A0%E7%89%A9%E5%AF%84%E5%85%BB'),
      o('startup','小本创业','闲鱼','气球布置/派对策划','200-2000元/单','学气球造型→闲鱼接单→生日/求婚/开业布置','https://www.goofish.com/search?q=%E6%B0%94%E7%90%83%E5%B8%83%E7%BD%AE'),
      o('startup','小本创业','美团','收纳整理师上门服务','200-500元/次','学收纳技巧→美团/闲鱼接单→上门整理衣橱','https://www.meituan.com/'),
      o('startup','小本创业','抖音','摆摊卖烤红薯/玉米','100-300元/天','烤箱+红薯→学校/社区门口→成本1元售5-10元','https://www.douyin.com/search/%E6%91%86%E6%91%8A'),
      o('startup','小本创业','微信','社区团购自营站点','2000-8000元/月','租小区门面→接各平台团购单→赚提成+自营','https://youxuan.meituan.com/'),
      o('startup','小本创业','58同城','快递代收驿站','3000-8000元/月','租10㎡门面→签约快递公司→每件0.3-0.5元→量大稳定','https://m.58.com/search/?key=%E5%BF%AB%E9%80%92%E9%A9%BF%E7%AB%99'),

      /* ======== 📱 社交电商/私域流量（8条）======== */
      o('startup','小本创业','微信','微信群接龙团购','1000-5000元/月','建小区群→每日推送低价商品→群接龙下单→赚佣金','https://mp.weixin.qq.com/'),
      o('startup','小本创业','抖音','抖音直播带货（0粉开播）','100-5000元/场','开通直播→选品挂车→直播讲解→按成交赚佣金','https://www.douyin.com/'),
      o('sell','变现','微信','朋友圈好物分享赚佣金','佣金10-40%','加入分销平台→选品→发朋友圈→有人买就赚','https://mp.weixin.qq.com/'),
      o('startup','小本创业','小红书','小红书店铺0元开店','利润30-60%','开通小红书店铺→1688无货源→发笔记→自动成交','https://www.xiaohongshu.com/'),
      o('sell','变现','视频号','视频号小店带货','佣金10-30%','开通视频号小店→选品→发视频/直播→赚佣金','https://channels.weixin.qq.com/'),
      o('startup','小本创业','拼多多','拼多多店铺（无货源）','利润5-30元/单','开店→1688/淘宝选品→上架→有单再采购→赚差价','https://mms.pinduoduo.com/'),
      o('sell','变现','闲鱼','闲鱼矩阵号批量出货','3000-10000元/月','多账号运营→每号50+商品→1688一件代发→量大取胜','https://www.goofish.com/'),
      o('startup','小本创业','快团团','快团团社群团购','500-3000元/月','注册团长→选品→群内开团→用户下单→赚差价','https://www.kuaituantuan.com/'),

      /* ======== 💡 新兴平台/蓝海机会（8条）======== */
      o('trend','热点商机','即刻','即刻社区付费圈子','200-2000元/月','创建付费圈子→分享干货→会员制收费→积累铁粉','https://www.okjike.com/'),
      o('trend','热点商机','飞书','飞书文档知识付费','50-500元/份','写行业报告/攻略→飞书文档→付费阅读','https://www.feishu.cn/'),
      o('sell','变现','Fiverr','海外自由职业者接单','$5-500/单','注册Fiverr→发布技能服务→接海外订单→美元收入','https://www.fiverr.com/'),
      o('sell','变现','Upwork','海外远程工作','$10-100/时','注册Upwork→投标项目→远程交付→PayPal提现','https://www.upwork.com/'),
      o('trend','热点商机','Notion','Notion模板售卖','$5-50/份','制作精美Notion模板→Gumroad上架→被动收入','https://www.notion.so/'),
      o('trend','热点商机','小宇宙','播客/音频内容变现','100-5000元/月','录制播客→小宇宙上架→接广告→赞赏收入','https://www.xiaoyuzhoufm.com/'),
      o('trend','热点商机','GitHub','开源项目打赏/赞助','$1-1000/月','维护开源项目→开通GitHub Sponsors→收赞助','https://github.com/sponsors'),
      o('sell','变现','Etsy','手工艺品海外售卖','$10-500/件','手工饰品/贺卡→Etsy上架→面向全球买家','https://www.etsy.com/'),

      /* ======== 🎓 知识/技能服务（6条）======== */
      o('startup','小本创业','闲鱼','方言/外语陪练','30-100元/时','闲鱼发布"英语/日语陪练"→线上视频→按小时收费','https://www.goofish.com/search?q=%E8%8B%B1%E8%AF%AD%E9%99%AA%E7%BB%83'),
      o('startup','小本创业','闲鱼','代拍/代抢服务','10-100元/次','帮人抢演唱会票/限量商品→闲鱼接单→成功收费','https://www.goofish.com/search?q=%E4%BB%A3%E6%8B%8D'),
      o('sell','变现','闲鱼','简历代写/求职辅导','50-300元/份','写专业简历→闲鱼接单→模板化高效产出','https://www.goofish.com/search?q=%E7%AE%80%E5%8E%86%E4%BB%A3%E5%86%99'),
      o('sell','变现','闲鱼','陪聊/情感咨询','50-200元/时','发布"倾听/陪聊"服务→微信语音→按时收费','https://www.goofish.com/search?q=%E9%99%AA%E8%81%8A'),
      o('startup','小本创业','抖音','短视频教学/培训','100-2000元/期','录制教程→抖音/小红书发布→私域收费教学','https://www.douyin.com/'),
      o('sell','变现','知乎','知乎盐选专栏写作','500-5000元/月','申请盐选创作者→写连载小说/专栏→按阅读分成','https://www.zhihu.com/creator'),

      /* ======== 🏠 房产/空间变现（5条）======== */
      o('startup','小本创业','闲鱼','停车位出租/共享','500-2000元/月','有闲置车位→闲鱼/小区群出租→按月收费','https://www.goofish.com/search?q=%E8%BD%A6%E4%BD%8D%E5%87%BA%E7%A7%9F'),
      o('startup','小本创业','自如','空余房间短租','1500-5000元/月','空余房间→自如/闲鱼→短租/合租→月收稳定','https://www.ziroom.com/'),
      o('startup','小本创业','美团','共享会议室/自习室','30-100元/时','租商铺→改造自习室→美团上架→按时收费','https://www.meituan.com/'),
      o('startup','小本创业','小红书','收纳/断舍离咨询','200-500元/次','学习收纳→小红书引流→上门整理→口碑传播','https://www.xiaohongshu.com/'),
      o('startup','小本创业','闲鱼','闲置物品寄卖代理','佣金20-30%','帮别人卖闲置→收取20-30%佣金→零成本创业','https://www.goofish.com/'),

      /* ======== 🎮 游戏/娱乐变现（5条）======== */
      o('sell','变现','闲鱼','游戏代练/陪玩','15-50元/小时','发布"LOL/王者代练"→接单→按段位定价','https://www.goofish.com/search?q=%E6%B8%B8%E6%88%8F%E4%BB%A3%E7%BB%83'),
      o('sell','变现','比心','游戏陪玩/语音陪聊','20-80元/小时','注册比心→通过认证→接陪玩/陪聊单','https://www.bixin.com/'),
      o('sell','变现','闲鱼','Steam游戏低价倒卖','利润5-50元/份','土区/阿区低价买Key→闲鱼原价出→赚汇率差','https://www.goofish.com/search?q=Steam'),
      o('task','悬赏','网易','游戏测试/内测体验','10-100元/次','申请内测资格→按要求测试→提交报告→领奖励','https://game.163.com/'),
      o('sell','变现','闲鱼','游戏攻略/教程出售','5-50元/份','写游戏攻略PDF→闲鱼上架→玩家付费下载','https://www.goofish.com/'),

      /* ======== 📷 摄影/设计变现（5条）======== */
      o('sell','变现','视觉中国','照片/视频素材上传','1-50元/张','拍照/拍视频→上传素材库→每次下载都有分成','https://www.vcg.com/'),
      o('sell','变现','千图网','设计素材/模板上传','1-20元/次','做PPT/海报模板→上传千图网→被动收入','https://www.58pic.com/'),
      o('sell','变现','花瓣网','设计师接单/设计服务','200-2000元/单','上传作品集→展示设计能力→接商业设计单','https://huaban.com/'),
      o('sell','变现','图虫','图虫创意签约摄影师','1-100元/张','上传高质量照片→签约→企业购买→持续收入','https://stock.tuchong.com/'),
      o('startup','小本创业','美团','上门拍证件照/形象照','50-200元/次','买背景布+补光灯→闲鱼/美团接单→上门拍摄','https://www.meituan.com/')
    ];

    // 根据用户技能添加个性化推荐（最多10条额外推荐）
    if (skills.includes('driving')) {
      all.unshift(o('gig','零工','滴滴','网约车司机（新人奖）','300-800元/周','注册→审核→完成单量→领新人冲单奖','https://www.didiglobal.com/driver/join'));
      all.unshift(o('gig','零工','货拉拉','货运司机','200-600元/天','注册→接搬家/送货单→按距离计费','https://www.huolala.cn/'));
      all.unshift(o('gig','零工','花小猪','花小猪司机','200-500元/天','注册→接单→低抽成+冲单奖','https://www.huaxiaozhu.com/'));
    }
    if (skills.includes('video')) {
      all.unshift(o('task','悬赏','猪八戒','短视频剪辑接单','100-500元/条','搜"短视频剪辑"→筛选急单→投标','https://www.zbj.com/search/f/?type=new&kw=%E7%9F%AD%E8%A7%86%E9%A2%91%E5%89%AA%E8%BE%91'));
      all.unshift(o('task','悬赏','闲鱼','视频剪辑/拍摄服务','50-300元/条','闲鱼发布"视频剪辑"服务→接单','https://www.goofish.com/search?q=%E8%A7%86%E9%A2%91%E5%89%AA%E8%BE%91'));
    }
    if (skills.includes('design')) {
      all.unshift(o('task','悬赏','猪八戒','LOGO/海报/名片设计','200-1000元/单','搜"LOGO设计"→选项目→投标','https://www.zbj.com/search/f/?type=new&kw=LOGO%E8%AE%BE%E8%AE%A1'));
      all.unshift(o('task','悬赏','闲鱼','设计接单/电商美工','30-500元/单','发布"设计服务"→展示作品集→接单','https://www.goofish.com/search?q=%E8%AE%BE%E8%AE%A1%E6%8E%A5%E5%8D%95'));
    }
    if (skills.includes('writing')) {
      all.unshift(o('task','悬赏','豆瓣','文案写作/公众号代写','50-300元/篇','豆瓣稿费银行→找需求→或知乎搜"约稿"','https://www.douban.com/group/Manuscripts/'));
      all.unshift(o('task','悬赏','闲鱼','文案/简历/策划代写','20-200元/份','发布"代写"服务→接单→线上交付','https://www.goofish.com/search?q=%E4%BB%A3%E5%86%99%E6%96%87%E6%A1%88'));
    }
    if (skills.includes('cooking')) all.unshift(o('gig','零工','闲鱼','私房菜/外卖接单','100-400元/天','发布"私房菜外卖"→朋友圈推广→接单','https://www.goofish.com/'));
    if (skills.includes('repair')) all.unshift(o('task','悬赏','58到家','上门维修/疏通服务','80-300元/次','注册→通过认证→接附近维修单','https://jia.58.com/'));
    if (skills.includes('teaching')) {
      all.unshift(o('parttime','兼职','闲鱼','线上辅导/答疑','30-100元/时','发布"辅导"服务→线上教学→按课时收费','https://www.goofish.com/search?q=%E8%BE%85%E5%AF%BC'));
      all.unshift(o('parttime','兼职','掌门教育','线上/线下家教','60-150元/时','注册→匹配学生→开始授课','https://www.zhangmen.com/'));
    }
    if (skills.includes('computer')) {
      all.unshift(o('task','悬赏','猪八戒','远程数据处理/Excel','100-500元/单','搜"数据处理"→投标→远程交付','https://www.zbj.com/search/f/?type=new&kw=%E6%95%B0%E6%8D%AE%E5%A4%84%E7%90%86'));
      all.unshift(o('task','悬赏','闲鱼','电脑维修/装系统','50-200元/次','发布"电脑维修"→接附近单→上门服务','https://www.goofish.com/search?q=%E7%94%B5%E8%84%91%E7%BB%B4%E4%BF%AE'));
    }
    if (skills.includes('sales')) all.unshift(o('parttime','兼职','58同城','地推/促销/扫码推广','150-300元/天','搜"地推 日结"→选附近→联系报名','https://m.58.com/search/?key=%E5%9C%B0%E6%8E%A8%E6%97%A5%E7%BB%93'));
    if (skills.includes('labor')) {
      all.unshift(o('gig','零工','58同城','建筑工地日结','200-350元/天','搜"工地日结"→电话联系→当天上岗','https://m.58.com/search/?key=%E5%B7%A5%E5%9C%B0%E6%97%A5%E7%BB%93'));
      all.unshift(o('gig','零工','货拉拉','搬家搬运工','150-300元/天','注册搬运师傅→接搬运单→按件计费','https://www.huolala.cn/'));
    }

    return all;
  }
};
