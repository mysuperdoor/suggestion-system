import React from 'react';
import { Layout, Menu, Dropdown, Space, Avatar, message } from 'antd';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  HomeOutlined,
  PlusOutlined,
  CheckOutlined,
  BarChartOutlined,
  TeamOutlined,
  UserOutlined,
  LogoutOutlined
} from '@ant-design/icons';
import { authService } from '../../services/authService';

const { Header, Footer, Content } = Layout;

const BasicLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = authService.getCurrentUser();

  // 检查是否有管理员权限
  const hasAdminAccess = currentUser?.role === '部门经理' || 
                        currentUser?.role === '运行科管理人员';

  const menuItems = [
    {
      key: '/home',
      icon: <HomeOutlined />,
      label: '首页'
    },
    {
      key: '/suggestions/new',
      icon: <PlusOutlined />,
      label: '提交建议'
    },
    {
      key: '/suggestions/list',
      icon: <CheckOutlined />,
      label: '建议列表'
    },
    {
      key: '/reports',
      icon: <BarChartOutlined />,
      label: '统计报表'
    },
    hasAdminAccess && {
      key: '/admin',
      icon: <TeamOutlined />,
      label: '系统管理'
    }
  ].filter(Boolean); // 过滤掉 false 值

  const handleMenuClick = (e) => {
    navigate(e.key);
  };

  const handleLogout = () => {
    authService.logout();
    message.success('退出登录成功');
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息'
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录'
    }
  ];

  const handleUserMenuClick = ({ key }) => {
    if (key === 'logout') {
      handleLogout();
    } else if (key === 'profile') {
      // 跳转到个人信息页面
      navigate('/profile');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ 
        padding: 0,
        display: 'flex',
        alignItems: 'center'
      }}>
        <div className="header-logo" style={{
          marginLeft: '24px',
          marginRight: '24px',
          width: 'auto',
          minWidth: '120px',
          color: '#fff',
          fontSize: '18px'
        }}>
          合理化建议系统
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ 
            flex: 1,
            minWidth: 0
          }}
        />
        <div style={{ marginRight: '24px' }}>
          <Dropdown
            menu={{
              items: userMenuItems,
              onClick: handleUserMenuClick
            }}
          >
            <Space style={{ color: '#fff', cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <span>{currentUser?.name || '用户'}</span>
            </Space>
          </Dropdown>
        </div>
      </Header>
      <Content style={{ 
        padding: '24px',
        background: '#f0f2f5'
      }}>
        <div style={{ 
          background: '#fff',
          padding: '24px',
          minHeight: '280px',
          borderRadius: '2px'
        }}>
          <Outlet />
        </div>
      </Content>
      <Footer style={{ 
        textAlign: 'center',
        background: '#fff'
      }}>
        合理化建议管理系统 ©{new Date().getFullYear()}
      </Footer>
    </Layout>
  );
};

export default BasicLayout; 