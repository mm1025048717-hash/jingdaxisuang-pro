/**
 * 机会雷达 - 完整机会数据（与 Web rule-engine _getFallbackData 一致）
 */
export const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'parttime', label: '兼职' },
  { key: 'gig', label: '零工' },
  { key: 'sell', label: '变现' },
  { key: 'discount', label: '打折' },
  { key: 'coupon', label: '薅羊毛' },
  { key: 'task', label: '悬赏' }
]

export function getOpportunityData() {
  let n = 0
  const ts = Date.now()
  const make = (type, badge, source, title, pay, desc, url) =>
    ({ id: String(ts + (++n)), type, badge, source, title, pay, desc: desc || '', url })

  return [
    make('parttime','兼职','58同城','超市促销员/日结','150-180元/天','','https://m.58.com/search/?key=日结促销'),
    make('parttime','兼职','58同城','餐厅服务员','20-30元/时','','https://m.58.com/search/?key=兼职服务员'),
    make('parttime','兼职','58同城','传单派发/地推','100-200元/天','','https://m.58.com/search/?key=发传单日结'),
    make('parttime','兼职','58同城','快递分拣/搬运','180-250元/天','','https://m.58.com/search/?key=快递分拣日结'),
    make('parttime','兼职','58同城','工厂流水线/包装工','160-220元/天','','https://m.58.com/search/?key=包装工日结'),
    make('parttime','兼职','58同城','保安/门卫','3500-5000元/月','','https://m.58.com/search/?key=保安包吃住'),
    make('parttime','兼职','58同城','家政保洁','35-60元/时','','https://m.58.com/search/?key=保洁小时工'),
    make('parttime','兼职','BOSS直聘','快递分拣/临时工','180-220元/天','','https://www.zhipin.com/web/geek/job?query=快递分拣日结'),
    make('parttime','兼职','BOSS直聘','远程客服','3000-5000元/月','','https://www.zhipin.com/web/geek/job?query=远程客服'),
    make('parttime','兼职','BOSS直聘','外卖骑手','5000-10000元/月','','https://www.zhipin.com/web/geek/job?query=骑手'),
    make('parttime','兼职','BOSS直聘','数据录入/文员','100-200元/天','','https://www.zhipin.com/web/geek/job?query=数据录入兼职'),
    make('gig','零工','美团众包','外卖骑手','150-300元/天','','https://peisong.meituan.com/'),
    make('gig','零工','美团众包','跑腿代办','8-25元/单','','https://peisong.meituan.com/'),
    make('gig','零工','蜂鸟众包','饿了么配送','150-280元/天','','https://fengniao.ele.me/'),
    make('gig','零工','达达快送','商超配送','150-280元/天','','https://www.imdada.cn/'),
    make('gig','零工','货拉拉','搬运助手','150-300元/天','','https://www.huolala.cn/'),
    make('gig','零工','滴滴','代驾司机','100-500元/晚','','https://www.didiglobal.com/'),
    make('gig','零工','闪送','同城急件','10-50元/单','','https://www.ishansong.com/'),
    make('sell','变现','闲鱼','闲置物品变现','50-2000元','','https://www.goofish.com/'),
    make('sell','变现','闲鱼','技能服务出售','30-500元/单','','https://www.goofish.com/search?q=代做'),
    make('sell','变现','转转','旧手机回收','100-3000元','','https://www.zhuanzhuan.com/pro/recovery/index.html'),
    make('sell','变现','淘宝','淘宝客推广','佣金5-30%','','https://pub.alimama.com/'),
    make('sell','变现','拼多多','多多进宝推广','佣金10-40%','','https://jinbao.pinduoduo.com/'),
    make('discount','打折','拼多多','百亿补贴','省10-50%','','https://mobile.yangkeduo.com/duo_cms_mall.html'),
    make('discount','打折','淘宝','聚划算','限时特惠','','https://h5.m.taobao.com/mshop/juhuasuan.html'),
    make('discount','外卖券','美团外卖','神券/红包','最高免单','','https://h5.waimai.meituan.com/waimai/mindex/home'),
    make('discount','外卖券','饿了么','红包/津贴','新人有礼','','https://h5.ele.me/'),
    make('discount','外卖券','麦当劳','1+1随心配','12元起','','https://www.mcdonalds.com.cn/'),
    make('discount','外卖券','肯德基','疯狂星期四','周四特惠','','https://www.kfc.com.cn/'),
    make('coupon','薅羊毛','拼多多','现金大转盘','0.3-5元/天','','https://mobile.yangkeduo.com/'),
    make('coupon','薅羊毛','支付宝','到店付款红包','0.1-99元','','https://www.alipay.com/'),
    make('coupon','薅羊毛','抖音极速版','刷视频赚金币','0.5-3元/天','','https://www.douyin.com/'),
    make('coupon','薅羊毛','快手极速版','刷视频赚金币','0.5-3元/天','','https://www.kuaishou.com/'),
    make('coupon','薅羊毛','京东','签到领京豆','0.5-5元/天','','https://m.jd.com/'),
    make('task','悬赏','猪八戒','LOGO/海报设计','200-1000元/单','','https://www.zbj.com/search/f/?kw=LOGO设计'),
    make('task','悬赏','猪八戒','PPT制作','50-300元/份','','https://www.zbj.com/search/f/?kw=PPT制作'),
    make('task','悬赏','猪八戒','短视频剪辑','100-500元/条','','https://www.zbj.com/search/f/?kw=短视频剪辑'),
    make('task','悬赏','抖音','创作者任务','10-2000元/条','','https://www.douyin.com/'),
    make('task','悬赏','小红书','探店达人','免费吃喝+50-200元','','https://www.xiaohongshu.com/explore'),
    make('task','悬赏','大众点评','写评价返现','5-20元/条','','https://m.dianping.com/'),
    make('task','悬赏','B站','创作激励','按播放量计费','','https://member.bilibili.com/platform/home'),
    make('task','悬赏','问卷星','填问卷赚佣金','1-10元/份','','https://www.wjx.cn/')
  ]
}
