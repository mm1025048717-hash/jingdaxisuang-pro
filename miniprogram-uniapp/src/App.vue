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
  background: #F2EEEA;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Noto Sans SC', sans-serif;
  -webkit-font-smoothing: antialiased;
}
</style>
