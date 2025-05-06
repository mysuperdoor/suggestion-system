import React, { useState } from 'react';
import { Tabs, Card } from 'antd';
import UserManagement from './components/UserManagement';
import RoleManagement from './components/RoleManagement';
import TeamManagement from './components/TeamManagement';

const Admin = () => {
  const items = [
    {
      key: 'users',
      label: '用户管理',
      children: <UserManagement />,
    },
    {
      key: 'roles',
      label: '角色权限',
      children: <RoleManagement />,
    },
    {
      key: 'teams',
      label: '班组管理',
      children: <TeamManagement />,
    },
  ];

  return (
    <div>
      <h2>系统管理</h2>
      <Card>
        <Tabs defaultActiveKey="users" items={items} />
      </Card>
    </div>
  );
};

export default Admin; 