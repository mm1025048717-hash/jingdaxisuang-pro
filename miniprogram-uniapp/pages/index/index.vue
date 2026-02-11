<template>
  <view class="ob-wrap">
    <view class="ob-slides">
      <view v-for="(slide, i) in slides" :key="i" class="ob-slide" :class="{ active: cur === i }">
        <view class="ob-img">
          <text class="ob-placeholder">{{ i === 0 ? '⚡' : i === 1 ? '🤖' : '📡' }}</text>
        </view>
        <text class="ob-title">{{ slide.title }}</text>
        <text class="ob-desc">{{ slide.desc }}</text>
      </view>
    </view>
    <view class="ob-dots">
      <view v-for="(_, i) in slides" :key="i" class="dot" :class="{ active: cur === i }" @tap="cur = i" />
    </view>
    <button class="btn-main" @tap="goInput">开始使用</button>
    <text class="ob-skip" @tap="skip">跳过</text>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { RuleEngine } from '@/utils/rule-engine'

const cur = ref(0)
const slides = [
  { title: '不只算你还能活几天', desc: '更告诉你这几天怎么活，并帮你执行' },
  { title: 'AI军师实时出谋划策', desc: '智能生成个性化生存方案' },
  { title: '机会雷达聚合兼职', desc: '今天能赚到的钱，直接筛好给你' }
]

function goInput() {
  uni.reLaunch({ url: '/pages/input/input' })
}

function skip() {
  const saved = RuleEngine.loadUserData()
  if (saved) {
    uni.reLaunch({ url: '/pages/dash/dash' })
  } else {
    uni.navigateTo({ url: '/pages/input/input' })
  }
}
</script>

<style lang="scss" scoped>
.ob-wrap {
  min-height: 100vh;
  padding: 60rpx 40rpx;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ob-slides {
  flex: 1;
  position: relative;
  width: 100%;
}
.ob-slide {
  display: none;
  flex-direction: column;
  align-items: center;
  &.active { display: flex; }
}
.ob-img {
  width: 280rpx;
  height: 280rpx;
  margin-bottom: 48rpx;
  background: #FFF3EB;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ob-placeholder { font-size: 120rpx; }
.ob-title {
  font-size: 36rpx;
  font-weight: 700;
  margin-bottom: 16rpx;
  text-align: center;
}
.ob-desc {
  font-size: 28rpx;
  color: #666;
  text-align: center;
}
.ob-dots {
  display: flex;
  gap: 12rpx;
  margin: 40rpx 0;
}
.dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: #E0E0E0;
  transition: all 0.3s;
  &.active {
    width: 44rpx;
    border-radius: 8rpx;
    background: #E85A24;
  }
}
.btn-main {
  width: 100%;
  max-width: 560rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: #1A1A1A;
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 999rpx;
  border: none;
}
.ob-skip {
  margin-top: 24rpx;
  font-size: 26rpx;
  color: #999;
}
</style>
