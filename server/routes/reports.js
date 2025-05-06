const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const { Suggestion, SUGGESTION_TYPES, SUGGESTION_STATUS } = require('../models/Suggestion');
const { User, ROLES, TEAMS, DEPARTMENTS } = require('../models/User');

// 检查管理员或经理权限的中间件
const checkAdminOrManagerRole = (req, res, next) => {
  if (req.user.role !== ROLES.SAFETY_ADMIN && 
      req.user.role !== ROLES.OPS_ADMIN && 
      req.user.role !== ROLES.DEPARTMENT_MANAGER) {
    return res.status(403).json({ msg: '没有权限，需要管理人员或部门经理权限' });
  }
  next();
};

// @route   GET api/reports/summary
// @desc    获取建议总体统计数据
// @access  Private (管理人员和部门经理)
router.get('/summary', [auth, checkAdminOrManagerRole], async (req, res) => {
  try {
    // 获取时间范围参数
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    
    if (startDate) {
      dateFilter.createdAt = { $gte: new Date(startDate) };
    }
    
    if (endDate) {
      if (dateFilter.createdAt) {
        dateFilter.createdAt.$lte = new Date(endDate);
      } else {
        dateFilter.createdAt = { $lte: new Date(endDate) };
      }
    }

    // 按用户角色过滤权限
    let typeFilter = {};
    if (req.user.role === ROLES.SAFETY_ADMIN) {
      typeFilter = { type: SUGGESTION_TYPES.SAFETY };
    } else if (req.user.role === ROLES.OPS_ADMIN) {
      typeFilter = { type: { $ne: SUGGESTION_TYPES.SAFETY } };
    }

    // 合并过滤条件
    const filter = { ...dateFilter, ...typeFilter };

    // 获取总建议数
    const totalCount = await Suggestion.countDocuments(filter);

    // 按状态统计
    const statusCounts = await Suggestion.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 按类型统计
    const typeCounts = await Suggestion.aggregate([
      { $match: filter },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    // 按班组统计
    const teamCounts = await Suggestion.aggregate([
      { $match: filter },
      { $group: { _id: '$team', count: { $sum: 1 } } }
    ]);

    // 处理结果
    const formatStatusCounts = {};
    statusCounts.forEach(item => {
      formatStatusCounts[item._id] = item.count;
    });

    const formatTypeCounts = {};
    typeCounts.forEach(item => {
      formatTypeCounts[item._id] = item.count;
    });

    const formatTeamCounts = {};
    teamCounts.forEach(item => {
      formatTeamCounts[item._id] = item.count;
    });

    res.json({
      totalCount,
      statusCounts: formatStatusCounts,
      typeCounts: formatTypeCounts,
      teamCounts: formatTeamCounts
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET api/reports/team-comparison
// @desc    获取班组建议对比数据
// @access  Private (管理人员和部门经理)
router.get('/team-comparison', [auth, checkAdminOrManagerRole], async (req, res) => {
  try {
    // 获取时间范围参数
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    
    if (startDate) {
      dateFilter.createdAt = { $gte: new Date(startDate) };
    }
    
    if (endDate) {
      if (dateFilter.createdAt) {
        dateFilter.createdAt.$lte = new Date(endDate);
      } else {
        dateFilter.createdAt = { $lte: new Date(endDate) };
      }
    }

    // 按用户角色过滤权限
    let typeFilter = {};
    if (req.user.role === ROLES.SAFETY_ADMIN) {
      typeFilter = { type: SUGGESTION_TYPES.SAFETY };
    } else if (req.user.role === ROLES.OPS_ADMIN) {
      typeFilter = { type: { $ne: SUGGESTION_TYPES.SAFETY } };
    }

    // 合并过滤条件
    const filter = { ...dateFilter, ...typeFilter };

    // 按班组和类型统计
    const teamTypeData = await Suggestion.aggregate([
      { $match: filter },
      { $group: { 
        _id: { team: '$team', type: '$type' }, 
        count: { $sum: 1 } 
      }},
      { $sort: { '_id.team': 1, '_id.type': 1 } }
    ]);

    // 按班组和状态统计
    const teamStatusData = await Suggestion.aggregate([
      { $match: filter },
      { $group: { 
        _id: { team: '$team', status: '$status' }, 
        count: { $sum: 1 } 
      }},
      { $sort: { '_id.team': 1, '_id.status': 1 } }
    ]);

    // 格式化结果用于图表显示
    const formattedTeamTypeData = [];
    teamTypeData.forEach(item => {
      formattedTeamTypeData.push({
        team: item._id.team,
        type: item._id.type,
        count: item.count
      });
    });

    const formattedTeamStatusData = [];
    teamStatusData.forEach(item => {
      formattedTeamStatusData.push({
        team: item._id.team,
        status: item._id.status,
        count: item.count
      });
    });

    res.json({
      teamTypeData: formattedTeamTypeData,
      teamStatusData: formattedTeamStatusData
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET api/reports/monthly-trend
// @desc    获取月度趋势数据
// @access  Private (管理人员和部门经理)
router.get('/monthly-trend', [auth, checkAdminOrManagerRole], async (req, res) => {
  try {
    // 获取年份参数，默认为当前年份
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();
    
    // 设置年份范围
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);
    
    // 按用户角色过滤权限
    let typeFilter = {};
    if (req.user.role === ROLES.SAFETY_ADMIN) {
      typeFilter = { type: SUGGESTION_TYPES.SAFETY };
    } else if (req.user.role === ROLES.OPS_ADMIN) {
      typeFilter = { type: { $ne: SUGGESTION_TYPES.SAFETY } };
    }

    // 合并过滤条件
    const filter = { 
      createdAt: { $gte: startOfYear, $lte: endOfYear },
      ...typeFilter
    };

    // 按月份统计
    const monthlyData = await Suggestion.aggregate([
      { $match: filter },
      { 
        $project: {
          month: { $month: '$createdAt' },
          type: 1
        }
      },
      { 
        $group: {
          _id: { month: '$month', type: '$type' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.month': 1, '_id.type': 1 } }
    ]);

    // 按月份和班组统计
    const monthlyTeamData = await Suggestion.aggregate([
      { $match: filter },
      { 
        $project: {
          month: { $month: '$createdAt' },
          team: 1
        }
      },
      { 
        $group: {
          _id: { month: '$month', team: '$team' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.month': 1, '_id.team': 1 } }
    ]);

    // 格式化结果，填充所有月份
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const formattedMonthlyData = [];
    const formattedMonthlyTeamData = [];

    // 为每个类型准备数据
    Object.values(SUGGESTION_TYPES).forEach(type => {
      const typeData = {
        type,
        data: []
      };

      months.forEach(month => {
        const found = monthlyData.find(item => 
          item._id.month === month && item._id.type === type
        );
        
        typeData.data.push({
          month,
          count: found ? found.count : 0
        });
      });

      formattedMonthlyData.push(typeData);
    });

    // 为每个班组准备数据
    Object.values(TEAMS).forEach(team => {
      // 跳过"无班组"
      if (team === TEAMS.NONE) return;
      
      const teamData = {
        team,
        data: []
      };

      months.forEach(month => {
        const found = monthlyTeamData.find(item => 
          item._id.month === month && item._id.team === team
        );
        
        teamData.data.push({
          month,
          count: found ? found.count : 0
        });
      });

      formattedMonthlyTeamData.push(teamData);
    });

    res.json({
      year,
      monthlyTypeData: formattedMonthlyData,
      monthlyTeamData: formattedMonthlyTeamData
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET api/reports/implementation-status
// @desc    获取实施状态统计数据
// @access  Private (管理人员和部门经理)
router.get('/implementation-status', [auth, checkAdminOrManagerRole], async (req, res) => {
  try {
    // 获取时间范围参数
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    
    if (startDate) {
      dateFilter.createdAt = { $gte: new Date(startDate) };
    }
    
    if (endDate) {
      if (dateFilter.createdAt) {
        dateFilter.createdAt.$lte = new Date(endDate);
      } else {
        dateFilter.createdAt = { $lte: new Date(endDate) };
      }
    }

    // 按用户角色过滤权限
    let typeFilter = {};
    if (req.user.role === ROLES.SAFETY_ADMIN) {
      typeFilter = { type: SUGGESTION_TYPES.SAFETY };
    } else if (req.user.role === ROLES.OPS_ADMIN) {
      typeFilter = { type: { $ne: SUGGESTION_TYPES.SAFETY } };
    }

    // 只查询已通过二级审核的建议
    const statusFilter = {
      status: { 
        $in: [
          SUGGESTION_STATUS.REJECTED, 
          SUGGESTION_STATUS.IMPLEMENTING, 
          SUGGESTION_STATUS.COMPLETED
        ]
      }
    };

    // 合并过滤条件
    const filter = { ...dateFilter, ...typeFilter, ...statusFilter };

    // 按类型和状态统计
    const typeStatusData = await Suggestion.aggregate([
      { $match: filter },
      { $group: { 
        _id: { type: '$type', status: '$status' }, 
        count: { $sum: 1 } 
      }},
      { $sort: { '_id.type': 1, '_id.status': 1 } }
    ]);

    // 按班组和状态统计
    const teamStatusData = await Suggestion.aggregate([
      { $match: filter },
      { $group: { 
        _id: { team: '$team', status: '$status' }, 
        count: { $sum: 1 } 
      }},
      { $sort: { '_id.team': 1, '_id.status': 1 } }
    ]);

    // 格式化结果用于图表显示
    const formattedTypeStatusData = [];
    typeStatusData.forEach(item => {
      formattedTypeStatusData.push({
        type: item._id.type,
        status: item._id.status,
        count: item.count
      });
    });

    const formattedTeamStatusData = [];
    teamStatusData.forEach(item => {
      formattedTeamStatusData.push({
        team: item._id.team,
        status: item._id.status,
        count: item.count
      });
    });

    res.json({
      typeStatusData: formattedTypeStatusData,
      teamStatusData: formattedTeamStatusData
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET api/reports/statistics
// @desc    获取建议统计数据
// @access  Private (管理员或经理权限)
router.get('/statistics', auth, checkAdminOrManagerRole, async (req, res) => {
  try {
    // 获取查询参数
    const { startDate, endDate, department, timeUnit = 'month' } = req.query;
    
    // 构建基础查询条件
    let queryConditions = {};
    
    // 按日期范围筛选
    if (startDate && endDate) {
      queryConditions.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // 按部门筛选
    if (department && department !== 'all') {
      // 为简化实现，这里假设建议类型和部门有对应关系
      if (department === DEPARTMENTS.SAFETY) {
        queryConditions.type = 'SAFETY';
      } else if (department === DEPARTMENTS.OPERATION) {
        queryConditions.type = { $in: ['PRODUCTION', 'AUTOMATION', 'OTHER'] };
      }
    }
    
    // 1. 按时间分布统计
    let timeDistribution = [];
    let timeGrouping = {};
    
    if (timeUnit === 'year') {
      timeGrouping = { 
        $dateToString: { format: "%Y", date: "$createdAt" } 
      };
    } else if (timeUnit === 'quarter') {
      timeGrouping = {
        $concat: [
          { $dateToString: { format: "%Y", date: "$createdAt" } },
          "-Q",
          { $toString: { $ceil: { $divide: [{ $month: "$createdAt" }, 3] } } }
        ]
      };
    } else if (timeUnit === 'month') {
      timeGrouping = { 
        $dateToString: { format: "%Y-%m", date: "$createdAt" } 
      };
    } else if (timeUnit === 'week') {
      timeGrouping = {
        $concat: [
          { $dateToString: { format: "%Y-W", date: "$createdAt" } },
          { $toString: { $week: "$createdAt" } }
        ]
      };
    }
    
    const timeResults = await Suggestion.aggregate([
      { $match: queryConditions },
      {
        $group: {
          _id: { timePeriod: timeGrouping },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.timePeriod': 1 } },
      {
        $project: {
          _id: 0,
          timePeriod: '$_id.timePeriod',
          count: 1
        }
      }
    ]);
    
    timeDistribution = timeResults;
    
    // 2. 按部门分布统计
    const departmentResults = await Suggestion.aggregate([
      { $match: queryConditions },
      {
        $lookup: {
          from: 'users',
          localField: 'submitter',
          foreignField: '_id',
          as: 'submitterInfo'
        }
      },
      { $unwind: '$submitterInfo' },
      {
        $group: {
          _id: '$submitterInfo.department',
          value: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          name: '$_id',
          value: 1
        }
      }
    ]);
    
    // 3. 按班组分布统计
    const teamResults = await Suggestion.aggregate([
      { $match: queryConditions },
      {
        $lookup: {
          from: 'users',
          localField: 'submitter',
          foreignField: '_id',
          as: 'submitterInfo'
        }
      },
      { $unwind: '$submitterInfo' },
      {
        $group: {
          _id: '$submitterInfo.team',
          value: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          name: '$_id',
          value: 1
        }
      }
    ]);
    
    // 4. 按状态分布统计
    const statusResults = await Suggestion.aggregate([
      { $match: queryConditions },
      {
        $group: {
          _id: '$status',
          value: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          name: { $literal: "$_id" },
          value: 1
        }
      }
    ]);
    
    // 将状态代码映射为可读名称
    const statusDistribution = statusResults.map(item => ({
      name: SUGGESTION_STATUS[item.name] || item.name,
      value: item.value
    }));
    
    // 5. 按类型分布统计
    const typeResults = await Suggestion.aggregate([
      { $match: queryConditions },
      {
        $group: {
          _id: '$type',
          value: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          name: { $literal: "$_id" },
          value: 1
        }
      }
    ]);
    
    // 将类型代码映射为可读名称
    const typeDistribution = typeResults.map(item => ({
      name: SUGGESTION_TYPES[item.name] || item.name,
      value: item.value
    }));
    
    // 6. 获取贡献排行榜
    const contributorsResults = await Suggestion.aggregate([
      { $match: queryConditions },
      {
        $lookup: {
          from: 'users',
          localField: 'submitter',
          foreignField: '_id',
          as: 'submitterInfo'
        }
      },
      { $unwind: '$submitterInfo' },
      {
        $group: {
          _id: {
            submitterId: '$submitter',
            submitterName: '$submitterInfo.name',
            team: '$submitterInfo.team'
          },
          totalCount: { $sum: 1 },
          adoptedCount: {
            $sum: {
              $cond: [
                { $in: ['$status', ['IMPLEMENTING', 'COMPLETED']] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          id: '$_id.submitterId',
          name: '$_id.submitterName',
          team: '$_id.team',
          count: '$totalCount',
          adoptionRate: {
            $multiply: [
              { $cond: [{ $eq: ['$totalCount', 0] }, 0, { $divide: ['$adoptedCount', '$totalCount'] }] },
              100
            ]
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // 返回完整的统计数据
    res.json({
      success: true,
      timeDistribution,
      departmentDistribution: departmentResults,
      teamDistribution: teamResults,
      statusDistribution,
      typeDistribution,
      topContributors: contributorsResults
    });
    
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({ msg: '服务器错误' });
  }
});

// @route   GET api/reports/dashboard
// @desc    获取仪表盘概览数据
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    
    // 查询条件会根据用户角色不同而不同
    let queryConditions = {};
    
    // 班组人员只能看到自己的建议
    if (user.role === ROLES.TEAM_MEMBER) {
      queryConditions.submitter = userId;
    }
    // 值班主任只能看到本班组的建议
    else if (user.role === ROLES.SHIFT_SUPERVISOR) {
      queryConditions.team = user.team;
    }
    // 管理人员根据部门查看对应类型的建议
    else if (user.role === ROLES.SAFETY_ADMIN) {
      queryConditions.type = 'SAFETY';
    }
    else if (user.role === ROLES.OPERATION_ADMIN) {
      queryConditions.type = { $in: ['PRODUCTION', 'AUTOMATION', 'OTHER'] };
    }
    // 部门经理可以看到所有建议
    
    // 统计各状态建议数量
    const statusCounts = await Suggestion.aggregate([
      { $match: queryConditions },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 转换为易于前端使用的格式
    const statusCountMap = {};
    statusCounts.forEach(item => {
      statusCountMap[item._id] = item.count;
    });
    
    // 获取最近的建议
    const recentSuggestions = await Suggestion.find(queryConditions)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('submitter', 'name team')
      .populate('firstReview.reviewer', 'name')
      .populate('secondReview.reviewer', 'name');
      
    // 构建待审核建议的过滤条件
    let pendingReviewFilter = {};
    
    // 根据用户角色设置适当的过滤条件
    if (user.role === ROLES.TEAM_MEMBER) {
      // 班组人员不需要看到待审核计数
      pendingReviewFilter = { _id: null }; // 强制不匹配任何文档
    } else if (user.role === ROLES.SHIFT_SUPERVISOR) {
      // 值班主任只能看到自己班组的一级待审核建议
      // 检查班组编码和名称的匹配
      const teamValue = user.team;
      let teamKey = Object.keys(TEAMS).find(key => TEAMS[key] === user.team);
      let teamCondition = {};
      if (teamKey) {
        teamCondition = { $or: [ { team: teamValue }, { team: teamKey } ] };
      } else {
        teamCondition = { team: teamValue };
      }
      
      // 同时检查status和reviewStatus字段
      const pendingReviewStatuses = ['PENDING_FIRST_REVIEW', '等待一级审核'];
      pendingReviewFilter = {
        $and: [
          teamCondition,
          { $or: [
            { status: { $in: pendingReviewStatuses } },
            { reviewStatus: { $in: pendingReviewStatuses } }
          ]}
        ]
      };
    } else if (user.role === ROLES.SAFETY_ADMIN) {
      // 安全科管理人员只能看到安全类的二级待审核建议
      const pendingReviewStatuses = ['PENDING_SECOND_REVIEW', '等待二级审核'];
      pendingReviewFilter = {
        $and: [
          { type: 'SAFETY' },
          { $or: [
            { status: { $in: pendingReviewStatuses } },
            { reviewStatus: { $in: pendingReviewStatuses } }
          ]}
        ]
      };
    } else if (user.role === ROLES.OPERATION_ADMIN) {
      // 运行科管理人员只能看到非安全类的二级待审核建议
      const pendingReviewStatuses = ['PENDING_SECOND_REVIEW', '等待二级审核'];
      pendingReviewFilter = {
        $and: [
          { type: { $ne: 'SAFETY' } },
          { $or: [
            { status: { $in: pendingReviewStatuses } },
            { reviewStatus: { $in: pendingReviewStatuses } }
          ]}
        ]
      };
    } else {
      // 部门经理能看到所有待审核建议
      const pendingReviewStatuses = ['PENDING_FIRST_REVIEW', '等待一级审核', 'PENDING_SECOND_REVIEW', '等待二级审核'];
      pendingReviewFilter = {
        $or: [
          { status: { $in: pendingReviewStatuses } },
          { reviewStatus: { $in: pendingReviewStatuses } }
        ]
      };
    }
    
    console.log('Dashboard pending review filter:', pendingReviewFilter);
    
    const pendingReviewCount = await Suggestion.countDocuments(pendingReviewFilter);
    
    // 构建响应数据
    const dashboardData = {
      suggestionCounts: {
        total: Object.values(statusCountMap).reduce((a, b) => a + b, 0),
        pending: statusCountMap['PENDING_FIRST_REVIEW'] || 0,
        underReview: statusCountMap['PENDING_SECOND_REVIEW'] || 0,
        implementing: statusCountMap['IMPLEMENTING'] || 0,
        completed: statusCountMap['COMPLETED'] || 0,
        rejected: statusCountMap['REJECTED'] || 0,
        notImplemented: statusCountMap['NOT_IMPLEMENTED'] || 0,
        withdrawn: statusCountMap['WITHDRAWN'] || 0
      },
      recentSuggestions,
      pendingReviewCount
    };
    
    res.json(dashboardData);
    
  } catch (error) {
    console.error('获取仪表盘数据失败:', error);
    res.status(500).json({ msg: '服务器错误' });
  }
});

module.exports = router; 