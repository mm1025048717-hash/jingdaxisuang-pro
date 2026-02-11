<template>
  <view class="advisor">
    <view class="welcome">
      <text class="q">有什么我能帮你的吗？</text>
      <text class="tagline">生存规划 · 军师在此 · 钱紧不慌</text>
    </view>
    <view class="chips">
      <view class="chip" @tap="start('survival')">分析我的情况</view>
      <view class="chip" @tap="start('debt')">债务谈判</view>
      <view class="chip" @tap="start('save')">极限省钱</view>
    </view>
    <view class="tip">
      <text>AI 功能需配置 API，完整版请使用 H5：https://jingdaxisuang-pro.vercel.app/</text>
    </view>
  </view>
</template>

<script setup>
function start(type) {
  uni.showToast({ title: '请使用 H5 版体验完整 AI', icon: 'none' })
}
</script>

<style lang="scss" scoped>
.advisor {
  padding: 48rpx 32rpx;
  min-height: 100vh;
  background: #F5F5F5;
}
.welcome {
  text-align: center;
  margin-bottom: 48rpx;
  .q { font-size: 36rpx; font-weight: 600; display: block; margin-bottom: 16rpx; }
  .tagline { font-size: 26rpx; color: #666; }
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}
.chip {
  padding: 20rpx 32rpx;
  background: #fff;
  border-radius: 999rpx;
  font-size: 28rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04);
}
.tip {
  margin-top: 48rpx;
  padding: 24rpx;
  background: #FFF8F4;
  border-radius: 16rpx;
  font-size: 24rpx;
  color: #999;
}
</style>
