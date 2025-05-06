import axios from 'axios';
import { message } from 'antd';

// 动态获取API基础URL
const getBaseUrl = () => {
  // 生产环境下使用相对路径，开发环境使用localhost
  if (process.env.NODE_ENV === 'production') {
    return '/api'; // 相对路径，会使用当前域名
  } else {
    return process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  }
};

// 创建 axios 实例
const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 30000, // 延长超时时间到30秒，文件上传需要更长时间
  headers: {
    'Content-Type': 'application/json'
  }
});

// 输出API基础URL，便于调试
console.log('API 基础URL:', getBaseUrl());

// 请求拦截器：添加 token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // 确保token格式正确
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // 不要修改FormData的Content-Type
    if (config.data instanceof FormData) {
      // 确保axios不会覆盖FormData的Content-Type
      config.headers['Content-Type'] = undefined;
    }
    
    console.log('请求详情:', {
      url: config.url,
      method: config.method,
      baseURL: config.baseURL,
      token: token ? '已设置' : '未设置'
    });
    return config;
  },
  (error) => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    // 确保返回response.data
    return response.data;
  },
  (error) => {
    console.error('API错误:', error);
    
    let errorMsg = '请求失败';
    
    if (error.response) {
      // 服务器返回了错误状态码
      console.error('服务器响应:', {
        status: error.response.status,
        data: error.response.data
      });
      
      // 处理401错误
      if (error.response.status === 401) {
        const errorMessage = error.response.data?.message || error.response.data?.msg;
        if (errorMessage?.includes('过期') || errorMessage?.includes('无效')) {
          // 如果是token过期或无效，清除用户信息并跳转到登录页
          console.log('清除用户登录状态并跳转到登录页面');
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
          localStorage.removeItem('currentUser');
          window.location.href = '/login';
        }
        errorMsg = '未授权，请重新登录';
      } 
      // 400错误通常意味着请求参数有问题
      else if (error.response.status === 400) {
        const errorData = error.response.data;
        if (errorData?.errors && Array.isArray(errorData.errors)) {
          // 如果是验证错误数组，显示第一个错误
          errorMsg = errorData.errors[0]?.msg || errorData.errors[0]?.message || '请求参数有误';
        } else {
          // 显示错误消息
          errorMsg = errorData?.message || errorData?.msg || '请求参数有误';
        }
      }
      // 500错误
      else if (error.response.status >= 500) {
        errorMsg = '服务器错误，请稍后再试';
      }
      // 其他错误
      else {
        errorMsg = error.response.data?.message || 
                  error.response.data?.msg || 
                  '请求失败，状态码: ' + error.response.status;
      }
    } 
    else if (error.request) {
      // 请求已发送但没有收到响应
      console.error('未收到响应:', error.request);
      errorMsg = '服务器未响应，请检查网络连接和服务器状态';
    } 
    else {
      // 在设置请求时发生错误
      console.error('请求配置错误:', error.message);
      errorMsg = '请求配置错误: ' + error.message;
    }
    
    // 只在特定情况下显示错误消息，避免重复提示
    if (error.config?.showErrorMessage !== false) {
      message.error(errorMsg);
    }
    
    return Promise.reject({
      ...error,
      userMessage: errorMsg
    });
  }
);

// 添加一个健康检查方法，用于检测API是否可用
api.checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return {
      success: true,
      status: response.status,
      message: response.message,
      time: response.time
    };
  } catch (error) {
    return {
      success: false,
      message: error.userMessage || '健康检查失败'
    };
  }
};

export default api; 