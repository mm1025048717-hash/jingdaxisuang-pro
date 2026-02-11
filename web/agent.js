/* ==========================================================
   精打细算 Pro v2 — Agent 技能系统
   基于 DeepSeek Tool Calling 的智能技能调度
   ========================================================== */

/* ======== 1. 技能注册表 (SkillRegistry) ======== */
const SkillRegistry = {
  skills: {},

  /** 注册一个技能 */
  register(skill) {
    this.skills[skill.name] = skill;
  },

  /** 获取所有已注册技能名 */
  list() {
    return Object.keys(this.skills);
  },

  /** 生成 OpenAI/DeepSeek 兼容的 tools 定义数组 */
  toToolDefinitions() {
    return Object.values(this.skills).map(sk => ({
      type: 'function',
      function: {
        name: sk.name,
        description: sk.description,
        parameters: sk.parameters || { type: 'object', properties: {} }
      }
    }));
  },

  /** 按名称获取技能 */
  get(name) {
    return this.skills[name] || null;
  },

  /** 执行指定技能 */
  async execute(name, args) {
    const sk = this.skills[name];
    if (!sk) return { error: `未知技能: ${name}` };
    try {
      return await sk.execute(args || {});
    } catch (e) {
      console.error(`技能执行失败 [${name}]:`, e);
      return { error: `技能执行出错: ${e.message}` };
    }
  }
};

/* -------- 注册 10 个技能 -------- */

// 1. analyze_finances — 财务分析
SkillRegistry.register({
  name: 'analyze_finances',
  description: '分析用户完整财务状况，返回可用资金、月支出、生存天数、危险等级、日预算、债务等结构化数据',
  parameters: { type: 'object', properties: {} },
  execute() {
    const data = RuleEngine.getFinancialData();
    if (!data) return { error: '用户尚未录入财务数据' };
    return data;
  }
});

// 2. search_opportunities — 搜索赚钱机会
SkillRegistry.register({
  name: 'search_opportunities',
  description: '搜索赚钱机会，支持按关键词和类型筛选，返回各平台真实机会列表',
  parameters: {
    type: 'object',
    properties: {
      keyword: { type: 'string', description: '搜索关键词，如"日结"、"设计"、"骑手"' },
      type: { type: 'string', enum: ['parttime', 'coupon', 'task', 'sell', 'gig', 'discount'], description: '机会类型: parttime=兼职, coupon=薅羊毛, task=悬赏任务, sell=变现, gig=零工, discount=打折商品/外卖券' },
      platform: { type: 'string', description: '平台名称筛选，如"58同城"、"闲鱼"' }
    }
  },
  execute(args) {
    const { keyword, type, platform } = args;
    let results = [];

    // 关键词搜索（生成跨平台搜索链接）
    if (keyword) {
      results = OpportunityScanner.searchByKeyword(keyword);
    }

    // 加上本地机会数据库
    const d = RuleEngine.loadUserData();
    const skills = d ? (d.skills || []) : [];
    const fallback = OpportunityScanner._getFallbackData(skills);
    results = [...results, ...fallback];

    // 按类型筛选
    if (type) {
      results = results.filter(o => o.type === type);
    }

    // 按平台筛选
    if (platform) {
      const pl = platform.toLowerCase();
      results = results.filter(o => o.source && o.source.toLowerCase().includes(pl));
    }

    // 最多返回 20 条，减少 token 消耗
    results = results.slice(0, 20).map(o => ({
      title: o.title,
      type: o.type,
      badge: o.badge,
      source: o.source,
      pay: o.pay,
      desc: o.desc,
      url: o.url || ''
    }));

    return { count: results.length, opportunities: results };
  }
});

// 3. track_expense — 记账
SkillRegistry.register({
  name: 'track_expense',
  description: '记录一笔支出到本地记账本。category 分类: food=餐饮, transport=交通, daily=日用, other=其他',
  parameters: {
    type: 'object',
    properties: {
      amount: { type: 'number', description: '金额（元）' },
      category: { type: 'string', enum: ['food', 'transport', 'daily', 'other'], description: '分类' },
      note: { type: 'string', description: '备注说明，如"午饭"、"地铁"' },
      date: { type: 'string', description: '日期，格式 YYYY-MM-DD，默认今天' }
    },
    required: ['amount', 'category']
  },
  execute(args) {
    const { amount, category, note, date } = args;
    if (!amount || amount <= 0) return { error: '金额必须大于0' };

    const record = {
      id: Date.now(),
      amount: parseFloat(amount),
      category: category || 'other',
      note: note || '',
      date: date || new Date().toISOString().slice(0, 10)
    };

    const key = 'expense-records';
    const records = JSON.parse(localStorage.getItem(key) || '[]');
    records.push(record);
    localStorage.setItem(key, JSON.stringify(records));

    // 统计今日总支出
    const today = new Date().toISOString().slice(0, 10);
    const todayTotal = records
      .filter(r => r.date === today)
      .reduce((s, r) => s + r.amount, 0);

    return {
      success: true,
      record,
      todayTotal,
      message: `已记录: ¥${amount} (${note || category})，今日共支出 ¥${todayTotal}`
    };
  }
});

// 4. get_expense_history — 查看记账历史
SkillRegistry.register({
  name: 'get_expense_history',
  description: '获取近期记账记录，支持按天数范围和分类筛选',
  parameters: {
    type: 'object',
    properties: {
      days: { type: 'number', description: '查询最近几天的记录，默认7天' },
      category: { type: 'string', enum: ['food', 'transport', 'daily', 'other'], description: '按分类筛选' }
    }
  },
  execute(args) {
    const { days, category } = args;
    const lookback = days || 7;
    const records = JSON.parse(localStorage.getItem('expense-records') || '[]');

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - lookback);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    let filtered = records.filter(r => r.date >= cutoffStr);
    if (category) filtered = filtered.filter(r => r.category === category);

    // 按日汇总
    const byDay = {};
    filtered.forEach(r => {
      if (!byDay[r.date]) byDay[r.date] = { total: 0, items: [] };
      byDay[r.date].total += r.amount;
      byDay[r.date].items.push({ amount: r.amount, category: r.category, note: r.note });
    });

    // 按分类汇总
    const byCat = {};
    const catNames = { food: '餐饮', transport: '交通', daily: '日用', other: '其他' };
    filtered.forEach(r => {
      const cn = catNames[r.category] || r.category;
      byCat[cn] = (byCat[cn] || 0) + r.amount;
    });

    const total = filtered.reduce((s, r) => s + r.amount, 0);
    const avgDaily = lookback > 0 ? Math.round(total / lookback) : 0;

    return {
      period: `最近${lookback}天`,
      totalRecords: filtered.length,
      totalAmount: total,
      avgDaily,
      byDay,
      byCategory: byCat
    };
  }
});

// 5. create_budget — 生成预算方案
SkillRegistry.register({
  name: 'create_budget',
  description: '基于用户财务数据计算日/周/月预算方案，给出各项支出建议上限',
  parameters: { type: 'object', properties: {} },
  execute() {
    const fin = RuleEngine.getFinancialData();
    if (!fin) return { error: '用户尚未录入财务数据' };

    const { totalMoney, monthlyExpense, dailyExpense, survivalDays, daysToPayday, dailyBudget, income } = fin;

    // 计算各项预算
    const d = RuleEngine.loadUserData();
    const strictDaily = daysToPayday && daysToPayday > 0
      ? Math.floor(totalMoney / daysToPayday)
      : dailyBudget;

    const budget = {
      daily: strictDaily,
      weekly: strictDaily * 7,
      monthly: strictDaily * 30,
      breakdown: {
        food: Math.round(strictDaily * 0.5),
        transport: Math.round(strictDaily * 0.15),
        daily_necessity: Math.round(strictDaily * 0.15),
        emergency: Math.round(strictDaily * 0.2)
      },
      savingPotential: Math.max(0, income - monthlyExpense),
      currentExpense: monthlyExpense,
      suggestedCuts: []
    };

    // 建议削减项
    if (d) {
      if (d.rent && d.rent > income * 0.4) budget.suggestedCuts.push(`房租 ¥${d.rent} 占收入比过高(>${Math.round(d.rent/income*100)}%)，建议考虑合租`);
      if (d.food && d.food > 1500) budget.suggestedCuts.push(`伙食 ¥${d.food}/月，建议自炊控制到 ¥900-1200`);
      if (d.transport && d.transport > 300) budget.suggestedCuts.push(`交通 ¥${d.transport}/月，建议步行/骑车替代短途`);
      if (d.otherExpense && d.otherExpense > 500) budget.suggestedCuts.push(`其他支出 ¥${d.otherExpense}/月，审视哪些可以砍掉`);
    }

    return budget;
  }
});

// 6. check_bills — 查看即将到期账单
SkillRegistry.register({
  name: 'check_bills',
  description: '查看即将到期的账单和债务还款日，按紧急程度排序',
  parameters: { type: 'object', properties: {} },
  execute() {
    const bills = RuleEngine.getUpcomingBills();
    if (!bills.length) return { message: '当前没有即将到期的账单', bills: [] };
    return {
      count: bills.length,
      urgent: bills.filter(b => b.isUrgent).length,
      bills: bills.map(b => ({
        name: b.name,
        amount: b.amount,
        dueDate: b.dueDate,
        daysLeft: b.daysLeft,
        isUrgent: b.isUrgent,
        status: b.daysLeft === 0 ? '今天到期' : b.daysLeft <= 3 ? '紧急' : '正常'
      }))
    };
  }
});

// 7. generate_script — 生成谈判话术
SkillRegistry.register({
  name: 'generate_script',
  description: '根据债主信息生成专属谈判话术/协商消息模板',
  parameters: {
    type: 'object',
    properties: {
      debtor_name: { type: 'string', description: '债主名称' },
      amount: { type: 'number', description: '欠款金额' },
      strategy: { type: 'string', enum: ['delay', 'installment', 'reduce', 'emotional'], description: '策略: delay=延期, installment=分期, reduce=减免, emotional=感情牌' }
    },
    required: ['debtor_name', 'amount']
  },
  execute(args) {
    const { debtor_name, amount, strategy } = args;
    const fin = RuleEngine.getFinancialData();
    const daysToPayday = fin ? fin.daysToPayday : 15;

    const scripts = {};

    // 延期话术
    scripts.delay = `"${debtor_name}，你好。最近遇到一些临时困难，想跟你商量还款的事。手头紧张但已积极找工作，预计${daysToPayday || 15}天后有收入。能不能宽限几天？到时候一定还上。给你添麻烦了，真抱歉。"`;

    // 分期话术
    const parts = Math.min(4, Math.ceil(amount / 500));
    const perPart = Math.ceil(amount / parts);
    scripts.installment = `"${debtor_name}，你好。欠你的${amount}元一直记着。现在情况特殊，想跟你商量分${parts}次还，每次${perPart}元。先转${Math.min(100, Math.floor(amount * 0.15))}元表示诚意，你看行吗？"`;

    // 减免话术
    const reduced = Math.round(amount * 0.8);
    scripts.reduce = `"${debtor_name}，实话跟你说，现在确实很困难。这${amount}元我认，但短期内很难一次还清。如果能减免一些，我可以在${daysToPayday || 15}天内还${reduced}元。你觉得怎么样？"`;

    // 感情牌
    scripts.emotional = `"${debtor_name}，最近一直在想怎么跟你开口。你之前帮了我大忙，我很感激。现在碰到难处了，但我不是想赖账，是真需要点时间。你能给我${daysToPayday || 15}天吗？到时候一定还上。"`;

    const chosen = strategy && scripts[strategy] ? strategy : 'delay';

    return {
      debtor_name,
      amount,
      strategy: chosen,
      script: scripts[chosen],
      allScripts: scripts,
      tips: [
        '选在对方心情好的时候发（如周末/晚上）',
        '先问候再说事，不要开门见山',
        '态度诚恳，承认困难但表达积极解决的意愿',
        '给出具体还款时间表，而非空口承诺'
      ]
    };
  }
});

// 8. learn_skill_plan — 技能学习计划
SkillRegistry.register({
  name: 'learn_skill_plan',
  description: '生成指定技能的速成学习计划，含每日任务、工具和收入预期',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: '技能名称，如"短视频剪辑"、"外卖骑手"、"闲鱼卖货"' }
    },
    required: ['name']
  },
  execute(args) {
    return RuleEngine.getSkillPlanData(args.name);
  }
});

// 9. open_platform — 生成平台搜索链接
SkillRegistry.register({
  name: 'open_platform',
  description: '生成指定平台的真实搜索URL，方便用户直接跳转',
  parameters: {
    type: 'object',
    properties: {
      platform: { type: 'string', description: '平台名称: 58同城/BOSS直聘/闲鱼/猪八戒/小红书/抖音/1688/转转/豆瓣/知乎/拼多多/美团' },
      keyword: { type: 'string', description: '搜索关键词' }
    },
    required: ['platform']
  },
  execute(args) {
    const { platform, keyword } = args;
    const kw = keyword || '';
    const ek = encodeURIComponent(kw);

    const PLATFORMS = {
      '58同城': { url: kw ? `https://m.58.com/search/?key=${ek}` : 'https://m.58.com/', desc: '全国最大分类信息平台，海量日结兼职' },
      'BOSS直聘': { url: kw ? `https://www.zhipin.com/web/geek/job?query=${ek}` : 'https://www.zhipin.com/', desc: '直接跟老板谈，兼职/全职/远程岗位' },
      '闲鱼': { url: kw ? `https://www.goofish.com/search?q=${ek}` : 'https://www.goofish.com/', desc: '卖闲置/接技能单/找低价货源' },
      '猪八戒': { url: kw ? `https://www.zbj.com/search/f/?type=new&kw=${ek}` : 'https://www.zbj.com/', desc: '设计/文案/开发/视频接单平台' },
      '小红书': { url: kw ? `https://www.xiaohongshu.com/search_result?keyword=${ek}` : 'https://www.xiaohongshu.com/explore', desc: '探店达人/试用招募/种草推广' },
      '抖音': { url: kw ? `https://www.douyin.com/search/${ek}` : 'https://www.douyin.com/', desc: '短视频任务/直播带货/达人招募' },
      '1688': { url: kw ? `https://s.1688.com/selloffer/offer_search.htm?keywords=${ek}` : 'https://www.1688.com/', desc: '无货源开店/一件代发/低价进货' },
      '转转': { url: kw ? `https://www.zhuanzhuan.com/search?keyword=${ek}` : 'https://www.zhuanzhuan.com/', desc: '二手交易/手机回收/电子产品估价' },
      '豆瓣': { url: kw ? `https://www.douban.com/search?q=${ek}` : 'https://www.douban.com/group/Manuscripts/', desc: '稿费银行/写作约稿/兼职小组' },
      '知乎': { url: kw ? `https://www.zhihu.com/search?type=content&q=${ek}` : 'https://www.zhihu.com/', desc: '付费咨询/回答赚钱/盐选创作' },
      '拼多多': { url: kw ? `https://mobile.yangkeduo.com/search_result.html?search_key=${ek}` : 'https://mobile.yangkeduo.com/', desc: '百亿补贴/多多买菜团长' },
      '美团': { url: 'https://peisong.meituan.com/', desc: '外卖骑手/跑腿/美团优选团长' },
      '蜂鸟众包': { url: 'https://fengniao.ele.me/', desc: '饿了么配送骑手' },
      '闪送': { url: 'https://www.ishansong.com/', desc: '同城急件配送' },
      '货拉拉': { url: 'https://www.huolala.cn/', desc: '货运司机/搬运助手' },
      '滴滴': { url: 'https://www.didiglobal.com/', desc: '网约车/代驾' }
    };

    const p = PLATFORMS[platform];
    if (!p) {
      // 尝试模糊匹配
      const match = Object.keys(PLATFORMS).find(k => k.includes(platform) || platform.includes(k));
      if (match) {
        const mp = PLATFORMS[match];
        return { platform: match, url: mp.url, description: mp.desc, keyword: kw };
      }
      return { error: `未找到平台: ${platform}`, availablePlatforms: Object.keys(PLATFORMS) };
    }

    return { platform, url: p.url, description: p.desc, keyword: kw };
  }
});

// 10. update_financial_data — 更新财务数据
SkillRegistry.register({
  name: 'update_financial_data',
  description: '修改用户财务数据的某个字段，如月收入、房租、存款等',
  parameters: {
    type: 'object',
    properties: {
      field: {
        type: 'string',
        enum: ['savings', 'cash', 'assets', 'rent', 'utilities', 'food', 'transport', 'otherExpense', 'income', 'payday', 'tempIncome'],
        description: '要修改的字段: savings=存款, cash=现金, assets=可变现资产, rent=房租, utilities=水电网, food=伙食费, transport=交通费, otherExpense=其他支出, income=月收入, payday=发薪日, tempIncome=临时收入'
      },
      value: { type: 'string', description: '新的值（数字或日期字符串）' }
    },
    required: ['field', 'value']
  },
  execute(args) {
    const { field, value } = args;
    const d = RuleEngine.loadUserData();
    if (!d) return { error: '用户尚未录入财务数据，请先完成数据录入' };

    const numFields = ['savings', 'cash', 'assets', 'rent', 'utilities', 'food', 'transport', 'otherExpense', 'income', 'tempIncome'];
    const fieldNames = {
      savings: '存款', cash: '现金', assets: '可变现资产', rent: '房租',
      utilities: '水电网费', food: '伙食费', transport: '交通费',
      otherExpense: '其他支出', income: '月收入', payday: '发薪日', tempIncome: '临时收入'
    };

    const oldVal = d[field];

    if (numFields.includes(field)) {
      d[field] = parseFloat(value) || 0;
    } else {
      d[field] = value;
    }

    RuleEngine.setUserData(d);

    return {
      success: true,
      field: fieldNames[field] || field,
      oldValue: oldVal,
      newValue: d[field],
      message: `已将${fieldNames[field] || field}从 ${oldVal} 更新为 ${d[field]}`
    };
  }
});


/* ======== 2. Agent 记忆系统 (AgentMemory) ======== */
const AgentMemory = {
  STORAGE_KEY: 'agent-memory',
  MAX_FACTS: 100,

  /** 获取所有记忆 */
  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || 'null') || this._default();
    } catch { return this._default(); }
  },

  _default() {
    return { facts: [], conversationCount: 0, lastActiveAt: null };
  },

  _save(mem) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mem));
  },

  /** 增加一条记忆 */
  addFact(text, category = 'general') {
    if (!text || !text.trim()) return null;
    const mem = this.getAll();
    // 去重：如果已有非常相似的记忆，更新它
    const existing = mem.facts.findIndex(f =>
      f.category === category && (f.text === text.trim() || this._similarity(f.text, text.trim()) > 0.8)
    );
    const fact = {
      id: 'mem_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      text: text.trim(),
      category,
      createdAt: new Date().toISOString(),
      accessCount: 0
    };
    if (existing >= 0) {
      fact.id = mem.facts[existing].id;
      fact.accessCount = mem.facts[existing].accessCount;
      mem.facts[existing] = fact;
    } else {
      mem.facts.push(fact);
      // 超限则移除最旧的
      if (mem.facts.length > this.MAX_FACTS) {
        mem.facts = mem.facts.slice(-this.MAX_FACTS);
      }
    }
    this._save(mem);
    return fact;
  },

  /** 删除一条记忆 */
  removeFact(id) {
    const mem = this.getAll();
    mem.facts = mem.facts.filter(f => f.id !== id);
    this._save(mem);
  },

  /** 按分类获取记忆 */
  getByCategory(category) {
    return this.getAll().facts.filter(f => f.category === category);
  },

  /** 获取记忆摘要（给 system prompt 用） */
  getSummary() {
    const mem = this.getAll();
    if (!mem.facts.length) return '';

    const cats = {};
    mem.facts.forEach(f => {
      if (!cats[f.category]) cats[f.category] = [];
      cats[f.category].push(f.text);
    });

    const catNames = {
      background: '用户背景',
      preference: '偏好习惯',
      goal: '目标计划',
      skill: '技能特长',
      concern: '关注事项',
      general: '其他信息'
    };

    let summary = '';
    for (const [cat, items] of Object.entries(cats)) {
      const name = catNames[cat] || cat;
      summary += `[${name}] ` + items.join('；') + '\n';
    }
    return summary.trim();
  },

  /** 记录一次对话 */
  bumpConversation() {
    const mem = this.getAll();
    mem.conversationCount = (mem.conversationCount || 0) + 1;
    mem.lastActiveAt = new Date().toISOString();
    this._save(mem);
  },

  /** 获取对话次数 */
  getConversationCount() {
    return this.getAll().conversationCount || 0;
  },

  /** 获取记忆条数 */
  getFactCount() {
    return this.getAll().facts.length;
  },

  /** 简单相似度（Jaccard） */
  _similarity(a, b) {
    const sa = new Set(a.split(''));
    const sb = new Set(b.split(''));
    let inter = 0;
    sa.forEach(c => { if (sb.has(c)) inter++; });
    return inter / (sa.size + sb.size - inter);
  },

  /** 清除所有记忆 */
  clear() {
    localStorage.removeItem(this.STORAGE_KEY);
  },

  /** 从 userData 同步关键信息到记忆（用户填表/更新数据时调用，越用越懂） */
  syncFromUserData() {
    const d = RuleEngine.loadUserData();
    if (!d) return;
    const skillNames = { driving: '开车', cooking: '做饭', repair: '维修', computer: '电脑', design: '设计', writing: '写作', video: '视频剪辑', sales: '销售', teaching: '辅导', labor: '体力劳动' };
    const skills = (d.skills || []).map(s => skillNames[s] || s);
    if (skills.length) {
      this.addFact(`用户掌握的技能：${skills.join('、')}`, 'skill');
    }
    if (d.rent) this.addFact(`月房租 ¥${d.rent}`, 'background');
    if (d.food) this.addFact(`月伙食费 ¥${d.food}`, 'background');
    if (d.income) this.addFact(`月收入 ¥${d.income}`, 'background');
  }
};

// 11. save_memory — 保存用户记忆
SkillRegistry.register({
  name: 'save_memory',
  description: '记住用户提到的重要信息，如个人背景、偏好、目标、关注点等，下次对话时可以回忆',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: '要记住的信息内容' },
      category: {
        type: 'string',
        enum: ['background', 'preference', 'goal', 'skill', 'concern', 'general'],
        description: '分类: background=用户背景, preference=偏好习惯, goal=目标计划, skill=技能特长, concern=关注事项, general=其他'
      }
    },
    required: ['text', 'category']
  },
  execute(args) {
    const fact = AgentMemory.addFact(args.text, args.category);
    if (!fact) return { error: '记忆内容为空' };
    return {
      success: true,
      factId: fact.id,
      totalMemories: AgentMemory.getFactCount(),
      message: `已记住: "${args.text}"`
    };
  }
});

// 12. get_memory — 回忆用户信息
SkillRegistry.register({
  name: 'get_memory',
  description: '回忆之前记住的用户信息，可按分类查看',
  parameters: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        enum: ['background', 'preference', 'goal', 'skill', 'concern', 'general', 'all'],
        description: '查看哪个分类的记忆，all=全部'
      }
    }
  },
  execute(args) {
    const category = args.category || 'all';
    const facts = category === 'all' ? AgentMemory.getAll().facts : AgentMemory.getByCategory(category);
    return {
      count: facts.length,
      conversationCount: AgentMemory.getConversationCount(),
      memories: facts.map(f => ({
        text: f.text,
        category: f.category,
        date: f.createdAt ? f.createdAt.slice(0, 10) : ''
      }))
    };
  }
});

/* ======== 3. Agent 执行引擎 (AgentCore) ======== */
const AgentCore = {
  /** 技能名称的中文映射 */
  SKILL_NAMES: {
    analyze_finances: '财务分析',
    search_opportunities: '机会搜索',
    track_expense: '记账',
    get_expense_history: '记账历史',
    create_budget: '预算方案',
    check_bills: '账单查看',
    generate_script: '谈判话术',
    learn_skill_plan: '学习计划',
    open_platform: '平台跳转',
    update_financial_data: '数据更新',
    save_memory: '记忆存储',
    get_memory: '记忆回忆'
  },

  /**
   * Agent 主入口：发送消息 → 可能触发技能 → 返回最终回复
   * @param {string} userMessage - 用户消息
   * @param {object} options - { onSkillStart, onSkillDone }
   * @returns {{ content: string, executedSkills: string[], toolResults: object[] }}
   */
  async run(userMessage, options = {}) {
    const { onSkillStart, onSkillDone, history = [] } = options;

    // 0.5 记录对话次数
    AgentMemory.bumpConversation();

    // 1. 构建 tools 定义
    const tools = SkillRegistry.toToolDefinitions();

    // 2. 构建消息（支持多轮对话历史，便于 AI 在上下文中捕捉并记忆用户信息）
    const context = RuleEngine.calculateSurvival();
    const systemPrompt = AIService._buildSystemPrompt(context);

    const historyMsgs = Array.isArray(history) ? history.slice(-12) : [];  // 最多 6 轮
    const messages = [
      { role: 'system', content: systemPrompt + this._getAgentSupplement() },
      ...historyMsgs,
      { role: 'user', content: userMessage }
    ];

    // 3. 第一次调 DeepSeek（带 tools）
    const resp1 = await this._callWithTools(messages, tools);

    // 3.5 修复：DeepSeek 有时把 tool_calls 输出为文本（DSML格式），需要解析
    if ((!resp1.tool_calls || resp1.tool_calls.length === 0) && resp1.content) {
      const textCalls = this._parseTextToolCalls(resp1.content);
      if (textCalls) {
        resp1.tool_calls = textCalls;
        resp1.content = this._cleanDSML(resp1.content);
      }
    }

    // 4. 如果有 tool_calls，逐个执行
    if (resp1.tool_calls && resp1.tool_calls.length > 0) {
      const executedSkills = [];
      const toolResultMessages = [];

      // 构建完整的技能调用列表（含 id、名称、参数摘要）
      const allCalls = resp1.tool_calls.map(tc => {
        const fnName = tc.function.name;
        let fnArgs = {};
        try { fnArgs = JSON.parse(tc.function.arguments || '{}'); } catch (e) {}
        return {
          id: tc.id,
          fnName,
          displayName: this.SKILL_NAMES[fnName] || fnName,
          argsSummary: Object.keys(fnArgs).length ? JSON.stringify(fnArgs).slice(0, 60) : '',
          status: 'pending' // pending → running → done
        };
      });

      // 通知 UI：显示完整工具调用面板
      if (onSkillStart) onSkillStart(allCalls);

      // 将 assistant 的 tool_calls 消息加入对话历史
      messages.push({
        role: 'assistant',
        content: resp1.content || null,
        tool_calls: resp1.tool_calls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.function.name, arguments: tc.function.arguments }
        }))
      });

      // 逐个执行技能，逐个通知 UI
      for (let i = 0; i < resp1.tool_calls.length; i++) {
        const tc = resp1.tool_calls[i];
        const fnName = tc.function.name;
        let fnArgs = {};
        try {
          fnArgs = JSON.parse(tc.function.arguments || '{}');
        } catch (e) {
          console.warn('解析技能参数失败:', tc.function.arguments);
        }

        // 通知当前技能开始执行
        allCalls[i].status = 'running';
        if (options.onEachSkill) options.onEachSkill(allCalls, i, 'running');

        const result = await SkillRegistry.execute(fnName, fnArgs);
        executedSkills.push(fnName);

        // 通知当前技能完成
        allCalls[i].status = 'done';
        if (options.onEachSkill) options.onEachSkill(allCalls, i, 'done');

        // 加入 tool result 消息
        toolResultMessages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result)
        });
      }

      // 把所有 tool results 加入 messages
      messages.push(...toolResultMessages);

      // 5. 第二次调 DeepSeek，生成最终自然语言回复
      if (onSkillDone) onSkillDone(allCalls);

      const resp2 = await this._callWithTools(messages, tools, false);

      return {
        content: this._cleanDSML(resp2.content || resp2),
        executedSkills,
        toolResults: toolResultMessages
      };
    }

    // 没有 tool_calls = 普通聊天，直接返回（清理可能的残留 DSML）
    return {
      content: this._cleanDSML(resp1.content || resp1),
      executedSkills: [],
      toolResults: []
    };
  },

  /** 解析 DeepSeek 文本中嵌入的 DSML 工具调用 */
  _parseTextToolCalls(content) {
    if (!content) return null;

    // 通用 DSML 标签模式（兼容 <|DSML|、< | DSML |、<|DSML |、< |DSML| 等各种空格变体）
    const D = '<\\s*\\|\\s*\\/?\\s*DSML\\s*\\|\\s*';  // 匹配 <|DSML| 及其空格变体
    const DC = '<\\s*\\/?\\s*\\|\\s*\\/?\\s*DSML\\s*\\|\\s*'; // 匹配闭合标签变体

    // 匹配 function_calls 块
    const patterns = [
      new RegExp(D + 'function_calls\\s*>([\\s\\S]*?)' + DC + 'function_calls\\s*>', 'i'),
      new RegExp(D + 'function_calls\\s*>([\\s\\S]*?)$', 'i'),  // 没有闭合标签的情况
      /```xml\s*<function_calls>([\s\S]*?)<\/function_calls>\s*```/,
      /<function_calls>([\s\S]*?)<\/function_calls>/
    ];
    let fcContent = null;
    for (const p of patterns) {
      const m = content.match(p);
      if (m) { fcContent = m[1]; break; }
    }
    if (!fcContent) return null;

    const calls = [];
    // 匹配 invoke / function_call 标签（兼容所有 DSML 空格变体）
    const invokePatterns = [
      new RegExp(D + '(?:invoke|function_call)\\s+name\\s*=\\s*"([^"]+)"\\s*>([\\s\\S]*?)' + DC + '(?:invoke|function_call)\\s*>', 'gi'),
      new RegExp(D + '(?:invoke|function_call)\\s+name\\s*=\\s*"([^"]+)"\\s*>([\\s\\S]*?)(?=' + D + '|$)', 'gi'),
      /<invoke\s+name="([^"]+)"\s*>([\s\S]*?)<\/invoke\s*>/g,
      /<function_call\s+name="([^"]+)"\s*>([\s\S]*?)<\/function_call\s*>/g
    ];
    for (const ip of invokePatterns) {
      let m;
      while ((m = ip.exec(fcContent)) !== null) {
        // 从参数块中提取 JSON 或 key-value
        let args = m[2].trim();
        args = this._extractArgsFromXml(args) || args || '{}';
        calls.push({
          id: 'tc_txt_' + Date.now() + '_' + calls.length,
          function: { name: m[1], arguments: args }
        });
      }
      if (calls.length > 0) break;
    }

    // 如果没匹配到 invoke 但有 function_calls，尝试匹配 name= 属性
    if (calls.length === 0) {
      const simpleMatch = fcContent.match(/name[=:]\s*"?([a-z_]+)"?/gi);
      if (simpleMatch) {
        simpleMatch.forEach((sm, i) => {
          const nm = sm.match(/name[=:]\s*"?([a-z_]+)"?/i);
          if (nm) calls.push({
            id: 'tc_txt_' + Date.now() + '_' + i,
            function: { name: nm[1], arguments: '{}' }
          });
        });
      }
    }

    return calls.length > 0 ? calls : null;
  },

  /** 从 XML 参数块中提取参数为 JSON 字符串 */
  _extractArgsFromXml(text) {
    if (!text) return null;
    // 匹配 <parameters>...<key>xxx</key><value>yyy</value>...</parameters>
    const kvPairs = {};
    const kvRegex = /<key>\s*([^<]+?)\s*<\/key>\s*[\n\r]*\s*<value>\s*([^<]*?)\s*<\/value>/gi;
    let m;
    while ((m = kvRegex.exec(text)) !== null) {
      kvPairs[m[1].trim()] = m[2].trim();
    }
    if (Object.keys(kvPairs).length > 0) return JSON.stringify(kvPairs);
    // 尝试直接解析 JSON
    try { const j = JSON.parse(text); return JSON.stringify(j); } catch {}
    return null;
  },

  /** 清理 DSML 工具调用残留文本（兼容各种空格/管道变体，如 < | DSML | xxx>） */
  _cleanDSML(content) {
    if (!content || typeof content !== 'string') return content || '';
    return content
      // 1. 完整 DSML 块（function_calls 包裹的所有内容，含闭合标签）
      .replace(/<[^>]*DSML[^>]*function_calls[^>]*>[\s\S]*?<[^>]*(?:DSML|function_calls)[^>]*>/gi, '')
      // 2. 无闭合标签的 DSML function_calls 块（截断到末尾）
      .replace(/<[^>]*DSML[^>]*function_calls[^>]*>[\s\S]*$/gi, '')
      // 3. 任何残留的 DSML 标签（< | DSML | xxx> 或 <|DSML|xxx> 等）
      .replace(/<[^>]*DSML[^>]*>/gi, '')
      // 4. 残留的 invoke / function_call 标签
      .replace(/<\/?[^>]*invoke[^>]*>/gi, '')
      .replace(/<\/?function_call[^>]*>/gi, '')
      // 5. XML function_calls 块
      .replace(/```xml\s*<function_calls>[\s\S]*?<\/function_calls>\s*```/g, '')
      .replace(/<\/?function_calls>/gi, '')
      // 6. 工具调用参数标签残留（<parameters>、<key>xxx</key>、<value>xxx</value>）
      .replace(/<\/?parameters>/gi, '')
      .replace(/<key>[^<]*<\/key>/gi, '')
      .replace(/<value>[^<]*<\/value>/gi, '')
      .replace(/<\/?key>/gi, '')
      .replace(/<\/?value>/gi, '')
      // 7. 清理多余空行
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  },

  /** Agent 补充 system prompt，告诉 LLM 可以使用的技能 + 记忆 */
  _getAgentSupplement() {
    // 构建记忆上下文
    const memorySummary = AgentMemory.getSummary();
    const convCount = AgentMemory.getConversationCount();
    const factCount = AgentMemory.getFactCount();

    let memoryBlock = '';
    if (memorySummary) {
      memoryBlock = `

【用户记忆（你之前记住的关于这位用户的信息）】
${memorySummary}
（共 ${factCount} 条记忆，已对话 ${convCount} 次）
你应该根据这些记忆来个性化回复，体现"越用越懂你"的特性。`;
    } else {
      memoryBlock = `

【用户记忆】
这是一位新用户，你还没有关于TA的记忆。请在对话中注意捕捉用户的重要信息并用 save_memory 记住。`;
    }

    return `

【你的身份】
你是"AI军师"——一个智能 Agent（不是普通聊天机器人）。
你拥有 12 项技能，可以主动调用它们帮用户完成任务、获取真实数据、记住用户信息。
你的核心特性是：越用越好用——你有记忆能力，能记住用户的背景、偏好、目标，每次对话都更懂用户。
${memoryBlock}

【Agent 技能系统】
你拥有以下工具/技能：

1. analyze_finances — 获取用户完整财务数据（资金、支出、生存天数等）
2. search_opportunities — 搜索赚钱机会（支持关键词和类型筛选）
3. track_expense — 帮用户记一笔支出（需要金额和分类）
4. get_expense_history — 查看用户近期记账记录和消费统计
5. create_budget — 为用户生成日/周/月预算方案
6. check_bills — 查看即将到期的账单/债务
7. generate_script — 为指定债主生成谈判话术
8. learn_skill_plan — 生成指定技能的速成学习计划
9. open_platform — 生成指定平台的真实搜索链接
10. update_financial_data — 帮用户修改财务数据的某个字段
11. save_memory — 记住用户提到的重要信息（背景/偏好/目标/技能/关注点）
12. get_memory — 回忆之前记住的用户信息

【OpenClaw 小龙虾联动】
- 产品已无缝集成 OpenClaw。当推荐赚钱机会、话术、链接时，回复末尾可自然提一句：「点「发给小龙虾」可让 OpenClaw 帮你在电脑/手机执行、打开网页。」
- 不要冗长解释，一句话带过即可。用户会在界面看到「🦞 发给小龙虾」按钮。

【使用规则】（必须严格按意图选对工具）
- 当用户问"有哪些赚钱机会"、"找兼职"、"搞钱"、"机会"、"赚钱"时，必须调用 search_opportunities，不要调用 analyze_finances
- 当用户问到财务状况/生存天数/预算分析时，才调用 analyze_finances
- 当用户想找机会/赚钱时，调用 search_opportunities
- 当用户说"记一笔XX元"之类的，调用 track_expense
- 当用户问"最近花了多少"，调用 get_expense_history
- 当用户需要预算建议，调用 create_budget
- 当用户问账单/债务到期，调用 check_bills
- 当用户需要谈判话术，调用 generate_script
- 当用户想学某个技能，调用 learn_skill_plan
- 当用户想去某个平台看看，调用 open_platform
- 当用户想修改某项财务数据，调用 update_financial_data
- 【记忆捕捉】用户用得越多、你记越多、回复越贴心。每次回复前务必审视：用户本轮是否透露了姓名、城市、职业、家庭、偏好、目标、技能（包括对话中补充的）、特殊需求、习惯等？若有，立即调用 save_memory 分批记住（每条一个明确事实）。宁可多记、勿漏记。
- 当你需要参考之前的对话记忆时，调用 get_memory
- 闲聊/简单问答不需要调工具，直接回复
- 可以一次调用多个工具（如同时分析财务+搜索机会+存储记忆）
- 回复时将工具返回的数据用易懂的方式呈现给用户
- 回复风格亲切实用，像一个老朋友+军师，不说废话直接给方案

【财务分析输出规范】（当调用 analyze_finances 时）
- 财务数据已由前端自动生成图表（饼图、缺口条、KPI 等），你的回复必须极简，勿重复列出数字
- 格式：①【致命问题】1 句（如：缺口¥X，5天后没钱但还要等28天发薪）②【突破口】1 条具体行动+金额 ③ 结尾 1 问（需要我帮你制定28天预算方案吗？）
- 禁止长列表、禁止「核心数据」「支出结构分析」等逐项罗列，图表已展示
- 总字数控制在 80 字以内

【机会搜索输出规范】
- 当调用 search_opportunities 后，回复要简洁
- 不要输出任何链接、URL、或 HTML，界面会根据工具结果自动生成可点击卡片
- 只需用 1-3 句话概括推荐思路，或问用户所在城市等以获取更精准结果

【调整规划输出规范】（当用户说「按我的建议调整」「根据我的建议」时）
- 必须先调用 analyze_finances 获取当前财务数据
- 输出结构：1)【节省】每项具体节省+金额（如：午餐¥8 晚餐¥10 每日伙食¥20 月¥600）2)【收入提升】立即行动+预估（如：①视频剪辑 B站/抖音接单 日结¥100-300）3)【调整后】月支出、月收入、月结余
- 结尾的追问必须基于你上面给出的具体推荐来写！例如：若推荐了视频剪辑和电脑技能，就问「需要我帮你搜索具体的视频剪辑或电脑技能兼职机会吗？」；若推荐了日结外卖，就问「需要我帮你搜索附近的日结配送机会吗？」。不要用笼统的「赚钱机会」，要指名具体方向。
- 数字要具体，金额用 ¥ 符号`;
  },

  /**
   * 调用 DeepSeek（带 tools）
   * @param {Array} messages - 消息数组
   * @param {Array} tools - tools 定义
   * @param {boolean} enableTools - 是否启用工具调用（默认true）
   * @returns {object} response message
   */
  async _callWithTools(messages, tools, enableTools = true) {
    const key = AIService.apiKey || AIService.DEFAULT_KEY;

    const body = {
      model: 'deepseek-chat',
      messages,
      max_tokens: 8192,
      temperature: 0.8,
      stream: false
    };

    if (enableTools && tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    // 30 秒超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let resp;
    try {
      resp = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') throw new Error('AI 请求超时，请稍后重试');
      throw e;
    }
    clearTimeout(timeoutId);

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('AgentCore API error:', resp.status, errText);
      throw new Error(`DeepSeek API ${resp.status}: ${errText}`);
    }

    const data = await resp.json();
    if (!data.choices || !data.choices[0]) throw new Error('DeepSeek: 无返回结果');

    const msg = data.choices[0].message;

    // 如果有 tool_calls
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      return {
        content: msg.content,
        tool_calls: msg.tool_calls
      };
    }

    // 普通文本回复
    return {
      content: msg.content
    };
  }
};
