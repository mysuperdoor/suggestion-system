const mongoose = require('mongoose');
const { User, ROLES, TEAMS, DEPARTMENTS } = require('../models/User');
require('dotenv').config();

const initializeDb = async () => {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/suggestion-system', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('数据库连接成功');

    // 检查是否已存在管理员用户
    const adminExists = await User.findOne({ username: 'admin' });
    
    if (!adminExists) {
      console.log('创建默认管理员用户...');
      // Directly use provided user data, including pre-hashed password
      
      const adminUser = {
        username: 'admin',
        password: '$2a$10$l4Qhi9SMpAWnPHRG0QdTr.0QSE/QukVgcg7VXoyTsl9mze/zRYB3i',
        name: '系统管理员',
        role: ROLES.DEPARTMENT_MANAGER,
        team: TEAMS.NONE,
        department: DEPARTMENTS.PRODUCTION,
        active: true,
        createdAt: new Date("2025-04-24T06:51:51.993Z"),
        updatedAt: new Date("2025-04-28T10:44:00.420Z")
      };
      
      await mongoose.connection.collection('users').insertOne(adminUser);
      console.log('默认管理员用户创建成功');
    } else {
      console.log('管理员用户已存在，跳过创建');
    }
    
    console.log('数据库初始化完成，仅检查/创建了 admin 用户');

  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1); // 如果发生错误，以非零状态码退出
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
    process.exit(0); // 成功完成后退出进程
  }
};

// 运行初始化
initializeDb();