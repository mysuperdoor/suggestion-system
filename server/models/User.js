const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 用户角色枚举 - 使用键值对方式定义，确保前后端一致
const ROLES = {
  DEPARTMENT_MANAGER: '部门经理',
  SHIFT_SUPERVISOR: '值班主任',
  SAFETY_ADMIN: '安全科管理人员',
  OPERATION_ADMIN: '运行科管理人员',
  TEAM_MEMBER: '班组人员'
};

// 班组枚举 - 使用键值对方式定义，确保前后端一致
const TEAMS = {
  TEAM_A: '甲班',
  TEAM_B: '乙班',
  TEAM_C: '丙班',
  TEAM_D: '丁班',
  NONE: '无班组'
};

// 部门枚举
const DEPARTMENTS = {
  PRODUCTION: '生产调度部'
};

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    required: true,
    enum: Object.values(ROLES),
    default: ROLES.TEAM_MEMBER
  },
  team: {
    type: String,
    required: true,
    enum: Object.values(TEAMS),
    default: TEAMS.NONE
  },
  department: {
    type: String,
    required: true,
    enum: Object.values(DEPARTMENTS),
    default: DEPARTMENTS.PRODUCTION
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 密码加密中间件
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    console.log('对密码进行哈希处理');
    this.password = await bcrypt.hash(this.password, 10);
  }
  this.updatedAt = Date.now();
  next();
});

// 验证密码方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 直接创建用户的静态方法（跳过密码哈希）
userSchema.statics.createWithHashedPassword = async function(userData) {
  // 直接插入文档，跳过中间件
  return this.create({
    ...userData,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
};

// 用户数据转换（去除密码等敏感信息）
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  
  // 添加角色和班组的代码（方便前端显示和处理）
  user.roleKey = Object.keys(ROLES).find(key => ROLES[key] === user.role) || '';
  user.teamKey = Object.keys(TEAMS).find(key => TEAMS[key] === user.team) || '';
  user.departmentKey = Object.keys(DEPARTMENTS).find(key => DEPARTMENTS[key] === user.department) || '';
  
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = {
  User,
  ROLES,
  TEAMS,
  DEPARTMENTS
}; 