const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, ROLES, TEAMS, DEPARTMENTS } = require('./models/User');
require('dotenv').config();

async function resetAdminDirect() {
  try {
    console.log('连接数据库...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/suggestion-system', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('数据库连接成功');

    // 先生成密码哈希
    const plainPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    console.log('密码哈希值已生成:', hashedPassword);
    
    // 直接更新数据库中的admin用户密码
    const result = await mongoose.connection.collection('users').updateOne(
      { username: 'admin' },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        } 
      }
    );
    
    console.log('更新结果:', result);
    
    if (result.matchedCount === 0) {
      console.log('未找到admin用户，将创建新用户');
      
      // 创建新的admin用户
      const newAdminUser = {
        username: 'admin',
        password: hashedPassword,
        name: '系统管理员',
        role: ROLES.DEPARTMENT_MANAGER,
        team: TEAMS.NONE,
        department: DEPARTMENTS.PRODUCTION,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const insertResult = await mongoose.connection.collection('users').insertOne(newAdminUser);
      console.log('创建结果:', insertResult);
      console.log('管理员用户创建成功');
    } else {
      console.log('管理员密码已重置');
    }
    
    // 验证密码
    const admin = await User.findOne({ username: 'admin' });
    const isMatch = await bcrypt.compare(plainPassword, admin.password);
    console.log('密码验证结果:', isMatch ? '正确' : '错误');
    
    console.log('用户名: admin');
    console.log('密码: admin123');

  } catch (error) {
    console.error('重置管理员失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
  }
}

resetAdminDirect(); 