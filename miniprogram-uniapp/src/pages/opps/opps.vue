<template>
  <view class="opps">
    <view class="hd">
      <text class="title">机会雷达</text>
      <text class="sub">今天能赚到的钱</text>
    </view>

    <!-- 你适合的（前4条赚钱向） -->
    <view class="suited" v-if="suited.length">
      <text class="suited-hd">你适合的</text>
      <view v-for="(o, i) in suited" :key="o.id || i" class="suited-item" @tap="openUrl(o.url)">
        <view class="suited-left">
          <text class="suited-title">{{ o.title }}</text>
          <text class="suited-meta">{{ o.source }} · {{ o.pay }}</text>
        </view>
        <text class="suited-arr">›</text>
      </view>
    </view>

    <!-- 分类筛选 -->
    <scroll-view class="filter-bar" scroll-x :show-scrollbar="false">
      <view
        v-for="f in FILTERS"
        :key="f.key"
        class="filter-tab"
        :class="{ active: filter === f.key }"
        @tap="setFilter(f.key)"
      >
        <text>{{ f.label }}</text>
      </view>
    </scroll-view>

    <!-- 机会列表 -->
    <view class="list" v-if="filteredList.length">
      <view
        v-for="(o, i) in filteredList"
        :key="o.id || i"
        class="opp-card"
        @tap="openUrl(o.url)"
      >
        <view class="opp-top">
          <text class="opp-source">{{ o.source }}</text>
          <text class="opp-badge" :class="o.type">{{ o.badge }}</text>
        </view>
        <view class="opp-body">
          <text class="opp-title">{{ o.title }}</text>
          <text class="opp-pay">{{ o.pay }}</text>
        </view>
      </view>
    </view>

    <view class="empty" v-else>
      <text>该分类暂无机会</text>
      <text class="hint">试试切换其他分类</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getOpportunityData, FILTERS } from '@/utils/opportunities'
import { RuleEngine } from '@/utils/rule-engine'

const data = ref([])
const filter = ref('all')

const suited = computed(() => {
  const earn = data.value.filter(o => ['parttime', 'sell', 'gig', 'task'].includes(o.type))
  return earn.slice(0, 4)
})

const filteredList = computed(() => {
  if (filter.value === 'all') return data.value
  return data.value.filter(o => o.type === filter.value)
})

function setFilter(key) {
  filter.value = key
}

function openUrl(url) {
  if (!url) return
  uni.setClipboardData({
    data: url,
    success: () => {
      uni.showToast({ title: '链接已复制，请在浏览器打开', icon: 'none', duration: 2500 })
    }
  })
}

onMounted(() => {
  data.value = getOpportunityData()
})
</script>

<style lang="scss" scoped>
.opps {
  padding: 24rpx 32rpx 120rpx;
  min-height: 100vh;
  background: linear-gradient(180deg, #FFF9F6 0%, #F8F4F1 30%, #F2EEEA 100%);
}

.hd {
  margin-bottom: 28rpx;
  .title { font-size: 40rpx; font-weight: 800; display: block; color: #1A1A1A; margin-bottom: 6rpx; }
  .sub { font-size: 26rpx; color: #8B7355; }
}

/* 你适合的 */
.suited {
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(232,90,36,.08), 0 2rpx 8rpx rgba(0,0,0,.04);
  border: 1rpx solid rgba(232,90,36,.06);
}
.suited-hd {
  font-size: 28rpx;
  font-weight: 700;
  color: #1A1A1A;
  display: block;
  margin-bottom: 20rpx;
}
.suited-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #F5F2EF;
  &:last-child { border-bottom: none; }
  &:active { opacity: .85; }
}
.suited-left { flex: 1; min-width: 0; }
.suited-title { font-size: 28rpx; font-weight: 600; color: #1A1A1A; display: block; }
.suited-meta { font-size: 22rpx; color: #999; margin-top: 4rpx; display: block; }
.suited-arr { font-size: 32rpx; color: #C4C4C4; font-weight: 300; }

/* 筛选 */
.filter-bar {
  white-space: nowrap;
  margin-bottom: 20rpx;
  padding: 4rpx 0;
}
.filter-tab {
  display: inline-flex;
  align-items: center;
  padding: 14rpx 28rpx;
  margin-right: 12rpx;
  background: #fff;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 500;
  color: #737373;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04);
  &:active { opacity: .9; }
  &.active {
    background: #E85A24;
    color: #fff;
    font-weight: 600;
  }
}

/* 列表 */
.list { display: flex; flex-direction: column; gap: 16rpx; }
.opp-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,.05);
  border: 1rpx solid #F0EDEA;
  &:active { background: #FAF8F6; }
}
.opp-top {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}
.opp-source { font-size: 22rpx; color: #999; }
.opp-badge {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  background: #F5F2EF;
  color: #737373;
  &.parttime { background: rgba(34,197,94,.12); color: #15803D; }
  &.gig { background: rgba(59,130,246,.12); color: #2563EB; }
  &.sell { background: rgba(232,90,36,.12); color: #C94D1A; }
  &.discount { background: rgba(168,85,247,.12); color: #7C3AED; }
  &.coupon { background: rgba(245,158,11,.15); color: #B45309; }
  &.task { background: rgba(14,165,233,.12); color: #0D9488; }
}
.opp-body { display: flex; justify-content: space-between; align-items: center; }
.opp-title { font-size: 28rpx; font-weight: 600; color: #1A1A1A; flex: 1; margin-right: 16rpx; }
.opp-pay { font-size: 26rpx; font-weight: 600; color: #E85A24; white-space: nowrap; }

.empty {
  text-align: center;
  padding: 80rpx 32rpx;
  color: #999;
  font-size: 28rpx;
  .hint { display: block; font-size: 24rpx; margin-top: 12rpx; color: #BBB; }
}
</style>
