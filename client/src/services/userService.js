import api from './api';
import axios from 'axios';

// 服务器API基础URL
const API_URL = 'http://localhost:5000/api';

export const userService = {
  // 获取用户列表
  getUsers: async (params = { page: 1, limit: 10 }) => {
    try {
      console.log('获取用户列表参数:', params);
      const response = await api.get('/users', { params });
      console.log('获取用户列表原始响应:', response);
      
      // 标准化响应格式
      if (response) {
        return { 
          data: response.users || [],  // 直接使用response.users
          pagination: response.pagination || { 
            total: 0, 
            current: params.page || 1, 
            pageSize: params.limit || 10 
          }
        };
      }
      
      return { data: [], pagination: { total: 0, current: 1, pageSize: 10 } };
    } catch (error) {
      console.error('获取用户列表失败:', error);
      throw error;
    }
  },

  // 创建新用户
  createUser: async (userData) => {
    try {
      console.log('发送创建用户请求:', userData);
      const response = await api.post('/users', userData);
      console.log('创建用户响应:', response.data);
      return response.data;
    } catch (error) {
      console.error('创建用户失败:', error);
      if (error.response && error.response.data) {
        throw error.response.data;
      }
      throw error;
    }
  },

  // 更新用户信息
  updateUser: async (id, userData) => {
    try {
      console.log('发送更新用户请求 - 原始数据:', userData);
      
      // 获取后端枚举常量
      const ROLES = {
        'DEPARTMENT_MANAGER': '部门经理',
        'SHIFT_SUPERVISOR': '值班主任',
        'SAFETY_ADMIN': '安全科管理人员',
        'OPERATION_ADMIN': '运行科管理人员',
        'TEAM_MEMBER': '班组人员'
      };
      
      const TEAMS = {
        'TEAM_A': '甲班',
        'TEAM_B': '乙班',
        'TEAM_C': '丙班',
        'TEAM_D': '丁班',
        'NONE': '无班组'
      };
      
      // 转换角色和班组为中文值
      const processedData = {
        ...userData,
        role: ROLES[userData.role] || userData.role,
        team: TEAMS[userData.team] || userData.team,
        department: userData.department === 'PRODUCTION' ? '生产调度部' : userData.department
      };
      
      console.log('发送更新用户请求 - 处理后数据:', processedData);
      
      const response = await api.put(`/users/${id}`, processedData);
      console.log('更新用户响应:', response.data);
      return response.data;
    } catch (error) {
      console.error('更新用户失败:', error);
      console.error('错误详情:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      throw error;
    }
  },

  // 删除用户
  deleteUser: async (id) => {
    try {
      console.log('发送删除用户请求:', { id });
      const response = await api.delete(`/users/${id}`);
      console.log('删除用户响应:', response.data);
      return response.data;
    } catch (error) {
      console.error('删除用户失败:', error);
      if (error.response && error.response.data) {
        throw error.response.data;
      }
      throw error;
    }
  },

  // 重置用户密码
  resetPassword: async (id, newPassword) => {
    try {
      console.log('发送重置密码请求:', { id, passwordLength: newPassword?.length });
      const response = await api.put(`/users/${id}/password`, { 
        password: newPassword 
      });
      console.log('重置密码响应:', response.data);
      return response.data;
    } catch (error) {
      console.error('重置密码失败:', error);
      if (error.response && error.response.data) {
        throw error.response.data;
      }
      throw error;
    }
  },

  // 修改当前用户密码
  changePassword: async (currentPassword, newPassword) => {
    try {
      const response = await api.put('/users/change-password', { 
        currentPassword, 
        newPassword 
      });
      return response.data;
    } catch (error) {
      console.error('修改密码失败:', error);
      if (error.response && error.response.data) {
        throw error.response.data;
      }
      throw error;
    }
  }
}; 