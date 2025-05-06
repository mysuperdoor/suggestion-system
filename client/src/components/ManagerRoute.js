import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { message, Spin } from 'antd';
import { authService } from '../services/authService';

/**
 * 管理人员路由组件
 * 允许部门经理、安全科管理人员、运行科管理人员和值班主任访问
 */
const ManagerRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 获取当前用户
        const currentUser = await authService.getCurrentUser();
        if (!currentUser) {
          setError('获取用户信息失败');
          setHasAccess(false);
          return;
        }
        
        // 检查用户角色是否有权限
        const role = currentUser.role;
        const hasPermission = role === '部门经理' || 
                              role === '安全科管理人员' || 
                              role === '运行科管理人员' ||
                              role === '值班主任';
        
        console.log('ManagerRoute - 当前用户角色:', role);
        console.log('ManagerRoute - 是否有访问权限:', hasPermission);
        
        setHasAccess(hasPermission);
        
        if (!hasPermission) {
          setError('您没有权限访问此页面');
        }
      } catch (error) {
        console.error('检查访问权限失败:', error);
        setHasAccess(false);
        setError(error.message || '检查权限失败');
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="验证权限中..." />
      </div>
    );
  }

  if (error || !hasAccess) {
    console.log('ManagerRoute - 权限不足，重定向到首页');
    message.error('您没有权限访问此页面');
    return <Navigate to="/" replace />;
  }

  console.log('ManagerRoute - 权限验证通过');
  return children;
};

export default ManagerRoute; 