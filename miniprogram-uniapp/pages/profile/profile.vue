<template>
  <view class="profile">
    <view class="card">
      <text class="label">当前模式</text>
      <text class="val">{{ level }}</text>
    </view>
    <view class="card">
      <text class="label">重新录入数据</text>
      <view class="btn-ghost" @tap="navInput">去录入</view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { RuleEngine } from '@/utils/rule-engine'

const level = ref('--')

onMounted(() => {
  const s = RuleEngine.calculateSurvival()
  if (s) {
    level.value = s.dangerLevel === 'danger' ? '生存模式' : s.dangerLevel === 'warning' ? '战斗模式' : '稳健模式'
  }
})

function navInput() {
  uni.navigateTo({ url: '/pages/input/input' })
}
</script>

<style lang="scss" scoped>
.profile { padding: 32rpx; min-height: 100vh; background: #F5F5F5; }
.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,.04);
  .label { font-size: 26rpx; color: #666; display: block; margin-bottom: 16rpx; }
  .val { font-size: 32rpx; font-weight: 700; }
}
.btn-ghost {
  display: inline-block;
  padding: 16rpx 32rpx;
  border: 1rpx solid #E5E5E5;
  border-radius: 999rpx;
  font-size: 28rpx;
  color: #666;
}
</style>
