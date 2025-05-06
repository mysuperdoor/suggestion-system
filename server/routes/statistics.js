const express = require('express');
const router = express.Router();
const statisticsController = require('../controllers/statisticsController');
const auth = require('../middleware/auth');

// 获取部门统计数据
router.get('/department-stats', auth, statisticsController.getDepartmentStats);

// 获取部门趋势数据
router.get('/department-trends', auth, statisticsController.getDepartmentTrends);

// 添加一个健康检查端点，用于调试
router.get('/status', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Statistics API is working',
    time: new Date().toISOString()
  });
});

module.exports = router; 