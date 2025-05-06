const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const { User, ROLES, TEAMS, DEPARTMENTS } = require('../models/User');
const auth = require('../middleware/auth');
const { checkUserManagementAccess, checkDepartmentManagerRole } = require('../middleware/admin');
const userController = require('../controllers/userController');

// @route   GET api/users
// @desc    获取用户列表
// @access  Private (仅部门经理)
router.get('/', [auth, checkUserManagementAccess], userController.getUsers);

// @route   GET api/users/:id
// @desc    获取单个用户信息
// @access  Private (仅部门经理)
router.get('/:id', [auth, checkUserManagementAccess], async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: '用户不存在' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: '用户不存在' });
    }
    res.status(500).json({ msg: '服务器错误' });
  }
});

// @route   PUT api/users/:id
// @desc    更新用户信息
// @access  Private (仅部门经理)
router.put(
  '/:id',
  [
    auth,
    checkUserManagementAccess,
    [
      check('name', '姓名不能为空').optional().not().isEmpty(),
      check('role', '角色必须有效').optional().isIn(Object.values(ROLES)),
      check('team', '班组必须有效').optional().isIn(Object.values(TEAMS)),
      check('active', '状态必须是布尔值').optional().isBoolean()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ msg: '用户不存在' });
      }

      // 更新字段
      if (req.body.name) user.name = req.body.name;
      if (req.body.role) user.role = req.body.role;
      if (req.body.team) user.team = req.body.team;
      if (req.body.active !== undefined) user.active = req.body.active;

      await user.save();

      res.json({
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        team: user.team,
        active: user.active
      });
    } catch (err) {
      console.error(err.message);
      if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: '用户不存在' });
      }
      res.status(500).send('服务器错误');
    }
  }
);

// @route   PUT api/users/:id/password
// @desc    重置用户密码
// @access  Private (仅部门经理)
router.put(
  '/:id/password',
  [
    auth,
    checkUserManagementAccess,
    [
      check('password', '密码长度至少为6个字符').isLength({ min: 6 })
    ]
  ],
  userController.resetPassword
);

// @route   PUT api/users/change-password
// @desc    修改自己的密码
// @access  Private (所有已登录用户)
router.put(
  '/change-password',
  [
    auth,
    [
      check('currentPassword', '当前密码不能为空').not().isEmpty(),
      check('newPassword', '新密码长度至少为6个字符').isLength({ min: 6 })
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ msg: '用户不存在' });
      }

      // 验证当前密码
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ msg: '当前密码错误' });
      }

      // 更新密码
      user.password = newPassword;
      await user.save();

      res.json({ msg: '密码已更新' });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: '服务器错误' });
    }
  }
);

// @route   DELETE api/users/:id
// @desc    删除用户
// @access  Private (仅部门经理)
router.delete('/:id', [auth, checkUserManagementAccess], async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ msg: '用户不存在' });
    }

    // 不允许删除自己
    if (user.id === req.user.id) {
      return res.status(400).json({ msg: '不能删除自己的账号' });
    }

    // 使用 findByIdAndDelete 删除用户
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ msg: '用户不存在或已被删除' });
    }

    res.json({ msg: '用户已删除', username: deletedUser.username });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: '用户不存在' });
    }
    res.status(500).send('服务器错误');
  }
});

// @route   GET api/users/supervisors
// @desc    获取所有值班主任列表（用于分配）
// @access  Private (仅部门经理)
router.get('/role/supervisors', [auth, checkUserManagementAccess], async (req, res) => {
  try {
    const supervisors = await User.find({ 
      role: ROLES.SHIFT_SUPERVISOR,
      active: true
    }).select('id name team').sort({ team: 1, name: 1 });
    
    res.json(supervisors);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: '服务器错误' });
  }
});

// @route   GET api/users/team/:team
// @desc    获取指定班组的所有成员
// @access  Private
router.get('/team/:team', auth, async (req, res) => {
  try {
    if (!Object.values(TEAMS).includes(req.params.team)) {
      return res.status(400).json({ msg: '无效的班组' });
    }

    // 检查权限
    const requestUser = await User.findById(req.user.id);
    if (requestUser.role !== ROLES.DEPARTMENT_MANAGER && 
        requestUser.role !== ROLES.SHIFT_SUPERVISOR && 
        requestUser.team !== req.params.team) {
      return res.status(403).json({ msg: '没有权限查看其他班组成员' });
    }

    const teamMembers = await User.find({
      team: req.params.team,
      active: true
    }).select('id name role').sort({ role: 1, name: 1 });

    res.json(teamMembers);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: '服务器错误' });
  }
});

// 创建用户 - 需要管理员权限
router.post('/', [
  auth,
  checkUserManagementAccess,
  [
    check('username', '用户名不能为空').not().isEmpty(),
    check('password', '密码长度至少为6个字符').isLength({ min: 6 }),
    check('name', '姓名不能为空').not().isEmpty(),
    check('role', '角色必须有效').isIn(Object.values(ROLES)),
    check('team', '班组必须有效').isIn(Object.values(TEAMS)),
    check('department', '部门必须有效').isIn(Object.values(DEPARTMENTS))
  ]
], userController.createUser);

// 更新用户 - 需要管理员权限
router.put('/:id', [
  auth,
  checkUserManagementAccess,
  [
    check('name', '姓名不能为空').not().isEmpty(),
    check('role', '角色不能为空').not().isEmpty(),
    check('team', '班组不能为空').not().isEmpty(),
    check('department', '部门不能为空').not().isEmpty(),
    check('active', '状态必须是布尔值').optional().isBoolean()
  ]
], userController.updateUser);

// 删除用户 - 需要管理员权限
router.delete('/:id', [auth, checkUserManagementAccess], userController.deleteUser);

// 重置密码 - 需要管理员权限
router.put('/:id/password', [
  auth,
  checkUserManagementAccess,
  [
    check('password', '密码长度至少为6个字符').isLength({ min: 6 })
  ]
], userController.resetPassword);

module.exports = router; 