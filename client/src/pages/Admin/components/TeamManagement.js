import React, { useState } from 'react';
import { Table, Button, Space, Modal, Form, Input, Card, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

const TeamManagement = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingTeam, setEditingTeam] = useState(null);

  const columns = [
    {
      title: '班组名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '值班主任',
      dataIndex: 'supervisor',
      key: 'supervisor',
    },
    {
      title: '成员数量',
      dataIndex: 'memberCount',
      key: 'memberCount',
    },
    {
      title: '本月建议数',
      dataIndex: 'suggestionCount',
      key: 'suggestionCount',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="link" 
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const mockData = [
    {
      key: '1',
      name: 'A班',
      supervisor: '张三',
      memberCount: 12,
      suggestionCount: 25,
    },
    {
      key: '2',
      name: 'B班',
      supervisor: '李四',
      memberCount: 10,
      suggestionCount: 18,
    },
  ];

  const handleAdd = () => {
    setEditingTeam(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (team) => {
    setEditingTeam(team);
    form.setFieldsValue(team);
    setIsModalVisible(true);
  };

  const handleDelete = (team) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除班组 ${team.name} 吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        // 调用删除API
        console.log('删除班组:', team);
      },
    });
  };

  const handleModalOk = () => {
    form.validateFields().then(values => {
      console.log('表单数据:', values);
      // 调用添加/更新API
      setIsModalVisible(false);
    });
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加班组
        </Button>
      </div>
      <Table columns={columns} dataSource={mockData} />

      <Modal
        title={editingTeam ? '编辑班组' : '添加班组'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="班组名称"
            rules={[{ required: true, message: '请输入班组名称' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="supervisor"
            label="值班主任"
            rules={[{ required: true, message: '请输入值班主任姓名' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TeamManagement; 