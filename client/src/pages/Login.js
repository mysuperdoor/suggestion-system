import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    try {
      setLoading(true);
      const response = await axios.post('/auth/login', values);
      const { token, user } = response.data;
      
      // 存储用户信息
      localStorage.setItem('token', token);
      localStorage.setItem('userId', user.id);
      localStorage.setItem('userRole', user.role);
      localStorage.setItem('userName', user.name);
      localStorage.setItem('userTeam', user.team);

      message.success('登录成功');
      navigate('/dashboard');
    } catch (error) {
      message.error(error.response?.data?.msg || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
  style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    background: 'linear-gradient(to right, #f8f9fa 50%, #ffffff 50%)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  }}
>
  <Card 
    style={{ 
      width: 480,
      borderRadius: '0',
      boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
      overflow: 'hidden',
      background: '#ffffff',
      border: 'none'
    }}
    bodyStyle={{ padding: '0' }}
    bordered={false}
  >
    {/* 企业标题栏 */}
    <div style={{ 
      padding: '22px 40px',
      borderBottom: '1px solid #e8e8e8',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>
        <div style={{ 
          fontSize: '22px', 
          fontWeight: '600',
          color: '#0d1835',
          letterSpacing: '0.3px',
          display: 'flex',
          alignItems: 'center'
        }}>
          {/* 简化的企业logo图标 */}
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: '#0d1835',
            marginRight: '12px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            fontSize: '16px',
            fontWeight: 'bold'
          }}>P</div>
          生产调度部
        </div>
      </div>
      <div style={{
        fontSize: '14px',
        color: '#8592a6'
      }}>合理化建议平台</div>
    </div>
    
    {/* 登录区域 */}
    <div style={{ padding: '40px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          color: '#0d1835', 
          margin: '0 0 8px 0',
          fontWeight: '600',
        }}>
          系统登录
        </h2>
        <div style={{
          fontSize: '14px',
          color: '#8592a6',
          lineHeight: '1.5'
        }}>
          创新思维，助力发展
        </div>
      </div>
      
      <Form
        name="login"
        onFinish={onFinish}
        autoComplete="off"
        layout="vertical"
        requiredMark={false}
      >
        <Form.Item
          label={<span style={{ fontSize: '14px', color: '#0d1835', fontWeight: '500' }}>用户名</span>}
          name="username"
          rules={[{ required: true, message: '请输入企业用户名' }]}
        >
          <Input 
            size="large"
            style={{ 
              borderRadius: '4px', 
              height: '48px', 
              fontSize: '14px',
              border: '1px solid #d9e1ec',
              boxShadow: 'none',
              padding: '0 16px'
            }}
          />
        </Form.Item>

        <Form.Item
          label={<span style={{ fontSize: '14px', color: '#0d1835', fontWeight: '500' }}>密码</span>}
          name="password"
          rules={[{ required: true, message: '请输入登录密码' }]}
          style={{ marginBottom: '28px' }}
        >
          <Input.Password
            size="large"
            style={{ 
              borderRadius: '4px', 
              height: '48px', 
              fontSize: '14px',
              border: '1px solid #d9e1ec',
              boxShadow: 'none',
              padding: '0 16px'
            }}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: '16px' }}>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading} 
            block 
            size="large"
            style={{ 
              height: '48px', 
              borderRadius: '4px', 
              background: '#0d1835',
              border: 'none',
              fontSize: '15px',
              fontWeight: '500',
              boxShadow: '0 4px 12px rgba(13,24,53,0.2)',
              letterSpacing: '1px'
            }}
          >
            登录
          </Button>
        </Form.Item>
        

      </Form>
    </div>
    
    {/* 页脚 */}
    <div style={{ 
      padding: '18px 40px',
      borderTop: '1px solid #e8e8e8',
      fontSize: '12px',
      color: '#8592a6',
      display: 'flex',
      justifyContent: 'space-between'
    }}>
      <div>© {new Date().getFullYear()} 内部系统 · 版本 1.0.0</div>
      <div>2#518</div>
    </div>
  </Card>
</div>
  );
};

export default Login; 