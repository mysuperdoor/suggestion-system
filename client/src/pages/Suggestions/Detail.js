import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Space,
  Tag,
  Button,
  Descriptions,
  Timeline,
  Spin,
  Modal,
  Form,
  Input,
  message,
  Divider,
  Alert,
  Popconfirm,
  List,
  Comment,
  Avatar,
  Radio,
  Row,
  Col,
  Badge,
  Select,
  DatePicker
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  EditOutlined, 
  RollbackOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  CommentOutlined,
  FileTextOutlined,
  HistoryOutlined,
  DownloadOutlined,
  TagOutlined,
  UserOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  StarOutlined
} from '@ant-design/icons';
import { suggestionService } from '../../services/suggestionService';
import { authService } from '../../services/authService';
import { SUGGESTION_TYPES, SUGGESTION_STATUS, STATUS_COLORS, TYPE_COLORS, IMPLEMENTATION_STATUS } from '../../constants/suggestions';
import { getStatusDisplayText, getStatusColor } from '../../utils/statusUtils';
import moment from 'moment';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { confirm } = Modal;
const { Option } = Select;

// 添加一个辅助函数，尝试修复乱码的文件名
const fixEncodingIssues = (text) => {
  try {
    // 尝试检测乱码的中文文件名
    // 乱码字符通常有一些特征，如è®³å¤ç®¡ç这样的组合
    if (/[èéêëàáâãäåæçìíîïòóôõøùúûü]/.test(text)) {
      // 尝试将错误编码的字符重新编码为UTF-8
      // 先转换为ISO-8859-1，再转换为UTF-8
      return decodeURIComponent(escape(text));
    }
    
    // 如果没有检测到乱码特征，则直接返回原始文本
    return text;
  } catch (error) {
    console.error('修复文件名编码错误:', error);
    return text; // 如果修复失败，返回原始文本
  }
};

const SuggestionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [firstReviewModalVisible, setFirstReviewModalVisible] = useState(false);
  const [secondReviewModalVisible, setSecondReviewModalVisible] = useState(false);
  const [scoreModalVisible, setScoreModalVisible] = useState(false);
  const [commentForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [withdrawForm] = Form.useForm();
  const [firstReviewForm] = Form.useForm();
  const [secondReviewForm] = Form.useForm();
  const [scoreForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 判断是否是值班主任
  const isSupervisor = currentUser?.role === '值班主任';
  
  // 判断是否是管理人员
  const isAdmin = currentUser?.role === '安全科管理人员' || 
                 currentUser?.role === '运行科管理人员' || 
                 currentUser?.role === '部门经理';
                 
  const isDepartmentManager = currentUser?.role === '部门经理';
  const isSafetyAdmin = currentUser?.role === '安全科管理人员';
  const isOperationAdmin = currentUser?.role === '运行科管理人员';
  
  // 添加 isTeamMatch 的定义
  const isTeamMatch = currentUser?.team === suggestion?.team || 
                     currentUser?.team === suggestion?.submitter?.team;
  
  // 判断是否可以进行一级审核
  const isPendingFirstReview = suggestion?.status === '等待一级审核' || 
                              suggestion?.status === 'PENDING_FIRST_REVIEW' ||
                              suggestion?.reviewStatus === 'PENDING_FIRST_REVIEW';
  
  const isPendingSecondReview = suggestion?.status === '等待二级审核' || 
                               suggestion?.status === 'PENDING_SECOND_REVIEW' ||
                               suggestion?.reviewStatus === 'PENDING_SECOND_REVIEW';
  
  // 判断是否可以进行一级审核 - 是值班主任且班组匹配，或部门经理
  const canFirstReview = ((isSupervisor && isTeamMatch) || isDepartmentManager) && 
                        isPendingFirstReview;

  // 判断是否可以进行二级审核
  const isSafetyType = suggestion?.type === 'SAFETY' || suggestion?.type === '安全管理';
  
  const canSecondReview = (
    (isSafetyAdmin && isSafetyType) || 
    (isOperationAdmin && !isSafetyType) || 
    isDepartmentManager
  ) && isPendingSecondReview;

  // 更新评分权限逻辑：部门经理可评所有建议，安全科只评安全类，运行科只评非安全类
  const canScore = isDepartmentManager || 
                  (currentUser?.role === '安全科管理人员' && isSafetyType) || 
                  (currentUser?.role === '运行科管理人员' && !isSafetyType);

  // 获取建议详情
  const fetchSuggestionDetail = async () => {
    try {
      setLoading(true);
      const response = await suggestionService.getSuggestionById(id);
      console.log('获取到的建议详情:', response.data);
      
      // 确保状态值正确转换
      const suggestionData = {
        ...response.data,
        status: response.data.status === 'PENDING_FIRST_REVIEW' ? '等待一级审核' : response.data.status
      };
      
      setSuggestion(suggestionData);
    } catch (error) {
      console.error('获取建议详情失败:', error);
      message.error('获取建议详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取当前用户信息
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (!user) {
          console.error('未获取到用户信息，将重定向到登录页面');
          message.error('请先登录后再访问此页面');
          navigate('/login');
          return;
        }
        setCurrentUser(user);
        console.log('当前用户信息:', {
          id: user._id,
          name: user.name,
          role: user.role,
          team: user.team,
          isAuthenticated: authService.isAuthenticated()
        });
      } catch (error) {
        console.error('获取用户信息失败:', error);
        message.error('获取用户信息失败');
        navigate('/login');
      }
    };
    
    fetchCurrentUser();
  }, [navigate]);

  useEffect(() => {
    fetchSuggestionDetail();
  }, [id]);

  // 添加调试信息
  useEffect(() => {
    if (suggestion) {
      console.log('=== 建议详情页状态检查 ===');
      console.log('1. 用户信息:', {
        id: currentUser?._id,
        name: currentUser?.name,
        role: currentUser?.role,
        team: currentUser?.team,
        authenticated: authService.isAuthenticated()
      });
      
      console.log('2. 建议信息:', {
        id: suggestion._id,
        title: suggestion.title,
        status: suggestion.status,
        team: suggestion.team,
        submitter: suggestion.submitter
      });
      
      console.log('3. 权限检查:', {
        是否是值班主任: isSupervisor,
        是否是管理人员: isAdmin,
        是否等待一级审核: isPendingFirstReview,
        是否可以一级审核: canFirstReview,
        班组是否匹配: isTeamMatch
      });
      
      console.log('4. 组件状态:', {
        加载中: loading,
        提交中: submitting,
        一级审核模态框可见: firstReviewModalVisible,
        二级审核模态框可见: secondReviewModalVisible
      });
      console.log('========================');
    }
  }, [
    suggestion, 
    currentUser, 
    isSupervisor, 
    isAdmin, 
    isPendingFirstReview, 
    canFirstReview, 
    isTeamMatch,
    loading,
    submitting,
    firstReviewModalVisible,
    secondReviewModalVisible
  ]);

  // 添加评论
  const handleAddComment = async (values) => {
    try {
      setSubmitting(true);
      await suggestionService.addComment(id, values.content);
      message.success('评论添加成功');
      commentForm.resetFields();
      setCommentModalVisible(false);
      fetchSuggestionDetail();
    } catch (error) {
      console.error('添加评论失败:', error);
      message.error('添加评论失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 修改建议
  const handleEdit = async (values) => {
    try {
      setSubmitting(true);
      await suggestionService.updateSuggestion(id, {
        title: values.title,
        content: values.content,
        expectedBenefit: values.expectedBenefit,
        reason: values.reason
      });
      message.success('建议修改成功');
      editForm.resetFields();
      setEditModalVisible(false);
      fetchSuggestionDetail();
    } catch (error) {
      console.error('修改建议失败:', error);
      message.error('修改建议失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 撤回建议
  const handleWithdraw = async (values) => {
    try {
      setSubmitting(true);
      await suggestionService.withdrawSuggestion(id, values.reason);
      message.success('建议已撤回');
      withdrawForm.resetFields();
      setWithdrawModalVisible(false);
      fetchSuggestionDetail();
    } catch (error) {
      console.error('撤回建议失败:', error);
      message.error('撤回建议失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 下载附件
  const handleDownloadAttachment = async (attachment) => {
    const baseUrl = 'http://localhost:5000'; // 更改为实际的后端URL
    
    // 使用新的下载路由
    const url = `${baseUrl}/download/${attachment.filename}?originalname=${encodeURIComponent(attachment.originalname)}`;
    
    try {
      // 创建一个隐藏的a标签，模拟点击下载
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      // 不使用download属性，让浏览器根据Content-Disposition头处理
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // 记录下载操作
      console.log('下载附件:', {
        文件名: attachment.originalname,
        编码后: encodeURIComponent(attachment.originalname),
        URL: url
      });
    } catch (error) {
      console.error('下载附件失败:', error);
      message.error('下载附件失败，请稍后重试');
    }
  };

  // 一级审核
  const handleFirstReview = async (values) => {
    try {
      setSubmitting(true);
      console.log('提交一级审核:', {
        建议ID: id,
        审核人: currentUser?.name,
        审核人角色: currentUser?.role,
        审核人班组: currentUser?.team,
        审核结果: values.result === 'approve' ? '通过' : '拒绝',
        审核意见: values.comment
      });
      
      const reviewData = {
        suggestionId: id,
        reviewType: 'first',
        result: values.result,
        comment: values.comment,
        reviewerId: currentUser?._id
      };
      
      await suggestionService.submitReview(reviewData);
      message.success('一级审核完成');
      firstReviewForm.resetFields();
      setFirstReviewModalVisible(false);
      fetchSuggestionDetail();
      
      // 如果从审核列表页面进入，则返回审核列表
      if (window.history.length > 1) {
        setTimeout(() => {
          navigate('/suggestions/review');
        }, 1500);
      }
    } catch (error) {
      console.error('一级审核失败:', error);
      message.error('一级审核失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  // 二级审核
  const handleSecondReview = async (values) => {
    try {
      setSubmitting(true);
      console.log('提交二级审核, 参数:', {
        id,
        result: values.result,
        comment: values.comment
      });
      
      const reviewData = {
        suggestionId: id,
        reviewType: 'second',
        result: values.result,
        comment: values.comment,
        reviewerId: currentUser?._id
      };
      
      await suggestionService.submitReview(reviewData);
      message.success('二级审核完成');
      secondReviewForm.resetFields();
      setSecondReviewModalVisible(false);
      fetchSuggestionDetail();
      
      // 如果从审核列表页面进入，则返回审核列表
      if (window.history.length > 1) {
        setTimeout(() => {
          navigate('/suggestions/review');
        }, 1500);
      }
    } catch (error) {
      console.error('二级审核失败:', error);
      message.error('二级审核失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  // 删除建议处理函数
  const handleDelete = () => {
    confirm({
      title: '确认删除这条建议吗？',
      icon: <ExclamationCircleOutlined />,
      content: '删除后，建议及其相关的附件和历史记录将无法恢复。',
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      confirmLoading: isDeleting,
      async onOk() {
        setIsDeleting(true);
        try {
          // 调用 service 中的 deleteSuggestion
          const result = await suggestionService.deleteSuggestion(id);
          console.log('handleDelete 收到 Service Result:', result);
          if (result.success) {
            message.success('建议已成功删除');
            // Navigate after success message is shown
            setTimeout(() => { // Add a slight delay for user to see message
                navigate('/suggestions/list'); // Correct path for the list page
            }, 1000); // Delay for 1 second
          } else {
            message.error(result.message || '删除建议失败');
          }
        } catch (error) {
          message.error('删除建议时发生错误');
        } finally {
          setIsDeleting(false);
        }
      },
      onCancel() {
        console.log('取消删除');
      },
    });
  };

  // Add score submit handler
  const handleScoreSubmit = async () => {
    const values = await scoreForm.validateFields();
    const scoreValue = parseFloat(values.score);
    if (isNaN(scoreValue) || scoreValue < 0 || scoreValue > 10) {
      message.error('请输入 0 到 10 之间的有效分数');
      return;
    }
    await suggestionService.scoreSuggestion(id, scoreValue);
    message.success('评分成功');
    setScoreModalVisible(false);
    fetchSuggestionDetail();
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin tip="加载建议详情..." />
      </div>
    );
  }

  if (!suggestion) {
    return (
      <Card>
        <Alert
          message="建议不存在或已被删除"
          description="您查找的建议可能不存在或已被删除，请返回列表查看其他建议。"
          type="error"
          showIcon
        />
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Button type="primary" onClick={() => navigate('/suggestions/list')}>
            返回列表
          </Button>
        </div>
      </Card>
    );
  }

  const showEditModal = () => {
    editForm.setFieldsValue({
      title: suggestion.title,
      content: suggestion.content,
      expectedBenefit: suggestion.expectedBenefit
    });
    setEditModalVisible(true);
  };

  // 添加 showWithdrawModal 函数
  const showWithdrawModal = () => {
    withdrawForm.resetFields();
    setWithdrawModalVisible(true);
  };

  // 渲染操作按钮
  const renderActionButtons = () => {
    const isSubmitter = suggestion?.submitter?._id === currentUser?.id;
    const isAdminOrManager = currentUser && (currentUser.role === '安全科管理人员' || currentUser.role === '运行科管理人员' || currentUser.role === '部门经理');
    const isShiftSupervisor = currentUser?.role === '值班主任';
    const isDepartmentManager = currentUser?.role === '部门经理';

    // Check if the suggestion is in a state where it can be edited by the submitter
    const canEdit = isSubmitter && suggestion?.reviewStatus === 'PENDING_FIRST_REVIEW';

    // Check if the suggestion can be withdrawn by the submitter
    const canWithdraw = isSubmitter && ['PENDING_FIRST_REVIEW', 'PENDING_SECOND_REVIEW', 'REJECTED'].includes(suggestion?.reviewStatus);

    // Check if the current user can perform the first review
    const canFirstReview = (isShiftSupervisor || isDepartmentManager) && suggestion?.reviewStatus === 'PENDING_FIRST_REVIEW';

    // Check if the current user can perform the second review
    const canSecondReview = (isAdminOrManager || isDepartmentManager) && suggestion?.reviewStatus === 'PENDING_SECOND_REVIEW';

    // Check if the current user can delete (only department manager)
    const canDelete = isDepartmentManager;

    // 定义建议类型
    const isSafetyType = suggestion?.type === 'SAFETY' || suggestion?.type === '安全管理';
    
    // 更新评分权限逻辑：部门经理可评所有建议，安全科只评安全类，运行科只评非安全类
    const canScore = isDepartmentManager || 
                    (currentUser?.role === '安全科管理人员' && isSafetyType) || 
                    (currentUser?.role === '运行科管理人员' && !isSafetyType);

    return (
      <Space wrap>
        {/* 修改按钮 */}
        {canEdit && (
          <Button 
            icon={<EditOutlined />} 
            onClick={showEditModal}
          >
            修改建议
          </Button>
        )}
        {/* 撤回按钮 */}
        {canWithdraw && (
          <Button 
            icon={<RollbackOutlined />} 
            danger 
            onClick={showWithdrawModal}
          >
            撤回建议
          </Button>
        )}
        {/* 一级审核按钮 */}
        {canFirstReview && (
          <Button 
            type="primary" 
            icon={<CheckCircleOutlined />} 
            onClick={() => setFirstReviewModalVisible(true)}
          >
            一级审核
          </Button>
        )}
        {/* 二级审核按钮 */}
        {canSecondReview && (
          <Button 
            type="primary" 
            icon={<CheckCircleOutlined />} 
            onClick={() => setSecondReviewModalVisible(true)}
          >
            二级审核
          </Button>
        )}
        {/* 添加评论按钮 */}
        <Button 
          icon={<CommentOutlined />} 
          onClick={() => setCommentModalVisible(true)}
        >
          添加评论
        </Button>
        {/* 删除按钮 - 仅部门经理可见 */}
        {canDelete && (
           <Button
             danger
             icon={<DeleteOutlined />}
             onClick={handleDelete}
             loading={isDeleting}
           >
             删除建议
           </Button>
        )}
        {/* Add Score Button */} 
        {canScore && (
          <Button
            type="primary"
            icon={<StarOutlined />}
            onClick={() => {
              scoreForm.setFieldsValue({ score: suggestion.scoring?.score });
              setScoreModalVisible(true);
            }}
          >
            {suggestion.scoring?.score !== undefined ? '修改评分' : '评分'}
          </Button>
        )}
      </Space>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card 
        bordered={false} 
        style={{ 
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          borderRadius: '8px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <Title level={3} style={{ marginBottom: 8 }}>{suggestion.title}</Title>
            <div style={{ marginTop: 24, display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <Tag 
                icon={<TagOutlined />} 
                color={TYPE_COLORS[suggestion.type] || 'default'} 
                style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '14px' }}
              >
                {SUGGESTION_TYPES[suggestion.type] || suggestion.type}
              </Tag>
              <Tag 
                icon={<UserOutlined />} 
                style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '14px' }}
              >
                {suggestion.submitter?.name || '未知'}
              </Tag>
              <Tag 
                icon={<TeamOutlined />} 
                style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '14px' }}
              >
                {suggestion.team || '未知班组'}
              </Tag>
              <Tag 
                icon={<ClockCircleOutlined />} 
                style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '14px' }}
              >
                {suggestion.createdAt ? new Date(suggestion.createdAt).toLocaleString() : '未知时间'}
              </Tag>
            </div>
          </div>
          <Space wrap>
            {renderActionButtons()}
            <Button 
              onClick={() => navigate('/suggestions/list')}
              style={{ borderRadius: '6px' }}
            >
              返回列表
            </Button>
          </Space>
        </div>

        <Row gutter={[24, 24]}>
          <Col span={24}>
            <Card 
              title="建议内容" 
              type="inner" 
              bordered={false}
              style={{ 
                background: '#f9f9f9', 
                borderRadius: '6px',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
              }}
            >
              <Paragraph style={{ whiteSpace: 'pre-wrap', fontSize: '15px' }}>
                {suggestion.content}
              </Paragraph>
            </Card>
          </Col>
          <Col span={24}>
            <Card 
              title="预期效益" 
              type="inner" 
              bordered={false}
              style={{ 
                background: '#f9f9f9', 
                borderRadius: '6px',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
              }}
            >
              <Paragraph style={{ whiteSpace: 'pre-wrap', fontSize: '15px' }}>
                {suggestion.expectedBenefit || <Text type="secondary">无预期效益说明</Text>}
              </Paragraph>
            </Card>
          </Col>

          {suggestion.attachments && suggestion.attachments.length > 0 && (
            <Col span={24}>
              <Card 
                title={<><FileTextOutlined /> 附件</>} 
                type="inner" 
                bordered={false}
                style={{ 
                  borderRadius: '6px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
                }}
              >
                <List
                  itemLayout="horizontal"
                  dataSource={suggestion.attachments}
                  renderItem={attachment => {
                    // 尝试修复文件名乱码
                    const fixedFilename = fixEncodingIssues(attachment.originalname);
                    
                    return (
                      <List.Item
                        actions={[
                          <Button 
                            type="link" 
                            icon={<DownloadOutlined />} 
                            onClick={() => handleDownloadAttachment({
                              ...attachment,
                              originalname: fixedFilename // 使用修复后的文件名
                            })}
                          >
                            下载
                          </Button>
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<Avatar icon={<FileTextOutlined />} style={{ backgroundColor: '#1890ff' }} />}
                          title={fixedFilename} // 使用修复后的文件名显示
                          description={`类型: ${attachment.mimetype}`}
                        />
                      </List.Item>
                    );
                  }}
                />
              </Card>
            </Col>
          )}

          {suggestion.firstReview && (
            <Col span={24}>
              <Card 
                title={<><CheckCircleOutlined style={{ color: suggestion.firstReview.result === 'APPROVED' ? '#52c41a' : '#f5222d' }} /> 一级审核</>} 
                type="inner" 
                bordered={false}
                style={{ 
                  borderRadius: '6px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                  borderLeft: `3px solid ${suggestion.firstReview.result === 'APPROVED' ? '#52c41a' : '#f5222d'}`
                }}
              >
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Text strong>审核结果: </Text>
                    <Tag 
                      color={suggestion.firstReview.result === 'APPROVED' ? 'success' : 'error'}
                      style={{ padding: '2px 8px', borderRadius: '4px' }}
                    >
                      {suggestion.firstReview.result === 'APPROVED' ? '通过' : '拒绝'}
                    </Tag>
                  </Col>
                  <Col span={8}>
                    <Text strong>审核人: </Text>
                    {suggestion.firstReview.reviewer?.name || '未知'}
                  </Col>
                  <Col span={8}>
                    <Text strong>审核时间: </Text>
                    {suggestion.firstReview.reviewedAt ? new Date(suggestion.firstReview.reviewedAt).toLocaleString() : '未知'}
                  </Col>
                  <Col span={24}>
                    <Text strong>审核意见: </Text>
                    <div style={{ padding: '8px 12px', background: '#f9f9f9', borderRadius: '4px', marginTop: '8px' }}>
                      {suggestion.firstReview.comments || <Text type="secondary">无审核意见</Text>}
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
          )}

          {suggestion.secondReview && (
            <Col span={24}>
              <Card 
                title={<><CheckCircleOutlined style={{ color: suggestion.secondReview.result === 'APPROVED' ? '#52c41a' : '#f5222d' }} /> 二级审核</>} 
                type="inner" 
                bordered={false}
                style={{ 
                  borderRadius: '6px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                  borderLeft: `3px solid ${suggestion.secondReview.result === 'APPROVED' ? '#52c41a' : '#f5222d'}`
                }}
              >
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Text strong>审核结果: </Text>
                    <Tag 
                      color={suggestion.secondReview.result === 'APPROVED' ? 'success' : 'error'}
                      style={{ padding: '2px 8px', borderRadius: '4px' }}
                    >
                      {suggestion.secondReview.result === 'APPROVED' ? '通过' : '拒绝'}
                    </Tag>
                  </Col>
                  <Col span={8}>
                    <Text strong>审核人: </Text>
                    {suggestion.secondReview.reviewer?.name || '未知'}
                  </Col>
                  <Col span={8}>
                    <Text strong>审核时间: </Text>
                    {suggestion.secondReview.reviewedAt ? new Date(suggestion.secondReview.reviewedAt).toLocaleString() : '未知'}
                  </Col>
                  <Col span={24}>
                    <Text strong>审核意见: </Text>
                    <div style={{ padding: '8px 12px', background: '#f9f9f9', borderRadius: '4px', marginTop: '8px' }}>
                      {suggestion.secondReview.comments || <Text type="secondary">无审核意见</Text>}
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>
          )}

          {/* 评分记录显示 */}
          {suggestion.scoring && suggestion.scoring.score !== undefined && (
            <Col span={24}>
              <Card 
                title={<><StarOutlined style={{ color: '#faad14' }} /> 建议评分</>}
                type="inner" 
                bordered={false}
                style={{ 
                  borderRadius: '6px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                  borderLeft: '3px solid #faad14'
                }}
              >
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Text strong>评分: </Text>
                    <Tag 
                      color="gold"
                      style={{ padding: '2px 8px', borderRadius: '4px' }}
                    >
                      {/* Display score with one decimal place */}
                      {typeof suggestion.scoring.score === 'number' ? suggestion.scoring.score.toFixed(1) : '-'}
                    </Tag>
                  </Col>
                  <Col span={8}>
                    <Text strong>评分人: </Text>
                    {suggestion.scoring.scorer?.name || '未知'} 
                    <Tag color="blue" style={{ marginLeft: '4px' }}>
                      {suggestion.scoring.scorer?.role || suggestion.scoring.scorerRole || '未知角色'}
                    </Tag>
                  </Col>
                  <Col span={8}>
                    <Text strong>评分时间: </Text>
                    {suggestion.scoring.scoredAt ? new Date(suggestion.scoring.scoredAt).toLocaleString() : '未知'}
                  </Col>
                </Row>
                {suggestion.scoring.history && suggestion.scoring.history.length > 0 && (
                  <>
                    <Timeline style={{ marginTop: 16 }}>
                      {suggestion.scoring.history.map((record, index) => (
                        <Timeline.Item 
                          key={index} 
                          color="gold" 
                          dot={<StarOutlined style={{ fontSize: '16px' }} />}
                        >
                          <div style={{ marginBottom: '8px' }}>
                            <Text strong>{record.scorer?.name || '未知用户'}</Text> 
                            <Tag color="blue" style={{ marginLeft: '4px' }}>
                              {record.scorer?.role || record.scorerRole || '未知角色'}
                            </Tag> 
                            于 {record.scoredAt ? new Date(record.scoredAt).toLocaleString() : '未知时间'} 
                            {/* Display history score with one decimal place */}
                            评分为 <Tag color="gold">{typeof record.score === 'number' ? record.score.toFixed(1) : '?'}</Tag>
                          </div>
                        </Timeline.Item>
                      ))}
                    </Timeline>
                  </>
                )}
              </Card>
            </Col>
          )}

          {suggestion.comments && suggestion.comments.length > 0 && (
            <Col span={24}>
              <Card 
                title={<><CommentOutlined /> 评论记录</>} 
                type="inner" 
                bordered={false}
                style={{ 
                  borderRadius: '6px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
                }}
              >
                <Timeline>
                  {suggestion.comments.map((comment, index) => (
                    <Timeline.Item key={index} color="#1890ff">
                      <Comment
                        author={<Text strong>{comment.user?.name || '未知用户'}</Text>}
                        avatar={<Avatar style={{ backgroundColor: '#1890ff' }} icon={<UserOutlined />} />}
                        content={
                          <div style={{ 
                            padding: '12px 16px', 
                            background: '#f9f9f9', 
                            borderRadius: '6px',
                            marginBottom: '8px'
                          }}>
                            <p>{comment.content}</p>
                          </div>
                        }
                        datetime={comment.createdAt ? new Date(comment.createdAt).toLocaleString() : '未知时间'}
                      />
                    </Timeline.Item>
                  ))}
                </Timeline>
              </Card>
            </Col>
          )}

          {suggestion.revisionHistory && suggestion.revisionHistory.length > 0 && (
            <Col span={24}>
              <Card 
                title={<><HistoryOutlined /> 修改历史</>} 
                type="inner" 
                bordered={false}
                style={{ 
                  borderRadius: '6px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
                }}
              >
                <Timeline>
                  {suggestion.revisionHistory.map((revision, index) => (
                    <Timeline.Item key={index} dot={<HistoryOutlined style={{ fontSize: '16px' }} />}>
                      <div style={{ marginBottom: '8px' }}>
                        <Text strong>{revision.modifiedBy?.name || '未知用户'}</Text> 于{' '}
                        {revision.modifiedAt ? new Date(revision.modifiedAt).toLocaleString() : '未知时间'} 
                        修改了内容
                      </div>
                      <div style={{ 
                        padding: '8px 12px', 
                        background: '#f9f9f9', 
                        borderRadius: '4px' 
                      }}>
                        修改原因: {revision.reason}
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </Card>
            </Col>
          )}

          {suggestion.implementationRecords && suggestion.implementationRecords.length > 0 && (
            <Col span={24}>
              <Card 
                title={<>实施记录</>} 
                type="inner" 
                bordered={false}
                style={{ 
                  borderRadius: '6px',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)'
                }}
              >
                <Timeline>
                  {suggestion.implementationRecords.map((record, index) => (
                    <Timeline.Item 
                      key={index} 
                      color={record.status === '已完成' ? 'green' : (record.status === '已拒绝' ? 'red' : 'blue')}
                    >
                      <div style={{ marginBottom: '8px' }}>
                        <Text strong>{record.updatedBy?.name || '未知用户'}</Text> 于{' '}
                        {record.updatedAt ? new Date(record.updatedAt).toLocaleString() : '未知时间'} 
                        将状态更新为 <Tag 
                          color={STATUS_COLORS[record.status] || 'default'}
                          style={{ padding: '2px 8px', borderRadius: '4px' }}
                        >
                          {SUGGESTION_STATUS[record.status] || record.status}
                        </Tag>
                      </div>
                      <div style={{ 
                        padding: '8px 12px', 
                        background: '#f9f9f9', 
                        borderRadius: '4px' 
                      }}>
                        说明: {record.comments}
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </Card>
            </Col>
          )}
        </Row>
      </Card>

      {/* 添加评论模态框 */}
      <Modal
        title={<><CommentOutlined /> 添加评论</>}
        open={commentModalVisible}
        onCancel={() => setCommentModalVisible(false)}
        footer={null}
        width={520}
        style={{ borderRadius: '8px' }}
        bodyStyle={{ padding: '24px' }}
      >
        <Form
          form={commentForm}
          onFinish={handleAddComment}
          layout="vertical"
        >
          <Form.Item
            name="content"
            rules={[{ required: true, message: '请输入评论内容' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="请输入您的评论..." 
              style={{ borderRadius: '4px' }}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button 
              onClick={() => setCommentModalVisible(false)}
              style={{ marginRight: '8px', borderRadius: '4px' }}
            >
              取消
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={submitting}
              style={{ borderRadius: '4px' }}
            >
              提交评论
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 修改建议模态框 */}
      <Modal
        title={<><EditOutlined /> 修改建议</>}
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        width={700}
        style={{ borderRadius: '8px' }}
        bodyStyle={{ padding: '24px' }}
      >
        <Form
          form={editForm}
          onFinish={handleEdit}
          layout="vertical"
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input style={{ borderRadius: '4px' }} />
          </Form.Item>
          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <TextArea 
              rows={6} 
              style={{ borderRadius: '4px' }} 
            />
          </Form.Item>
          <Form.Item
            name="expectedBenefit"
            label="预期效益"
            rules={[{ required: true, message: '请输入预期效益' }]}
          >
            <TextArea 
              rows={4} 
              style={{ borderRadius: '4px' }} 
            />
          </Form.Item>
          <Form.Item
            name="reason"
            label="修改原因"
            rules={[{ required: true, message: '请输入修改原因' }]}
          >
            <TextArea 
              rows={2} 
              style={{ borderRadius: '4px' }} 
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button 
              onClick={() => setEditModalVisible(false)}
              style={{ marginRight: '8px', borderRadius: '4px' }}
            >
              取消
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={submitting}
              style={{ borderRadius: '4px' }}
            >
              提交修改
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 一级审核模态框 */}
      <Modal
        title={<><CheckCircleOutlined /> 一级审核</>}
        open={firstReviewModalVisible}
        onCancel={() => setFirstReviewModalVisible(false)}
        footer={null}
        width={600}
        style={{ borderRadius: '8px' }}
        bodyStyle={{ padding: '24px' }}
      >
        <Alert
          message="一级审核提示"
          description="请仔细审核建议内容，确认是否通过一级审核。通过后将进入二级审核流程。"
          type="info"
          showIcon
          style={{ marginBottom: '16px', borderRadius: '4px' }}
        />
        <Form
          form={firstReviewForm}
          onFinish={handleFirstReview}
          layout="vertical"
          initialValues={{ result: 'approve' }}
        >
          <Form.Item
            name="result"
            label="审核结果"
            rules={[{ required: true, message: '请选择审核结果' }]}
          >
            <Radio.Group>
              <Radio.Button value="approve" style={{ borderRadius: '4px 0 0 4px' }}>通过</Radio.Button>
              <Radio.Button value="reject" style={{ borderRadius: '0 4px 4px 0' }}>拒绝</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            name="comment"
            label="审核意见"
            rules={[{ required: true, message: '请输入审核意见' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="请输入审核意见..." 
              style={{ borderRadius: '4px' }}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button 
              onClick={() => setFirstReviewModalVisible(false)}
              style={{ marginRight: '8px', borderRadius: '4px' }}
            >
              取消
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={submitting}
              style={{ borderRadius: '4px' }}
            >
              提交审核
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* 二级审核模态框 */}
      <Modal
        title={<><CheckCircleOutlined /> 二级审核</>}
        open={secondReviewModalVisible}
        onCancel={() => setSecondReviewModalVisible(false)}
        footer={null}
        width={600}
        style={{ borderRadius: '8px' }}
        bodyStyle={{ padding: '24px' }}
      >
        <Alert
          message="二级审核提示"
          description="请仔细审核建议内容，确认是否最终通过。通过后建议将进入实施流程，否则将结束处理。"
          type="warning"
          showIcon
          style={{ marginBottom: '16px', borderRadius: '4px' }}
        />
        <Form
          form={secondReviewForm}
          onFinish={handleSecondReview}
          layout="vertical"
          initialValues={{ result: 'approve' }}
        >
          <Form.Item
            name="result"
            label="审核结果"
            rules={[{ required: true, message: '请选择审核结果' }]}
          >
            <Radio.Group>
              <Radio.Button value="approve" style={{ borderRadius: '4px 0 0 4px' }}>通过</Radio.Button>
              <Radio.Button value="reject" style={{ borderRadius: '0 4px 4px 0' }}>拒绝</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            name="comment"
            label="审核意见"
            rules={[{ required: true, message: '请输入审核意见' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="请输入审核意见..." 
              style={{ borderRadius: '4px' }}
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Button 
              onClick={() => setSecondReviewModalVisible(false)}
              style={{ marginRight: '8px', borderRadius: '4px' }}
            >
              取消
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={submitting}
              style={{ borderRadius: '4px' }}
            >
              提交审核
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Score Modal */} 
      <Modal
        title={suggestion?.scoring?.score !== undefined ? '修改建议评分' : '为建议评分'}
        open={scoreModalVisible}
        onCancel={() => setScoreModalVisible(false)}
        onOk={handleScoreSubmit}
        okText="提交评分"
        cancelText="取消"
      >
        <Form form={scoreForm} layout="vertical" name="score_form">
          <Form.Item
            name="score"
            label="分数 (0-100)"
            rules={[
              { required: true, message: '请输入分数' },
              {
                validator: (_, value) => {
                  const scoreNum = parseInt(value, 10);
                  if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
                    return Promise.reject(new Error('分数必须在 0 到 100 之间'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <Input type="number" min={0} max={100} placeholder="请输入 0-100 的分数" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SuggestionDetail; 