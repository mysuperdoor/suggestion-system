import api from './api';

const saveUserToLocalStorage = (userData) => {
  try {
    if (!userData) {
      console.error('保存用户信息失败: 用户数据为空');
      return;
    }
    
    console.log('准备保存用户信息到localStorage:', {
      id: userData._id || userData.id,
      name: userData.name,
      role: userData.role,
      team: userData.team
    });
    
    // 标准化用户ID字段
    const userToSave = { ...userData };
    if (userData._id && !userData.id) {
      userToSave.id = userData._id;
    }
    
    localStorage.setItem('currentUser', JSON.stringify(userToSave));
    
    // 同时保存用户角色，方便侧边栏使用
    if (userData.role) {
      localStorage.setItem('userRole', userData.role);
    }
    
    console.log('用户信息已成功保存到localStorage');
  } catch (error) {
    console.error('保存用户信息失败:', error);
  }
};

export const authService = {
  login: async (username, password) => {
    try {
      console.log('开始登录请求...');
      const response = await api.post('/auth/login', { username, password });
      console.log('登录响应:', response);
      
      // 确保我们能获取到token和user信息
      const token = response.token;
      const user = response.user;
      
      if (!token || !user) {
        console.error('登录响应格式不正确:', response);
        throw new Error('登录失败：服务器返回格式异常');
      }
      
      // 保存token和用户信息
      localStorage.setItem('token', token);
      localStorage.setItem('userId', user._id || user.id);
      
      // 保存完整的用户信息
      saveUserToLocalStorage(user);
      
      return { token, user };
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  },

  logout: () => {
    console.log('执行注销操作，清除所有用户信息');
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');
  },

  getCurrentUser: async () => {
    try {
      // 先从localStorage中获取用户信息
      const userJson = localStorage.getItem('currentUser');
      if (userJson) {
        console.log('getCurrentUser: 从localStorage获取用户信息');
        return JSON.parse(userJson);
      }
      
      console.log('getCurrentUser: localStorage中没有找到用户信息');
      
      // 检查token是否存在
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('getCurrentUser: 未找到token，用户未登录');
        return null;
      }
      
      console.log('getCurrentUser: 检测到token存在，尝试重新获取用户信息');
      
      // 调用API获取用户信息
      const response = await api.get('/auth/me');
      
      // 检查响应格式
      console.log('获取到用户信息:', response);
      
      // 简化数据处理逻辑，直接使用API返回的数据
      // API返回的用户数据可能直接就是用户对象
      const userData = response;
      
      if (!userData || (!userData._id && !userData.id)) {
        console.error('getCurrentUser: 返回的用户数据无效', response);
        return null;
      }
      
      // 保存用户信息到localStorage
      saveUserToLocalStorage(userData);
      
      return userData;
    } catch (error) {
      console.error('获取当前用户信息失败:', error);
      return null;
    }
  },

  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    console.log('检查用户认证状态:', !!token);
    return !!token;
  },
  
  // 检查用户是否是部门经理
  isDepartmentManager: async () => {
    try {
      // 先检查localStorage中是否有角色信息
      const roleFromStorage = localStorage.getItem('userRole');
      if (roleFromStorage === '部门经理') {
        return true;
      }
      
      // 如果没有或不是部门经理，尝试从API获取
      const user = await authService.getCurrentUser();
      if (user && user.role === '部门经理') {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('检查部门经理权限失败:', error);
      return false;
    }
  },
  
  // 检查用户是否有管理员权限（部门经理、安全科或运行科管理人员）
  isAdmin: async () => {
    try {
      // 先检查localStorage中是否有角色信息
      const roleFromStorage = localStorage.getItem('userRole');
      if (roleFromStorage === '部门经理' || 
          roleFromStorage === '安全科管理人员' || 
          roleFromStorage === '运行科管理人员') {
        return true;
      }
      
      // 如果没有或不是管理员，尝试从API获取
      const user = await authService.getCurrentUser();
      if (user && (
        user.role === '部门经理' || 
        user.role === '安全科管理人员' || 
        user.role === '运行科管理人员'
      )) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('检查管理员权限失败:', error);
      return false;
    }
  },
  
  // 检查用户是否是值班主任
  isShiftSupervisor: async () => {
    try {
      // 先检查localStorage中是否有角色信息
      const roleFromStorage = localStorage.getItem('userRole');
      if (roleFromStorage === '值班主任') {
        return true;
      }
      
      // 如果没有或不是值班主任，尝试从API获取
      const user = await authService.getCurrentUser();
      if (user && user.role === '值班主任') {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('检查值班主任权限失败:', error);
      return false;
    }
  },
  
  // 检查用户是否有审核权限（部门经理、安全科管理人员、运行科管理人员或值班主任）
  hasReviewPermission: async () => {
    try {
      // 先检查localStorage中是否有角色信息
      const roleFromStorage = localStorage.getItem('userRole');
      if (roleFromStorage === '部门经理' || 
          roleFromStorage === '安全科管理人员' || 
          roleFromStorage === '运行科管理人员' ||
          roleFromStorage === '值班主任') {
        console.log('hasReviewPermission: 用户有审核权限(从localStorage检查)', roleFromStorage);
        return true;
      }
      
      // 如果没有或不符合条件，尝试从API获取
      const user = await authService.getCurrentUser();
      console.log('hasReviewPermission: 从API获取用户信息', user);
      
      if (user && (
        user.role === '部门经理' || 
        user.role === '安全科管理人员' || 
        user.role === '运行科管理人员' ||
        user.role === '值班主任'
      )) {
        console.log('hasReviewPermission: 用户有审核权限(从API检查)', user.role);
        return true;
      }
      
      console.log('hasReviewPermission: 用户没有审核权限');
      return false;
    } catch (error) {
      console.error('检查审核权限失败:', error);
      return false;
    }
  },
  
  // 获取用户角色
  getUserRole: () => {
    // 首先从localStorage获取角色
    const roleFromStorage = localStorage.getItem('userRole');
    if (roleFromStorage) {
      return roleFromStorage;
    }
    
    // 如果没有，从currentUser获取
    try {
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user && user.role) {
          return user.role;
        }
      }
    } catch (error) {
      console.error('获取用户角色失败:', error);
    }
    
    return null;
  }
}; 