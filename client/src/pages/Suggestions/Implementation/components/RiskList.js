import React from 'react';
import { Table, Tag, Button, Space, Popconfirm, Typography, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import moment from 'moment';

const { Text } = Typography;

const RiskList = ({ 
  risks = [], 
  onEdit, 
  onDelete,
  loading = false 
}) => {
  // 风险等级颜色映射
  const levelColors = {
    'LOW': 'success',
    'MEDIUM': 'warning',
    'HIGH': 'error'
  };

  // 风险等级文本映射
  const levelTexts = {
    'LOW': '低',
    'MEDIUM': '中',
    'HIGH': '高'
  };

  // 状态颜色映射
  const statusColors = {
    'OPEN': 'error',
    'MITIGATED': 'warning',
    'CLOSED': 'success'
  };

  // 状态文本映射
  const statusTexts = {
    'OPEN': '未解决',
    'MITIGATED': '已缓解',
    'CLOSED': '已关闭'
  };

  const columns = [
    {
      title: '风险',
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
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      render: level => (
        <Tag color={levelColors[level]}>
          {levelTexts[level] || level}
        </Tag>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => (
        <Tooltip title={record.mitigationPlan || '暂无缓解计划'}>
          <Tag color={statusColors[status]}>
            {statusTexts[status] || status}
          </Tag>
        </Tooltip>
      )
    },
    {
      title: '识别时间',
      dataIndex: 'identifiedAt',
      key: 'identifiedAt',
      render: date => date ? moment(date).format('YYYY-MM-DD') : '-'
    },
    {
      title: '解决时间',
      dataIndex: 'resolvedAt',
      key: 'resolvedAt',
      render: date => date ? moment(date).format('YYYY-MM-DD') : '-'
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
            title="确定要删除这个风险记录吗?"
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
      dataSource={risks}
      rowKey={record => record._id || record.title}
      loading={loading}
      pagination={false}
      size="small"
    />
  );
};

export default RiskList; 