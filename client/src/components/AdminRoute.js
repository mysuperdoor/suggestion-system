import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { message, Spin } from 'antd';
import { authService } from '../services/authService';

const AdminRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 使用新的辅助函数检查部门经理权限
        const hasDepartmentManagerAccess = await authService.isDepartmentManager();
        setIsAdmin(hasDepartmentManagerAccess);
        
        if (!hasDepartmentManagerAccess) {
          setError('需要部门经理权限');
        }
      } catch (error) {
        console.error('检查管理员权限失败:', error);
        setIsAdmin(false);
        setError(error.message || '检查权限失败');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="验证权限中..." />
      </div>
    );
  }

  if (error || !isAdmin) {
    console.log('AdminRoute - 权限不足，重定向到首页');
    message.error('需要部门经理权限');
    return <Navigate to="/" replace />;
  }

  console.log('AdminRoute - 部门经理权限验证通过');
  return children;
};

export default AdminRoute; 