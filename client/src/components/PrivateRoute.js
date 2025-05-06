import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';

const PrivateRoute = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();

  console.log('PrivateRoute检查认证状态:', {
    isAuthenticated,
    currentPath: location.pathname,
    token: localStorage.getItem('token')
  });

  if (!isAuthenticated) {
    // 重定向到登录页面，保存当前路径
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default PrivateRoute; 