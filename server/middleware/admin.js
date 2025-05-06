const { ROLES } = require('../models/User');

// 检查用户是否拥有部门经理权限
const checkDepartmentManagerRole = (req, res, next) => {
  if (req.user && req.user.role === '部门经理') {
    next();
  } else {
    return res.status(403).json({ msg: '需要部门经理权限' });
  }
};

// 检查用户是否拥有安全科管理人员权限
const checkSafetyAdminRole = (req, res, next) => {
  if (req.user && (req.user.role === '安全科管理人员' || req.user.role === '部门经理')) {
    next();
  } else {
    return res.status(403).json({ msg: '需要安全科管理人员或部门经理权限' });
  }
};

// 检查用户是否拥有运行科管理人员权限
const checkOperationAdminRole = (req, res, next) => {
  if (req.user && (req.user.role === '运行科管理人员' || req.user.role === '部门经理')) {
    next();
  } else {
    return res.status(403).json({ msg: '需要运行科管理人员或部门经理权限' });
  }
};

// 检查用户是否拥有任何管理人员权限（安全科或运行科或部门经理）
const checkAnyAdminRole = (req, res, next) => {
  if (req.user && (
    req.user.role === '安全科管理人员' || 
    req.user.role === '运行科管理人员' || 
    req.user.role === '部门经理'
  )) {
    next();
  } else {
    return res.status(403).json({ msg: '需要管理人员权限' });
  }
};

// 检查用户是否拥有值班主任权限或更高权限
const checkShiftSupervisorRole = (req, res, next) => {
  if (req.user && (
    req.user.role === '值班主任' || 
    req.user.role === '安全科管理人员' || 
    req.user.role === '运行科管理人员' || 
    req.user.role === '部门经理'
  )) {
    next();
  } else {
    return res.status(403).json({ msg: '需要值班主任或更高权限' });
  }
};

// 检查用户是否属于指定班组
const checkTeamAccess = (team) => {
  return (req, res, next) => {
    // 部门经理和管理人员可以访问所有班组
    if (req.user && (
      req.user.role === '部门经理' ||
      req.user.role === '安全科管理人员' ||
      req.user.role === '运行科管理人员'
    )) {
      return next();
    }
    
    // 值班主任只能访问自己班组
    if (req.user && req.user.role === '值班主任' && req.user.team === team) {
      return next();
    }
    
    // 班组人员只能访问自己班组的信息
    if (req.user && req.user.team === team) {
      return next();
    }
    
    return res.status(403).json({ msg: '没有权限访问该班组数据' });
  };
};

// 检查用户管理权限（只有部门经理）
const checkUserManagementAccess = (req, res, next) => {
  if (req.user && req.user.role === '部门经理') {
    next();
  } else {
    return res.status(403).json({ msg: '只有部门经理可以管理用户' });
  }
};

module.exports = {
  checkDepartmentManagerRole,
  checkSafetyAdminRole,
  checkOperationAdminRole,
  checkAnyAdminRole,
  checkShiftSupervisorRole,
  checkTeamAccess,
  checkUserManagementAccess
}; 