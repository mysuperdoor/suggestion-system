// 获取认证头信息
export const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// 获取当前用户ID
export const getCurrentUserId = () => {
  return localStorage.getItem('userId');
};

// 检查用户是否已登录
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

// 检查用户是否有特定角色
export const hasRole = (roleToCheck) => {
  const userRole = localStorage.getItem('userRole');
  return userRole === roleToCheck;
}; 