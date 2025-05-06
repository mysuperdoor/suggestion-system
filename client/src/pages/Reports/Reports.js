import React, { useState, useEffect } from 'react';
import { Card, Row, Col, DatePicker, Spin, message } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';
import axios from 'axios';
import moment from 'moment';

const { RangePicker } = DatePicker;

// 从环境变量或配置中获取API地址
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [monthlyData, setMonthlyData] = useState([]);
  const [typeData, setTypeData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [dateRange, setDateRange] = useState([
    moment().subtract(1, 'month'),
    moment().add(1, 'day')
  ]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      const [start, end] = dateRange;
      const params = new URLSearchParams({
        startDate: start.format('YYYY-MM-DD'),
        endDate: end.format('YYYY-MM-DD'),
        timeUnit: 'month'
      });

      const response = await axios.get(`${API_BASE_URL}/reports/statistics?${params.toString()}`, {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });

      if (response.data && response.data.success) {
        const { timeDistribution, typeDistribution, statusDistribution } = response.data;
        
        // 处理月度数据
        if (Array.isArray(timeDistribution)) {
          const formattedMonthlyData = timeDistribution.map(item => ({
            month: moment(item.timePeriod, 'YYYY-MM').format('M月'),
            count: item.count
          }));
          setMonthlyData(formattedMonthlyData);
        }
        
        // 处理类型数据
        if (Array.isArray(typeDistribution)) {
          setTypeData(typeDistribution);
        }
        
        // 处理状态数据
        if (Array.isArray(statusDistribution)) {
          setStatusData(statusDistribution);
        }
      } else {
        message.error('获取报表数据失败');
      }
    } catch (error) {
      console.error('获取报表数据错误:', error);
      message.error('获取报表数据失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (dates) => {
    if (dates && dates.length === 2) {
      setDateRange(dates);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>统计报表</h2>
        <RangePicker 
          value={dateRange} 
          onChange={handleDateChange}
          style={{ width: 280 }}
        />
      </div>
      
      <Spin spinning={loading}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <Card 
              title="月度建议数量统计" 
              size="small"
              bodyStyle={{ padding: '8px' }}
              headStyle={{ padding: '0 12px' }}
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8884d8" name="建议数量" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card 
              title="建议类型分布" 
              size="small"
              bodyStyle={{ padding: '8px' }}
              headStyle={{ padding: '0 12px' }}
            >
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                    label={(entry) => entry.name}
                  >
                    {typeData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card 
              title="建议处理情况统计" 
              size="small"
              bodyStyle={{ padding: '8px' }}
              headStyle={{ padding: '0 12px' }}
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" fill="#82ca9d" name="数量" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default Reports; 