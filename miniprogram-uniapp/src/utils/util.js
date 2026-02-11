/**
 * 通用工具函数
 */
export function fmt(n) {
  if (n == null || isNaN(n)) return '0'
  const num = Number(n)
  return num >= 10000 ? (num / 10000).toFixed(1) + '万' : Math.round(num).toLocaleString()
}

export function getGreeting() {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}
