/**
 * 简单内存缓存实现
 * 用于减少频繁访问的数据库查询
 */

// 缓存存储
const cache = new Map();

// 缓存统计
const cacheStats = {
  hits: 0,
  misses: 0,
  size: 0,
  sets: 0,
  deletes: 0
};

// 默认缓存超时时间 (5分钟)
const DEFAULT_TTL = 5 * 60 * 1000;

// 最大缓存条目数
const MAX_CACHE_SIZE = 500;

/**
 * 获取缓存项
 * @param {String} key 缓存键名
 * @returns {any|null} 缓存值或null
 */
const get = (key) => {
  // 检查缓存是否存在且未过期
  if (cache.has(key)) {
    const item = cache.get(key);
    
    if (item.expiry > Date.now()) {
      // 缓存命中
      cacheStats.hits++;
      return item.value;
    } else {
      // 缓存已过期，删除
      cache.delete(key);
      cacheStats.size--;
      cacheStats.deletes++;
    }
  }
  
  // 缓存未命中
  cacheStats.misses++;
  return null;
};

/**
 * 设置缓存项
 * @param {String} key 缓存键名
 * @param {any} value 缓存值
 * @param {Number} ttl 超时时间(毫秒)，默认5分钟
 */
const set = (key, value, ttl = DEFAULT_TTL) => {
  // 如果缓存超过最大大小，清理最早的10%条目
  if (cache.size >= MAX_CACHE_SIZE) {
    const keysToDelete = Array.from(cache.keys()).slice(0, Math.floor(MAX_CACHE_SIZE * 0.1));
    keysToDelete.forEach(k => {
      cache.delete(k);
      cacheStats.size--;
      cacheStats.deletes++;
    });
    console.log(`缓存超过最大值(${MAX_CACHE_SIZE})，已清理 ${keysToDelete.length} 条目`);
  }
  
  cache.set(key, {
    value,
    expiry: Date.now() + ttl
  });
  
  cacheStats.sets++;
  cacheStats.size = cache.size;
};

/**
 * 删除缓存项
 * @param {String} key 缓存键名
 */
const del = (key) => {
  if (cache.has(key)) {
    cache.delete(key);
    cacheStats.size--;
    cacheStats.deletes++;
    return true;
  }
  return false;
};

/**
 * 清除所有缓存
 */
const flush = () => {
  cache.clear();
  cacheStats.size = 0;
  cacheStats.deletes++;
  return true;
};

/**
 * 删除匹配指定前缀的所有缓存项
 * @param {String} prefix 缓存键前缀
 */
const delByPrefix = (prefix) => {
  let count = 0;
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      count++;
      cacheStats.size--;
      cacheStats.deletes++;
    }
  }
  return count;
};

/**
 * 获取缓存统计信息
 * @returns {Object} 缓存统计
 */
const getStats = () => {
  return {
    ...cacheStats,
    hitRate: cacheStats.hits + cacheStats.misses > 0 
      ? (cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100).toFixed(2) + '%' 
      : '0%'
  };
};

module.exports = {
  get,
  set,
  del,
  flush,
  delByPrefix,
  getStats
}; 