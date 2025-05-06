import api from './api';
import { getAuthHeader } from '../utils/authUtils';

// 使用直接定义的API基础URL，而不是从constants/config导入
const API_BASE_URL = 'http://localhost:5000/api';

const statisticsService = {
    // 获取部门统计数据
    getDepartmentStats: async (startDate, endDate) => {
        try {
            console.log('发送部门统计数据请求，参数:', { startDate, endDate });
            
            const params = {};
            if (startDate && endDate) {
                params.startDate = startDate;
                params.endDate = endDate;
            }
            
            // 使用api实例而不是直接使用axios
            const response = await api.get('/statistics/department-stats', { params });
            
            console.log('获取部门统计数据响应:', response);
            
            // api.js 的响应拦截器已经处理了response.data，所以这里直接使用response
            if (response && response.success && Array.isArray(response.data)) {
                return {
                    success: true,
                    data: response.data
                };
            } else {
                console.error('部门统计数据响应格式不正确:', response);
                return {
                    success: false,
                    data: [],
                    message: '数据格式不正确'
                };
            }
        } catch (error) {
            // 详细记录错误信息
            console.error('获取部门统计数据失败:', error.message);
            if (error.response) {
                console.error('服务器响应:', error.response.status, error.response.data);
            } else if (error.request) {
                console.error('未收到响应，请求详情:', error.request);
            }
            
            throw error;
        }
    },

    // 获取部门趋势数据
    getDepartmentTrends: async (team, period = 'month') => {
        try {
            const params = { team, period };
            // 使用api实例而不是直接使用axios
            const response = await api.get('/statistics/department-trends', { params });
            return response;
        } catch (error) {
            console.error('获取部门趋势数据失败:', error);
            throw error;
        }
    },
    
    // 检查统计API是否可用
    checkApiStatus: async () => {
        try {
            // 先检查整体API健康状况
            const healthResult = await api.checkHealth();
            
            if (!healthResult.success) {
                return healthResult;
            }
            
            // 再检查统计API是否可用
            const statsResult = await api.get('/statistics/status', { 
                // 设置短超时，避免长时间等待
                timeout: 5000,
                // 避免显示重复错误消息
                showErrorMessage: false
            });
            
            return {
                success: true,
                status: statsResult.status,
                message: statsResult.message,
                time: statsResult.time
            };
        } catch (error) {
            console.error('统计API状态检查失败:', error);
            return {
                success: false,
                message: error.userMessage || '统计服务不可用'
            };
        }
    }
};

export default statisticsService; 