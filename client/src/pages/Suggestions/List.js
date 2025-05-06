import React, { useState, useEffect } from 'react';
import {
  Table,
  Tag,
  Space,
  Button,
  message
} from 'antd';
import { EyeOutlined, EditOutlined } from '@ant-design/icons';
import { suggestionService } from '../../services/suggestionService';
import { authService } from '../../services/authService';
import { useNavigate } from 'react-router-dom';
import {
  SUGGESTION_TYPES,
  SUGGESTION_STATUS,
  STATUS_COLORS,
  TYPE_COLORS,
  IMPLEMENTATION_STATUS,
  IMPLEMENTATION_STATUS_COLORS
} from '../../constants/suggestions';
import { getStatusDisplayText, getStatusColor } from '../../utils/statusUtils'; // 导入工具函数

const SuggestionList = () => {
  // 检查 STATUS_COLORS 是否正确导入
  console.log('STATUS_COLORS:', STATUS_COLORS);
  
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  const currentUser = authService.getCurrentUser();
  const isManager = currentUser?.role === '部门经理';
  const isSupervisor = currentUser?.role === '值班主任';
  const isSafetyAdmin = currentUser?.role === '安全科管理人员';
  const isOperationAdmin = currentUser?.role === '运行科管理人员';

  const navigate = useNavigate();

  // 获取建议列表
  const fetchSuggestions = async (params = {}) => {
    try {
      setLoading(true);
      const response = await suggestionService.getSuggestions(params);
      console.log('获取到的建议列表数据:', response);
      
      // 从response中解构data和pagination
      const { data, pagination: responsePagination } = response;
      
      // 设置建议数据
      setSuggestions(data || []);
      
      // 更新分页信息
      if (responsePagination) {
        setPagination({
          ...pagination,
          total: responsePagination.total || 0,
          current: responsePagination.current || 1,
          pageSize: responsePagination.pageSize || 10
        });
      }
    } catch (error) {
      console.error('获取建议列表失败:', error);
      message.error('获取建议列表失败');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions(); // 初始加载

    // 添加 focus 事件监听器，当页面获得焦点时刷新
    const handleFocus = () => {
      console.log('SuggestionList window focused, refreshing data...');
      // 重新获取时，应该基于当前的筛选和排序状态，或者获取第一页?
      // 为简单起见，先只获取当前页
      fetchSuggestions({
        page: pagination.current,
        limit: pagination.pageSize
        // 注意：这里没有传递当前的 filters 和 sorter，如果需要，需要从状态中读取
      });
    };

    window.addEventListener('focus', handleFocus);

    // 组件卸载时移除监听器
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []); // 保持空依赖，只在挂载和卸载时运行

  // 处理表格变化 (分页、排序、筛选)
  const handleTableChange = (pagination, filters, sorter) => {
    console.log('Table changed:', pagination, filters, sorter);
    const params = {
      page: pagination.current,
      limit: pagination.pageSize,
    };
    // 添加筛选参数
    if (filters) {
      // 注意：这里假设 filter 的 key 与后端期望的参数名一致
      // 例如，状态筛选器的 key 是 'status' 或 'reviewStatus'?
      // 需要与 columns 定义中的 filter key 对应
      if (filters.status && filters.status.length > 0) {
        // Antd filters value is an array
        params.reviewStatus = filters.status.join(','); // 后端 getSuggestions 检查 reviewStatus
      }
      if (filters.type && filters.type.length > 0) {
        params.type = filters.type.join(',');
      }
      // Add other filters if any
    }
    // 添加排序参数
    if (sorter && sorter.field) {
      params.sortBy = sorter.field;
      // Antd order is 'ascend' or 'descend'
      params.sortOrder = sorter.order === 'ascend' ? 'asc' : 'desc'; 
    }
    
    // 调用 fetchSuggestions 更新数据
    fetchSuggestions(params);
  };

  // 查看建议详情
  const handleView = (record) => {
    navigate(`/suggestions/${record._id}`);
  };

  // 获取当前状态
  const getCurrentStatus = (record) => {
    // 优先使用 reviewStatus，如果不存在则使用 status
    const status = record.reviewStatus || record.status;
    
    // 如果状态值是中文，尝试转换为英文键名
    if (typeof status === 'string' && /[\u4e00-\u9fa5]/.test(status)) {
      // 查找 SUGGESTION_STATUS 对象中键值对应的中文值
      const statusEntry = Object.entries(SUGGESTION_STATUS).find(([_, value]) => value === status);
      const result = statusEntry ? statusEntry[0] : status;
      
      console.log('状态值转换:', {
        原始状态: status,
        是否中文: /[\u4e00-\u9fa5]/.test(status),
        转换结果: result,
        颜色: STATUS_COLORS[result]
      });
      
      return result;
    }
    
    return status;
  };

  // 表格列定义
  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: '20%',
      sorter: true, // 添加排序功能
      render: (text) => <span style={{ fontSize: '14px' }}>{text}</span>
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: '10%',
      sorter: true, // 添加排序功能
      render: (type) => (
        <Tag 
          color={TYPE_COLORS[type] || 'default'}
          style={{ 
            padding: '4px 8px', 
            borderRadius: '4px', 
            fontSize: '14px'
          }}
        >
          {SUGGESTION_TYPES[type] || type}
        </Tag>
      )
    },
    {
      title: '提交人',
      dataIndex: ['submitter', 'name'],
      key: 'submitter',
      width: '10%',
      sorter: true, // 添加排序功能
      render: (text, record) => <span style={{ fontSize: '14px' }}>{record.submitter ? record.submitter.name : '未知'}</span>
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '15%',
      sorter: true, // 添加排序功能
      render: (text) => <span style={{ fontSize: '14px' }}>{text ? new Date(text).toLocaleString() : '未知'}</span>
    },
    {
      title: '建议状态',
      dataIndex: 'status',
      key: 'status',
      width: '10%',
      sorter: true, // 添加排序功能
      render: (status, record) => {
        const currentStatus = getCurrentStatus(record);
        console.log('状态渲染:', {
          原始状态: status,
          当前状态: currentStatus,
          状态颜色: STATUS_COLORS[currentStatus],
          状态显示文本: SUGGESTION_STATUS[currentStatus] || currentStatus
        });
        
        // 确保显示正确的颜色，即使状态是中文
        const displayColor = STATUS_COLORS[currentStatus] || 'default';
        
        return (
          <Tag 
            color={displayColor}
            style={{ 
              padding: '4px 8px', 
              borderRadius: '4px', 
              fontSize: '14px'
            }}
          >
            {SUGGESTION_STATUS[currentStatus] || currentStatus}
          </Tag>
        );
      }
    },
    {
      title: '实施状态',
      dataIndex: 'implementationStatus',
      key: 'implementationStatus',
      width: '10%',
      sorter: true, // 添加排序功能
      render: (status, record) => {
        // 获取实施状态，优先使用 implementation 嵌套对象中的状态
        const implStatus = record.implementation?.status || status || 'NOT_STARTED';
        // 使用统一的状态显示函数
        const statusText = getStatusDisplayText(implStatus, 'implementation');
        const statusColor = getStatusColor(implStatus, 'implementation');

        return (
          <Tag
            color={statusColor}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            {statusText}
          </Tag>
        );
      }
    },
    {
      title: '得分',
      dataIndex: ['scoring', 'score'],
      key: 'score',
      width: '8%',
      sorter: (a, b) => {
        // 确保正确排序，处理空值情况
        const scoreA = a.scoring?.score;
        const scoreB = b.scoring?.score;
        
        // 当两个值都存在时进行数值比较
        if (scoreA !== undefined && scoreA !== null && 
            scoreB !== undefined && scoreB !== null) {
          return scoreA - scoreB;
        }
        
        // 处理空值情况 (将空值排在最后)
        if (scoreA === undefined || scoreA === null) return 1;
        if (scoreB === undefined || scoreB === null) return -1;
        return 0;
      },
      render: (score) => (
        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
          {/* Display score with one decimal place */}
          {typeof score === 'number' ? score.toFixed(1) : '-'}
        </span>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => {
        const currentStatus = getCurrentStatus(record);
        return (
          <Space>
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
              style={{ fontSize: '14px' }}
            >
              查看
            </Button>
            {/* 部门经理可以看到一级审核按钮（对所有等待一级审核的建议） */}
            {isManager && currentStatus === 'PENDING_FIRST_REVIEW' && (
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => navigate(`/suggestions/${record._id}`)}
                style={{ fontSize: '14px' }}
              >
                一级审核
              </Button>
            )}
            {/* 安全科管理人员可以看到二级审核按钮（对安全类且等待二级审核的建议） */}
            {isSafetyAdmin && currentStatus === 'PENDING_SECOND_REVIEW' && record.type === 'SAFETY' && (
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => navigate(`/suggestions/${record._id}`)}
                style={{ fontSize: '14px' }}
              >
                二级审核
              </Button>
            )}
            {/* 运行科管理人员可以看到二级审核按钮（对非安全类且等待二级审核的建议） */}
            {isOperationAdmin && currentStatus === 'PENDING_SECOND_REVIEW' && record.type !== 'SAFETY' && (
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => navigate(`/suggestions/${record._id}`)}
                style={{ fontSize: '14px' }}
              >
                二级审核
              </Button>
            )}
            {/* 部门经理可以看到二级审核按钮（对所有等待二级审核的建议） */}
            {isManager && currentStatus === 'PENDING_SECOND_REVIEW' && (
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => navigate(`/suggestions/${record._id}`)}
                style={{ fontSize: '14px' }}
              >
                二级审核
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Table
        columns={columns}
        dataSource={suggestions}
        rowKey="_id"
        pagination={pagination}
        loading={loading}
        onChange={handleTableChange}
        style={{ fontSize: '14px' }}
        className="suggestions-table"
        bordered
        rowClassName={() => 'suggestion-row'}
      />
    </div>
  );
};

export default SuggestionList; 