import React from 'react';
import { Tabs } from 'antd';
import UserManagement from './components/UserManagement';
// ... 其他导入

const Admin = () => {
  const items = [
    {
      key: 'users',
      label: '用户管理',
      children: <UserManagement />
    },
    {
      key: 'roles',
      label: '角色权限',
      children: <div>角色权限管理内容</div>,
    },
    {
      key: 'teams',
      label: '班组管理',
      children: <div>班组管理内容</div>,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Tabs items={items} />
    </div>
  );
};

export default Admin; 