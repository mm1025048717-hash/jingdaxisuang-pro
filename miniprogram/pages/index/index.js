// 精打细算 Pro - 小程序入口页（web-view 模式）
Page({
  data: {
    webUrl: 'https://jingdaxisuang-pro.vercel.app/'
  },

  onLoad() {
    // 可根据需要从云端配置或本地切换 web 地址
    const url = this.data.webUrl;
    if (!url) {
      wx.showToast({ title: '链接未配置', icon: 'none' });
    }
  },

  onMessage(e) {
    // 接收 web-view 内 postMessage 的消息
    console.log('web-view message:', e.detail.data);
  },

  onWebLoad() {
    console.log('web-view load');
  },

  onError(e) {
    console.error('web-view error:', e);
    wx.showToast({ title: '加载失败，请检查网络', icon: 'none' });
  }
});
