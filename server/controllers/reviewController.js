const { Review, REVIEW_LEVELS, REVIEW_RESULTS } = require('../models/Review');
const { Suggestion } = require('../models/Suggestion');
const { User } = require('../models/User');
const mongoose = require('mongoose');
const { notifyReviewers } = require('../utils/notificationUtils');
// 导入缓存工具
const cache = require('../utils/cacheUtils');

/**
 * 创建审核记录
 * @param {Object} reviewData 审核数据
 * @param {String} reviewData.suggestion 建议ID
 * @param {String} reviewData.reviewer 审核人ID
 * @param {String} reviewData.level 审核级别 FIRST_LEVEL/SECOND_LEVEL
 * @param {String} reviewData.result 审核结果 APPROVED/REJECTED
 * @param {String} reviewData.comments 审核意见
 * @returns {Promise<Object>} 创建的审核记录
 */
exports.createReview = async (reviewData) => {
  try {
    const { suggestion, reviewer, level, result, comments } = reviewData;
    
    // 验证建议是否存在
    const suggestionExists = await Suggestion.findById(suggestion);
    if (!suggestionExists) {
      throw new Error('建议不存在');
    }
    
    // 创建审核记录
    const review = new Review({
      suggestion,
      reviewer,
      level,
      result,
      comments,
      reviewedAt: Date.now()
    });
    
    await review.save();
    
    return review;
  } catch (error) {
    console.error('创建审核记录失败:', error);
    throw error;
  }
};

/**
 * 获取建议的审核记录
 * @param {String} suggestionId 建议ID
 * @returns {Promise<Object>} 审核记录
 */
exports.getReviewsBySuggestion = async (req, res) => {
  try {
    const { suggestionId } = req.params;
    
    // 验证建议是否存在
    const suggestionExists = await Suggestion.findById(suggestionId);
    if (!suggestionExists) {
      return res.status(404).json({ message: '建议不存在' });
    }
    
    // 获取审核记录
    const reviews = await Review.find({ suggestion: suggestionId })
      .populate('reviewer', 'name username role')
      .sort({ createdAt: -1 });
    
    res.json(reviews);
  } catch (error) {
    console.error('获取审核记录失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

/**
 * 获取审核人的审核记录
 * @param {String} reviewerId 审核人ID
 * @returns {Promise<Object>} 审核记录列表
 */
exports.getReviewsByReviewer = async (req, res) => {
  try {
    const reviewerId = req.user.id;
    
    // 获取审核记录
    const reviews = await Review.find({ reviewer: reviewerId })
      .populate({
        path: 'suggestion',
        select: 'title type status submitter',
        populate: {
          path: 'submitter',
          select: 'name username team'
        }
      })
      .sort({ createdAt: -1 });
    
    res.json(reviews);
  } catch (error) {
    console.error('获取审核记录失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

/**
 * 获取审核统计数据
 * @returns {Promise<Object>} 统计数据
 */
exports.getReviewStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 获取审核人的审核记录总数
    const totalReviews = await Review.countDocuments({ reviewer: userId });
    
    // 按审核结果统计
    const resultStats = await Review.aggregate([
      { $match: { reviewer: mongoose.Types.ObjectId(userId) } },
      { 
        $group: {
          _id: '$result',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 按审核级别统计
    const levelStats = await Review.aggregate([
      { $match: { reviewer: mongoose.Types.ObjectId(userId) } },
      { 
        $group: {
          _id: '$level',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 统计审核时效
    const timeEfficiency = await Review.aggregate([
      { $match: { reviewer: mongoose.Types.ObjectId(userId) } },
      {
        $project: {
          reviewTime: {
            $subtract: ['$reviewedAt', '$createdAt']
          }
        }
      },
      {
        $group: {
          _id: null,
          averageTime: { $avg: '$reviewTime' },
          maxTime: { $max: '$reviewTime' },
          minTime: { $min: '$reviewTime' }
        }
      }
    ]);
    
    // 格式化结果
    const formattedResultStats = resultStats.map(item => ({
      result: REVIEW_RESULTS[item._id],
      resultKey: item._id,
      count: item.count
    }));
    
    const formattedLevelStats = levelStats.map(item => ({
      level: REVIEW_LEVELS[item._id],
      levelKey: item._id,
      count: item.count
    }));
    
    const averageTimeInHours = timeEfficiency.length > 0 
      ? (timeEfficiency[0].averageTime / (1000 * 60 * 60)).toFixed(2) 
      : 0;
    
    res.json({
      totalReviews,
      resultStats: formattedResultStats,
      levelStats: formattedLevelStats,
      timeEfficiency: {
        averageTimeInHours: parseFloat(averageTimeInHours),
        maxTimeInHours: timeEfficiency.length > 0 
          ? (timeEfficiency[0].maxTime / (1000 * 60 * 60)).toFixed(2)
          : 0,
        minTimeInHours: timeEfficiency.length > 0 
          ? (timeEfficiency[0].minTime / (1000 * 60 * 60)).toFixed(2)
          : 0
      }
    });
  } catch (error) {
    console.error('获取审核统计数据失败:', error);
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
  // 清除审核相关缓存
  cache.delByPrefix('reviews:');
};

/**
 * 提交一级审核
 * @param {Object} req.params.id 建议ID
 * @param {Object} req.body.result 审核结果 (APPROVED/REJECTED)
 * @param {Object} req.body.comments 审核意见
 * @returns {Promise<Object>} 更新后的建议
 */
exports.submitFirstReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { result, comments } = req.body;
    
    // 检查参数
    if (!result) {
      return res.status(400).json({ message: '审核结果不能为空' });
    }
    
    // 获取建议
    const suggestion = await Suggestion.findById(id);
    if (!suggestion) {
      return res.status(404).json({ message: '建议不存在' });
    }
    
    // 验证状态
    if (suggestion.reviewStatus !== 'PENDING_FIRST_REVIEW') {
      return res.status(400).json({ 
        message: '当前建议状态不允许提交一级审核',
        userMessage: '当前建议状态不允许提交一级审核，请刷新页面' 
      });
    }
    
    // 验证审核人权限
    if (!['值班主任', '部门经理'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: '无权进行一级审核',
        userMessage: '您没有权限进行一级审核' 
      });
    }
    
    // 更新建议状态
    const reviewData = {
      reviewer: req.user.id,
      result,
      comments: comments || '',
      reviewedAt: Date.now()
    };
    
    let newStatus;
    if (result === 'APPROVED') {
      newStatus = 'PENDING_SECOND_REVIEW';
    } else {
      newStatus = 'REJECTED';
    }
    
    // 更新建议
    suggestion.firstReview = reviewData;
    suggestion.reviewStatus = newStatus;
    await suggestion.save();
    
    // 创建审核记录
    await this.createReview({
      suggestion: id,
      reviewer: req.user.id,
      level: 'FIRST_LEVEL',
      result,
      comments: comments || ''
    });
    
    // 通知相关人员
    await notifyReviewers(suggestion, newStatus);
    
    // 清除缓存
    clearSuggestionCaches(id);
    
    res.json({
      message: '一级审核提交成功',
      suggestion
    });
  } catch (error) {
    console.error('提交一级审核失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

/**
 * 提交二级审核
 * @param {Object} req.params.id 建议ID
 * @param {Object} req.body.result 审核结果 (APPROVED/REJECTED)
 * @param {Object} req.body.comments 审核意见
 * @returns {Promise<Object>} 更新后的建议
 */
exports.submitSecondReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { result, comments } = req.body;
    
    // 检查参数
    if (!result) {
      return res.status(400).json({ message: '审核结果不能为空' });
    }
    
    // 获取建议
    const suggestion = await Suggestion.findById(id);
    if (!suggestion) {
      return res.status(404).json({ message: '建议不存在' });
    }
    
    // 验证状态
    if (suggestion.reviewStatus !== 'PENDING_SECOND_REVIEW') {
      return res.status(400).json({ 
        message: '当前建议状态不允许提交二级审核',
        userMessage: '当前建议状态不允许提交二级审核，请刷新页面' 
      });
    }
    
    // 验证审核人权限
    if (!['安全科管理人员', '运行科管理人员', '部门经理'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: '无权进行二级审核',
        userMessage: '您没有权限进行二级审核' 
      });
    }
    
    // 安全科只能审核安全类建议
    if (req.user.role === '安全科管理人员' && suggestion.type !== 'SAFETY') {
      return res.status(403).json({ 
        message: '安全科只能审核安全类建议',
        userMessage: '您只能审核安全类建议' 
      });
    }
    
    // 运行科只能审核非安全类建议
    if (req.user.role === '运行科管理人员' && suggestion.type === 'SAFETY') {
      return res.status(403).json({ 
        message: '运行科只能审核非安全类建议',
        userMessage: '您只能审核非安全类建议' 
      });
    }
    
    // 更新建议状态
    const reviewData = {
      reviewer: req.user.id,
      result,
      comments: comments || '',
      reviewedAt: Date.now()
    };
    
    let newStatus;
    if (result === 'APPROVED') {
      newStatus = 'APPROVED';
      // 如果批准，初始化实施信息
      if (!suggestion.implementation) {
        suggestion.implementation = {
          status: 'NOT_STARTED',
          history: [{
            status: 'NOT_STARTED',
            updatedBy: req.user.id,
            updatedAt: Date.now(),
            comments: '建议已批准，等待分配实施负责人'
          }]
        };
      }
    } else {
      newStatus = 'REJECTED';
    }
    
    // 更新建议
    suggestion.secondReview = reviewData;
    suggestion.reviewStatus = newStatus;
    await suggestion.save();
    
    // 创建审核记录
    await this.createReview({
      suggestion: id,
      reviewer: req.user.id,
      level: 'SECOND_LEVEL',
      result,
      comments: comments || ''
    });
    
    // 通知相关人员
    await notifyReviewers(suggestion, newStatus);
    
    // 清除缓存
    clearSuggestionCaches(id);
    
    res.json({
      message: '二级审核提交成功',
      suggestion
    });
  } catch (error) {
    console.error('提交二级审核失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 验证审核权限
const validateReviewPermission = async (reviewer, suggestion, reviewType) => {
  // 部门经理可以审核所有建议
  if (reviewer.role === '部门经理') {
    return true;
  }
  
  // 一级审核 - 值班主任
  if (reviewType === 'FIRST_LEVEL') {
    if (reviewer.role !== '值班主任') {
      return false;
    }
    
    // 确保值班主任只能审核自己班组的建议
    return reviewer.team === suggestion.team;
  }
  
  // 二级审核 - 安全科/运行科管理人员
  if (reviewType === 'SECOND_LEVEL') {
    if (!['安全科管理人员', '运行科管理人员'].includes(reviewer.role)) {
      return false;
    }
    
    // 安全科只能审核安全类建议
    if (reviewer.role === '安全科管理人员') {
      return suggestion.type === 'SAFETY';
    }
    
    // 运行科只能审核非安全类建议
    if (reviewer.role === '运行科管理人员') {
      return suggestion.type !== 'SAFETY';
    }
  }
  
  return false;
}; 