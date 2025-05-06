const { Suggestion } = require('../models/Suggestion');
const { User } = require('../models/User');
const mongoose = require('mongoose');
const fs = require('fs');
const { validationResult } = require('express-validator');
const { validateSuggestion } = require('../utils/validation');
const { Review } = require('../models/Review');
const { notifyReviewers } = require('../utils/notificationUtils');
// 导入常量定义
const { REVIEW_STATUS, IMPLEMENTATION_STATUS } = require('../constants/suggestions');
const path = require('path');
// 导入缓存工具
const cache = require('../utils/cacheUtils');

// 缓存常量
const CACHE_TTL_SHORT = 1 * 60 * 1000; // 1分钟
const CACHE_TTL_MEDIUM = 5 * 60 * 1000; // 5分钟
const CACHE_TTL_LONG = 15 * 60 * 1000; // 15分钟

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
};

exports.getSuggestions = async (req, res) => {
  try {
    // 清理查询参数
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      type,
      reviewStatus, 
      submitter: submitterId,
      responsiblePerson: responsiblePersonId,
      implementationStatus,
      team,
      timeRange,
      sortBy,
      sortOrder
    } = req.query;
    
    // 创建缓存键（基于所有查询参数的哈希）
    const cacheKey = `suggestions:list:${JSON.stringify({
      page, limit, search, type, reviewStatus, submitterId, 
      responsiblePersonId, implementationStatus, team, 
      timeRange, sortBy, sortOrder
    })}`;
    
    // 检查缓存
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      return res.json(cachedResult);
    }
    
    // 计算分页参数
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // 构建查询条件
    let query = {};
    
    // -- 1. 应用前端传入的显式过滤条件 --
    if (reviewStatus) {
      // 支持单个状态或逗号分隔的多个状态
      const statuses = reviewStatus.split(',').map(s => s.trim());
      query.reviewStatus = { $in: statuses };
    }
    if (type) {
      const types = type.split(',').map(t => t.trim());
      query.type = { $in: types };
    }
    if (team) {
      const teams = team.split(',').map(t => t.trim());
      query.team = { $in: teams };
    }
    
    // -- 2. 应用基于用户角色的权限过滤 (如果前端没有指定更具体的 submitterId 或 responsiblePersonId) --
    // 注意：responsiblePersonId 的过滤需要在获取实施信息后进行，或使用聚合管道
    
    let filterByUserPermission = true; // 默认应用权限过滤
    
    if (responsiblePersonId && responsiblePersonId === req.user.id) {
        // 如果查询的是 "我负责的"，那么建议本身不需要加 submitter 限制
        // 但需要后续过滤实施信息
        filterByUserPermission = false; // 不再应用下面的通用角色过滤
    } else if (submitterId && submitterId === req.user.id) {
        // 如果查询的是 "我提交的"，直接添加到主查询
        query.submitter = req.user.id;
        filterByUserPermission = false; // 不再应用下面的通用角色过滤
    }
    
    if (filterByUserPermission) {
        if (req.user.role === '班组人员') {
          // 班组成员默认只能看到自己的建议
          query.submitter = req.user.id;
        } else if (req.user.role === '值班主任') {
          // 值班主任默认可以看到自己班组的所有建议
          // (不再默认强制过滤状态，状态由前端参数控制)
          const { TEAMS } = require('../models/User');
          let teamValue = req.user.team;
          let teamKey = Object.keys(TEAMS).find(key => TEAMS[key] === req.user.team);
          if (teamKey) {
            query.$or = [ { team: teamValue }, { team: teamKey } ];
          } else {
            query.team = teamValue;
          }
        }
    }

    // 如果按 responsiblePerson 或 implementationStatus 过滤，需要调整主查询条件
    if (responsiblePersonId && responsiblePersonId === req.user.id) {
      // 直接在主查询中添加对嵌套字段的查询
      query['implementation.responsiblePerson'] = req.user.id;
    }
    if (implementationStatus) {
      const implStatuses = implementationStatus.split(',').map(s => s.trim());
      // 直接在主查询中添加对嵌套字段的查询
      query['implementation.status'] = { $in: implStatuses }; 
    }

    // 构建排序选项
    let sortOptions = {};
    if (sortBy && sortOrder) {
      // 将 Ant Design 的 'ascend'/'descend' 转换为 mongoose 的 1/-1 或 'asc'/'desc'
      const order = (sortOrder === 'ascend' || sortOrder === 'asc') ? 1 : -1;
      // 特别处理嵌套字段
      if (sortBy === 'score') {
        sortOptions['scoring.score'] = order;
      } else {
        sortOptions[sortBy] = order;
      }
    } else {
      // 默认按创建时间降序排序
      sortOptions = { createdAt: -1 };
    }

    // 使用Promise.all并行执行count和find查询，提高性能
    const [total, suggestions] = await Promise.all([
      // 查询总数
      Suggestion.countDocuments(query),
      
      // 查询数据，优化populate和投影
      Suggestion.find(query)
        .select('title type submitter team reviewStatus implementation.status implementation.responsiblePerson scoring.score createdAt updatedAt')
        .populate('submitter', 'name team')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    // 处理数据
    let processedSuggestions = suggestions.map(suggestion => {
      return {
        ...suggestion,
        submitter: suggestion.submitter || { name: '未知用户', _id: null }
      };
    });

    // 构建结果对象
    const result = {
      suggestions: processedSuggestions,
      pagination: {
        current: page,
        pageSize: limit,
        total
      }
    };
    
    // 缓存结果 (30秒 - 因为列表数据变化较频繁)
    cache.set(cacheKey, result, 30 * 1000);
    
    res.json(result);
  } catch (error) {
    console.error('获取建议列表失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

exports.getSuggestionById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 检查缓存
    const cacheKey = `suggestion:${id}`;
    const cachedSuggestion = cache.get(cacheKey);
    if (cachedSuggestion) {
      return res.json(cachedSuggestion);
    }
    
    // 使用lean查询提高性能
    const suggestion = await Suggestion.findById(id)
      .lean();
    
    if (!suggestion) {
      return res.status(404).json({ message: '未找到建议' });
    }
    
    // 使用Promise.all并行加载关联数据
    const [
      submitter,
      firstReviewer,
      secondReviewer,
      commentAuthors,
      scorer,
      historyUpdaters
    ] = await Promise.all([
      // 加载提交者信息
      User.findById(suggestion.submitter, 'name username department team').lean(),
      
      // 加载一级审核人信息
      suggestion.firstReview?.reviewer 
        ? User.findById(suggestion.firstReview.reviewer, 'name username role').lean() 
        : null,
        
      // 加载二级审核人信息
      suggestion.secondReview?.reviewer 
        ? User.findById(suggestion.secondReview.reviewer, 'name username role').lean() 
        : null,
        
      // 加载评论作者信息
      suggestion.comments?.length 
        ? User.find(
            { _id: { $in: suggestion.comments.map(c => c.author) } },
            'name username role'
          ).lean() 
        : [],
        
      // 加载评分人信息
      suggestion.scoring?.scorer 
        ? User.findById(suggestion.scoring.scorer, 'name username role').lean() 
        : null,
        
      // 加载实施历史更新人信息
      suggestion.implementation?.history?.length 
        ? User.find(
            { _id: { $in: suggestion.implementation.history.map(h => h.updatedBy).filter(Boolean) } },
            'name username role'
          ).lean() 
        : []
    ]);
    
    // 合并关联数据
    const detailedSuggestion = {
      ...suggestion,
      submitter: submitter || { name: '未知用户', _id: null }
    };
    
    // 填充一级审核人
    if (detailedSuggestion.firstReview && firstReviewer) {
      detailedSuggestion.firstReview.reviewer = firstReviewer;
    }
    
    // 填充二级审核人
    if (detailedSuggestion.secondReview && secondReviewer) {
      detailedSuggestion.secondReview.reviewer = secondReviewer;
    }
    
    // 填充评论作者
    if (detailedSuggestion.comments && commentAuthors.length) {
      detailedSuggestion.comments = detailedSuggestion.comments.map(comment => {
        const author = commentAuthors.find(u => u._id.toString() === comment.author.toString());
        return {
          ...comment,
          author: author || { name: '未知用户' }
        };
      });
    }
    
    // 填充评分人
    if (detailedSuggestion.scoring && scorer) {
      detailedSuggestion.scoring.scorer = scorer;
    }
    
    // 填充实施历史更新人
    if (detailedSuggestion.implementation?.history && historyUpdaters.length) {
      detailedSuggestion.implementation.history = detailedSuggestion.implementation.history.map(record => {
        if (!record.updatedBy) return record;
        
        const updater = historyUpdaters.find(u => u._id.toString() === record.updatedBy.toString());
        return {
          ...record,
          updatedBy: updater || { name: '未知用户' }
        };
      });
    }
    
    // 缓存结果 (3分钟)
    cache.set(cacheKey, detailedSuggestion, CACHE_TTL_MEDIUM);
    
    res.json(detailedSuggestion);
  } catch (error) {
    console.error('获取建议详情失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

exports.updateSuggestionStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, comment } = req.body;
    const suggestion = await Suggestion.findById(req.params.id);

    if (!suggestion) {
      return res.status(404).json({ message: '建议不存在' });
    }

    // 检查权限
    if (req.user.role !== '部门经理') {
      return res.status(403).json({ message: '没有权限更新建议状态' });
    }

    // 更新状态
    suggestion.status = status;
    
    // 添加评论
    if (comment) {
      suggestion.comments.push({
        author: req.user.id,
        content: comment
      });
    }

    await suggestion.save();

    // 返回更新后的建议
    const updatedSuggestion = await Suggestion.findById(req.params.id)
      .populate('submitter', 'name team')
      .populate({
        path: 'comments.author',
        select: 'name',
        model: 'User'
      })
      .populate({
        path: 'firstReview secondReview',
        populate: {
          path: 'reviewer',
          select: 'name',
          model: 'User'
        }
      })
      .lean();

    // 处理null值
    const processedSuggestion = {
      ...updatedSuggestion,
      submitter: updatedSuggestion.submitter || { name: '未知用户', _id: null },
      comments: Array.isArray(updatedSuggestion.comments) ? updatedSuggestion.comments.map(comment => ({
        ...comment,
        author: comment.author || { name: '未知用户' }
      })) : []
    };

    res.json(processedSuggestion);
  } catch (error) {
    console.error('更新建议状态失败:', error);
    res.status(500).json({ message: '更新建议状态失败', error: error.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const suggestion = await Suggestion.findById(req.params.id);

    if (!suggestion) {
      return res.status(404).json({ message: '建议不存在' });
    }

    // 添加评论
    suggestion.comments.push({
      author: req.user.id,
      content: req.body.content
    });

    await suggestion.save();

    // 返回更新后的建议
    const updatedSuggestion = await Suggestion.findById(req.params.id)
      .populate('submitter', 'name team')
      .populate({
        path: 'comments.author',
        select: 'name',
        model: 'User'
      })
      .populate({
        path: 'firstReview secondReview',
        populate: {
          path: 'reviewer',
          select: 'name',
          model: 'User'
        }
      })
      .lean();

    // 处理null值
    const processedSuggestion = {
      ...updatedSuggestion,
      submitter: updatedSuggestion.submitter || { name: '未知用户', _id: null },
      comments: Array.isArray(updatedSuggestion.comments) ? updatedSuggestion.comments.map(comment => ({
        ...comment,
        author: comment.author || { name: '未知用户' }
      })) : []
    };

    res.json(processedSuggestion);
  } catch (error) {
    console.error('添加评论失败:', error);
    res.status(500).json({ message: '添加评论失败', error: error.message });
  }
};

/**
 * 获取所有建议
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getAllSuggestions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // 缓存键
    const cacheKey = `suggestions:list:all:${page}:${limit}`;
    // 尝试从缓存获取
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    // 使用Promise.all并行执行count和find查询，提高性能
    const [total, suggestions] = await Promise.all([
      // 获取总数
      Suggestion.countDocuments(),
      
      // 获取建议列表，使用投影只选择必要字段
      Suggestion.find()
        .select('title type submitter team reviewStatus implementation.status implementation.responsiblePerson implementation.completionRate comments.author comments._id firstReview secondReview createdAt updatedAt')
        .populate('submitter', 'name team')
        .populate({
          path: 'comments.author',
          select: 'name',
          model: 'User'
        })
        .populate({
          path: 'firstReview.reviewer secondReview.reviewer',
          select: 'name',
          model: 'User'
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean() // 使用lean()减少内存使用
    ]);

    // 处理null的submitter字段
    const processedSuggestions = suggestions.map(suggestion => {
      return {
        ...suggestion,
        submitter: suggestion.submitter || { name: '未知用户', _id: null },
        comments: Array.isArray(suggestion.comments) ? suggestion.comments.map(comment => ({
          ...comment,
          author: comment.author || { name: '未知用户' }
        })) : []
      };
    });

    const result = {
      suggestions: processedSuggestions,
      pagination: {
        current: page,
        pageSize: limit,
        total
      }
    };
    
    // 缓存结果 (5分钟)
    cache.set(cacheKey, result, CACHE_TTL_MEDIUM);

    res.json(result);
  } catch (error) {
    console.error('获取所有建议失败:', error);
    res.status(500).json({ message: '获取建议列表失败', error: error.message });
  }
};

/**
 * 获取特定部门的建议
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getSuggestionsByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // 缓存键
    const cacheKey = `suggestions:list:department:${departmentId}:${page}:${limit}`;
    // 尝试从缓存获取
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    // 使用Promise.all并行执行count和find查询，提高性能
    const [total, suggestions] = await Promise.all([
      // 获取总数
      Suggestion.countDocuments({ department: departmentId }),
      
      // 获取建议列表，使用投影只选择必要字段
      Suggestion.find({ department: departmentId })
        .select('title type submitter team reviewStatus implementation.status implementation.responsiblePerson createdAt updatedAt')
        .populate('submitter', 'name team')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean() // 使用lean()减少内存使用
    ]);

    // 处理null的submitter字段
    const processedSuggestions = suggestions.map(suggestion => {
      return {
        ...suggestion,
        submitter: suggestion.submitter || { name: '未知用户', _id: null }
      };
    });

    const result = {
      suggestions: processedSuggestions,
      pagination: {
        current: page,
        pageSize: limit,
        total
      }
    };
    
    // 缓存结果 (2分钟)
    cache.set(cacheKey, result, 2 * 60 * 1000);

    res.json(result);
  } catch (error) {
    console.error('获取部门建议失败:', error);
    res.status(500).json({ message: '获取建议列表失败', error: error.message });
  }
};

/**
 * 获取特定团队的建议
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getSuggestionsByTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 获取总数
    const total = await Suggestion.countDocuments({ team: teamId });
    
    // 获取建议列表
    const suggestions = await Suggestion.find({ team: teamId })
      .populate('submitter', 'name team')
      .populate({
        path: 'comments.author',
        select: 'name',
        model: 'User'
      })
      .populate({
        path: 'firstReview secondReview',
        populate: {
          path: 'reviewer',
          select: 'name',
          model: 'User'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // 处理null的submitter字段
    const processedSuggestions = suggestions.map(suggestion => {
      return {
        ...suggestion,
        submitter: suggestion.submitter || { name: '未知用户', _id: null },
        comments: Array.isArray(suggestion.comments) ? suggestion.comments.map(comment => ({
          ...comment,
          author: comment.author || { name: '未知用户' }
        })) : []
      };
    });

    res.json({
      suggestions: processedSuggestions,
      pagination: {
        current: page,
        pageSize: limit,
        total
      }
    });
  } catch (error) {
    console.error('获取团队建议失败:', error);
    res.status(500).json({ message: '获取建议列表失败', error: error.message });
  }
};

/**
 * 获取用户提交的建议
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getUserSuggestions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const userId = req.user.id;
    
    // 缓存键
    const cacheKey = `suggestions:list:user:${userId}:${page}:${limit}`;
    // 尝试从缓存获取
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      return res.json(cachedResult);
    }

    // 使用Promise.all并行执行count和find查询，提高性能
    const [total, suggestions] = await Promise.all([
      // 获取总数
      Suggestion.countDocuments({ submitter: userId }),
      
      // 获取建议列表，使用投影只选择必要字段
      Suggestion.find({ submitter: userId })
        .select('title type team reviewStatus implementation.status implementation.completionRate createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean() // 使用lean()减少内存使用
    ]);

    const result = {
      suggestions: suggestions,
      pagination: {
        current: page,
        pageSize: limit,
        total
      }
    };
    
    // 缓存结果 (2分钟)
    cache.set(cacheKey, result, 2 * 60 * 1000);

    res.json(result);
  } catch (error) {
    console.error('获取用户建议失败:', error);
    res.status(500).json({ message: '获取建议列表失败', error: error.message });
  }
};

/**
 * 获取待审核的建议
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getPendingReviewSuggestions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const query = {};
    const userRole = req.user.role;
    const userTeam = req.user.team;

    if (userRole === '值班主任') {
      // 值班主任只能看到自己团队待一级审核的建议
      query.team = userTeam;
      query.status = 'PENDING_FIRST_REVIEW';
    } else if (userRole === '安全科管理人员') {
      // 安全科管理人员只能看到安全类的待二级审核的建议
      query.type = 'SAFETY';
      query.status = 'PENDING_SECOND_REVIEW';
    } else if (userRole === '运行科管理人员') {
      // 运行科管理人员只能看到非安全类的待二级审核的建议
      query.type = { $ne: 'SAFETY' };
      query.status = 'PENDING_SECOND_REVIEW';
    } else if (userRole === '部门经理') {
      // 部门经理可以看到所有待审核的建议
      query.status = { $in: ['PENDING_FIRST_REVIEW', 'PENDING_SECOND_REVIEW'] };
    }

    // 获取总数
    const total = await Suggestion.countDocuments(query);
    
    // 获取建议列表
    const suggestions = await Suggestion.find(query)
      .populate('submitter', 'name team')
      .populate({
        path: 'comments.author',
        select: 'name',
        model: 'User'
      })
      .populate({
        path: 'firstReview secondReview',
        populate: {
          path: 'reviewer',
          select: 'name',
          model: 'User'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // 处理null的submitter字段
    const processedSuggestions = suggestions.map(suggestion => {
      return {
        ...suggestion,
        submitter: suggestion.submitter || { name: '未知用户', _id: null },
        comments: Array.isArray(suggestion.comments) ? suggestion.comments.map(comment => ({
          ...comment,
          author: comment.author || { name: '未知用户' }
        })) : []
      };
    });

    res.json({
      suggestions: processedSuggestions,
      pagination: {
        current: page,
        pageSize: limit,
        total
      }
    });
  } catch (error) {
    console.error('获取待审核建议失败:', error);
    res.status(500).json({ message: '获取建议列表失败', error: error.message });
  }
};

// 创建新建议
exports.createSuggestion = async (req, res) => {
  try {
    // 检查用户权限 - 运行科和安全科管理人员不允许提交建议
    if (req.user && (req.user.role === '运行科管理人员' || req.user.role === '安全科管理人员')) {
      return res.status(403).json({
        success: false,
        message: '运行科和安全科管理人员暂时无法提交建议'
      });
    }
    
    const { title, type, content, expectedBenefit } = req.body;
    
    // 验证必填字段
    if (!title || !type || !content) {
      return res.status(400).json({
        success: false,
        message: '标题、类型和内容为必填项'
      });
    }
    
    // 创建建议对象
    const suggestion = new Suggestion({
      title,
      type,
      content,
      expectedBenefit,
      submitter: req.user._id,
      team: req.user.team
    });
    
    // 处理附件上传
    if (req.files && req.files.length > 0) {
      suggestion.attachments = req.files.map(file => ({
        filename: file.filename,
        path: file.path,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      }));
    }
    
    // 保存建议
    const newSuggestion = await suggestion.save();
    
    // 清除列表缓存，因为新建了一个建议
    clearSuggestionCaches();
    
    // 返回成功响应
    res.status(201).json({
      success: true,
      message: '建议提交成功',
      suggestion: newSuggestion
    });
  } catch (error) {
    console.error('创建建议失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，建议提交失败',
      error: error.message
    });
  }
};

// 更新建议
exports.updateSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, implementationSuggestion, expectedBenefits } = req.body;
    const userId = req.user.id;
    
    // 查找待更新的建议
    const suggestion = await Suggestion.findById(id);
    
    if (!suggestion) {
      return res.status(404).json({ message: '未找到建议' });
    }
    
    // 验证用户是否是作者
    if (suggestion.author.toString() !== userId) {
      return res.status(403).json({ message: '只有建议的作者才能更新建议' });
    }
    
    // 验证建议是否可以更新（只有在等待一级审核的状态才能更新）
    if (suggestion.status !== 'PENDING_FIRST_REVIEW') {
      return res.status(400).json({ message: '只有等待一级审核的建议才能更新' });
    }
    
    // 处理新上传的附件
    const newAttachments = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size
    })) : [];
    
    // 更新建议
    suggestion.title = title;
    suggestion.description = description;
    suggestion.category = category;
    suggestion.implementationSuggestion = implementationSuggestion;
    suggestion.expectedBenefits = expectedBenefits;
    
    // 如果有新附件，添加到现有附件列表
    if (newAttachments.length > 0) {
      suggestion.attachments = [...suggestion.attachments, ...newAttachments];
    }
    
    // 添加更新记录到实施记录中
    suggestion.implementationRecords.push({
      status: 'PENDING_FIRST_REVIEW',
      comments: '建议已更新',
      updatedBy: userId
    });
    
    await suggestion.save();
    
    // 清除缓存
    clearSuggestionCaches(id);
    
    // 返回更新后的建议
    const updatedSuggestion = await Suggestion.findById(id)
      .populate('author', 'name username department team');
    
    res.json(updatedSuggestion);
  } catch (error) {
    console.error('更新建议失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 删除建议
exports.deleteSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // 获取用户信息
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 查找待删除的建议
    const suggestion = await Suggestion.findById(id);
    
    if (!suggestion) {
      return res.status(404).json({ message: '建议不存在' });
    }
    
    // 检查删除权限
    // 只有管理员、部门经理、本人可以删除，但已经开始实施的建议不能删除
    const isAdmin = user.role === '系统管理员' || user.role === '部门经理';
    const isAuthor = suggestion.submitter.toString() === userId;
    
    if (!isAdmin && !isAuthor) {
      return res.status(403).json({ message: '您没有权限删除此建议' });
    }
    
    // 检查是否已开始实施
    if (suggestion.implementationStatus !== 'NOT_STARTED' && !isAdmin) {
      return res.status(403).json({ message: '已开始实施的建议不能删除' });
    }
    
    // 删除关联的文件
    if (suggestion.attachments && suggestion.attachments.length > 0) {
      // 删除附件文件
      for (const attachment of suggestion.attachments) {
        try {
          const filePath = path.join(__dirname, '..', attachment.path);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (error) {
          console.error(`删除附件失败: ${error.message}`);
        }
      }
    }
    
    // 删除建议
    await Suggestion.findByIdAndDelete(id);
    
    // 清除缓存
    clearSuggestionCaches(id);
    
    // 返回成功响应
    res.json({ message: '建议已成功删除' });
  } catch (error) {
    console.error('删除建议失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 撤回建议
exports.withdrawSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // 查找待撤回的建议
    const suggestion = await Suggestion.findById(id);
    
    if (!suggestion) {
      return res.status(404).json({ message: '未找到建议' });
    }
    
    // 验证用户是否是作者
    if (suggestion.author.toString() !== userId) {
      return res.status(403).json({ message: '只有建议的作者才能撤回建议' });
    }
    
    // 验证建议是否可以撤回（只有在等待一级审核或被拒绝的状态才能撤回）
    if (suggestion.status !== 'PENDING_FIRST_REVIEW' && suggestion.status !== 'REJECTED') {
      return res.status(400).json({ message: '只有等待一级审核或被拒绝的建议才能撤回' });
    }
    
    // 更新建议状态
    suggestion.status = 'WITHDRAWN';
    
    // 添加实施记录
    suggestion.implementationRecords.push({
      status: 'WITHDRAWN',
      comments: '建议已被作者撤回',
      updatedBy: userId
    });
    
    await suggestion.save();
    
    res.json({ message: '建议已成功撤回', suggestion });
  } catch (error) {
    console.error('撤回建议失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取建议统计数据
exports.getSuggestionStats = async (req, res) => {
  try {
    const totalCount = await Suggestion.countDocuments();
    
    // 按状态统计
    const statusCounts = await Suggestion.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 按类别统计
    const categoryCounts = await Suggestion.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 按部门统计
    const departmentStats = await Suggestion.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'authorInfo'
        }
      },
      {
        $unwind: '$authorInfo'
      },
      {
        $group: {
          _id: '$authorInfo.department',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 格式化状态统计结果
    const formattedStatusCounts = statusCounts.map(item => ({
      status: SUGGESTION_STATUS[item._id],
      statusKey: item._id,
      count: item.count
    }));
    
    res.json({
      totalCount,
      statusCounts: formattedStatusCounts,
      categoryCounts,
      departmentStats
    });
  } catch (error) {
    console.error('获取建议统计数据失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 获取实施完成率
exports.getImplementationRate = async (req, res) => {
  try {
    // 获取总审核通过的建议数
    const approvedTotal = await Suggestion.countDocuments({
      status: { $in: ['NOT_IMPLEMENTED', 'IMPLEMENTING', 'COMPLETED'] }
    });
    
    // 获取已完成实施的建议数
    const completedCount = await Suggestion.countDocuments({
      status: 'COMPLETED'
    });
    
    // 计算实施完成率
    const implementationRate = approvedTotal > 0 ? (completedCount / approvedTotal * 100).toFixed(2) : 0;
    
    // 获取实施时间统计
    const implementationTimes = await Suggestion.aggregate([
      {
        $match: {
          status: 'COMPLETED',
          implementationDate: { $exists: true }
        }
      },
      {
        $project: {
          implementationDuration: {
            $divide: [
              { $subtract: ['$implementationDate', '$createdAt'] },
              1000 * 60 * 60 * 24 // 转换为天数
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          averageDuration: { $avg: '$implementationDuration' },
          minDuration: { $min: '$implementationDuration' },
          maxDuration: { $max: '$implementationDuration' }
        }
      }
    ]);
    
    // 按月统计实施完成情况
    const monthlyStats = await Suggestion.aggregate([
      {
        $match: {
          status: 'COMPLETED',
          implementationDate: { $exists: true }
        }
      },
      {
        $project: {
          month: { $month: '$implementationDate' },
          year: { $year: '$implementationDate' }
        }
      },
      {
        $group: {
          _id: {
            year: '$year',
            month: '$month'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1
        }
      }
    ]);
    
    res.json({
      approvedTotal,
      completedCount,
      implementationRate,
      averageImplementationTime: implementationTimes.length > 0 ? implementationTimes[0].averageDuration.toFixed(2) : 0,
      minImplementationTime: implementationTimes.length > 0 ? implementationTimes[0].minDuration.toFixed(2) : 0,
      maxImplementationTime: implementationTimes.length > 0 ? implementationTimes[0].maxDuration.toFixed(2) : 0,
      monthlyStats
    });
  } catch (error) {
    console.error('获取实施完成率失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

/**
 * 提交审核
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.submitReview = async (req, res) => {
  try {
    const { suggestionId, reviewType, result, comment } = req.body;
    
    console.log('接收到审核请求:', {
      suggestionId,
      reviewType,
      result,
      comment,
      userId: req.user.id
    });
    
    if (!suggestionId || !reviewType || !result || !comment) {
      return res.status(400).json({ message: '缺少必要参数' });
    }
    
    // 验证reviewType (first/second)
    if (reviewType !== 'first' && reviewType !== 'second') {
      return res.status(400).json({ message: '无效的审核类型' });
    }
    
    // 验证result (approve/reject)
    if (result !== 'approve' && result !== 'reject') {
      return res.status(400).json({ message: '无效的审核结果' });
    }
    
    // 获取建议
    const suggestion = await Suggestion.findById(suggestionId);
    if (!suggestion) {
      return res.status(404).json({ message: '建议不存在' });
    }
    
    console.log('找到建议:', {
      id: suggestion._id,
      status: suggestion.status,
      type: suggestion.type,
      team: suggestion.team
    });
    
    // 更灵活地验证建议状态
    const currentDbStatus = suggestion.reviewStatus || suggestion.status; // 获取当前状态（优先reviewStatus）
    const isPendingFirstReview = [
      'PENDING_FIRST_REVIEW',               // 检查 Key
      REVIEW_STATUS.PENDING_FIRST_REVIEW, // 检查 Value ('等待一级审核')
      // 如果还有其他可能的旧值，也加在这里
    ].includes(currentDbStatus);
    
    const isPendingSecondReview = [
      'PENDING_SECOND_REVIEW',              // 检查 Key
      REVIEW_STATUS.PENDING_SECOND_REVIEW, // 检查 Value ('等待二级审核')
      // 如果还有其他可能的旧值，也加在这里
    ].includes(currentDbStatus);
    
    console.log('状态验证结果:', {
      statusFromDb: suggestion.status, // 保留原始日志
      reviewStatusFromDb: suggestion.reviewStatus, // 增加 reviewStatus 日志
      currentDbStatus: currentDbStatus, // 增加合并后的状态日志
      isPendingFirstReview,
      isPendingSecondReview,
      SUGGESTION_STATUS_VALUE: REVIEW_STATUS.PENDING_FIRST_REVIEW
    });
    
    // 验证建议状态
    if (reviewType === 'first' && !isPendingFirstReview) {
      return res.status(400).json({ 
        message: '建议不处于待一级审核状态',
        currentStatus: currentDbStatus, // 使用合并后的状态
        expectedStatus: REVIEW_STATUS.PENDING_FIRST_REVIEW
      });
    }
    
    if (reviewType === 'second' && !isPendingSecondReview) {
      return res.status(400).json({ 
        message: '建议不处于待二级审核状态',
        currentStatus: currentDbStatus, // 使用合并后的状态
        expectedStatus: REVIEW_STATUS.PENDING_SECOND_REVIEW
      });
    }
    
    // 获取审核人
    const reviewer = await User.findById(req.user.id);
    if (!reviewer) {
      return res.status(404).json({ message: '审核人不存在' });
    }
    
    console.log('审核人信息:', {
      id: reviewer._id,
      role: reviewer.role,
      team: reviewer.team
    });
    
    // 验证审核权限
    const canReview = await validateReviewPermission(reviewer, suggestion, reviewType);
    if (!canReview) {
      return res.status(403).json({ message: '无审核权限' });
    }
    
    // 创建审核记录
    const review = {
      reviewer: req.user.id,
      result: result === 'approve' ? 'APPROVED' : 'REJECTED',
      comments: comment,
      reviewedAt: new Date()
    };
    
    // 更新建议
    if (reviewType === 'first') {
      suggestion.firstReview = review;
      if (result === 'approve') {
        suggestion.reviewStatus = 'PENDING_SECOND_REVIEW';
        suggestion.status = 'PENDING_SECOND_REVIEW'; // 同时更新status字段
      } else {
        suggestion.reviewStatus = 'REJECTED';
        suggestion.status = 'REJECTED'; // 同时更新status字段
      }
    } else if (reviewType === 'second') {
      suggestion.secondReview = review;
      if (result === 'approve') {
        suggestion.reviewStatus = 'APPROVED';
        suggestion.status = 'NOT_IMPLEMENTED'; // 同时更新status字段
        // 初始化实施状态
        suggestion.implementationStatus = 'NOT_STARTED';
        suggestion.implementation = {
          status: 'NOT_STARTED',
          history: [{
            status: 'NOT_STARTED',
            updatedBy: req.user.id,
            date: new Date(),
            notes: '建议已通过二级审核，等待实施'
          }]
        };
      } else {
        suggestion.reviewStatus = 'REJECTED';
        suggestion.status = 'REJECTED'; // 同时更新status字段
      }
    }
    
    console.log('即将保存的建议:', {
      id: suggestion._id,
      newStatus: suggestion.status,
      newReviewStatus: suggestion.reviewStatus
    });
    
    await suggestion.save();
    
    // 发送电子邮件通知二审人员
    notifyReviewers(suggestion, 'second');
    
    // 查询完整的建议信息
    const updatedSuggestion = await Suggestion.findById(suggestionId)
      .populate('submitter', 'name team')
      .populate({
        path: 'firstReview.reviewer',
        select: 'name role',
        model: 'User'
      })
      .populate({
        path: 'secondReview.reviewer',
        select: 'name role',
        model: 'User'
      });
    
    console.log('审核成功完成');
    
    res.json({
      message: '审核提交成功',
      suggestion: updatedSuggestion
    });
  } catch (error) {
    console.error('提交审核失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

// 验证审核权限
const validateReviewPermission = async (reviewer, suggestion, reviewType) => {
  const role = reviewer.role;
  const team = reviewer.team;

  // 部门经理可以进行所有审核
  if (role === '部门经理') {
    return true;
  }

  // 一级审核权限验证
  if (reviewType === 'first') {
    // 值班主任只能审核自己班组的建议
    if (role === '值班主任' && team === suggestion.team) {
      return true;
    }
  }

  // 二级审核权限验证
  if (reviewType === 'second') {
    // 安全科管理人员只能审核安全类建议
    if (role === '安全科管理人员' && suggestion.type === 'SAFETY') {
      return true;
    }
    // 运行科管理人员只能审核非安全类建议
    if (role === '运行科管理人员' && suggestion.type !== 'SAFETY') {
      return true;
    }
  }

  return false;
};

/**
 * 更新建议实施状态
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.updateImplementation = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, responsiblePerson, startDate, plannedCompletionDate, actualCompletionDate, notes, attachments, completionRate } = req.body;
    const userId = req.user.id;

    // 查找建议
    const suggestion = await Suggestion.findById(id);
    if (!suggestion) {
      return res.status(404).json({ success: false, message: '未找到该建议' });
    }

    // 检查审核状态是否为 '已批准'
    if (suggestion.reviewStatus !== 'APPROVED') {
         return res.status(400).json({ success: false, message: '建议尚未通过审核，无法更新实施状态' });
    }

    // 直接验证传入的 status 是否是有效的英文代码
    const validStatusCodes = Object.keys(IMPLEMENTATION_STATUS); // 使用从常量文件导入的 IMPLEMENTATION_STATUS
    if (!status || !validStatusCodes.includes(status)) {
        // 如果 status 无效或未提供
        return res.status(400).json({
            success: false,
            message: `无效的实施状态代码: ${status}`
        });
    }
    
    // 查找或创建实施信息
    let implementation = suggestion.implementation;
    if (!implementation) {
      suggestion.implementation = {};
      implementation = suggestion.implementation;
      implementation.status = 'NOT_STARTED';
      implementation.history = [{
          status: 'NOT_STARTED',
          updatedBy: userId,
          date: new Date(),
          notes: '初始化实施记录'
      }];
    }
    if (!implementation.history) {
        implementation.history = [];
    }

    const oldStatus = implementation.status || 'NOT_STARTED';
    let statusChanged = false;

    // 更新实施信息 (直接使用验证后的 status)
    if (status !== oldStatus) {
      implementation.status = status;
      suggestion.implementationStatus = status; // 同步顶层状态
      statusChanged = true;
    }
    if (responsiblePerson) implementation.responsiblePerson = responsiblePerson;
    if (startDate) implementation.startDate = startDate;
    if (plannedCompletionDate) implementation.plannedEndDate = plannedCompletionDate; 
    if (actualCompletionDate) implementation.actualEndDate = actualCompletionDate;
    if (typeof completionRate === 'number') implementation.completionRate = completionRate;
    
    // 添加历史记录
    if (statusChanged || notes) {
        const historyEntry = {
            status: implementation.status,
            updatedBy: userId,
            date: new Date(),
            // 使用导入的 IMPLEMENTATION_STATUS 获取中文名
            notes: notes || (statusChanged ? `状态更新为: ${IMPLEMENTATION_STATUS[implementation.status] || implementation.status}` : '更新实施信息')
        };
        implementation.history.push(historyEntry);
    }
    
    await suggestion.save();

    res.json({
      success: true,
      message: '实施信息更新成功',
      suggestion: suggestion
    });

  } catch (error) {
    console.error('更新实施状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新实施状态失败',
      error: error.message
    });
  }
};

/**
 * 获取建议实施统计数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.getImplementationStats = async (req, res) => {
  try {
    // 获取已批准建议总数
    const approvedCount = await Suggestion.countDocuments({
      status: { $in: ['NOT_IMPLEMENTED', 'IMPLEMENTING', 'COMPLETED'] }
    });
    
    // 获取各实施状态的数量
    const implementingCount = await Suggestion.countDocuments({ status: 'IMPLEMENTING' });
    const completedCount = await Suggestion.countDocuments({ status: 'COMPLETED' });
    const notImplementedCount = await Suggestion.countDocuments({ status: 'NOT_IMPLEMENTED' });
    
    // 计算实施率
    const implementationRate = approvedCount > 0 
      ? (completedCount / approvedCount * 100).toFixed(2)
      : 0;
    
    // 按月统计实施完成数量
    const monthlyStats = await Suggestion.aggregate([
      {
        $match: { status: 'COMPLETED', implementationDate: { $exists: true } }
      },
      {
        $group: {
          _id: {
            year: { $year: '$implementationDate' },
            month: { $month: '$implementationDate' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
    
    // 按类型统计实施完成情况
    const typeStats = await Suggestion.aggregate([
      {
        $match: { status: 'COMPLETED' }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 按班组统计实施完成情况
    const teamStats = await Suggestion.aggregate([
      {
        $match: { status: 'COMPLETED' }
      },
      {
        $group: {
          _id: '$team',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      approvedCount,
      implementingCount,
      completedCount,
      notImplementedCount,
      implementationRate,
      monthlyStats,
      typeStats,
      teamStats
    });
  } catch (error) {
    console.error('获取实施统计数据失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

/**
 * 一级审核（值班主任）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.firstReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { approved, comments } = req.body;
    const suggestion = await Suggestion.findById(req.params.id);

    if (!suggestion) {
      return res.status(404).json({ message: '建议不存在' });
    }

    // 检查建议是否处于待一级审核状态
    if (suggestion.status !== 'PENDING_FIRST_REVIEW') {
      return res.status(400).json({ message: '建议不处于待一级审核状态' });
    }

    // 检查权限（值班主任只能审核自己班组的建议）
    if (req.user.role === '值班主任' && req.user.team !== suggestion.team) {
      return res.status(403).json({ message: '只能审核自己班组的建议' });
    }

    // 创建审核记录
    const review = {
      reviewer: req.user.id,
      result: approved === 'approve' ? 'APPROVED' : 'REJECTED',
      comments: comments,
      reviewedAt: new Date()
    };

    // 更新建议
    suggestion.firstReview = review;
    
    if (approved === 'approve') {
      suggestion.status = 'PENDING_SECOND_REVIEW';
      suggestion.reviewStatus = 'PENDING_SECOND_REVIEW'; // 同时更新reviewStatus字段
    } else {
      suggestion.status = 'REJECTED';
      suggestion.reviewStatus = 'REJECTED'; // 同时更新reviewStatus字段
    }

    await suggestion.save();

    // 获取更新后的建议（包含关联信息）
    const updatedSuggestion = await Suggestion.findById(req.params.id)
      .populate('submitter', 'name team')
      .populate({
        path: 'firstReview.reviewer',
        select: 'name role',
        model: 'User'
      });

    res.json({
      message: approved === 'approve' ? '建议已通过一级审核' : '建议已在一级审核中被拒绝',
      suggestion: updatedSuggestion
    });
  } catch (error) {
    console.error('一级审核失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

/**
 * 二级审核（安全科/运行科管理人员）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.secondReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { approved, comments } = req.body;
    const suggestion = await Suggestion.findById(req.params.id);

    if (!suggestion) {
      return res.status(404).json({ message: '建议不存在' });
    }

    // 检查建议是否处于待二级审核状态
    if (suggestion.status !== 'PENDING_SECOND_REVIEW') {
      return res.status(400).json({ message: '建议不处于待二级审核状态' });
    }

    // 检查权限
    const userRole = req.user.role;
    if (userRole === '安全科管理人员' && suggestion.type !== 'SAFETY') {
      return res.status(403).json({ message: '安全科管理人员只能审核安全类建议' });
    }
    if (userRole === '运行科管理人员' && suggestion.type === 'SAFETY') {
      return res.status(403).json({ message: '运行科管理人员不能审核安全类建议' });
    }

    // 创建审核记录
    const review = {
      reviewer: req.user.id,
      result: approved === 'approve' ? 'APPROVED' : 'REJECTED',
      comments: comments,
      reviewedAt: new Date()
    };

    // 更新建议
    suggestion.secondReview = review;
    
    if (approved === 'approve') {
      suggestion.status = 'NOT_IMPLEMENTED'; // 或者之前使用的 'APPROVED'
      suggestion.reviewStatus = 'APPROVED'; // 同时更新reviewStatus字段
      
      // 初始化实施状态
      suggestion.implementationStatus = 'NOT_STARTED';
      suggestion.implementation = {
        status: 'NOT_STARTED',
        history: [{
          status: 'NOT_STARTED',
          updatedBy: req.user.id,
          date: new Date(),
          notes: '建议已通过二级审核，等待实施'
        }]
      };
    } else {
      suggestion.status = 'REJECTED';
      suggestion.reviewStatus = 'REJECTED'; // 同时更新reviewStatus字段
    }

    await suggestion.save();

    // 获取更新后的建议（包含关联信息）
    const updatedSuggestion = await Suggestion.findById(req.params.id)
      .populate('submitter', 'name team')
      .populate({
        path: 'firstReview.reviewer',
        select: 'name role',
        model: 'User'
      })
      .populate({
        path: 'secondReview.reviewer',
        select: 'name role',
        model: 'User'
      });

    res.json({
      message: approved === 'approve' ? '建议已通过二级审核' : '建议已在二级审核中被拒绝',
      suggestion: updatedSuggestion
    });
  } catch (error) {
    console.error('二级审核失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
};

/**
 * 为建议打分
 * 部门经理可以评分所有建议
 * 安全科管理人员只能评分安全类建议
 * 运行科管理人员只能评分非安全类建议
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
exports.scoreSuggestion = async (req, res) => {
  try {
    const { id } = req.params;
    const { score, comments } = req.body;
    const userId = req.user.id;
    
    // 验证分数范围
    if (score < 0 || score > 10) {
      return res.status(400).json({ message: '分数必须在0到10之间' });
    }
    
    // 获取用户信息，确认评分权限
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 检查评分权限 - 简化为只有部门经理才能评分
    const canScore = ['部门经理', '系统管理员'].includes(user.role);
    if (!canScore) {
      return res.status(403).json({ message: '您没有权限对建议评分' });
    }
    
    // 获取建议
    const suggestion = await Suggestion.findById(id);
    if (!suggestion) {
      return res.status(404).json({ message: '建议不存在' });
    }
    
    // 只有已完成的建议才能评分
    if (suggestion.implementationStatus !== 'COMPLETED' && 
        suggestion.implementationStatus !== 'EVALUATED') {
      return res.status(400).json({ 
        message: '只有已完成的建议才能评分',
        currentStatus: suggestion.implementationStatus
      });
    }
    
    // 准备评分数据
    const scoringData = {
      score,
      scorer: userId,
      scorerRole: user.role,
      scoredAt: new Date()
    };
    
    // 记录历史评分
    const historyEntry = { ...scoringData };
    
    // 更新或创建评分对象
    if (!suggestion.scoring) {
      suggestion.scoring = scoringData;
      suggestion.scoring.history = [historyEntry];
    } else {
      // 更新现有评分
      suggestion.scoring.score = score;
      suggestion.scoring.scorer = userId;
      suggestion.scoring.scorerRole = user.role;
      suggestion.scoring.scoredAt = new Date();
      
      // 添加到历史记录
      if (!suggestion.scoring.history) {
        suggestion.scoring.history = [];
      }
      suggestion.scoring.history.push(historyEntry);
    }
    
    // 更新实施状态为已评估
    if (suggestion.implementationStatus !== 'EVALUATED') {
      suggestion.implementationStatus = 'EVALUATED';
      if (suggestion.implementation) {
        suggestion.implementation.status = 'EVALUATED';
        
        // 添加状态变更记录
        if (!suggestion.implementation.history) {
          suggestion.implementation.history = [];
        }
        
        suggestion.implementation.history.push({
          status: 'EVALUATED',
          updatedBy: userId,
          date: new Date(),
          notes: `评分: ${score}/10`
        });
      }
    }
    
    // 保存建议
    await suggestion.save();
    
    // 清除缓存
    clearSuggestionCaches(id);
    
    res.json({ 
      message: '建议评分成功',
      score: suggestion.scoring.score
    });
  } catch (error) {
    console.error('建议评分失败:', error);
    res.status(500).json({ message: '服务器错误', error: error.message });
  }
}; 