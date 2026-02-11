<template>
  <view class="dash">
    <view class="hd">
      <text class="greeting">{{ greeting }}</text>
      <text class="headline">生存概览</text>
    </view>

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
        <text class="hero-status" :class="s?.dangerLevel">{{ info?.status ?? '计算中…' }}</text>
        <text class="hero-desc">{{ info?.summary ?? '' }}</text>
        <text v-if="s?.survivalDays < 90" class="hero-exit">这{{ s.survivalDays }}天怎么过？ → 今日可执行清单已生成</text>
      </view>
    </view>

    <view class="kpi-row">
      <view class="kpi"><text class="val">¥{{ fmt(s?.totalMoney) }}</text><text class="lbl">可用资金</text></view>
      <view class="kpi"><text class="val">¥{{ fmt(s?.monthlyExpense) }}</text><text class="lbl">月支出</text></view>
      <view class="kpi"><text class="val">¥{{ fmt(s?.dailyBudget) }}</text><text class="lbl">日预算</text></view>
      <view class="kpi"><text class="val">{{ s?.daysToPayday ?? '--' }}天</text><text class="lbl">距发薪</text></view>
    </view>

    <view class="links">
      <view class="link" @tap="navTo('/pages/advisor/advisor')">
        <text>AI军师</text>
        <text class="arrow">›</text>
      </view>
      <view class="link" @tap="navTo('/pages/opps/opps')">
        <text>机会雷达</text>
        <text class="arrow">›</text>
      </view>
      <view class="link" @tap="navTo('/pages/advisor/advisor?from=debt')">
        <text>债务谈判</text>
        <text class="arrow">›</text>
      </view>
      <view class="link" @tap="navTo('/pages/input/input')">
        <text>调整数据</text>
        <text class="arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
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
  padding: 24rpx 32rpx 120rpx;
  min-height: 100vh;
  background: #F5F5F5;
}
.hd {
  margin-bottom: 32rpx;
  .greeting { font-size: 24rpx; color: #999; display: block; }
  .headline { font-size: 34rpx; font-weight: 700; }
}
.hero-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,.04);
}
.hero-left {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  margin-right: 32rpx;
}
.hero-ring-wrap {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: #F1F1F1;
}
.hero-ring {
  position: absolute;
  inset: 8rpx;
  border-radius: 50%;
  border: 16rpx solid #E85A24;
  border-top-color: transparent;
}
.hero-num {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  .n { font-size: 48rpx; font-weight: 800; }
  .unit { font-size: 24rpx; color: #666; }
}
.hero-right { flex: 1; }
.hero-status {
  font-size: 28rpx;
  font-weight: 600;
  display: block;
  margin-bottom: 8rpx;
  &.danger { color: #E85A24; }
  &.warning { color: #F59E0B; }
  &.safe { color: #22C55E; }
}
.hero-desc { font-size: 24rpx; color: #666; display: block; margin-bottom: 8rpx; }
.hero-exit { font-size: 22rpx; color: #999; }
.kpi-row {
  display: flex;
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,.04);
}
.kpi {
  flex: 1;
  text-align: center;
  .val { font-size: 28rpx; font-weight: 700; display: block; }
  .lbl { font-size: 22rpx; color: #999; }
}
.links {
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,.04);
}
.link {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32rpx;
  border-bottom: 1rpx solid #F0F0F0;
  &:last-child { border-bottom: none; }
  .arrow { color: #999; font-size: 32rpx; }
}
</style>
