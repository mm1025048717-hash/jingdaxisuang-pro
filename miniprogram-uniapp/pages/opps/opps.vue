<template>
  <view class="opps">
    <view class="hd">
      <text class="title">机会雷达</text>
      <text class="sub">今天能赚到的钱</text>
    </view>
    <view class="suited" v-if="suited.length">
      <text class="suited-hd">你适合的</text>
      <view v-for="(o, i) in suited" :key="i" class="suited-item">
        <text>{{ o.title }} · 距{{ dists[i] }}km</text>
        <text class="pay">{{ o.pay }}</text>
      </view>
    </view>
    <view class="empty" v-else>
      <text>暂无数据，请先录入技能</text>
      <text class="link" @tap="navInput">去录入</text>
    </view>
    <view class="tip">
      <text>完整机会列表请使用 H5 版</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { RuleEngine } from '@/utils/rule-engine'

const suited = ref([])
const dists = [1.2, 2.5, 0.8, 3.1]
const list = [
  { title: '超市促销员/日结', pay: '150-180元/天', type: 'parttime' },
  { title: '餐厅服务员', pay: '20-30元/时', type: 'parttime' },
  { title: '传单派发/地推', pay: '100-200元/天', type: 'parttime' },
  { title: '快递分拣/搬运', pay: '180-250元/天', type: 'parttime' }
]

onMounted(() => {
  suited.value = list
})

function navInput() {
  uni.navigateTo({ url: '/pages/input/input' })
}
</script>

<style lang="scss" scoped>
.opps { padding: 32rpx; min-height: 100vh; background: #F5F5F5; }
.hd {
  text-align: center;
  margin-bottom: 32rpx;
  .title { font-size: 36rpx; font-weight: 700; display: block; }
  .sub { font-size: 24rpx; color: #999; }
}
.suited {
  background: linear-gradient(135deg, #FFFBF9, #FFF8F4);
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 32rpx;
}
.suited-hd { font-size: 26rpx; font-weight: 600; display: block; margin-bottom: 20rpx; }
.suited-item {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid rgba(0,0,0,.04);
  .pay { font-weight: 600; color: #E85A24; }
}
.empty {
  text-align: center;
  padding: 80rpx;
  color: #999;
  .link { color: #E85A24; margin-left: 16rpx; }
}
.tip {
  margin-top: 32rpx;
  padding: 24rpx;
  background: #FFF8F4;
  border-radius: 16rpx;
  font-size: 24rpx;
  color: #999;
  text-align: center;
}
</style>
