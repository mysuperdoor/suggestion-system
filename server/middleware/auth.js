const jwt = require('jsonwebtoken');
const { User } = require('../models/User');

module.exports = async function(req, res, next) {
  // 获取请求头中的token
  const token = req.header('Authorization');
  console.log('认证请求头:', token ? '存在token' : '无token');

  // 检查token是否存在
  if (!token || !token.startsWith('Bearer ')) {
    console.log('认证失败: 缺少有效token');
    return res.status(401).json({ msg: '无访问权限，请登录' });
  }

  try {
    // 验证token
    const decoded = jwt.verify(
      token.replace('Bearer ', ''),
      process.env.JWT_SECRET || 'defaultsecretkey'
    );

    // 检查token是否过期
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      console.log('认证失败: token已过期');
      return res.status(401).json({ msg: '会话已过期，请重新登录' });
    }

    // 从数据库获取用户信息（不包含密码）
    const user = await User.findById(decoded.user.id).select('-password');
    
    if (!user) {
      console.log('认证失败: 找不到用户');
      return res.status(401).json({ msg: '用户不存在' });
    }
    
    // 检查用户是否激活
    if (!user.active) {
      console.log('认证失败: 用户已禁用');
      return res.status(403).json({ msg: '账号已被禁用，请联系管理员' });
    }

    // 将用户信息添加到请求对象
    req.user = {
      id: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
      team: user.team,
      department: user.department
    };
    
    console.log('认证成功, 用户信息:', {
      id: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
      team: user.team
    });
    
    next();
  } catch (err) {
    console.error('Token验证失败:', err.message);
    res.status(401).json({ msg: '无效的令牌' });
  }
}; 