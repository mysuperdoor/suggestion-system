/**
 * 数据库连接池监控工具
 * 用于监控和记录MongoDB连接池状态
 */

const mongoose = require('mongoose');

// 默认监控间隔 (毫秒)
const DEFAULT_INTERVAL = 60000; // 1分钟

// 连接池统计信息
const poolStats = {
  timestamp: null,
  poolSize: 0,
  available: 0,
  pending: 0,
  maxPoolSize: 0,
  minPoolSize: 0,
  history: []
};

// 保留的历史记录数量
const MAX_HISTORY_SIZE = 100;

/**
 * 更新连接池统计信息
 */
const updatePoolStats = () => {
  if (!mongoose.connection || !mongoose.connection.db) {
    return null;
  }
  
  try {
    const client = mongoose.connection.getClient();
    if (client && client.topology) {
      // 更新当前统计
      poolStats.timestamp = new Date();
      
      // 尝试使用新版API获取连接池信息
      if (client.topology.s.pool) {
        poolStats.poolSize = client.topology.s.pool.totalConnections || 0;
        poolStats.available = client.topology.s.pool.availableConnections || 0;
        poolStats.pending = client.topology.s.pool.pendingConnections || 0;
      } else if (client.s && client.s.options) {
        // 如果无法直接访问连接池，则获取配置的值
        poolStats.poolSize = client.connections?.length || 0;
        poolStats.available = 0; // 无法准确获取
        poolStats.pending = 0; // 无法准确获取
      }
      
      // 从连接配置中获取最大/最小连接池大小
      if (client.s && client.s.options) {
        poolStats.maxPoolSize = client.s.options.maxPoolSize || 0;
        poolStats.minPoolSize = client.s.options.minPoolSize || 0;
      } else {
        poolStats.maxPoolSize = mongoose.connection.config?.maxPoolSize || 0;
        poolStats.minPoolSize = mongoose.connection.config?.minPoolSize || 0;
      }
      
      // 添加到历史记录
      poolStats.history.push({
        timestamp: poolStats.timestamp,
        poolSize: poolStats.poolSize,
        available: poolStats.available,
        pending: poolStats.pending
      });
      
      // 限制历史记录大小
      if (poolStats.history.length > MAX_HISTORY_SIZE) {
        poolStats.history = poolStats.history.slice(-MAX_HISTORY_SIZE);
      }
      
      return { ...poolStats };
    }
  } catch (error) {
    console.error('获取连接池统计失败:', error);
  }
  
  return null;
};

/**
 * 获取当前连接池统计信息
 * @returns {Object} 连接池统计
 */
const getPoolStats = () => {
  updatePoolStats();
  return { ...poolStats };
};

/**
 * 开始定时监控连接池
 * @param {Number} interval 监控间隔 (毫秒)
 * @returns {Number} 定时器ID
 */
const startMonitoring = (interval = DEFAULT_INTERVAL) => {
  // 立即执行一次
  updatePoolStats();
  
  // 设置定时器
  const timerId = setInterval(() => {
    updatePoolStats();
  }, interval);
  
  return timerId;
};

/**
 * 停止定时监控
 * @param {Number} timerId 定时器ID
 */
const stopMonitoring = (timerId) => {
  if (timerId) {
    clearInterval(timerId);
  }
};

module.exports = {
  getPoolStats,
  startMonitoring,
  stopMonitoring,
  updatePoolStats
}; 