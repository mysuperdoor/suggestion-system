const { Suggestion } = require('../models/Suggestion');
const { User } = require('../models/User');

// 获取各班组/科室的建议统计数据
exports.getDepartmentStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // 构建时间范围过滤条件
        const dateFilter = {};
        if (startDate) {
            dateFilter.createdAt = { $gte: new Date(startDate) };
        }
        if (endDate) {
            if (!dateFilter.createdAt) dateFilter.createdAt = {};
            dateFilter.createdAt.$lte = new Date(endDate);
        }
        
        // 并行执行多个查询，提高性能
        const [submissionStats, teamUserCounts] = await Promise.all([
            // 1. 按团队统计建议
            Suggestion.aggregate([
                { $match: dateFilter },
                {
                    $group: {
                        _id: '$team',
                        totalCount: { $sum: 1 },
                        approvedCount: { 
                            $sum: { 
                                $cond: [{ $eq: ['$reviewStatus', 'APPROVED'] }, 1, 0] 
                            } 
                        },
                        implementedCount: { 
                            $sum: { 
                                $cond: [
                                    { $in: ['$implementationStatus', ['COMPLETED', 'EVALUATED']] }, 
                                    1, 
                                    0
                                ] 
                            } 
                        },
                        avgScore: { 
                            $avg: {
                                $cond: [
                                    { $and: [
                                        { $isNumber: '$scoring.score' },
                                        { $ne: ['$scoring.score', null] }
                                    ]},
                                    '$scoring.score',
                                    null
                                ]
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        team: '$_id',
                        totalCount: 1,
                        approvedCount: 1,
                        implementedCount: 1,
                        approvalRate: { 
                            $cond: [
                                { $eq: ['$totalCount', 0] },
                                0,
                                { $multiply: [{ $divide: ['$approvedCount', '$totalCount'] }, 100] }
                            ]
                        },
                        implementationRate: { 
                            $cond: [
                                { $eq: ['$approvedCount', 0] },
                                0,
                                { $multiply: [{ $divide: ['$implementedCount', '$approvedCount'] }, 100] }
                            ]
                        },
                        avgScore: { $round: ['$avgScore', 1] }
                    }
                },
                { $sort: { totalCount: -1 } }
            ]),
            
            // 2. 统计每个团队的人数
            User.aggregate([
                {
                    $group: {
                        _id: '$team',
                        userCount: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        team: '$_id',
                        userCount: 1
                    }
                }
            ])
        ]);
        
        // 合并结果，计算人均提案数
        const teamMap = new Map();
        
        // 首先将用户数量添加到Map
        teamUserCounts.forEach(item => {
            teamMap.set(item.team, { userCount: item.userCount });
        });
        
        // 然后合并建议统计信息
        submissionStats.forEach(stat => {
            const teamData = teamMap.get(stat.team) || { userCount: 0 };
            teamMap.set(stat.team, {
                ...teamData,
                ...stat,
                perCapitaCount: teamData.userCount > 0 
                    ? +(stat.totalCount / teamData.userCount).toFixed(2) 
                    : 0
            });
        });
        
        // 转换为数组形式，计算总分
        const finalStats = Array.from(teamMap.entries()).map(([team, data]) => ({
            team,
            ...data,
            totalScore: calculateTotalScore(data)
        })).sort((a, b) => b.totalScore - a.totalScore);
        
        res.json(finalStats);
    } catch (error) {
        console.error('获取部门统计失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
};

// 获取部门建议趋势数据
exports.getDepartmentTrends = async (req, res) => {
    try {
        console.log('开始执行getDepartmentTrends，参数:', req.query);
        
        const { team, period = 'month' } = req.query;
        
        const trends = await Suggestion.aggregate([
            {
                $match: team ? { team } : {}
            },
            {
                $group: {
                    _id: {
                        team: '$team',
                        year: { $year: '$createdAt' },
                        [period]: period === 'month' ? 
                            { $month: '$createdAt' } : 
                            { $week: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: {
                    '_id.year': 1,
                    ['_id.' + period]: 1
                }
            }
        ]);
        
        console.log('趋势统计结果:', trends);

        res.json({
            success: true,
            data: trends
        });
    } catch (error) {
        console.error('Trends statistics error详细信息:', error);
        console.error('Error stack:', error.stack);
        
        res.status(500).json({
            success: false,
            message: '获取趋势数据失败',
            error: error.message
        });
    }
}; 