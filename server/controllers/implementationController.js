const { Suggestion } = require('../models/Suggestion');
const { User } = require('../models/User');
const mongoose = require('mongoose');
const { IMPLEMENTATION_STATUS } = require('../constants/suggestions');
// 导入缓存工具
const cache = require('../utils/cacheUtils');

/**
 * 更新建议实施状态
 * @param {Object} req.params.id 建议ID
 * @param {Object} req.body 实施信息
 * @returns {Promise<Object>} 更新后的建议
 */
exports.updateImplementation = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      status, 
      responsiblePerson, 
      expectedCompletionDate, 
      completionDate, 
      comments 
    } = req.body;
    
    // 验证参数
    if (!status) {
      return res.status(400).json({ 
        message: '实施状态不能为空',
        userMessage: '请选择实施状态'
      });
    }
    
    // 验证实施状态是否有效
    if (!Object.keys(IMPLEMENTATION_STATUS).includes(status)) {
      return res.status(400).json({ 
        message: '无效的实施状态',
        userMessage: '请选择有效的实施状态'
      });
    }
    
    // 获取建议
    const suggestion = await Suggestion.findById(id)
      .select('reviewStatus implementation')
      .lean();
    
    if (!suggestion) {
      return res.status(404).json({ message: '建议不存在' });
    }
    
    // 验证状态
    if (suggestion.reviewStatus !== 'APPROVED') {
      return res.status(400).json({ 
        message: '只有已批准的建议才能更新实施状态',
        userMessage: '此建议未获批准，无法更新实施状态'
      });
    }
    
    // 验证权限
    if (!['部门经理', '安全科管理人员', '运行科管理人员'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: '无权更新实施状态',
        userMessage: '您没有权限更新实施状态'
      });
    }
    
    // 如果指定了负责人，检查用户是否存在
    if (responsiblePerson) {
      const responsiblePersonExists = await User.exists({ _id: responsiblePerson });
      if (!responsiblePersonExists) {
        return res.status(404).json({ 
          message: '指定的负责人不存在',
          userMessage: '指定的负责人不存在或已被删除'
        });
      }
    }
    
    // 处理相关日期
    let parsedExpectedCompletionDate = null;
    let parsedCompletionDate = null;
    
    if (expectedCompletionDate) {
      parsedExpectedCompletionDate = new Date(expectedCompletionDate);
      if (isNaN(parsedExpectedCompletionDate.getTime())) {
        return res.status(400).json({ 
          message: '预计完成日期格式无效',
          userMessage: '请输入有效的预计完成日期'
        });
      }
    }
    
    if (completionDate) {
      parsedCompletionDate = new Date(completionDate);
      if (isNaN(parsedCompletionDate.getTime())) {
        return res.status(400).json({ 
          message: '实际完成日期格式无效',
          userMessage: '请输入有效的实际完成日期'
        });
      }
      
      // 检查实际完成日期不能早于当前日期
      if (status === 'COMPLETED' && parsedCompletionDate > new Date()) {
        return res.status(400).json({ 
          message: '实际完成日期不能晚于当前日期',
          userMessage: '实际完成日期不能是未来日期'
        });
      }
    }
    
    // 记录当前状态
    const previousStatus = suggestion.implementation?.status || 'NOT_STARTED';
    
    // 构建更新操作
    const update = {};
    const historyEntry = {
      status,
      updatedBy: req.user.id,
      updatedAt: Date.now(),
      comments: comments || `状态由 ${IMPLEMENTATION_STATUS[previousStatus] || previousStatus} 变更为 ${IMPLEMENTATION_STATUS[status] || status}`
    };
    
    // 设置初始implementation对象（如果不存在）
    if (!suggestion.implementation) {
      update.$set = {
        'implementation.status': status,
        'implementation.history': [historyEntry],
        'implementationStatus': status // 同步顶层状态
      };
    } else {
      // 更新实施信息
      update.$set = {
        'implementation.status': status,
        'implementationStatus': status // 同步顶层状态
      };
      
      // 添加可选字段
      if (responsiblePerson !== undefined) {
        update.$set['implementation.responsiblePerson'] = responsiblePerson;
      }
      if (parsedExpectedCompletionDate !== null) {
        update.$set['implementation.expectedCompletionDate'] = parsedExpectedCompletionDate;
      }
      if (parsedCompletionDate !== null) {
        update.$set['implementation.completionDate'] = parsedCompletionDate;
      }
      
      // 添加历史记录
      update.$push = {
        'implementation.history': historyEntry
      };
    }
    
    // 执行更新操作并获取更新后的文档
    const updatedSuggestion = await Suggestion.findByIdAndUpdate(
      id,
      update,
      { new: true, runValidators: true }
    )
    .populate('submitter', 'name team email')
    .populate('implementation.responsiblePerson', 'name role');
    
    // 清除缓存
    clearSuggestionCaches(id);
    
    res.json({
      message: '实施状态更新成功',
      suggestion: updatedSuggestion
    });
  } catch (error) {
    console.error('更新实施状态失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 在相关更新操作后，需要清除缓存
const clearSuggestionCaches = (suggestionId) => {
  // 清除列表缓存
  cache.delByPrefix('suggestions:list:');
  // 清除指定ID的详情缓存
  if (suggestionId) {
    cache.del(`suggestion:${suggestionId}`);
  }
  // 清除所有统计缓存
  cache.delByPrefix('statistics:');
  // 清除实施相关缓存
  cache.delByPrefix('implementation:');
};

/**
 * 获取实施统计数据
 * @returns {Promise<Object>} 统计数据
 */
exports.getImplementationStats = async (req, res) => {
  try {
    // 检查缓存
    const cacheKey = 'statistics:implementation';
    const cachedStats = cache.get(cacheKey);
    if (cachedStats) {
      return res.json(cachedStats);
    }
    
    // 使用Promise.all并行执行多个聚合查询
    const [statusStats, responsiblePersonStats, implementationTimeStats] = await Promise.all([
      // 按状态统计
      Suggestion.aggregate([
        { $match: { reviewStatus: 'APPROVED' } },
        {
          $group: {
            _id: '$implementation.status',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // 按负责人统计
      Suggestion.aggregate([
        { $match: { reviewStatus: 'APPROVED', 'implementation.responsiblePerson': { $exists: true } } },
        {
          $group: {
            _id: '$implementation.responsiblePerson',
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'personInfo'
          }
        },
        {
          $project: {
            _id: 1,
            count: 1,
            name: { $arrayElemAt: ['$personInfo.name', 0] },
            role: { $arrayElemAt: ['$personInfo.role', 0] }
          }
        }
      ]),
      
      // 使用聚合管道计算平均实施时间
      Suggestion.aggregate([
        {
          $match: {
            reviewStatus: 'APPROVED',
            'implementation.status': 'COMPLETED',
            'implementation.completionDate': { $exists: true },
            'secondReview.reviewedAt': { $exists: true }
          }
        },
        {
          $project: {
            implementationDays: {
              $divide: [
                { $subtract: ['$implementation.completionDate', '$secondReview.reviewedAt'] },
                1000 * 60 * 60 * 24 // 转换为天数
              ]
            }
          }
        },
        {
          $match: {
            implementationDays: { $gte: 0 } // 过滤无效数据
          }
        },
        {
          $group: {
            _id: null,
            avgDays: { $avg: '$implementationDays' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);
    
    // 按时间段统计
    const currentDate = new Date();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(currentDate.getMonth() - 1);
    
    const implementedLastMonth = await Suggestion.countDocuments({
      reviewStatus: 'APPROVED',
      'implementation.status': 'COMPLETED',
      'implementation.completionDate': { $gte: oneMonthAgo, $lte: currentDate }
    });
    
    // 格式化负责人统计结果
    const formattedResponsiblePersonStats = responsiblePersonStats.map(stat => ({
      _id: stat._id,
      name: stat.name || '未知用户',
      role: stat.role || '未知角色',
      count: stat.count
    }));
    
    // 获取平均实施时间
    const averageImplementationDays = implementationTimeStats.length > 0 
      ? parseFloat(implementationTimeStats[0].avgDays.toFixed(1)) 
      : 0;
    
    // 构建结果对象
    const result = {
      statusStats: statusStats.map(stat => ({
        status: stat._id,
        statusText: IMPLEMENTATION_STATUS[stat._id] || stat._id,
        count: stat.count
      })),
      responsiblePersonStats: formattedResponsiblePersonStats,
      timeStats: {
        implementedLastMonth,
        averageImplementationDays
      }
    };
    
    // 缓存结果 (10分钟)
    cache.set(cacheKey, result, 10 * 60 * 1000);
    
    res.json(result);
  } catch (error) {
    console.error('获取实施统计数据失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
}; 