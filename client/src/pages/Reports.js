import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Select, DatePicker, Typography, Spin, Alert, Table } from 'antd';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell 
} from 'recharts';
import moment from 'moment';
import axios from 'axios';
import { getAuthHeader } from '../utils/authUtils';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A64D79'];

// API基础URL
const API_BASE_URL = 'http://localhost:5000/api';

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [dateRange, setDateRange] = useState([
    moment().subtract(1, 'year'),
    moment()
  ]);
  const [department, setDepartment] = useState('all');
  const [timeUnit, setTimeUnit] = useState('month');
  
  const [monthlyData, setMonthlyData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [teamData, setTeamData] = useState([]);
  const [typeData, setTypeData] = useState([]);
  const [topContributors, setTopContributors] = useState([]);
  
  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 构建查询参数
      const params = new URLSearchParams();
      params.append('startDate', dateRange[0].format('YYYY-MM-DD'));
      params.append('endDate', dateRange[1].format('YYYY-MM-DD'));
      if (department !== 'all') {
        params.append('department', department);
      }
      params.append('timeUnit', timeUnit);
      
      // 修复API路径，使用正确的URL前缀
      const response = await axios.get(
        `${API_BASE_URL}/reports/statistics?${params.toString()}`,
        { headers: getAuthHeader() }
      );
      const data = response.data;
      
      // 更新各个图表数据
      setMonthlyData(data.timeDistribution || []);
      setDepartmentData(data.departmentDistribution || []);
      setStatusData(data.statusDistribution || []);
      setTeamData(data.teamDistribution || []);
      setTypeData(data.typeDistribution || []);
      setTopContributors(data.topContributors || []);
      
    } catch (err) {
      console.error('获取报表数据失败:', err);
      setError('获取报表数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchReportData();
  }, [department, timeUnit, dateRange]);
  
  // 按日期范围筛选
  const handleDateRangeChange = (dates) => {
    if (dates && dates.length === 2) {
      setDateRange(dates);
    }
  };
  
  // 贡献者列表表格列定义
  const contributorsColumns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (_, __, index) => index + 1
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '所属班组',
      dataIndex: 'team',
      key: 'team'
    },
    {
      title: '建议数量',
      dataIndex: 'count',
      key: 'count',
      sorter: (a, b) => a.count - b.count
    },
    {
      title: '采纳率',
      dataIndex: 'adoptionRate',
      key: 'adoptionRate',
      render: (text) => `${text}%`,
      sorter: (a, b) => a.adoptionRate - b.adoptionRate
    }
  ];
  
  return (
    <div style={{ padding: 16 }}>
      <Title level={2}>统计报表</Title>
      
      {error && (
        <Alert
          message="获取数据失败"
          description={error}
          type="error"
          style={{ marginBottom: 16 }}
          closable
        />
      )}
      
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Select
            defaultValue="all"
            style={{ width: 200 }}
            value={department}
            onChange={(value) => setDepartment(value)}
          >
            <Option value="all">所有部门</Option>
            <Option value="SAFETY">安全科</Option>
            <Option value="OPERATION">运行科</Option>
          </Select>
        </Col>
        <Col span={8}>
          <Select
            style={{ width: 200 }}
            value={timeUnit}
            onChange={(value) => setTimeUnit(value)}
          >
            <Option value="year">按年度统计</Option>
            <Option value="quarter">按季度统计</Option>
            <Option value="month">按月度统计</Option>
            <Option value="week">按周统计</Option>
          </Select>
        </Col>
        <Col span={8}>
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            style={{ width: 250 }}
          />
        </Col>
      </Row>
      
      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="建议提交趋势">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={monthlyData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timePeriod" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    name="建议数量" 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          
          <Col span={12}>
            <Card title="各班组建议分布">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={teamData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {teamData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} 条建议`, '数量']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          
          <Col span={12}>
            <Card title="建议类型分布">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} 条建议`, '数量']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          
          <Col span={12}>
            <Card title="建议状态分布">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} 条建议`, '数量']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          
          <Col span={12}>
            <Card title="部门分布">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={departmentData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" name="建议数量" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          
          <Col span={24}>
            <Card title="建议贡献排行榜">
              <Table
                dataSource={topContributors}
                columns={contributorsColumns}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default Reports; 