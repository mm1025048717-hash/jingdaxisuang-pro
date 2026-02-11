/**
 * 规则引擎 - uni-app 版
 * 逻辑与 Web 版 rule-engine.js 保持一致，存储改用 uni.storage
 */

let userData = null

function load() {
  if (userData) return userData
  try {
    const s = uni.getStorageSync('userData')
    if (s) userData = typeof s === 'string' ? JSON.parse(s) : s
  } catch (e) {}
  return userData
}

function save(d) {
  userData = d
  uni.setStorageSync('userData', JSON.stringify(d || {}))
}

export const RuleEngine = {
  setUserData(d) {
    save(d)
  },

  loadUserData() {
    return load()
  },

  calculateSurvival() {
    const d = load()
    if (!d) return null

    const totalMoney = (d.savings || 0) + (d.cash || 0) + (d.assets || 0)
    const monthlyExpense = (d.rent || 0) + (d.utilities || 0) + (d.food || 0) + (d.transport || 0) + (d.otherExpense || 0)
    const dailyExpense = monthlyExpense / 30
    const survivalDays = dailyExpense > 0 ? Math.floor(totalMoney / dailyExpense) : 999

    let daysToPayday = null
    if (d.payday) {
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      const pay = new Date(d.payday)
      pay.setHours(0, 0, 0, 0)
      daysToPayday = Math.max(0, Math.ceil((pay - now) / 864e5))
    }

    const monthlyGap = monthlyExpense - (d.income || 0)
    const dailyBudget = daysToPayday && daysToPayday > 0
      ? Math.floor(totalMoney / daysToPayday)
      : dailyExpense > 0 ? Math.floor(totalMoney / Math.max(survivalDays, 1)) : 0

    let dangerLevel = 'safe'
    if (survivalDays <= 7 || (daysToPayday && survivalDays < daysToPayday)) dangerLevel = 'danger'
    else if (survivalDays <= 30 || monthlyGap > 0) dangerLevel = 'warning'

    return {
      totalMoney,
      monthlyExpense,
      dailyExpense: Math.round(dailyExpense * 100) / 100,
      survivalDays,
      daysToPayday,
      monthlyGap,
      dailyBudget,
      dangerLevel
    }
  },

  getStatusText(s) {
    if (!s) return { status: '暂无数据', summary: '请先录入财务数据' }
    const { survivalDays, daysToPayday, dangerLevel, monthlyGap, dailyExpense } = s
    let status = '', summary = ''
    if (dangerLevel === 'danger') {
      if (daysToPayday && survivalDays < daysToPayday) {
        status = '🔴 红色警报'
        summary = `钱不够撑到发薪日！缺口约 ¥${Math.round((daysToPayday - survivalDays) * dailyExpense)}`
      } else {
        status = '🔴 紧急状态'
        summary = `仅能维持${survivalDays}天，需立即行动`
      }
    } else if (dangerLevel === 'warning') {
      status = '🟡 需要警惕'
      summary = monthlyGap > 0 ? `每月缺口 ¥${Math.round(monthlyGap)}，需开源节流` : `资金可维持${survivalDays}天，建议提前规划`
    } else {
      status = '🟢 暂时安全'
      summary = `资金较充足，可维持${survivalDays}天`
    }
    return { status, summary }
  }
}
