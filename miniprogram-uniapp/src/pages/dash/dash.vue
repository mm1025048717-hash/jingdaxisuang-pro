<template>
  <view class="dash">
    <!-- 顶部装饰区 -->
    <view class="dash-top">
      <view class="hd">
        <text class="greeting">{{ greeting }}</text>
        <text class="headline">生存概览</text>
      </view>
    </view>

    <!-- 生存天数主卡片 -->
    <view class="hero-card">
      <view class="hero-left">
        <view class="hero-ring-wrap">
          <view class="hero-ring" />
        </view>
        <view class="hero-num">
          <text class="n">{{ s?.survivalDays ?? '--' }}</text>
          <text class="unit">天</text>
        </view>
      </view>
      <view class="hero-right">
        <view class="hero-status-pill" :class="s?.dangerLevel">
          <text class="pill-dot"></text>
          <text>{{ info?.status ?? '计算中…' }}</text>
        </view>
        <text class="hero-desc">{{ info?.summary ?? '' }}</text>
        <text v-if="s?.survivalDays != null && s.survivalDays < 90" class="hero-exit">这{{ s.survivalDays }}天怎么过？ → 今日可执行清单已生成</text>
      </view>
    </view>

    <!-- 数据指标 -->
    <view class="kpi-section">
      <text class="section-title">资金概况</text>
      <view class="kpi-row">
        <view class="kpi">
          <text class="kpi-ico">💰</text>
          <text class="val">¥{{ fmt(s?.totalMoney) }}</text>
          <text class="lbl">可用资金</text>
        </view>
        <view class="kpi">
          <text class="kpi-ico">📊</text>
          <text class="val">¥{{ fmt(s?.monthlyExpense) }}</text>
          <text class="lbl">月支出</text>
        </view>
        <view class="kpi">
          <text class="kpi-ico">📅</text>
          <text class="val">¥{{ fmt(s?.dailyBudget) }}</text>
          <text class="lbl">日预算</text>
        </view>
        <view class="kpi">
          <text class="kpi-ico">⏰</text>
          <text class="val">{{ s?.daysToPayday ?? '--' }}<text class="val-unit">天</text></text>
          <text class="lbl">距发薪</text>
        </view>
      </view>
    </view>

    <!-- 功能入口 -->
    <view class="links-section">
      <text class="section-title">工具箱</text>
      <view class="links">
        <view class="link" @tap="navTo('/pages/advisor/advisor')">
          <view class="link-left">
            <text class="link-ico">🤖</text>
            <view>
              <text class="link-title">AI军师</text>
              <text class="link-desc">智能生成生存方案</text>
            </view>
          </view>
          <text class="arrow">›</text>
        </view>
        <view class="link" @tap="navTo('/pages/opps/opps')">
          <view class="link-left">
            <text class="link-ico">📡</text>
            <view>
              <text class="link-title">机会雷达</text>
              <text class="link-desc">发现附近赚钱机会</text>
            </view>
          </view>
          <text class="arrow">›</text>
        </view>
        <view class="link" @tap="navTo('/pages/advisor/advisor?from=debt')">
          <view class="link-left">
            <text class="link-ico">📋</text>
            <view>
              <text class="link-title">债务谈判</text>
              <text class="link-desc">话术与策略指导</text>
            </view>
          </view>
          <text class="arrow">›</text>
        </view>
        <view class="link" @tap="navTo('/pages/input/input')">
          <view class="link-left">
            <text class="link-ico">⚙️</text>
            <view>
              <text class="link-title">调整数据</text>
              <text class="link-desc">更新收支与发薪日</text>
            </view>
          </view>
          <text class="arrow">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { RuleEngine } from '@/utils/rule-engine'
import { fmt, getGreeting } from '@/utils/util'

const s = ref(null)
const info = ref(null)
const greeting = ref(getGreeting())

const ringOffset = computed(() => {
  if (!s.value?.survivalDays) return 327
  const circ = 2 * Math.PI * 52
  return circ * (1 - Math.min(s.value.survivalDays / 90, 1))
})

function refresh() {
  const data = RuleEngine.loadUserData()
  if (!data) {
    uni.redirectTo({ url: '/pages/index/index' })
    return
  }
  s.value = RuleEngine.calculateSurvival()
  info.value = RuleEngine.getStatusText(s.value)
}

function navTo(url) {
  uni.navigateTo({ url })
}

onMounted(refresh)
onShow(refresh)
</script>

<style lang="scss" scoped>
.dash {
  padding: 0 32rpx 120rpx;
  min-height: 100vh;
  background: linear-gradient(180deg, #FFF9F6 0%, #F8F4F1 30%, #F2EEEA 100%);
}

.dash-top {
  padding: 24rpx 0 20rpx;
}
.hd {
  .greeting { font-size: 26rpx; color: #8B7355; display: block; margin-bottom: 4rpx; }
  .headline { font-size: 40rpx; font-weight: 800; color: #1A1A1A; letter-spacing: -0.5rpx; }
}

/* 主卡片 */
.hero-card {
  background: #fff;
  border-radius: 28rpx;
  padding: 36rpx;
  display: flex;
  align-items: center;
  margin-bottom: 28rpx;
  box-shadow: 0 4rpx 20rpx rgba(232,90,36,.08), 0 2rpx 8rpx rgba(0,0,0,.04);
  border: 1rpx solid rgba(232,90,36,.06);
}
.hero-left {
  position: relative;
  width: 180rpx;
  height: 180rpx;
  margin-right: 36rpx;
}
.hero-ring-wrap {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFF5F0 0%, #F5EDE8 100%);
}
.hero-ring {
  position: absolute;
  inset: 10rpx;
  border-radius: 50%;
  border: 18rpx solid #E85A24;
  border-top-color: transparent;
  border-right-color: rgba(232,90,36,.3);
}
.hero-num {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  .n { font-size: 52rpx; font-weight: 800; color: #1A1A1A; line-height: 1.1; }
  .unit { font-size: 24rpx; color: #8B7355; margin-top: 4rpx; }
}
.hero-right { flex: 1; min-width: 0; }
.hero-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
  font-weight: 600;
  margin-bottom: 12rpx;
  &.safe {
    background: rgba(34,197,94,.12);
    color: #15803D;
    .pill-dot { background: #22C55E; }
  }
  &.warning {
    background: rgba(245,158,11,.15);
    color: #B45309;
    .pill-dot { background: #F59E0B; }
  }
  &.danger {
    background: rgba(232,90,36,.12);
    color: #C94D1A;
    .pill-dot { background: #E85A24; }
  }
}
.pill-dot {
  width: 10rpx; height: 10rpx;
  border-radius: 50%;
  display: block;
}
.hero-desc { font-size: 26rpx; color: #525252; display: block; line-height: 1.5; margin-bottom: 8rpx; }
.hero-exit { font-size: 22rpx; color: #E85A24; font-weight: 500; }

/* 区块标题 */
.section-title {
  font-size: 26rpx; font-weight: 600; color: #737373;
  margin-bottom: 16rpx; display: block; padding-left: 4rpx;
}

/* KPI 区 */
.kpi-section { margin-bottom: 28rpx; }
.kpi-row {
  display: flex;
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,.05);
  border: 1rpx solid #F0EDEA;
}
.kpi {
  flex: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  .kpi-ico { font-size: 36rpx; margin-bottom: 4rpx; }
  .val {
    font-size: 28rpx; font-weight: 700; color: #1A1A1A; display: block;
    .val-unit { font-size: 22rpx; font-weight: 500; color: #737373; margin-left: 2rpx; }
  }
  .lbl { font-size: 22rpx; color: #999; }
}

/* 功能入口 */
.links-section { }
.links {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,.05);
  border: 1rpx solid #F0EDEA;
}
.link {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #F5F2EF;
  transition: background .15s;
  &:last-child { border-bottom: none; }
  &:active { background: #FAF8F6; }
}
.link-left {
  display: flex;
  align-items: center;
  gap: 24rpx;
}
.link-ico { font-size: 44rpx; }
.link-title { font-size: 30rpx; font-weight: 600; color: #1A1A1A; display: block; }
.link-desc { font-size: 22rpx; color: #999; margin-top: 2rpx; display: block; }
.arrow {
  color: #C4C4C4;
  font-size: 36rpx;
  font-weight: 300;
}
</style>
