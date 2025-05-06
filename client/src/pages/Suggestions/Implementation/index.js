import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  message,
  Typography,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Upload,
  Timeline,
  Alert,
  Tooltip,
  Collapse,
  Empty
} from 'antd';
import {
  FileTextOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  InboxOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import { suggestionService } from '../../../services/suggestionService';
import { authService } from '../../../services/authService';
import { 
  SUGGESTION_TYPES, 
  SUGGESTION_STATUS, 
  STATUS_COLORS, 
  TYPE_COLORS,
  IMPLEMENTATION_STATUS,
  IMPLEMENTATION_STATUS_COLORS,
  REVIEW_STATUS
} from '../../../constants/suggestions';
import { getStatusDisplayText, getStatusColor } from '../../../utils/statusUtils';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;
const { Dragger } = Upload;

const ImplementationList = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [implementationSuggestions, setImplementationSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [currentSuggestion, setCurrentSuggestion] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [currentStatusValue, setCurrentStatusValue] = useState('未开始');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // 表格变化处理器 (分页, 排序, 筛选)
  const handleTableChange = (newPagination, filters, sorter) => {
    console.log('Table changed:', newPagination, filters, sorter);
    // 更新分页状态并重新获取数据
    // 注意：如果需要支持排序和筛选，需要在这里处理 filters 和 sorter
    // 并将相应的参数传递给 fetchImplementationSuggestions
    setPagination(prev => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    }));
    // fetchImplementationSuggestions 将在 pagination 变化时通过 useEffect 触发
  };

  // 获取当前用户信息
  const fetchCurrentUser = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        message.error('请先登录');
        navigate('/login');
        return;
      }
      setCurrentUser(user);
    } catch (error) {
      console.error('获取用户信息失败:', error);
      message.error('获取用户信息失败');
      navigate('/login');
    }
  };
  
  useEffect(() => {
    fetchCurrentUser();
  }, [navigate]);

  // 获取待实施和实施中的建议
  const fetchImplementationSuggestions = async (page = pagination.current, pageSize = pagination.pageSize) => {
    try {
      setLoading(true);
      
      // 准备API请求参数
      const params = {
        page,
        pageSize,
        reviewStatus: 'APPROVED', // 固定查询已批准的
        includeImplementation: true, // 确保包含实施信息
        forceRefresh: true // 保持强制刷新
      };

      // 根据用户角色添加过滤 (如果不是管理员或经理)
      // 注意：后端控制器现在会根据 req.user.id 处理 responsiblePersonId 和 submitterId
      // 所以前端只需要传递用户的意图
      if (currentUser && !['部门经理', '安全科管理人员', '运行科管理人员'].includes(currentUser.role)) {
        // 普通用户或责任人，假设他们只能看到自己负责或自己提交的
        // 后端会处理具体的逻辑，前端可以不显式传递 ID，或根据需要传递
        // params.responsiblePersonId = currentUser._id; // 如果希望只看负责的
        // params.submitterId = currentUser._id;       // 如果希望只看提交的
        // 或者让后端根据角色判断
        console.log('非管理员角色，后端将根据用户ID进行过滤');
      }

      console.log('开始获取实施建议数据...');
      console.log('请求参数:', params);
      
      const response = await suggestionService.getSuggestions(params);

      console.log('获取到实施建议数据:', response);
      
      // 直接使用后端返回的数据和分页信息
      if (response && response.data && response.pagination) {
        setImplementationSuggestions(response.data);
        setPagination(prev => ({
          ...prev,
          current: response.pagination.current,
          pageSize: response.pagination.pageSize,
          total: response.pagination.total,
        }));
      } else {
        // 处理可能的错误或空数据情况
        setImplementationSuggestions([]);
        setPagination(prev => ({ ...prev, total: 0 }));
        console.warn('从API获取的数据格式不符合预期或数据为空');
      }
    } catch (error) {
      console.error('获取待实施建议失败:', error);
      message.error('获取待实施建议失败');
      setImplementationSuggestions([]);
      setPagination(prev => ({ ...prev, total: 0, current: 1 })); // 出错时重置分页
    } finally {
      setLoading(false);
    }
  };

  // 当 currentUser 或分页变化时，获取数据
  useEffect(() => {
    if (currentUser) {
      fetchImplementationSuggestions(pagination.current, pagination.pageSize);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, pagination.current, pagination.pageSize]);

  // 点击查看详情
  const handleViewDetail = (id) => {
    navigate(`/suggestions/${id}`);
  };

  // 打开更新实施状态模态框
  const showUpdateModal = (suggestion) => {
    setCurrentSuggestion(suggestion);
    setUpdateModalVisible(true);
    
    // 确定当前状态
    let currentStatus = '未开始';
    
    if (suggestion.implementation && suggestion.implementation.status) {
      // 优先使用implementation中的status
      currentStatus = getStatusDisplayText(suggestion.implementation.status, 'implementation');
    } else if (suggestion.implementationStatus) {
      // 其次使用顶层的implementationStatus
      currentStatus = getStatusDisplayText(suggestion.implementationStatus, 'implementation');
    }
    
    console.log('当前状态:', currentStatus);
    
    // 更新当前状态值
    setCurrentStatusValue(currentStatus);
    
    // 预填表单
    form.setFieldsValue({
      status: currentStatus, // 使用从 getStatusDisplayText 获取的中文状态
      responsiblePerson: suggestion.implementation?.responsiblePerson || '',
      startDate: suggestion.implementation?.startDate ? moment(suggestion.implementation.startDate) : null,
      plannedEndDate: suggestion.implementation?.plannedEndDate ? moment(suggestion.implementation.plannedEndDate) : null,
      actualEndDate: suggestion.implementation?.actualEndDate ? moment(suggestion.implementation.actualEndDate) : null,
      notes: suggestion.implementation?.notes || '',
    });
  };

  // 处理状态变更
  const handleStatusChange = (value) => {
    console.log('状态变更为:', value);
    setCurrentStatusValue(value);
    form.setFieldsValue({ status: value });
  };

  // 关闭更新实施状态模态框
  const handleUpdateCancel = () => {
    setUpdateModalVisible(false);
    setCurrentSuggestion(null);
    form.resetFields();
  };

  // 提交实施状态更新
  const handleUpdateSubmit = async () => {
    try {
      // 验证表单
      const values = await form.validateFields();
      setConfirmLoading(true);

      // 将中文状态转换回英文键
      const statusKey = Object.keys(IMPLEMENTATION_STATUS).find(
        key => IMPLEMENTATION_STATUS[key] === values.status
      );

      if (!statusKey) {
        message.error('无效的状态选择，无法找到对应的状态代码');
        setConfirmLoading(false);
        return;
      }

      const updateData = {
        status: statusKey, // 使用转换后的英文键
        responsiblePerson: values.responsiblePerson,
        startDate: values.startDate?.format('YYYY-MM-DD'),
        plannedCompletionDate: values.plannedEndDate?.format('YYYY-MM-DD'), // 注意字段名对应后端
        actualCompletionDate: values.actualEndDate?.format('YYYY-MM-DD'), // 注意字段名对应后端
        notes: values.notes
        // 移除 evaluation 相关字段
      };

      console.log('准备更新实施状态:', currentSuggestion._id, updateData);

      // 调用 service 更新状态
      const result = await suggestionService.updateImplementation(currentSuggestion._id, updateData);

      console.log('更新实施状态 API 响应:', result);

      if (result && result.success) { // 检查 success 标志
        message.success('实施状态更新成功');
        setUpdateModalVisible(false);
        // 重新加载数据
        fetchImplementationSuggestions(pagination.current, pagination.pageSize);
      } else {
        message.error(result?.message || '操作失败'); // 显示后端返回的错误信息
      }
    } catch (error) {
      console.error('更新实施状态失败:', error);
      // 检查是否是表单验证错误
      if (error.errorFields) {
        message.error('表单填写有误，请检查');
      } else {
         message.error('更新实施状态时发生错误');
      }
    } finally {
      setConfirmLoading(false);
    }
  };

  // 打开详情查看模态框
  const showDetailModal = (suggestion) => {
    setCurrentSuggestion(suggestion);
    setDetailVisible(true);
  };

  // 关闭详情查看模态框
  const handleDetailCancel = () => {
    setDetailVisible(false);
  };

  // 表格列定义
  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <Button 
          type="link" 
          onClick={() => showDetailModal(record)}
          style={{ fontSize: '14px', padding: '0' }}
        >
          {text}
        </Button>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        // 优先使用常量中的中文，其次是原始值
        const typeText = SUGGESTION_TYPES[type] || type;
        return (
          <Tag 
            color={TYPE_COLORS[type] || 'default'}
            style={{ 
              padding: '4px 8px', 
              borderRadius: '4px', 
              fontSize: '14px'
            }}
          >
            {typeText}
          </Tag>
        );
      }
    },
    {
      title: '审核状态',
      dataIndex: 'reviewStatus',
      key: 'reviewStatus',
      render: (status) => {
        // 在实施列表，审核状态理论上都应是 '已批准'
        // 使用工具函数获取文本和颜色
        const statusText = getStatusDisplayText(status, 'review');
        const statusColor = getStatusColor(status, 'review'); // 确保 getStatusColor 支持 review 类型
        return (
          <Tag 
            color={statusColor || 'green'}
            style={{ 
              padding: '4px 8px', 
              borderRadius: '4px', 
              fontSize: '14px'
            }}
          >
            {statusText || '已批准'}
          </Tag>
        );
      }
    },
    {
      title: '实施状态',
      dataIndex: 'implementationStatus',
      key: 'implementationStatus',
      render: (status, record) => {
        // 确保使用最新状态：优先使用implementation子文档的状态，其次使用顶层状态
        const implStatus = (record.implementation && record.implementation.status) || status || 'NOT_STARTED';
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
      title: '责任人',
      dataIndex: ['implementation', 'responsiblePerson'],
      key: 'responsiblePerson',
      render: (text) => <span style={{ fontSize: '14px' }}>{text || '未分配'}</span>
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => {
        const canUpdate = currentUser && (
          ['部门经理', '安全科管理人员', '运行科管理人员'].includes(currentUser.role) || 
          (record.implementation && record.implementation.responsiblePerson === currentUser.name)
        );
        
        // 确认审核状态是否为 '已批准'
        const isReviewApproved = record.reviewStatus === 'APPROVED' || record.reviewStatus === '已批准';
        // 获取实施状态文本
        const implStatusText = getStatusDisplayText(record.implementationStatus || record.implementation?.status || 'NOT_STARTED', 'implementation');

        // 只有审核通过且实施状态不是最终状态 '已评估' 时，才能更新实施状态
        const canUpdateImplStatus = isReviewApproved && implStatusText !== '已评估';
        // 只有审核通过且实施状态为 '已完成' 时，才能评估
        const canEvaluate = isReviewApproved && implStatusText === '已完成';

        return (
          <Space>
            {/* 更新状态按钮: 需审核通过且实施未评估 */}
            {canUpdate && canUpdateImplStatus && (
              <Button 
                type="primary" 
                icon={<ToolOutlined />} 
                onClick={() => showUpdateModal(record)}
                style={{ fontSize: '14px' }}
              >
                更新状态
              </Button>
            )}
            {/* 查看详情按钮 */}
            <Button 
              type="default" 
              icon={<FileTextOutlined />} 
              onClick={() => showDetailModal(record)} // 使用 showDetailModal
              style={{ fontSize: '14px' }}
            >
              查看详情
            </Button>
          </Space>
        );
      }
    }
  ];

  const renderImplementationDetail = () => {
    if (!currentSuggestion || !currentSuggestion.implementation) {
      return <Alert message="暂无实施信息" type="info" showIcon />;
    }
    
    const implementation = currentSuggestion.implementation;
    const history = implementation.statusHistory || implementation.history || [];
    
    console.log('实施历史记录:', history);
    
    return (
      <div>
        <Card title="实施基本信息" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ marginBottom: 16, minWidth: '45%' }}>
              <Text strong>实施状态: </Text>
              <Tag 
                color={getStatusColor(implementation.status || '未开始')}
                style={{ 
                  padding: '4px 8px', 
                  borderRadius: '4px', 
                  fontSize: '14px'
                }}
              >
                {getStatusDisplayText(implementation.status || '未开始', 'implementation')}
              </Tag>
            </div>
            
            <div style={{ marginBottom: 16, minWidth: '45%' }}>
              <Text strong>责任人: </Text>
              <Text>{implementation.responsiblePerson || '未分配'}</Text>
            </div>
            
            <div style={{ marginBottom: 16, minWidth: '45%' }}>
              <Text strong>开始日期: </Text>
              <Text>{implementation.startDate ? moment(implementation.startDate).format('YYYY-MM-DD') : '未设置'}</Text>
            </div>
            
            <div style={{ marginBottom: 16, minWidth: '45%' }}>
              <Text strong>计划完成日期: </Text>
              <Text>{implementation.plannedEndDate ? moment(implementation.plannedEndDate).format('YYYY-MM-DD') : '未设置'}</Text>
            </div>
            
            {implementation.actualEndDate && (
              <div style={{ marginBottom: 16, minWidth: '45%' }}>
                <Text strong>实际完成日期: </Text>
                <Text>{moment(implementation.actualEndDate).format('YYYY-MM-DD')}</Text>
              </div>
            )}
          </div>
          
          {implementation.notes && (
            <div style={{ marginTop: 16 }}>
              <Text strong>实施备注: </Text>
              <Paragraph>{implementation.notes}</Paragraph>
            </div>
          )}
        </Card>
        
        {implementation.attachments && implementation.attachments.length > 0 && (
          <Card title="实施附件" style={{ marginBottom: 16 }}>
            <ul style={{ paddingLeft: 20 }}>
              {implementation.attachments.map((attachment, index) => (
                <li key={index}>
                  <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                    {attachment.name}
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        )}
        
        {history && history.length > 0 ? (
          <Card title="实施历史记录" style={{ marginBottom: 16 }}>
            <Timeline reverse={true}>
              {[...history].reverse().map((record, index) => (
                <Timeline.Item 
                  key={index} 
                  color={getStatusColor(record.status)}
                  dot={
                    <div style={{ 
                      background: getStatusColor(record.status), 
                      borderRadius: '50%', 
                      width: '16px', 
                      height: '16px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      {index === 0 && <ClockCircleOutlined style={{ fontSize: '10px', color: '#fff' }} />}
                    </div>
                  }
                >
                  <div style={{ 
                    border: '1px solid #f0f0f0', 
                    borderRadius: '4px', 
                    padding: '12px', 
                    marginBottom: '8px',
                    backgroundColor: '#fafafa'
                  }}>
                    <div style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '8px', marginBottom: '8px' }}>
                      <Tag 
                        color={getStatusColor(record.status)}
                        style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          fontSize: '14px'
                        }}
                      >
                        {getStatusDisplayText(record.status, 'implementation')}
                      </Tag>
                      <Text type="secondary" style={{ marginLeft: '8px' }}>
                        {moment(record.date || record.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                      </Text>
                    </div>
                    
                    <p><Text strong>操作人员: </Text>{record.updatedBy?.name || record.updatedBy || '系统'}</p>
                    {(record.notes || record.comments) && (
                      <div style={{ marginTop: '4px' }}>
                        <Text strong>备注信息: </Text>
                        <div style={{ 
                          backgroundColor: '#fff', 
                          padding: '8px', 
                          borderRadius: '4px',
                          border: '1px solid #f0f0f0',
                          marginTop: '4px'
                        }}>
                          {record.notes || record.comments}
                        </div>
                      </div>
                    )}
                    
                    {index < history.length - 1 && index !== 0 && (
                      <div style={{ marginTop: '8px' }}>
                        <Text type="secondary">
                          状态持续时间: {
                            moment(record.date || record.timestamp).diff(moment([...history].reverse()[index-1].date || [...history].reverse()[index-1].timestamp), 'hours') >= 24 ?
                            `${moment(record.date || record.timestamp).diff(moment([...history].reverse()[index-1].date || [...history].reverse()[index-1].timestamp), 'days')} 天` :
                            `${moment(record.date || record.timestamp).diff(moment([...history].reverse()[index-1].date || [...history].reverse()[index-1].timestamp), 'hours')} 小时`
                          }
                        </Text>
                      </div>
                    )}
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        ) : (
          <Card title="实施历史记录" style={{ marginBottom: 16 }}>
            <Empty description="暂无状态变更记录" />
          </Card>
        )}
      </div>
    );
  };

  // 获取可用的状态选项
  const getStatusOptions = (currentStatus) => {
    // 直接返回所有有效的实施状态
    return Object.entries(IMPLEMENTATION_STATUS)
           // 过滤掉 EVALUATED (虽然常量已移除，双重保险)
           .filter(([key, value]) => key !== 'EVALUATED') 
           .map(([key, value]) => ({ 
             value: value, // 使用中文值作为选项值和显示文本
             label: value 
           }));
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchImplementationSuggestions(pagination.current, pagination.pageSize);
  }, []);

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={3} style={{ fontSize: '20px', marginBottom: '20px' }}>建议实施跟踪</Title>
        
        <Table
          rowKey="_id"
          columns={columns}
          dataSource={implementationSuggestions}
          loading={loading}
          pagination={{ 
            current: pagination.current, 
            pageSize: pagination.pageSize, 
            total: pagination.total 
          }}
          onChange={handleTableChange}
          bordered
          className="suggestions-table"
          rowClassName={() => 'suggestion-row'}
          expandable={{
            expandedRowRender: record => (
              <div style={{ margin: 0 }}>
                <Collapse>
                  <Panel header="建议内容" key="content">
                    <Paragraph>{record.content}</Paragraph>
                  </Panel>
                  {record.implementation?.notes && (
                    <Panel header="实施备注" key="notes">
                      <Paragraph>{record.implementation.notes}</Paragraph>
                    </Panel>
                  )}
                </Collapse>
              </div>
            ),
          }}
        />
      </Card>

      {/* 更新实施状态模态框 */}
      <Modal
        title="更新实施状态"
        visible={updateModalVisible}
        onCancel={handleUpdateCancel}
        footer={[
          <Button key="back" onClick={handleUpdateCancel} style={{ fontSize: '14px' }}>
            取消
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={confirmLoading} 
            onClick={handleUpdateSubmit}
            style={{ fontSize: '14px' }}
          >
            提交
          </Button>,
        ]}
        width={700}
        bodyStyle={{ fontSize: '14px' }}
      >
        <Form
          form={form}
          layout="vertical"
          onValuesChange={(changedValues) => {
            if (changedValues.status) {
              setCurrentStatusValue(changedValues.status);
            }
          }}
        >
          <Form.Item
            name="status"
            label="实施状态"
            rules={[{ required: true, message: '请选择实施状态' }]}
          >
            <Select 
              onChange={handleStatusChange} 
              placeholder="选择要更新的状态"
              style={{ fontSize: '14px' }}
            >
              {getStatusOptions(currentStatusValue).map(option => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="responsiblePerson"
            label="责任人"
            rules={[{ required: true, message: '请输入责任人' }]}
          >
            <Input placeholder="请输入负责此建议实施的人员姓名" style={{ fontSize: '14px' }} />
          </Form.Item>
          
          <Form.Item
            name="startDate"
            label="开始日期"
            dependencies={['status']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const status = getFieldValue('status');
                  if (status === '实施中' && !value) {
                    return Promise.reject('状态为实施中时，请选择开始日期');
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <DatePicker style={{ width: '100%', fontSize: '14px' }} placeholder="选择实施开始日期" />
          </Form.Item>
          
          <Form.Item
            name="plannedEndDate"
            label="计划完成日期"
            dependencies={['status']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const status = getFieldValue('status');
                  if (status === '实施中' && !value) {
                    return Promise.reject('状态为实施中时，请选择计划完成日期');
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <DatePicker style={{ width: '100%', fontSize: '14px' }} placeholder="选择计划完成日期" />
          </Form.Item>
          
          <Form.Item
            name="actualEndDate"
            label="实际完成日期"
            dependencies={['status']}
            rules={[
              ({ getFieldValue }) => ({
                validator(_, value) {
                  const status = getFieldValue('status');
                  if (status === '已完成' && !value) {
                    return Promise.reject('状态为已完成时，请选择实际完成日期');
                  }
                  return Promise.resolve();
                },
              }),
            ]}
          >
            <DatePicker style={{ width: '100%', fontSize: '14px' }} placeholder="选择实际完成日期" />
          </Form.Item>
          
          <Form.Item
            name="notes"
            label="实施备注"
            rules={[{ required: true, message: '请输入实施情况说明' }]}
          >
            <TextArea rows={4} placeholder="请输入实施情况说明、遇到的问题等" style={{ fontSize: '14px' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 建议实施详情模态框 */}
      <Modal
        title={currentSuggestion ? `建议实施跟踪: ${currentSuggestion.title}` : '建议详情'}
        visible={detailVisible}
        onCancel={handleDetailCancel}
        footer={[
          <Button key="back" onClick={handleDetailCancel} style={{ fontSize: '14px' }}>
            关闭
          </Button>,
        ]}
        width={800}
        bodyStyle={{ fontSize: '14px' }}
      >
        {currentSuggestion && (
          <div>
            <Card title="建议基本信息" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ marginBottom: 16, minWidth: '45%' }}>
                  <Text strong>建议类型: </Text>
                  <Tag 
                    color={TYPE_COLORS[currentSuggestion.type] || 'default'}
                    style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px', 
                      fontSize: '14px'
                    }}
                  >
                    {SUGGESTION_TYPES[currentSuggestion.type] || currentSuggestion.type}
                  </Tag>
                </div>
                
                <div style={{ marginBottom: 16, minWidth: '45%' }}>
                  <Text strong>提交人: </Text>
                  <Text>{currentSuggestion.submitter?.name || '未知'}</Text>
                </div>
                
                <div style={{ marginBottom: 16, minWidth: '45%' }}>
                  <Text strong>班组: </Text>
                  <Text>{currentSuggestion.team || '未知'}</Text>
                </div>
                
                <div style={{ marginBottom: 16, minWidth: '45%' }}>
                  <Text strong>提交时间: </Text>
                  <Text>{currentSuggestion.createdAt ? moment(currentSuggestion.createdAt).format('YYYY-MM-DD HH:mm') : '未知'}</Text>
                </div>
              </div>
              
              <div style={{ marginTop: 16 }}>
                <Text strong>建议内容: </Text>
                <Paragraph>{currentSuggestion.content}</Paragraph>
              </div>
            </Card>
            
            {/* 实施详情 */}
            {renderImplementationDetail()}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ImplementationList; 