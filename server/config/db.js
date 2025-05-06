const mongoose = require('mongoose');
const { db } = require('./index');

// 创建一个定期监控数据库连接池的函数
function monitorConnectionPool() {
  const { 
    connections, 
    connection: {
      name, 
      host, 
      port, 
      readyState 
    }, 
    connection
  } = mongoose;
  
  // 连接状态名称
  const states = ['断开', '已连接', '连接中', '断开中'];
  
  console.log(`MongoDB连接池状态 [${name}] - ${host}:${port}:`);
  console.log(`- 主连接状态: ${states[readyState]} (${readyState})`);
  
  if (connection.db) {
    console.log(`- 连接池大小: ${connection.db.serverConfig.s.pool.size}`);
    console.log(`- 空闲连接: ${connection.db.serverConfig.s.pool.availableConnections.length}`);
    console.log(`- 使用中连接: ${connection.db.serverConfig.s.pool.inUseConnections.length}`);
    console.log(`- 等待队列: ${connection.db.serverConfig.s.pool.waitQueueSize}`);
  }
  
  // 遍历所有连接 (多数据库场景)
  if (connections.length > 1) {
    console.log(`- 总计活跃连接: ${connections.length}`);
    connections.forEach((conn, i) => {
      if (i > 0) { // 跳过主连接
        console.log(`  - ${conn.name}: ${states[conn.readyState]} (${conn.readyState})`);
      }
    });
  }
}

// 连接到MongoDB数据库
const connectDB = async () => {
  try {
    const startTime = Date.now();
    const conn = await mongoose.connect(db.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // 连接池设置
      maxPoolSize: 10,
      // 连接超时设置
      connectTimeoutMS: 10000,
      // 套接字超时设置
      socketTimeoutMS: 45000,
      // 重试设置
      serverSelectionTimeoutMS: 15000,
      // 心跳设置
      heartbeatFrequencyMS: 10000
    });

    const connectionTime = Date.now() - startTime;
    console.log(`MongoDB 连接成功: ${conn.connection.host} (${connectionTime}ms)`);
    
    // 设置数据库事件监听器
    mongoose.connection.on('error', err => {
      console.error(`MongoDB 连接错误: ${err.message}`);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB 连接已断开');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB 已重新连接');
    });
    
    // 每30分钟监控数据库连接池状态
    setInterval(monitorConnectionPool, 30 * 60 * 1000);
    
    // 初始监控记录
    monitorConnectionPool();
    
    return conn;
  } catch (error) {
    console.error(`MongoDB 连接失败: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB; 