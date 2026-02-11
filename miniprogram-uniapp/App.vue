<script setup>
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'

onLaunch(() => {
  console.log('精打细算 Pro 启动')
})

onShow(() => {})
onHide(() => {})
</script>

<style>
@import '@/uni.scss';

page {
  height: 100%;
  background: #F5F5F5;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;
}
</style>
