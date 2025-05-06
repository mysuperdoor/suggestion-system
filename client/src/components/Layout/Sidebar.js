import React, { useState, useEffect } from 'react';
import { Menu } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import {
  HomeOutlined,
  FileTextOutlined,
  PlusOutlined,
  BarChartOutlined,
  TeamOutlined,
  LockOutlined,
  UserOutlined,
  LogoutOutlined,
  AuditOutlined,
  ToolOutlined,
  PieChartOutlined
} from '@ant-design/icons';
import { authService } from '../../services/authService';

const Sidebar = ({ role: propRole }) => {
  const [role, setRole] = useState(propRole || localStorage.getItem('userRole'));
  const navigate = useNavigate();

  useEffect(() => {
    // 如果props中没有role，尝试从localStorage获取
    if (!propRole) {
      const storedRole = localStorage.getItem('userRole');
      if (storedRole) {
        setRole(storedRole);
      } else {
        // 如果localStorage也没有，尝试从currentUser获取
        authService.getCurrentUser().then(user => {
          if (user && user.role) {
            setRole(user.role);
            localStorage.setItem('userRole', user.role);
          }
        }).catch(err => {
          console.error('获取用户角色失败:', err);
        });
      }
    } else if (propRole !== role) {
      // 如果props中的role变化了，更新状态
      setRole(propRole);
    }
  }, [propRole]);

  // 根据角色确定权限
  const isAdmin = role === '部门经理' || role === '安全科管理人员' || role === '运行科管理人员';
  const isDepartmentManager = role === '部门经理';
  const isSupervisor = role === '值班主任';
  const isSafetyOrOperationAdmin = role === '安全科管理人员' || role === '运行科管理人员';
  
  // 确定是否显示审核菜单（值班主任、安全科管理人员、运行科管理人员、部门经理可见）
  const canReview = isSupervisor || isAdmin;
  
  // 确定是否显示实施跟踪菜单（安全科管理人员、运行科管理人员、部门经理可见）
  const canManageImplementation = isAdmin;
  
  // 确定是否可以提交建议（除了安全科管理人员和运行科管理人员外的所有人可见）
  const canSubmitSuggestion = !isSafetyOrOperationAdmin;

  console.log('Sidebar - 用户角色:', role);
  console.log('Sidebar - 是否管理员:', isAdmin);
  console.log('Sidebar - 是否部门经理:', isDepartmentManager);
  console.log('Sidebar - 是否可以提交建议:', canSubmitSuggestion);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <Menu
      mode="inline"
      defaultSelectedKeys={['1']}
      style={{ height: '100%', borderRight: 0 }}
    >
      <Menu.Item key="1" icon={<HomeOutlined />}>
        <Link to="/dashboard">首页</Link>
      </Menu.Item>
      
      <Menu.Item key="2" icon={<FileTextOutlined />}>
        <Link to="/suggestions/list">建议列表</Link>
      </Menu.Item>
      
      {canSubmitSuggestion && (
        <Menu.Item key="3" icon={<PlusOutlined />}>
          <Link to="/suggestions/new">提交新建议</Link>
        </Menu.Item>
      )}

      {canReview && (
        <Menu.Item key="4" icon={<AuditOutlined />}>
          <Link to="/suggestions/review">建议审核</Link>
        </Menu.Item>
      )}

      {canManageImplementation && (
        <Menu.Item key="5" icon={<ToolOutlined />}>
          <Link to="/suggestions/implementation">实施跟踪</Link>
        </Menu.Item>
      )}

      {isAdmin && (
        <Menu.Item key="6" icon={<BarChartOutlined />}>
          <Link to="/reports/department-performance">报表统计</Link>
        </Menu.Item>
      )}

      {isDepartmentManager && (
        <Menu.Item key="7" icon={<TeamOutlined />}>
          <Link to="/users">用户管理</Link>
        </Menu.Item>
      )}

      <Menu.Item key="9" icon={<LockOutlined />}>
        <Link to="/change-password">修改密码</Link>
      </Menu.Item>
      
      <Menu.Item key="10" icon={<LogoutOutlined />} onClick={handleLogout}>
        退出登录
      </Menu.Item>
    </Menu>
  );
};

export default Sidebar; 