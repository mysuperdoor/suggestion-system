const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

const login = async (req, res) => {
  try {
    console.log('开始登录验证，请求数据:', req.body);
    const { username, password } = req.body;
    
    // 查找用户
    const user = await User.findOne({ username });
    if (!user) {
      console.log('登录失败: 用户不存在 -', username);
      return res.status(400).json({ message: '用户名或密码错误' });
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('登录失败: 密码错误 -', username);
      return res.status(400).json({ message: '用户名或密码错误' });
    }

    console.log('密码验证成功，生成用户信息');
    
    // 获取完整的用户对象（通过toJSON()方法会添加roleKey和teamKey）
    const userObj = user.toJSON();
    console.log('用户完整信息:', userObj);

    // 创建 token
    const payload = {
      user: {
        id: userObj._id,
        username: userObj.username,
        name: userObj.name,
        role: userObj.role,
        team: userObj.team,
        roleKey: userObj.roleKey,
        teamKey: userObj.teamKey
      }
    };

    console.log('创建token的payload:', payload);

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });
    console.log('token生成成功');

    // 返回完整的用户信息和token
    res.json({
      token,
      user: userObj
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 获取当前用户信息
const getMe = async (req, res) => {
  try {
    console.log('获取当前用户信息, userId:', req.user.id);
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      console.log('用户不存在:', req.user.id);
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 获取用户完整信息
    const userObj = user.toJSON();
    console.log('返回用户信息:', {
      id: userObj._id,
      username: userObj.username,
      name: userObj.name,
      role: userObj.role,
      team: userObj.team,
      roleKey: userObj.roleKey
    });
    
    res.json(userObj);
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({ message: '服务器错误' });
  }
};

// 修改当前用户密码
const changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id; // 从认证中间件获取用户ID

  try {
    console.log(`[密码修改] 用户 ID: ${userId} 开始修改密码`);
    const user = await User.findById(userId);

    if (!user) {
      console.log(`[密码修改] 失败 - 用户不存在 ID: ${userId}`);
      return res.status(404).json({ message: '用户不存在' });
    }

    // 验证当前密码
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      console.log(`[密码修改] 失败 - 当前密码错误 用户 ID: ${userId}`);
      return res.status(400).json({ message: '当前密码不正确' });
    }

    // 不需要手动哈希新密码，直接赋值原文
    user.password = newPassword; 
    user.updatedAt = Date.now();
    
    // pre('save') 中间件会自动哈希
    await user.save();

    console.log(`[密码修改] 成功 - 用户 ID: ${userId}`);
    res.json({ message: '密码修改成功' });

  } catch (error) {
    console.error('[密码修改] 失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

module.exports = {
  login,
  getMe,
  changePassword
}; 