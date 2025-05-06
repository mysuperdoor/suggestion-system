import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin, message } from 'antd';
import {
  FileAddOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import axios from 'axios';
import moment from 'moment';

// 从环境变量或配置中获取API地址
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState({
    totalCount: 0,
    approvedCount: 0,
    inProgressCount: 0
  });

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      
      // 设置筛选条件为当前月
      const startDate = moment().startOf('month').format('YYYY-MM-DD');
      const endDate = moment().endOf('month').format('YYYY-MM-DD');
      
      const params = new URLSearchParams({
        startDate,
        endDate
      });

      const response = await axios.get(`${API_BASE_URL}/reports/statistics?${params.toString()}`, {
        headers: {
          'x-auth-token': localStorage.getItem('token')
        }
      });

      if (response.data && response.data.success) {
        // 提取状态分布数据
        const { statusDistribution } = response.data;
        
        // 计算总数、已批准数和处理中数
        let totalCount = 0;
        let approvedCount = 0;
        let inProgressCount = 0;
        
        if (Array.isArray(statusDistribution)) {
          statusDistribution.forEach(item => {
            totalCount += item.value;
            
            // 根据状态名称分类
            if (['已批准', '已通过'].includes(item.name)) {
              approvedCount += item.value;
            } else if (['实施中', '联系中', '未开始'].includes(item.name)) {
              inProgressCount += item.value;
            }
          });
        }
        
        setStatistics({
          totalCount,
          approvedCount,
          inProgressCount
        });
      } else {
        message.error('获取统计数据失败');
      }
    } catch (error) {
      console.error('获取统计数据错误:', error);
      message.error('获取统计数据失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>统计报表</h1>
      <Spin spinning={loading}>
        <Row gutter={16}>
          <Col span={8}>
            <Card>
              <Statistic
                title="本月建议总数"
                value={statistics.totalCount}
                prefix={<FileAddOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="已采纳建议"
                value={statistics.approvedCount}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="处理中建议"
                value={statistics.inProgressCount}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
};

export default Reports; 