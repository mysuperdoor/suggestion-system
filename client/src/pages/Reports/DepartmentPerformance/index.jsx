import React, { useState, useEffect } from 'react';
import { Card, Row, Col, DatePicker, Table, message, Spin, Empty, Alert, Button, Space, Typography, Tooltip } from 'antd';
import { Bar, Line } from '@ant-design/charts';
import statisticsService from '../../../services/statisticsService';
import moment from 'moment';
import { ReloadOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

const { RangePicker } = DatePicker;
const { Text } = Typography;

// 预设时间范围
const presetRanges = {
  '最近一个月': [moment().subtract(1, 'month'), moment()],
  '最近三个月': [moment().subtract(3, 'months'), moment()],
  '最近半年': [moment().subtract(6, 'months'), moment()],
  '最近一年': [moment().subtract(1, 'year'), moment()],
  '当年': [moment().startOf('year'), moment()]
};

// 模拟数据，用于在API无法返回数据时显示
const mockData = [
    {
        team: '机械班组',
        totalSubmissions: 35,
        approvalRate: 85.7,
        implementationRate: 68.5,
        userCount: 12,
        perCapitaSubmissions: 2.9
    },
    {
        team: '电气班组',
        totalSubmissions: 42,
        approvalRate: 78.6,
        implementationRate: 59.5,
        userCount: 15,
        perCapitaSubmissions: 2.8
    },
    {
        team: '仪表班组',
        totalSubmissions: 28,
        approvalRate: 92.8,
        implementationRate: 75.0,
        userCount: 10,
        perCapitaSubmissions: 2.8
    },
    {
        team: '安全班组',
        totalSubmissions: 31,
        approvalRate: 90.3,
        implementationRate: 67.7,
        userCount: 9,
        perCapitaSubmissions: 3.4
    },
    {
        team: '运行班组',
        totalSubmissions: 48,
        approvalRate: 83.3,
        implementationRate: 72.9,
        userCount: 20,
        perCapitaSubmissions: 2.4
    }
];

const DepartmentPerformance = () => {
    const [loading, setLoading] = useState(false);
    const [statsData, setStatsData] = useState([]);
    const [error, setError] = useState(null);
    const [dateRange, setDateRange] = useState([
        moment().subtract(1, 'month'),
        moment().add(1, 'day')
    ]);
    const [useMockData, setUseMockData] = useState(false);
    
    // 添加API状态检查相关状态
    const [apiStatus, setApiStatus] = useState({
        checking: false,
        available: null,
        lastChecked: null,
        message: null
    });

    // 检查API状态
    const checkApiStatus = async () => {
        try {
            setApiStatus(prev => ({ ...prev, checking: true }));
            const result = await statisticsService.checkApiStatus();
            
            setApiStatus({
                checking: false,
                available: result.success,
                lastChecked: new Date(),
                message: result.message || (result.success ? '统计API可用' : '统计API不可用')
            });
            
            if (result.success) {
                message.success('统计API连接成功');
                // API可用，尝试重新加载数据
                loadStats();
            } else {
                message.error('统计API连接失败');
            }
        } catch (error) {
            setApiStatus({
                checking: false,
                available: false,
                lastChecked: new Date(),
                message: error.message || '检查API状态时出错'
            });
            message.error('检查API状态失败');
        }
    };

    // 加载统计数据
    const loadStats = async () => {
        try {
            setLoading(true);
            setError(null);
            const [start, end] = dateRange;
            const response = await statisticsService.getDepartmentStats(
                start.format('YYYY-MM-DD'),
                end.format('YYYY-MM-DD')
            );
            
            if (response.success && Array.isArray(response.data) && response.data.length > 0) {
                setStatsData(response.data);
                setUseMockData(false);
                // 如果之前API不可用，但现在成功获取数据，更新API状态
                if (apiStatus.available === false) {
                    setApiStatus(prev => ({
                        ...prev,
                        available: true,
                        lastChecked: new Date(),
                        message: '统计API连接恢复'
                    }));
                }
            } else {
                console.log('API返回的数据为空或格式不正确，使用模拟数据', response);
                setStatsData(mockData);
                setUseMockData(true);
                setError(`未能获取真实数据：${response.message || '数据为空'}`);
                message.warning('无法从服务器获取数据，显示模拟数据');
            }
        } catch (error) {
            console.error('加载统计数据失败:', error);
            
            let errorMessage = '获取报表数据失败';
            if (error.response) {
                errorMessage += `: ${error.response.status} - ${error.response.data?.message || '未知错误'}`;
            } else if (error.request) {
                errorMessage += ': 服务器未响应，请检查网络连接和服务器状态';
                // API可能不可用，更新状态
                setApiStatus({
                    checking: false,
                    available: false,
                    lastChecked: new Date(),
                    message: '服务器未响应'
                });
            } else {
                errorMessage += `: ${error.message}`;
            }
            
            setError(errorMessage);
            setStatsData(mockData);
            setUseMockData(true);
            message.error('数据加载失败，显示模拟数据');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStats();
        // 初始检查API状态
        checkApiStatus();
    }, []);

    useEffect(() => {
        if (!loading) {
            loadStats();
        }
    }, [dateRange]);

    // 表格列配置
    const columns = [
        {
            title: '班组/科室',
            dataIndex: 'team',
            key: 'team',
        },
        {
            title: '提交总数',
            dataIndex: 'totalSubmissions',
            key: 'totalSubmissions',
            sorter: (a, b) => a.totalSubmissions - b.totalSubmissions,
        },
        {
            title: '通过率',
            dataIndex: 'approvalRate',
            key: 'approvalRate',
            render: (val) => `${val ? val.toFixed(2) : 0}%`,
            sorter: (a, b) => a.approvalRate - b.approvalRate,
        },
        {
            title: '实施完成率',
            dataIndex: 'implementationRate',
            key: 'implementationRate',
            render: (val) => `${val ? val.toFixed(2) : 0}%`,
            sorter: (a, b) => a.implementationRate - b.implementationRate,
        },
        {
            title: '班组得分总和',
            dataIndex: 'totalScore',
            key: 'totalScore',
            sorter: (a, b) => (a.totalScore || 0) - (b.totalScore || 0),
            render: (val) => (typeof val === 'number' ? val.toFixed(1) : '-'),
        },
    ];

    // 柱状图配置
    const barConfig = {
        data: statsData,
        xField: 'team',
        yField: 'totalSubmissions',
        label: {
            position: 'top',
        },
        meta: {
            team: {
                alias: '班组/科室',
            },
            totalSubmissions: {
                alias: '提交总数',
            },
        },
        height: 220, // 减小图表高度
    };

    // 通过率和实施率对比图配置
    const rateComparisonConfig = {
        data: statsData.length > 0 ? statsData.map(item => [
            {
                team: item.team,
                rate: item.approvalRate || 0,
                type: '通过率'
            },
            {
                team: item.team,
                rate: item.implementationRate || 0,
                type: '实施完成率'
            }
        ]).flat() : [],
        xField: 'team',
        yField: 'rate',
        seriesField: 'type',
        meta: {
            rate: {
                formatter: (v) => `${v}%`
            }
        },
        height: 220, // 减小图表高度
    };

    const renderContent = () => {
        if (loading) {
            return <Spin tip="加载中..." size="large" style={{ marginTop: 60, display: 'flex', justifyContent: 'center' }} />;
        }

        if (error && !useMockData) {
            return <Alert message={error} type="error" style={{ marginTop: 15 }} />;
        }

        if (!statsData || statsData.length === 0) {
            return <Empty description="暂无数据" style={{ marginTop: 30 }} />;
        }

        return (
            <Row gutter={[12, 12]}>
                {(useMockData || error) && (
                    <Col span={24}>
                        <Alert
                            message={useMockData ? "当前显示的是模拟数据" : "数据加载出现问题"}
                            description={
                                <div>
                                    <p style={{ margin: '8px 0' }}>{error || '无法从服务器获取真实数据，当前显示的是模拟数据。'}</p>
                                    <Space>
                                        <Button 
                                            type="primary" 
                                            size="small"
                                            icon={<ReloadOutlined />}
                                            onClick={loadStats}
                                            loading={loading}
                                        >
                                            重新加载数据
                                        </Button>
                                        <Button 
                                            type="link" 
                                            size="small"
                                            onClick={checkApiStatus}
                                            loading={apiStatus.checking}
                                        >
                                            检查API状态
                                        </Button>
                                    </Space>
                                </div>
                            }
                            type="warning"
                            showIcon
                            style={{ marginBottom: 12 }}
                        />
                    </Col>
                )}
                
                <Col xs={24} lg={12}>
                    <Card 
                        title={
                            <Space>
                                <span>建议提交数量</span>
                                {apiStatus.available === true && (
                                    <Text type="success"><CheckCircleOutlined /> API可用</Text>
                                )}
                                {apiStatus.available === false && (
                                    <Text type="danger"><ExclamationCircleOutlined /> API不可用</Text>
                                )}
                            </Space>
                        } 
                        size="small"
                        bordered={false}
                        bodyStyle={{ padding: '8px' }}
                        headStyle={{ padding: '8px 12px' }}
                        extra={
                            <Button 
                                icon={<ReloadOutlined />} 
                                onClick={loadStats}
                                loading={loading}
                                size="small"
                            >
                                刷新
                            </Button>
                        }
                    >
                        <Bar {...barConfig} />
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card 
                        title="通过率和实施完成率对比" 
                        size="small"
                        bordered={false}
                        bodyStyle={{ padding: '8px' }}
                        headStyle={{ padding: '8px 12px' }}
                    >
                        <Line {...rateComparisonConfig} />
                    </Card>
                </Col>
                <Col span={24}>
                    <Card 
                        title="详细数据" 
                        size="small"
                        bordered={false}
                        bodyStyle={{ padding: '8px' }}
                        headStyle={{ padding: '8px 12px' }}
                    >
                        <Table
                            columns={columns}
                            dataSource={statsData}
                            rowKey="team"
                            loading={loading}
                            size="small"
                            pagination={false}
                        />
                    </Card>
                </Col>
            </Row>
        );
    };

    return (
        <div className="department-performance" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Card 
                title="报表统计" 
                size="small"
                bodyStyle={{ padding: '12px' }}
                extra={
                    <Space size="small">
                        <RangePicker
                            value={dateRange}
                            onChange={setDateRange}
                            allowClear={false}
                            ranges={presetRanges}
                            size="small"
                        />
                        <Button 
                            icon={<ReloadOutlined />} 
                            onClick={loadStats}
                            loading={loading}
                            size="small"
                        >
                            刷新
                        </Button>
                    </Space>
                }
            >
                {renderContent()}
            </Card>
        </div>
    );
};

export default DepartmentPerformance; 