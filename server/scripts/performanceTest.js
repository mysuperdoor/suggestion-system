/**
 * 数据库性能测试脚本
 * 
 * 测试主要查询接口的性能，评估缓存和索引优化效果
 */

const mongoose = require('mongoose');
const config = require('../config');
const { Suggestion } = require('../models/Suggestion');
const cache = require('../utils/cacheUtils');

// 连接数据库
async function connectDB() {
  try {
    await mongoose.connect(config.db.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('数据库连接成功');
  } catch (error) {
    console.error('数据库连接失败:', error);
    process.exit(1);
  }
}

// 测试获取建议列表性能
async function testGetSuggestions() {
  console.log('\n===== 测试获取建议列表性能 =====');
  
  // 测试不同的分页大小
  const pageSizes = [1, 2, 3]; // 根据数据量调整测试的页面大小
  
  for (const limit of pageSizes) {
    console.log(`\n测试页面大小: ${limit}`);
    
    try {
      // 第一次查询 (没有缓存)
      console.log('第一次查询 (无缓存):');
      const startTime1 = Date.now();
      // 使用更通用的查询条件
      const query = {};
      
      // 使用普通查询
      const suggestions1 = await Suggestion.find(query)
        .limit(limit)
        .lean();
      
      const endTime1 = Date.now();
      console.log(`- 执行时间: ${endTime1 - startTime1}ms`);
      console.log(`- 结果数量: ${suggestions1.length}`);
      
      // 第二次查询 (如果有缓存系统会使用缓存)
      console.log('第二次查询 (应使用缓存):');
      const startTime2 = Date.now();
      
      // 使用缓存请求
      const cacheKey = `test:suggestions:list:${limit}`;
      let suggestions2;
      
      const cachedResult = cache.get(cacheKey);
      if (cachedResult) {
        suggestions2 = cachedResult;
        console.log('- 使用缓存数据');
      } else {
        suggestions2 = await Suggestion.find(query)
          .limit(limit)
          .lean();
        
        cache.set(cacheKey, suggestions2, 60 * 1000); // 缓存1分钟
      }
      
      const endTime2 = Date.now();
      console.log(`- 执行时间: ${endTime2 - startTime2}ms`);
      console.log(`- 结果数量: ${suggestions2.length}`);
      
      // 性能改进百分比
      const time1 = endTime1 - startTime1;
      const time2 = endTime2 - startTime2;
      if (time1 > 0) {
        const improvement = ((time1 - time2) / time1 * 100);
        console.log(`- 性能改进: ${improvement.toFixed(2)}%`);
      } else {
        console.log(`- 性能改进: 无法计算 (第一次查询时间为0)`);
      }
    } catch (error) {
      console.error(`测试页面大小: ${limit} 时发生错误:`, error.message);
    }
  }
}

// 测试建议详情查询性能
async function testGetSuggestionDetail() {
  console.log('\n===== 测试建议详情查询性能 =====');
  
  // 获取最多3个ID
  const suggestions = await Suggestion.find()
    .select('_id')
    .limit(3)
    .lean();
  
  if (suggestions.length === 0) {
    console.log('没有数据可测试');
    return;
  }
  
  for (let i = 0; i < suggestions.length; i++) {
    const id = suggestions[i]._id;
    console.log(`\n测试ID: ${id}`);
    
    try {
      // 第一次查询 (没有缓存)
      console.log('第一次查询 (无缓存):');
      const startTime1 = Date.now();
      
      // 简化查询方法
      const suggestion = await Suggestion.findById(id).lean();
      
      const endTime1 = Date.now();
      console.log(`- 执行时间: ${endTime1 - startTime1}ms`);
      
      // 第二次查询 (如果有缓存系统会使用缓存)
      console.log('第二次查询 (应使用缓存):');
      const startTime2 = Date.now();
      
      // 检查缓存
      const cacheKey = `test:suggestion:${id}`;
      let result;
      
      const cachedSuggestion = cache.get(cacheKey);
      if (cachedSuggestion) {
        result = cachedSuggestion;
        console.log('- 使用缓存数据');
      } else {
        // 重复查询
        result = await Suggestion.findById(id).lean();
        
        cache.set(cacheKey, result, 60 * 1000); // 缓存1分钟
      }
      
      const endTime2 = Date.now();
      console.log(`- 执行时间: ${endTime2 - startTime2}ms`);
      
      // 性能改进百分比
      if (endTime1 > 0 && startTime1 > 0) {
        const time1 = endTime1 - startTime1;
        const time2 = endTime2 - startTime2;
        if (time1 > 0) {
          const improvement = ((time1 - time2) / time1 * 100);
          console.log(`- 性能改进: ${improvement.toFixed(2)}%`);
        } else {
          console.log(`- 性能改进: 无法计算 (第一次查询时间为0)`);
        }
      } else {
        console.log(`- 性能改进: 无法计算`);
      }
    } catch (error) {
      console.error(`测试ID: ${id} 时发生错误:`, error.message);
    }
  }
}

// 测试聚合查询性能
async function testAggregationQueries() {
  console.log('\n===== 测试聚合查询性能 =====');
  
  try {
    // 测试使用Promise.all进行并行查询
    console.log('\n测试并行聚合查询:');
    
    // 顺序执行
    console.log('顺序执行:');
    const startTimeSeq = Date.now();
    
    // 按状态统计
    const statusStats = await Suggestion.aggregate([
      { $match: { reviewStatus: 'APPROVED' } },
      {
        $group: {
          _id: '$implementation.status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 按负责人统计
    const responsiblePersonStats = await Suggestion.aggregate([
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
      }
    ]);
    
    const endTimeSeq = Date.now();
    console.log(`- 执行时间: ${endTimeSeq - startTimeSeq}ms`);
    
    // 并行执行
    console.log('并行执行:');
    const startTimePar = Date.now();
    
    const [statusStatsP, responsiblePersonStatsP] = await Promise.all([
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
        }
      ])
    ]);
    
    const endTimePar = Date.now();
    console.log(`- 执行时间: ${endTimePar - startTimePar}ms`);
    
    // 性能改进百分比
    const time1 = endTimeSeq - startTimeSeq;
    const time2 = endTimePar - startTimePar;
    if (time1 > 0) {
      const improvement = ((time1 - time2) / time1 * 100);
      console.log(`- 性能改进: ${improvement.toFixed(2)}%`);
    } else {
      console.log(`- 性能改进: 无法计算 (顺序执行时间为0)`);
    }
  } catch (error) {
    console.error('测试聚合查询时发生错误:', error.message);
  }
}

// 显示缓存统计信息
function showCacheStats() {
  console.log('\n===== 缓存统计信息 =====');
  console.log(cache.getStats());
}

// 运行所有测试
async function runTests() {
  try {
    await connectDB();
    
    console.log('\n开始性能测试...');
    
    // 检查是否有测试数据
    const count = await Suggestion.countDocuments();
    console.log(`数据库中共有 ${count} 条建议数据`);
    
    if (count === 0) {
      console.log('警告: 数据库中没有建议数据，无法进行有效测试');
      return;
    }
    
    // 执行测试
    try {
      await testGetSuggestions();
    } catch (error) {
      console.error('测试获取建议列表失败:', error);
    }
    
    try {
      await testGetSuggestionDetail();
    } catch (error) {
      console.error('测试建议详情查询失败:', error);
    }
    
    try {
      await testAggregationQueries();
    } catch (error) {
      console.error('测试聚合查询失败:', error);
    }
    
    // 显示缓存统计
    showCacheStats();
    
    console.log('\n性能测试完成!');
  } catch (error) {
    console.error('测试执行失败:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
    process.exit(0);
  }
}

// 执行测试
runTests(); 