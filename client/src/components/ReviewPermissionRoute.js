import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { message, Spin } from 'antd';
import { authService } from '../services/authService';

/**
 * 审核权限路由组件
 * 允许部门经理、安全科管理人员、运行科管理人员和值班主任访问
 */
const ReviewPermissionRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 检查是否有审核权限
        const hasReviewAccess = await authService.hasReviewPermission();
        setHasAccess(hasReviewAccess);
        
        if (!hasReviewAccess) {
          setError('需要审核权限');
        }
      } catch (error) {
        console.error('检查审核权限失败:', error);
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
    console.log('ReviewPermissionRoute - 权限不足，重定向到首页');
    message.error('您需要审核权限才能访问此页面');
    return <Navigate to="/" replace />;
  }

  console.log('ReviewPermissionRoute - 审核权限验证通过');
  return children;
};

export default ReviewPermissionRoute; 