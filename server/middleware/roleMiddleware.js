const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: '未授权访问' });
    }

    if (!Array.isArray(roles)) {
      roles = [roles];
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: '权限不足',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

module.exports = {
  checkRole
}; 