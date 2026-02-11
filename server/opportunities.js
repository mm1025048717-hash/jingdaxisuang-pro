/**
 * 机会雷达 - 后端实时数据聚合
 * 对接正式开放 API，合规获取真实招聘/兼职数据
 */

const crypto = require('crypto');

/* ========== 实习僧开放平台 ==========
 * 文档: https://open.shixiseng.com/
 * 需联系商务获取 APP_ID、APP_SECRET，配置 IP 白名单
 */
async function fetchShixiseng(keyword, city, page = 1, limit = 20) {
  const appId = process.env.SHIXISENG_APP_ID;
  const appSecret = process.env.SHIXISENG_APP_SECRET;
  if (!appId || !appSecret) return [];

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signStr = appId + appSecret + timestamp;
  const sign = crypto.createHash('md5').update(signStr).digest('hex').toUpperCase();
  const auth = Buffer.from(`${appId}:${timestamp}`).toString('base64');

  const params = new URLSearchParams({
    sign,
    keyword: keyword || '',
    city: city || '',
    page: String(page),
    limit: String(limit)
  });

  try {
    const resp = await fetch('https://open.shixiseng.com/intern/search', {
      method: 'POST',
      headers: {
        Accept: 'text/html',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Authorization: auth
      },
      body: params.toString()
    });
    const data = await resp.json();
    if (data.code !== 100 || !Array.isArray(data.msg)) return [];
    const ts = Date.now();
    return data.msg.map((m, i) => ({
      id: `sxs_${ts}_${i}`,
      title: m.name || '',
      type: 'parttime',
      badge: '兼职',
      source: '实习僧',
      pay: m.minsalary && m.maxsalary ? `${m.minsalary}-${m.maxsalary}元/天` : '面议',
      desc: `${m.company_name || ''} · ${m.city || ''} · ${m.job || ''}`.trim() || '实习/兼职岗位',
      url: m.uuid ? `https://www.shixiseng.com/intern/${m.uuid}` : '',
      hot: false,
      fromAPI: 'shixiseng'
    }));
  } catch (e) {
    console.error('[Opportunities] 实习僧 API 错误:', e.message);
    return [];
  }
}

/* ========== 聚合数据 招聘信息大全（维护中，预留接口）==========
 * 文档: https://www.juhe.cn/docs/api/id/56
 * 需注册、实名认证、申请接口、购买套餐
 */
async function fetchJuhe(keyword, city) {
  const key = process.env.JUHE_JOB_API_KEY;
  if (!key) return [];
  // 接口维护中，暂不实现
  return [];
}

/* ========== 58同城 API（需商务对接）==========
 * 需在 58 开放平台注册、提交资质、获取 app_key/secret
 */
async function fetch58(keyword, city) {
  const appKey = process.env.API_58_APP_KEY;
  const appSecret = process.env.API_58_APP_SECRET;
  if (!appKey || !appSecret) return [];
  // 58 接口需特定签名算法，预留
  return [];
}

/* ========== 主聚合入口 ========== */
async function aggregateOpportunities({ keyword = '', city = '', page = 1, limit = 30 } = {}) {
  const results = [];
  const sources = [];

  // 1. 实习僧（实习/兼职，真实数据）
  const sxs = await fetchShixiseng(keyword, city, page, Math.min(limit, 20));
  if (sxs.length) {
    results.push(...sxs);
    sources.push('实习僧');
  }

  // 2. 聚合数据（预留）
  const juhe = await fetchJuhe(keyword, city);
  if (juhe.length) {
    results.push(...juhe);
    sources.push('聚合数据');
  }

  // 3. 58同城（预留）
  const f58 = await fetch58(keyword, city);
  if (f58.length) {
    results.push(...f58);
    sources.push('58同城');
  }

  return {
    data: results,
    sources,
    fromRealAPI: sources.length > 0,
    timestamp: Date.now()
  };
}

module.exports = {
  aggregateOpportunities,
  fetchShixiseng,
  fetchJuhe,
  fetch58
};
