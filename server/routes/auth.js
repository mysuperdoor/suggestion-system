const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const { User } = require('../models/User');
const auth = require('../middleware/auth');
const { login, getMe, changePassword } = require('../controllers/authController');

// 验证中间件
const loginValidation = [
  check('username', '用户名不能为空').not().isEmpty(),
  check('password', '密码不能为空').not().isEmpty()
];

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post(
  '/login',
  [
    check('username', '请输入用户名').not().isEmpty(),
    check('password', '请输入密码').exists()
  ],
  login
);

// @route   GET api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, getMe);

// @route   PUT api/auth/change-password
// @desc    Change current user password
// @access  Private
router.put(
  '/change-password',
  auth, 
  [
    check('currentPassword', '请输入当前密码').not().isEmpty(),
    check('newPassword', '新密码长度必须至少为6个字符').isLength({ min: 6 })
  ],
  changePassword
);

// @route   PUT api/auth/reset-password
// @desc    重置密码
// @access  Private
router.put('/reset-password', [
  auth,
  [
    check('currentPassword', '当前密码不能为空').not().isEmpty(),
    check('newPassword', '新密码长度必须至少为6个字符').isLength({ min: 6 })
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    // 验证当前密码
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ msg: '当前密码错误' });
    }

    // 更新密码
    user.password = newPassword;
    await user.save();

    res.json({ msg: '密码修改成功' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: '服务器错误' });
  }
});

module.exports = router; 