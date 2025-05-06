import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { 
  FileAddOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined 
} from '@ant-design/icons';

const Home = () => {
  return (
    <div>
      <h1>首页</h1>
      <h2>系统概况</h2>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月提交建议"
              value={28}
              prefix={<FileAddOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待审核建议"
              value={5}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已采纳建议"
              value={156}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="参与人数"
              value={45}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Home; 