const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const { Suggestion } = require('../models/Suggestion');
const { User, ROLES } = require('../models/User');
const { SUGGESTION_TYPES, IMPLEMENTATION_STATUS, REVIEW_STATUS } = require('../constants/suggestions');
const suggestionController = require('../controllers/suggestionController');
const reviewController = require('../controllers/reviewController');
const implementationController = require('../controllers/implementationController');
const attachmentController = require('../controllers/attachmentController');
const { checkRole } = require('../middleware/roleMiddleware');
const { validateSuggestion } = require('../middleware/validationMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');
const emailService = require('../utils/emailService');
const { SUGGESTION_STATUS } = require('../models/Suggestion');

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    // 确保上传目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // 保存原始文件名，不进行任何改变
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// 检查用户权限的中间件
const checkTeamMemberRole = (req, res, next) => {
  if (req.user.role !== '班组成员') {
    return res.status(403).json({ msg: '没有权限，需要班组成员权限' });
  }
  next();
};

const checkSupervisorRole = (req, res, next) => {
  if (req.user.role !== '值班主任' && 
      req.user.role !== '安全科管理人员' && 
      req.user.role !== '运行科管理人员' && 
      req.user.role !== '部门经理') {
    return res.status(403).json({ msg: '没有权限，需要值班主任或更高级别权限' });
  }
  next();
};

const checkAdminRole = (req, res, next) => {
  if (req.user.role !== '安全科管理人员' && 
      req.user.role !== '运行科管理人员' && 
      req.user.role !== '部门经理') {
    return res.status(403).json({ msg: '没有权限，需要管理人员权限' });
  }
  next();
};

const checkManagerRole = (req, res, next) => {
  if (req.user.role !== '部门经理') {
    return res.status(403).json({ msg: '没有权限，需要部门经理权限' });
  }
  next();
};

// 检查评分权限中间件
const checkScorePermission = async (req, res, next) => {
  try {
    // 部门经理有权限评分所有建议
    if (req.user.role === '部门经理') {
      return next();
    }

    // 获取建议信息
    const suggestion = await Suggestion.findById(req.params.id);
    if (!suggestion) {
      return res.status(404).json({ msg: '建议不存在' });
    }

    // 判断建议类型
    const isSafetyType = suggestion.type === 'SAFETY' || suggestion.type === '安全管理';

    // 安全科管理人员只能评分安全类建议
    if (req.user.role === '安全科管理人员' && isSafetyType) {
      return next();
    }

    // 运行科管理人员只能评分非安全类建议
    if (req.user.role === '运行科管理人员' && !isSafetyType) {
      return next();
    }

    // 其他情况无权限
    return res.status(403).json({ msg: '没有评分权限', userMessage: '您只能评分您负责审核类型的建议' });
  } catch (error) {
    console.error('检查评分权限错误:', error);
    return res.status(500).json({ msg: '服务器错误' });
  }
};

// @route   GET api/suggestions/create
// @desc    获取创建建议所需的初始数据
// @access  Private
router.get('/create', auth, async (req, res) => {
  try {
    // 返回创建建议所需的枚举数据
    res.json({
      types: Object.entries(SUGGESTION_TYPES).map(([key, value]) => ({
        value: key,
        label: value
      })),
      currentUser: {
        id: req.user.id,
        name: req.user.name,
        team: req.user.team,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('获取创建建议数据失败:', error);
    res.status(500).json({ 
      message: '获取创建建议数据失败', 
      error: error.message 
    });
  }
});

// @route   POST api/suggestions
// @desc    创建新建议
// @access  Private
router.post('/', auth, upload.array('files', 5), validateSuggestion, async (req, res) => {
  try {
    console.log('建议提交 - 请求体:', req.body);
    console.log('建议提交 - 上传文件:', req.files ? req.files.length : 0);
    
    // 确保上传目录存在
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('创建上传目录:', uploadDir);
    }
    
    // 手动验证请求数据
    const errors = [];
    
    if (!req.body.title) {
      errors.push({ msg: '标题不能为空' });
    } else if (req.body.title.length > 100) {
      errors.push({ msg: '标题不能超过100个字符' });
    }
    
    if (!req.body.type) {
      errors.push({ msg: '请选择有效的建议类型' });
    } else if (!Object.keys(SUGGESTION_TYPES).includes(req.body.type)) {
      errors.push({ msg: '建议类型无效' });
    }
    
    if (!req.body.content) {
      errors.push({ msg: '内容不能为空' });
    } else if (req.body.content.length < 20) {
      errors.push({ msg: '内容不能少于20个字符' });
    }
    
    if (!req.body.expectedBenefit) {
      errors.push({ msg: '预期效果不能为空' });
    }
    
    // 如果有验证错误
    if (errors.length > 0) {
      // 如果上传了文件，需要删除
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          fs.unlink(file.path, err => {
            if (err) console.error('删除文件失败:', err);
          });
        });
      }
      return res.status(400).json({ message: errors[0].msg, errors: errors });
    }

    const { title, type, content, expectedBenefit } = req.body;
    
    // 处理附件
    let attachments = [];
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => {
        // 文件原始名称可能来自不同编码的客户端，必须确保其正确性
        const safeOriginalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        
        return {
          filename: file.filename,
          originalname: safeOriginalname,  // 使用处理后的安全文件名
          path: file.path.replace(/\\/g, '/'),  // 统一使用正斜杠
          mimetype: file.mimetype
        };
      });
      console.log('处理附件:', attachments);
    }
    
    // 创建新建议
    const suggestion = new Suggestion({
      title,
      type,
      content,
      expectedBenefit,
      submitter: req.user.id,
      team: req.user.team,  // 从用户信息中获取班组
      attachments: attachments
    });

    console.log('准备保存建议:', JSON.stringify(suggestion, null, 2));
    await suggestion.save();
    console.log('建议保存成功，ID:', suggestion._id);
    
    // 填充提交者信息
    await suggestion.populate('submitter', 'name team');
    
    console.log('返回建议数据:', JSON.stringify(suggestion, null, 2));
    res.status(201).json({ 
      message: '建议提交成功', 
      suggestion 
    });
  } catch (error) {
    // 如果保存失败且上传了文件，需要删除文件
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        fs.unlink(file.path, err => {
          if (err) console.error('删除文件失败:', err);
        });
      });
    }
    
    console.error('提交建议失败:', error);
    res.status(500).json({ 
      message: '提交建议失败', 
      error: error.message 
    });
  }
});

// 添加健康检查和错误日志路由
router.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

router.get('/error-log', auth, checkManagerRole, (req, res) => {
  try {
    const logPath = path.join(__dirname, '../logs/error.log');
    if (fs.existsSync(logPath)) {
      const log = fs.readFileSync(logPath, 'utf8');
      res.json({ log });
    } else {
      res.json({ log: '日志文件不存在' });
    }
  } catch (error) {
    res.status(500).json({ message: '获取错误日志失败', error: error.message });
  }
});

// @route   GET api/suggestions
// @desc    获取建议列表（根据用户角色和权限过滤）
// @access  Private
router.get('/', auth, suggestionController.getSuggestions);

// @route   GET api/suggestions/:id
// @desc    获取单个建议详情
// @access  Private
router.get('/:id', auth, suggestionController.getSuggestionById);

// @route   DELETE api/suggestions/:id
// @desc    删除建议 (部门经理权限)
// @access  Private (部门经理)
router.delete(
  '/:id',
  auth,
  checkRole(['部门经理']), // 明确路由级别的权限检查
  suggestionController.deleteSuggestion
);

// @route   PUT api/suggestions/:id/first-review
// @desc    一级审核（值班主任）
// @access  Private (值班主任及以上)
router.put(
  '/:id/first-review',
  [
    auth, 
    checkSupervisorRole,
    [
      check('approved', '必须指定是否批准').exists(),
      check('comments', '必须提供审核意见').not().isEmpty()
    ]
  ],
  suggestionController.firstReview
);

// @route   PUT api/suggestions/:id/second-review
// @desc    二级审核（安全科/运行科管理人员）
// @access  Private (管理人员及以上)
router.put(
  '/:id/second-review',
  [
    auth, 
    checkAdminRole,
    [
      check('approved', '必须指定是否批准').exists(),
      check('comments', '必须提供审核意见').not().isEmpty()
    ]
  ],
  suggestionController.secondReview
);

// @route   PUT api/suggestions/:id/implementation
// @desc    更新建议实施状态
// @access  Private (管理人员及以上)
router.put(
  '/:id/implementation',
  [
    auth, 
    checkAdminRole, // 权限检查中间件
    // 修正验证规则
    [
      check('status', '必须提供有效的实施状态')
        .isIn(Object.keys(IMPLEMENTATION_STATUS)), // 使用导入的 IMPLEMENTATION_STATUS 的 key
      check('responsiblePerson', '必须指定责任人')
        .not().isEmpty()
        .isString(),
      check('notes', '必须提供状态更新说明') // 验证 notes 字段
        .not().isEmpty()
        .isString(),
      check('startDate', '开始日期格式无效')
        .optional({ checkFalsy: true }) // 允许空字符串或 null
        .isISO8601(),
      check('plannedCompletionDate', '计划完成日期格式无效') // 对应前端 plannedEndDate
        .optional({ checkFalsy: true })
        .isISO8601(),
      check('actualCompletionDate', '实际完成日期格式无效') // 对应前端 actualEndDate
        .optional({ checkFalsy: true })
        .isISO8601(),
      check('completionRate', '完成率必须是0-100的数字')
        .optional({ checkFalsy: true })
        .isInt({ min: 0, max: 100 })
    ]
  ],
  // 添加验证结果处理中间件
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('更新实施状态验证失败:', errors.array());
      // 返回第一个错误信息给前端
      return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
    }
    next(); // 验证通过，继续执行下一个处理器
  },
  // 指向正确的控制器函数
  suggestionController.updateImplementation 
  // 移除旧的内联处理器
  /* async (req, res) => { ... } */
);

// @route   POST api/suggestions/upload
// @desc    上传文件
// @access  Private
router.post('/upload', auth, upload.single('file'), (req, res) => {
  try {
    res.json({
      fileUrl: `/uploads/${req.file.filename}`
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('文件上传失败');
  }
});

// @route   PUT api/suggestions/:id/status
// @desc    更新建议状态
// @access  Private (管理人员及以上)
router.put(
  '/:id/status',
  [
    auth,
    [
      check('status', '状态不能为空').not().isEmpty(),
      check('status', '无效的状态').isIn(['待审核', '已通过', '已拒绝', '处理中', '已完成']),
      check('comment', '审核意见不能为空').not().isEmpty()
    ]
  ],
  suggestionController.updateSuggestionStatus
);

// @route   POST api/suggestions/:id/comments
// @desc    添加评论
// @access  Private (管理人员及以上)
router.post(
  '/:id/comments',
  [
    auth,
    [
      check('content', '评论内容不能为空').not().isEmpty()
    ]
  ],
  suggestionController.addComment
);

// @route   POST api/suggestions/:id/score
// @desc    为建议打分
// @access  Private (Manager, Safety Admin for safety suggestions, Operations Admin for non-safety suggestions)
router.post('/:id/score', auth, checkScorePermission, suggestionController.scoreSuggestion);

// @route   PUT api/suggestions/:id
// @desc    修改建议
// @access  Private
router.put('/:id', [
  auth,
  [
    check('title', '标题不能为空').optional().not().isEmpty(),
    check('content', '内容不能为空').optional().not().isEmpty(),
    check('reason', '修改原因不能为空').not().isEmpty()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const suggestion = await Suggestion.findById(req.params.id);
    
    if (!suggestion) {
      return res.status(404).json({ msg: '建议不存在' });
    }

    // 检查权限：只有提交者本人可以修改，且仅限于未开始审核的建议
    if (suggestion.submitter.toString() !== req.user.id) {
      return res.status(403).json({ msg: '没有修改权限' });
    }

    if (suggestion.status !== SUGGESTION_STATUS.PENDING_FIRST_REVIEW) {
      return res.status(400).json({ msg: '建议已进入审核流程，无法修改' });
    }

    const { title, content, expectedBenefit, reason } = req.body;

    // 保存修改历史
    suggestion.revisionHistory.push({
      content: suggestion.content,
      modifiedBy: req.user.id,
      reason
    });

    // 更新建议内容
    if (title) suggestion.title = title;
    if (content) suggestion.content = content;
    if (expectedBenefit) suggestion.expectedBenefit = expectedBenefit;

    await suggestion.save();
    res.json(suggestion);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/suggestions/:id/withdraw
// @desc    撤回建议
// @access  Private
router.put('/:id/withdraw', [
  auth,
  [
    check('reason', '撤回原因不能为空').not().isEmpty()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const suggestion = await Suggestion.findById(req.params.id);
    
    if (!suggestion) {
      return res.status(404).json({ msg: '建议不存在' });
    }

    // 检查权限：只有提交者本人可以撤回，且仅限于未完成审核的建议
    if (suggestion.submitter.toString() !== req.user.id) {
      return res.status(403).json({ msg: '没有撤回权限' });
    }

    if (![SUGGESTION_STATUS.PENDING_FIRST_REVIEW, SUGGESTION_STATUS.PENDING_SECOND_REVIEW].includes(suggestion.status)) {
      return res.status(400).json({ msg: '建议已完成审核，无法撤回' });
    }

    const { reason } = req.body;

    // 更新撤回信息
    suggestion.status = SUGGESTION_STATUS.WITHDRAWN;
    suggestion.withdrawnAt = Date.now();
    suggestion.withdrawnBy = req.user.id;
    suggestion.withdrawalReason = reason;

    await suggestion.save();
    res.json(suggestion);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET api/suggestions/all
// @desc    获取所有建议
// @access  Private
router.get('/all', auth, suggestionController.getAllSuggestions);

// @route   GET api/suggestions/department/:departmentId
// @desc    获取特定部门的建议
// @access  Private
router.get('/department/:departmentId', auth, suggestionController.getSuggestionsByDepartment);

// @route   GET api/suggestions/team/:teamId
// @desc    获取特定团队的建议
// @access  Private
router.get('/team/:teamId', auth, suggestionController.getSuggestionsByTeam);

// @route   GET api/suggestions/user
// @desc    获取用户提交的建议
// @access  Private
router.get('/user', auth, suggestionController.getUserSuggestions);

// @route   GET api/suggestions/pending-review
// @desc    获取待审核的建议
// @access  Private
router.get('/pending-review', auth, suggestionController.getPendingReviewSuggestions);

// @route   GET api/suggestions/:id/implementation-records
// @desc    获取实施记录
// @access  Private
router.get('/:id/implementation-records', auth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const suggestion = await Suggestion.findById(id);
    
    if (!suggestion) {
      return res.status(404).json({ message: '未找到建议' });
    }
    
    // 获取实施记录
 const implementation = await Implementation.findOne({ suggestion: suggestion._id })
      .populate('statusHistory.updatedBy', 'name username role')
      .lean();
    
    if (!implementation || !implementation.statusHistory) {
      return res.status(200).json([]);
    }
    
    // 转换状态为中文显示并按时间排序
    const records = implementation.statusHistory.map(record => ({
      id: record._id,
      status: record.status,
      comments: record.comments,
      updatedBy: record.updatedBy,
      updatedAt: record.timestamp
    })).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    res.status(200).json(records);
  } catch (error) {
    console.error('获取实施记录失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
});

// 提交审核
router.post('/review', auth, suggestionController.submitReview);

// 添加电子邮件通知相关函数
function notifyReviewers(suggestion, type) {
  try {
    const isSafety = suggestion.type === 'SAFETY';
    const reviewerRole = isSafety ? 'safety_manager' : 'operations_manager';
    const reviewStage = type === 'first' ? '初审' : '二审';
    const subject = `新的${isSafety ? '安全' : '运营'}建议需要${reviewStage}`;
    const content = `
      <p>您好，</p>
      <p>有一条新的建议需要您${reviewStage}。</p>
      <p>建议标题：${suggestion.title}</p>
      <p>建议类型：${isSafety ? '安全管理' : '运营管理'}</p>
      <p>提交人：${suggestion.submitter.name}</p>
      <p>请尽快登录系统进行审核。</p>
    `;
    
    // 通知相关部门管理人员
    emailService.notifyByRole(reviewerRole, subject, content);
  } catch (error) {
    console.error('发送审核通知邮件失败:', error);
  }
}

// 审核相关路由
router.post('/:id/review/first', auth, checkSupervisorRole, reviewController.submitFirstReview);
router.post('/:id/review/second', auth, checkAdminRole, reviewController.submitSecondReview);
router.get('/reviews/:suggestionId', auth, reviewController.getReviewsBySuggestion);
router.get('/reviews/reviewer/me', auth, reviewController.getReviewsByReviewer);
router.get('/stats/reviews', auth, reviewController.getReviewStats);

// 实施相关路由
router.post('/:id/implementation', auth, checkAdminRole, implementationController.updateImplementation);
router.get('/stats/implementation', auth, implementationController.getImplementationStats);

// 附件相关路由
router.get('/files/:filename', attachmentController.getUploadedFile);
router.get('/:id/attachments/:attachmentId', auth, attachmentController.downloadAttachment);
router.delete('/:id/attachments/:attachmentId', auth, attachmentController.deleteAttachment);

module.exports = router; 