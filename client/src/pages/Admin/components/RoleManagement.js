import React from 'react';
import { Table, Tag, Card, List } from 'antd';

const RoleManagement = () => {
  const rolePermissions = [
    {
      role: 'department_manager',
      name: '部门经理',
      permissions: [
        '查看所有建议',
        '查看统计报表',
        '管理用户',
        '管理角色权限'
      ]
    },
    {
      role: 'safety_admin',
      name: '安全管理员',
      permissions: [
        '审核安全类建议',
        '跟踪建议实施',
        '查看统计报表'
      ]
    },
    {
      role: 'ops_admin',
      name: '运行管理员',
      permissions: [
        '审核生产类建议',
        '跟踪建议实施',
        '查看统计报表'
      ]
    },
    {
      role: 'shift_supervisor',
      name: '值班主任',
      permissions: [
        '一级审核建议',
        '查看本班组建议',
        '查看统计报表'
      ]
    },
    {
      role: 'team_member',
      name: '班组成员',
      permissions: [
        '提交建议',
        '查看个人建议'
      ]
    }
  ];

  return (
    <div>
      <List
        grid={{ gutter: 16, column: 1 }}
        dataSource={rolePermissions}
        renderItem={item => (
          <List.Item>
            <Card title={item.name}>
              <div>
                {item.permissions.map((permission, index) => (
                  <Tag key={index} color="blue" style={{ margin: '4px' }}>
                    {permission}
                  </Tag>
                ))}
              </div>
            </Card>
          </List.Item>
        )}
      />
    </div>
  );
};

export default RoleManagement; 