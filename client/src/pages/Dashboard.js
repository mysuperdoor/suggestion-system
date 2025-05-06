import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, List, Typography, Spin, Button, Alert, Tag, Space } from 'antd';
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  FileTextOutlined, 
  HighlightOutlined,
  RiseOutlined,
  TeamOutlined,
  AlertOutlined
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { reportService } from '../services/reportService';
import { SUGGESTION_STATUS, STATUS_COLORS } from '../constants/suggestions';

const { Title, Text } = Typography;

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    suggestionCounts: {
      total: 0,
      pending: 0,
      underReview: 0,
      implementing: 0,
      completed: 0,
      rejected: 0
    },
    recentSuggestions: [],
    pendingReviewCount: 0
  });
  
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await reportService.getDashboardData();
      
      // 处理响应数据
      const data = response.data || response;
      
      // 确保数据格式正确
      const processedData = {
        suggestionCounts: {
          total: data?.suggestionCounts?.total || 0,
          pending: data?.suggestionCounts?.pending || 0,
          underReview: data?.suggestionCounts?.underReview || 0,
          implementing: data?.suggestionCounts?.implementing || 0,
          completed: data?.suggestionCounts?.completed || 0,
          rejected: data?.suggestionCounts?.rejected || 0
        },
        recentSuggestions: Array.isArray(data?.recentSuggestions) ? data.recentSuggestions : [],
        pendingReviewCount: data?.pendingReviewCount || 0
      };
      
      setDashboardData(processedData);
    } catch (err) {
      console.error('获取仪表盘数据失败:', err);
      setError('获取仪表盘数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchDashboardData();
  }, []);
  
  // 获取建议的当前状态，兼容老数据
  const getCurrentStatus = (suggestion) => {
    return suggestion.reviewStatus || suggestion.status;
  };

  // 获取建议状态标签
  const getStatusTag = (suggestion) => {
    const currentStatus = getCurrentStatus(suggestion);
    const color = STATUS_COLORS[currentStatus] || 'blue';
    const text = SUGGESTION_STATUS[currentStatus] || currentStatus;
    
    return <Tag color={color}>{text}</Tag>;
  };
  
  return (
    <div style={{ padding: 16 }}>
      <Title level={2}>系统概览</Title>
      
      {error && (
        <Alert
          message="数据加载失败"
          description={error}
          type="error"
          style={{ marginBottom: 16 }}
          closable
        />
      )}
      
      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          {/* 统计卡片 */}
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card>
              <Statistic
                title="合理化建议总数"
                value={dashboardData.suggestionCounts.total}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card>
              <Statistic
                title="待审核建议"
                value={dashboardData.suggestionCounts.pending + dashboardData.suggestionCounts.underReview}
                prefix={<ClockCircleOutlined style={{ color: '#faad14' }} />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card>
              <Statistic
                title="已采纳并实施"
                value={dashboardData.suggestionCounts.implementing + dashboardData.suggestionCounts.completed}
                prefix={<RiseOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          
          <Col xs={24} sm={12} md={8} lg={6}>
            <Card>
              <Statistic
                title="已完成建议"
                value={dashboardData.suggestionCounts.completed}
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          
          {/* 需要我审核的建议 */}
          {dashboardData.pendingReviewCount > 0 && (
            <Col span={24}>
              <Card 
                title={
                  <span>
                    <AlertOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                    需要我审核的建议
                  </span>
                } 
                style={{ borderLeft: '5px solid #ff4d4f' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Statistic value={dashboardData.pendingReviewCount} suffix="条待审核" />
                  <Button type="primary" onClick={() => navigate('/suggestions/review')}>
                    去审核
                  </Button>
                </div>
              </Card>
            </Col>
          )}
          
          {/* 各类型建议占比 */}
          <Col span={24}>
            <Card title="待办事项">
              <List
                itemLayout="horizontal"
                dataSource={[
                  {
                    title: '待我审核的建议',
                    count: dashboardData.pendingReviewCount,
                    icon: <HighlightOutlined style={{ color: '#fa8c16' }} />,
                    path: '/suggestions/list?status=pending'
                  },
                  {
                    title: '正在实施的建议',
                    count: dashboardData.suggestionCounts.implementing,
                    icon: <TeamOutlined style={{ color: '#1890ff' }} />,
                    path: '/suggestions/list?status=implementing'
                  }
                ]}
                renderItem={item => (
                  <List.Item
                    actions={[
                      <Button type="link" onClick={() => navigate(item.path)}>
                        查看
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={item.icon}
                      title={item.title}
                      description={`${item.count}条记录需要处理`}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          
          {/* 最近的建议 */}
          <Col span={24}>
            <Card 
              title="最近提交的建议" 
              extra={<Link to="/suggestions/list">查看全部</Link>}
            >
              <List
                itemLayout="horizontal"
                dataSource={dashboardData.recentSuggestions}
                renderItem={item => (
                  <List.Item
                    actions={[
                      <Button 
                        type="link" 
                        onClick={() => navigate(`/suggestions/${item._id}`)}
                      >
                        详情
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      title={item.title}
                      description={
                        <Space>
                          <Text type="secondary">{item.submitter?.name || '未知用户'} @ {new Date(item.createdAt).toLocaleDateString()}</Text>
                          {getStatusTag(item)}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default Dashboard; 