<template>
  <view class="input-page">
    <view class="step-hd">
      <text class="step-title">录入财务数据</text>
      <text class="step-desc">用于计算生存天数与日预算</text>
    </view>

    <view class="form">
      <view class="field">
        <text class="label">存款+现金+资产（元）</text>
        <input v-model="form.savings" type="digit" placeholder="0" class="inp" />
      </view>
      <view class="field">
        <text class="label">月支出（房租+伙食+交通等）</text>
        <input v-model="form.monthlyExpense" type="digit" placeholder="0" class="inp" />
      </view>
      <view class="field">
        <text class="label">月收入（元，选填）</text>
        <input v-model="form.income" type="digit" placeholder="0" class="inp" />
      </view>
      <view class="field">
        <text class="label">发薪日（选填，如 2025-02-15）</text>
        <input v-model="form.payday" type="text" placeholder="YYYY-MM-DD" class="inp" />
      </view>
    </view>

    <button class="btn-main" @tap="submit">开始分析</button>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { RuleEngine } from '@/utils/rule-engine'

const form = ref({
  savings: '',
  monthlyExpense: '',
  income: '',
  payday: ''
})

function submit() {
  const savings = parseFloat(form.value.savings) || 0
  const monthlyExpense = parseFloat(form.value.monthlyExpense) || 0
  const rent = Math.floor(monthlyExpense * 0.4)
  const food = Math.floor(monthlyExpense * 0.3)
  const transport = Math.floor(monthlyExpense * 0.1)
  const otherExpense = monthlyExpense - rent - food - transport

  RuleEngine.setUserData({
    savings,
    cash: 0,
    assets: 0,
    rent,
    utilities: 0,
    food,
    transport,
    otherExpense: Math.max(0, otherExpense),
    income: parseFloat(form.value.income) || 0,
    payday: form.value.payday || null,
    debts: [],
    skills: []
  })

  uni.reLaunch({ url: '/pages/dash/dash' })
}
</script>

<style lang="scss" scoped>
.input-page { padding: 48rpx 32rpx; min-height: 100vh; background: #F5F5F5; }
.step-hd { margin-bottom: 48rpx; }
.step-title { font-size: 36rpx; font-weight: 700; display: block; margin-bottom: 8rpx; }
.step-desc { font-size: 26rpx; color: #666; }
.form { margin-bottom: 48rpx; }
.field {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,.04);
  .label { font-size: 26rpx; color: #666; display: block; margin-bottom: 16rpx; }
  .inp { font-size: 32rpx; font-weight: 600; }
}
.btn-main {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background: #1A1A1A;
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 999rpx;
  border: none;
}
</style>
