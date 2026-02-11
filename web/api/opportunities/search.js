/**
 * Vercel Serverless - 机会雷达实时聚合 API
 * GET /api/opportunities/search?keyword=xxx&city=xxx&page=1&limit=30
 */
const { aggregateOpportunities } = require('../../server/opportunities');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const keyword = String(req.query.keyword || '').trim();
    const city = String(req.query.city || '').trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(10, parseInt(req.query.limit, 10) || 30));
    const result = await aggregateOpportunities({ keyword, city, page, limit });
    res.json({ ok: true, ...result });
  } catch (e) {
    console.error('[API] opportunities/search:', e);
    res.status(500).json({
      ok: false,
      error: e.message,
      data: [],
      sources: [],
      fromRealAPI: false
    });
  }
};
