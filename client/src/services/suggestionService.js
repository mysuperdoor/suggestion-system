import api from './api';
import axios from 'axios';

// 移除开头的 /api，假设 api 实例已配置 baseURL: '/api'
const API_URL = '/suggestions';

export const suggestionService = {
  // 获取创建建议初始数据
  getCreateData: async () => {
    try {
      const response = await api.get('/suggestions/create');
      return response;
    } catch (error) {
      console.error('获取创建建议数据失败:', error);
      throw error;
    }
  },

  // 提交建议
  submitSuggestion: async (formData) => {
    try {
      console.log('提交建议，表单数据:', formData);
      
      // 确保Content-Type由浏览器自动设置
      const response = await api.post('/suggestions', formData, {
        headers: {
          // 不要显式设置Content-Type，让浏览器自动设置，确保边界字符串正确
          'Content-Type': undefined
        }
      });
      
      console.log('提交建议响应:', response);
      return response;
    } catch (error) {
      console.error('提交建议失败:', error);
      console.error('错误响应:', error.response?.data);
      throw error;
    }
  },

  // 获取建议列表
  getSuggestions: async (params = {}) => {
    try {
      console.log('suggestionService.getSuggestions - params:', params);
      // 将 params 对象转换为查询字符串
      const queryString = new URLSearchParams(params).toString();
      console.log('suggestionService.getSuggestions - queryString:', queryString);
      // 将查询字符串附加到 URL，并使用 api 对象
      const response = await api.get(`/suggestions?${queryString}`); 
      
      console.log('suggestionService.getSuggestions - 原始响应:', response);
      
      // 分析响应结构并适配成统一的格式：{ data: [...], pagination: {...} }
      let result = {
        data: [],
        pagination: {
          current: parseInt(params.page) || 1,
          pageSize: parseInt(params.limit) || 10,
          total: 0
        }
      };
      
      // 1. 检查后端直接返回的 suggestions 和 pagination 格式
      if (response && response.data && Array.isArray(response.data.suggestions)) {
        console.log('格式1: response.data = { suggestions: [...], pagination: {...} }');
        result.data = response.data.suggestions;
        if (response.data.pagination) {
          result.pagination = response.data.pagination;
        }
      } 
      // 2. 检查直接返回数组的格式
      else if (response && Array.isArray(response.data)) {
        console.log('格式2: response.data = [...]');
        result.data = response.data;
      }
      // 3. 检查嵌套数据的格式
      else if (response && response.data && response.data.data && Array.isArray(response.data.data)) {
        console.log('格式3: response.data.data = [...]');
        result.data = response.data.data;
        if (response.data.pagination) {
          result.pagination = response.data.pagination;
        }
      } 
      // 4. 处理其他可能的格式
      else {
        console.warn('suggestionService.getSuggestions - 未知响应结构:', response);
        // 尝试从响应中提取有用信息
        if (response && typeof response === 'object') {
          // 尝试找到第一个数组类型的属性
          const arrayProp = Object.entries(response).find(([_, value]) => Array.isArray(value));
          if (arrayProp) {
            console.log(`找到可能的数据数组: ${arrayProp[0]}`);
            result.data = arrayProp[1];
          }
        }
      }
      
      console.log('suggestionService.getSuggestions - 处理后的结果:', result);
      return result;
    } catch (error) {
      console.error('获取建议列表失败:', error.response?.data || error.message);
      throw error;
    }
  },

  // 获取单个建议详情
  getSuggestionById: async (id) => {
    try {
      const response = await api.get(`/suggestions/${id}`);
      // 验证并修复可能的空数据
      if (response && response.data) {
        return {
          data: validateSuggestionData(response.data)
        };
      } else if (response) {
        return {
          data: validateSuggestionData(response)
        };
      }
      return response;
    } catch (error) {
      console.error('获取建议详情失败:', error);
      throw error;
    }
  },

  // 更新建议状态
  updateSuggestionStatus: async (id, status, comment) => {
    try {
      const response = await api.put(`/suggestions/${id}/status`, {
        status,
        comment
      });
      return response;
    } catch (error) {
      console.error('更新建议状态失败:', error);
      throw error;
    }
  },

  // 一级审核
  firstReview: async (id, approved, comments) => {
    try {
      console.log('提交一级审核:', id, '审核结果:', approved, '审核意见:', comments);
      const response = await api.put(`/suggestions/${id}/first-review`, {
        result: approved,  // 使用 result 字段
        comments: comments
      });
      console.log('一级审核响应:', response);
      return response;
    } catch (error) {
      console.error('一级审核失败:', error);
      console.error('错误详情:', error.response?.data);
      throw error;
    }
  },

  // 二级审核
  secondReview: async (id, approved, comments) => {
    try {
      console.log('提交二级审核:', id, '审核结果:', approved, '审核意见:', comments);
      const response = await api.put(`/suggestions/${id}/second-review`, {
        result: approved,  // 使用 result 字段
        comments: comments
      });
      console.log('二级审核响应:', response);
      return response;
    } catch (error) {
      console.error('二级审核失败:', error);
      console.error('错误详情:', error.response?.data);
      throw error;
    }
  },

  // 更新建议
  updateSuggestion: async (id, updateData) => {
    try {
      console.log('更新建议:', id, updateData);
      const response = await api.put(`/suggestions/${id}`, updateData);
      return response;
    } catch (error) {
      console.error('更新建议失败:', error);
      throw error;
    }
  },

  // 撤回建议
  withdrawSuggestion: async (id, reason) => {
    try {
      console.log('撤回建议:', id, reason);
      const response = await api.put(`/suggestions/${id}/withdraw`, { reason });
      return response;
    } catch (error) {
      console.error('撤回建议失败:', error);
      throw error;
    }
  },

  // 添加评论
  addComment: async (id, comment) => {
    try {
      const response = await api.post(`/suggestions/${id}/comments`, {
        content: comment
      });
      return response;
    } catch (error) {
      console.error('添加评论失败:', error);
      throw error;
    }
  },

  // 获取所有建议
  getAllSuggestions: async () => {
    try {
      const response = await axios.get(API_URL);
      return response.data;
    } catch (error) {
      console.error('获取建议列表失败:', error);
      throw error;
    }
  },

  // 获取单个建议
  getSuggestion: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error('获取建议详情失败:', error);
      throw error;
    }
  },

  // 创建新建议
  createSuggestion: async (suggestionData) => {
    try {
      const response = await axios.post(API_URL, suggestionData);
      return response.data;
    } catch (error) {
      console.error('创建建议失败:', error);
      throw error;
    }
  },

  // 删除建议
  deleteSuggestion: async (id) => {
    try {
      console.log(`尝试删除建议: ${id}`);
      const response = await api.delete(`/suggestions/${id}`);
      console.log('删除建议响应:', response);
      // 后端返回 { success: true, message: '...' }
      if (response && response.success === true) {
        return { success: true, message: response.message };
      } else {
        // 如果后端没有按预期返回 success: true
        console.warn('删除成功但响应格式不符合预期:', response);
        return { success: false, message: response?.message || '删除失败，响应格式错误' };
      }
    } catch (error) {
      console.error(`删除建议 ${id} 失败:`, error);
      console.error('错误响应:', error.response?.data);
      return {
        success: false,
        message: error.response?.data?.message || '删除建议时发生网络或服务器错误'
      };
    }
  },

  // 提交建议审核
  submitForReview: async (id) => {
    try {
      const response = await axios.post(`${API_URL}/${id}/submit`);
      return response.data;
    } catch (error) {
      console.error('提交建议审核失败:', error);
      throw error;
    }
  },

  // 审核建议
  reviewSuggestion: async (id, reviewData) => {
    try {
      const response = await axios.post(`${API_URL}/${id}/review`, reviewData);
      return response.data;
    } catch (error) {
      console.error('审核建议失败:', error);
      throw error;
    }
  },
  
  // 更新建议实施状态
  updateImplementation: async (id, implementationData) => {
    try {
      // 使用新的实施状态映射
      const statusMap = {
        '未开始': 'NOT_STARTED',
        '联系中': 'CONTACTING',
        '实施中': 'IN_PROGRESS',
        '已完成': 'COMPLETED',
        '取消': 'CANCELLED'
      };

      // 准备发送到后端的数据
      const updatePayload = {
        ...implementationData,
        status: statusMap[implementationData.status] || implementationData.status,
      };
      // 删除 evaluation 键，以防万一
      delete updatePayload.evaluation;

      console.log('发送实施更新请求 (suggestionService):', id, updatePayload);
      
      // 调用统一的更新接口 (假设是 PUT /api/suggestions/:id/implementation 或类似)
      // 注意：后端路由和控制器需要对应这个路径和方法
      // 查找之前的代码，发现后端控制器是 suggestionController.updateImplementation
      // 路由是 PUT /api/suggestions/:id/implementation (需要确认或调整)
      // 假设路由是 /api/suggestions/:id/implementation
      const response = await api.put(`${API_URL}/${id}/implementation`, updatePayload);
      
      console.log('实施更新响应:', response);
      
      // 返回成功标识和数据
      return {
        success: true,
        message: '实施状态更新成功',
        data: response.data || response // 根据后端实际返回调整
      };

    } catch (error) {
      console.error('更新实施状态失败 (suggestionService):', error);
      console.error('错误响应:', error.response?.data);
      // 返回包含错误信息的对象
      return {
        success: false,
        message: error.response?.data?.message || '更新实施状态失败', // 优先使用后端错误信息
        error: error
      };
    }
  },
  
  // 获取实施统计数据
  getImplementationStats: async () => {
    try {
      const response = await axios.get(`${API_URL}/stats/implementation`);
      return response.data;
    } catch (error) {
      console.error('获取实施统计数据失败:', error);
      throw error;
    }
  },

  // 提交审核
  submitReview: async (reviewData) => {
    try {
      const response = await api.post('/suggestions/review', reviewData);
      return response;
    } catch (error) {
      throw error;
    }
  },

  // 部门经理为建议打分
  scoreSuggestion: async (id, score) => {
    try {
      const response = await api.post(`/suggestions/${id}/score`, { score });
      return response; // 通常返回更新后的 suggestion 对象
    } catch (error) {
      console.error(`建议 ${id} 打分失败:`, error);
      throw error; // 将错误抛出给调用者处理
    }
  }
};

// 验证并修复建议数据，确保关键字段存在
function validateSuggestionData(suggestion) {
  if (!suggestion) return {};

  // 处理实施信息，确保字段命名一致
  let implementation = suggestion.implementation;
  if (implementation) {
    // 确保前端显示所需的字段存在
    implementation = {
      ...implementation,
      // 确保状态字段存在，并进行状态名称标准化
      status: implementation.status || 'NOT_STARTED',
      // 确保责任人字段存在，优先使用responsiblePerson字段
      responsiblePerson: implementation.responsiblePerson || 
                         implementation.implementer?.name || 
                         (typeof implementation.implementer === 'string' ? implementation.implementer : '未分配'),
      // 确保日期字段存在
      startDate: implementation.startDate || null,
      plannedEndDate: implementation.plannedCompletionDate || implementation.plannedEndDate || null,
      actualEndDate: implementation.actualCompletionDate || implementation.actualEndDate || null,
      // 确保备注字段存在
      notes: implementation.notes || implementation.comments || '',
      // 确保历史记录存在
      history: implementation.history || []
    };
  } else {
    // 如果没有实施信息，创建默认的实施信息
    implementation = {
      status: 'NOT_STARTED',
      responsiblePerson: '未分配',
      startDate: null,
      plannedEndDate: null,
      actualEndDate: null,
      notes: '',
      history: []
    };
  }
  
  // 处理建议状态
  let reviewStatus = suggestion.reviewStatus || suggestion.status;
  let implementationStatus = suggestion.implementationStatus || 
                           (implementation ? implementation.status : 'NOT_STARTED');
  
  // 导入状态常量
  const { REVIEW_STATUS, IMPLEMENTATION_STATUS } = require('../constants/suggestions');
  
  // 转换审核状态
  if (REVIEW_STATUS[reviewStatus]) {
    reviewStatus = REVIEW_STATUS[reviewStatus];
  }
  
  // 转换实施状态
  if (IMPLEMENTATION_STATUS[implementationStatus]) {
    implementationStatus = IMPLEMENTATION_STATUS[implementationStatus];
  }
  
  return {
    ...suggestion,
    reviewStatus,
    implementationStatus,
    implementation,
    // 确保submitter字段存在
    submitter: suggestion.submitter || { name: '未知', _id: null },
    // 确保comments字段是数组
    comments: Array.isArray(suggestion.comments) ? suggestion.comments.map(comment => ({
      ...comment,
      user: comment.user || { name: '未知用户' },
      createdAt: comment.createdAt || new Date().toISOString()
    })) : []
  };
} 