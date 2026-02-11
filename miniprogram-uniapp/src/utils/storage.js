/**
 * 存储适配层：uni-app 环境使用 uni.storage，H5 使用 localStorage
 */
function getStorage(key) {
  // #ifdef H5
  return uni.getStorageSync(key)
  // #endif
  // #ifndef H5
  return uni.getStorageSync(key)
  // #endif
}

function setStorage(key, value) {
  uni.setStorageSync(key, typeof value === 'string' ? value : JSON.stringify(value))
}

export { getStorage, setStorage }
