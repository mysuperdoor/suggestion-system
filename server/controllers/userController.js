const { User, DEPARTMENTS, ROLES, TEAMS } = require('../models/User');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const userController = {
  // 获取用户列表
  getUsers: async (req, res) => {
    try {
      console.log('获取用户列表请求');
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      
      // 构建查询条件
      const query = {};
      
      // 如果有角色过滤
      if (req.query.role) {
        // 可以接受角色的key或者value
        const roleValue = ROLES[req.query.role] || req.query.role;
        query.role = roleValue;
      }
      
      // 如果有班组过滤
      if (req.query.team) {
        // 可以接受班组的key或者value
        const teamValue = TEAMS[req.query.team] || req.query.team;
        query.team = teamValue;
      }
      
      // 如果有状态过滤
      if (req.query.active !== undefined) {
        query.active = req.query.active === 'true';
      }

      const users = await User.find(query)
        .select('-password')
        .sort({ role: 1, team: 1, name: 1 })
        .skip(skip)
        .limit(limit);

      const total = await User.countDocuments(query);

      console.log(`成功获取用户列表，共 ${users.length} 条记录`);
      res.json({
        users,
        pagination: {
          total,
          current: page,
          pageSize: limit
        }
      });
    } catch (error) {
      console.error('获取用户列表失败:', error);
      res.status(500).json({ message: '服务器错误' });
    }
  },

  // 创建用户
  createUser: async (req, res) => {
    try {
      const { username, password, name, role, team, department, active } = req.body;
      console.log('创建用户请求数据:', {
        username,
        name, 
        role,
        team,
        department,
        active: active !== undefined ? active : true
      });

      // 检查用户名是否已存在
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: '用户名已存在' });
      }
      
      // 确定正确的角色值（可以是key或value）
      let roleValue = role;
      if (ROLES[role]) {
        // 如果提供的是key
        roleValue = ROLES[role];
      } else if (!Object.values(ROLES).includes(role)) {
        // 如果既不是key也不是value
        console.log('无效的角色值:', role);
        return res.status(400).json({ message: '无效的角色值' });
      }
      
      // 确定正确的班组值（可以是key或value）
      let teamValue = team;
      if (TEAMS[team]) {
        // 如果提供的是key
        teamValue = TEAMS[team];
      } else if (!Object.values(TEAMS).includes(team)) {
        // 如果既不是key也不是value
        console.log('无效的班组值:', team);
        return res.status(400).json({ message: '无效的班组值' });
      }

      // 生成密码哈希
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // 直接使用MongoDB集合操作，避免二次哈希
      const newUser = {
        username,
        password: hashedPassword,
        name,
        role: roleValue,
        team: teamValue,
        department: DEPARTMENTS.PRODUCTION, // 直接使用生产调度部
        active: active !== undefined ? active : true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await mongoose.connection.collection('users').insertOne(newUser);
      
      // 获取创建的用户，不包含密码字段
      const createdUser = await User.findById(result.insertedId);
      console.log('用户创建成功:', username);
      
      res.status(201).json(createdUser);
    } catch (error) {
      console.error('创建用户失败:', error);
      res.status(500).json({ message: '创建用户失败', error: error.message });
    }
  },

  // 更新用户
  updateUser: async (req, res) => {
    const { name, role, team, department, active } = req.body;
    
    try {
      console.log(`[用户更新] 开始更新用户 ID: ${req.params.id}`);
      console.log(`[用户更新] 请求数据:`, req.body);

      // 验证用户是否存在
      const user = await User.findById(req.params.id);
      if (!user) {
        console.log(`[用户更新] 失败 - 用户不存在 ID: ${req.params.id}`);
        return res.status(404).json({ message: '用户不存在' });
      }

      // 验证角色值
      if (role && !Object.values(ROLES).includes(role)) {
        console.log('[用户更新] 无效的角色值:', role);
        console.log('[用户更新] 有效的角色值:', Object.values(ROLES));
        return res.status(400).json({ message: `无效的角色值: ${role}` });
      }

      // 验证班组值
      if (team && !Object.values(TEAMS).includes(team)) {
        console.log('[用户更新] 无效的班组值:', team);
        console.log('[用户更新] 有效的班组值:', Object.values(TEAMS));
        return res.status(400).json({ message: `无效的班组值: ${team}` });
      }

      // 验证部门值
      if (department && !Object.values(DEPARTMENTS).includes(department)) {
        console.log('[用户更新] 无效的部门值:', department);
        console.log('[用户更新] 有效的部门值:', Object.values(DEPARTMENTS));
        return res.status(400).json({ message: `无效的部门值: ${department}` });
      }

      // 更新用户字段
      if (name) user.name = name;
      if (role) user.role = role;
      if (team) user.team = team;
      if (department) user.department = department;
      if (active !== undefined) user.active = active;

      // 添加更新时间和更新人
      user.updatedAt = Date.now();
      user.updatedBy = req.user.id;

      // 保存用户
      await user.save();
      console.log(`[用户更新] 成功 - 用户 ID: ${req.params.id}`);
      console.log(`[用户更新] 更新后数据:`, {
        name: user.name,
        role: user.role,
        team: user.team,
        department: user.department,
        active: user.active
      });

      res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        team: user.team,
        department: user.department,
        active: user.active,
        updatedAt: user.updatedAt,
        updatedBy: user.updatedBy
      });
    } catch (err) {
      console.error(`[用户更新] 错误 - 用户 ID: ${req.params.id}`, err);
      res.status(500).json({ 
        message: '服务器错误',
        error: err.message 
      });
    }
  },

  // 删除用户
  deleteUser: async (req, res) => {
    try {
      const userId = req.params.id;

      // 先检查用户是否存在，并确保不能删除自己
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: '用户不存在' });
      }

      // 不允许删除自己
      if (user.id.toString() === req.user.id.toString()) {
        console.log('尝试删除自己被阻止:', {
          userId: userId,
          requestUserId: req.user.id,
          username: user.username
        });
        return res.status(400).json({ message: '不能删除自己的账号' });
      }

      // 直接使用 findByIdAndDelete 删除用户
      const deletedUser = await User.findByIdAndDelete(userId);
      if (!deletedUser) {
        return res.status(404).json({ message: '用户不存在或已被删除' });
      }

      console.log('用户删除成功:', deletedUser.username);
      res.json({ message: '用户已成功删除', username: deletedUser.username });
    } catch (error) {
      console.error('删除用户失败:', error);
      res.status(500).json({ message: '删除用户失败', error: error.message });
    }
  },

  // 重置密码
  resetPassword: async (req, res) => {
    try {
      const userId = req.params.id;
      const { password } = req.body;
      console.log('密码重置请求:', { userId, passwordLength: password?.length });

      if (!password || password.length < 6) {
        return res.status(400).json({ message: '密码长度必须至少为6个字符' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: '用户不存在' });
      }

      // 直接将新密码原文赋值给 user.password
      user.password = password; 
      user.updatedAt = new Date();

      // 调用 user.save()，让 pre('save') 中间件自动哈希密码
      await user.save(); 

      console.log('密码重置成功:', user.username);
      res.json({ message: '密码重置成功', username: user.username });
    } catch (error) {
      console.error('重置密码失败:', error);
      res.status(500).json({ message: '重置密码失败', error: error.message });
    }
  }
};

module.exports = userController; 