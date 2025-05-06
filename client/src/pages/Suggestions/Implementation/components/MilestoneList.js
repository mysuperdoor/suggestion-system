import React from 'react';
import { Table, Tag, Button, Space, Popconfirm, Typography } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import moment from 'moment';

const { Text } = Typography;

const MilestoneList = ({ 
  milestones = [], 
  onEdit, 
  onDelete,
  loading = false 
}) => {
  // 状态颜色映射
  const statusColors = {
    'NOT_STARTED': 'default',
    'IN_PROGRESS': 'processing',
    'COMPLETED': 'success',
    'DELAYED': 'error'
  };

  // 状态文本映射
  const statusTexts = {
    'NOT_STARTED': '未开始',
    'IN_PROGRESS': '进行中',
    'COMPLETED': '已完成',
    'DELAYED': '延期'
  };

  const columns = [
    {
      title: '里程碑',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          {record.description && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.description}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: '计划日期',
      dataIndex: 'plannedDate',
      key: 'plannedDate',
      render: date => date ? moment(date).format('YYYY-MM-DD') : '-'
    },
    {
      title: '实际日期',
      dataIndex: 'actualDate',
      key: 'actualDate',
      render: date => date ? moment(date).format('YYYY-MM-DD') : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: status => (
        <Tag color={statusColors[status]}>
          {statusTexts[status] || status}
        </Tag>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => onEdit?.(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个里程碑吗?"
            onConfirm={() => onDelete?.(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Table
      columns={columns}
      dataSource={milestones}
      rowKey={record => record._id || record.title}
      loading={loading}
      pagination={false}
      size="small"
    />
  );
};

export default MilestoneList; 