import React from 'react';
import { Layout as AntLayout } from 'antd';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const { Content, Sider } = AntLayout;

const Layout = () => {
  // 从localStorage获取用户信息
  const userRole = localStorage.getItem('userRole');

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider width={200} theme="light">
        <Sidebar role={userRole} />
      </Sider>
      <AntLayout>
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff' }}>
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout; 