import api from './api';

export const reportService = {
  // 获取仪表盘数据
  getDashboardData: async () => {
    try {
      const response = await api.get('/reports/dashboard');
      return response;
    } catch (error) {
      console.error('获取仪表盘数据失败:', error);
      throw error;
    }
  },

  // 获取建议类型统计
  getSuggestionTypeStats: async (params) => {
    try {
      const response = await api.get('/reports/suggestions/type', { params });
      return response;
    } catch (error) {
      console.error('获取建议类型统计失败:', error);
      throw error;
    }
  },

  // 获取建议状态统计
  getSuggestionStatusStats: async (params) => {
    try {
      const response = await api.get('/reports/suggestions/status', { params });
      return response;
    } catch (error) {
      console.error('获取建议状态统计失败:', error);
      throw error;
    }
  },

  // 获取部门/班组建议统计
  getDepartmentStats: async (params) => {
    try {
      const response = await api.get('/reports/suggestions/department', { params });
      return response;
    } catch (error) {
      console.error('获取部门统计失败:', error);
      throw error;
    }
  }
}; 