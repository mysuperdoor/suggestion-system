import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { message, Spin } from 'antd';
import { authService } from '../services/authService';

/**
 * 部门经理路由组件
 * 只允许部门经理访问
 */
const DepartmentManagerRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 检查是否有部门经理权限
        const hasDepartmentManagerAccess = await authService.isDepartmentManager();
        setHasAccess(hasDepartmentManagerAccess);
        
        if (!hasDepartmentManagerAccess) {
          setError('需要部门经理权限');
        }
      } catch (error) {
        console.error('检查部门经理权限失败:', error);
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
    console.log('DepartmentManagerRoute - 权限不足，重定向到首页');
    message.error('需要部门经理权限才能访问此页面');
    return <Navigate to="/" replace />;
  }

  console.log('DepartmentManagerRoute - 部门经理权限验证通过');
  return children;
};

export default DepartmentManagerRoute; 