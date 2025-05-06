import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, message, Checkbox, Alert, Typography } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';

const { Title, Text } = Typography;

const Login = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // 组件加载时检查是否有保存的用户名和记住密码状态
  useEffect(() => {
    const savedUsername = localStorage.getItem('savedUsername');
    const rememberPassword = localStorage.getItem('rememberPassword') === 'true';
    
    if (savedUsername) {
      form.setFieldsValue({
        username: savedUsername,
        remember: rememberPassword
      });
    }
    
    // 检查是否已经登录，如果已登录则重定向到首页
    const checkLoginStatus = async () => {
      try {
        const isAuthenticated = authService.isAuthenticated();
        console.log('登录页检查认证状态:', isAuthenticated);
        
        if (isAuthenticated) {
          // 尝试获取用户信息验证token有效性
          const user = await authService.getCurrentUser();
          if (user) {
            console.log('用户已登录，重定向到首页');
            navigate('/');
            return;
          } else {
            // 如果获取不到用户信息但有token，可能token已失效
            console.log('Token可能已失效，清除登录状态');
            authService.logout();
          }
        }
      } catch (error) {
        console.error('检查登录状态失败:', error);
      }
    };
    
    checkLoginStatus();
  }, [form, navigate]);

  const onFinish = async (values) => {
    try {
      setLoading(true);
      setError('');
      
      const { username, password, remember } = values;
      
      // 记住用户名和是否记住密码的选择
      if (remember) {
        localStorage.setItem('savedUsername', username);
        localStorage.setItem('rememberPassword', 'true');
      } else {
        localStorage.removeItem('savedUsername');
        localStorage.removeItem('rememberPassword');
      }
      
      console.log('开始登录...');
      const result = await authService.login(username, password);
      console.log('登录成功，获取到用户信息:', result.user);
      
      message.success('登录成功！');
      navigate('/');
    } catch (error) {
      console.error('登录失败:', error);
      setError(
        error.response?.data?.msg || 
        error.response?.data?.message || 
        '登录失败，请检查用户名和密码或联系管理员'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: '#f0f2f5',
      backgroundImage: 'url(/bg-login.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }}>
      <Card 
        title={
          <div style={{ textAlign: 'center' }}>
            <Title level={3}>合理化建议管理系统</Title>
            <Text type="secondary">登录系统管理您的工作</Text>
          </div>
        } 
        style={{ 
          width: 380,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          borderRadius: '8px'
        }}
      >
        {error && (
          <Alert
            message="登录失败"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setError('')}
          />
        )}
        
        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          initialValues={{ remember: false }}
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="用户名" 
              autoComplete="username"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>记住用户名</Checkbox>
            </Form.Item>
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              style={{ width: '100%', height: '40px' }}
            >
              登录
            </Button>
          </Form.Item>
          
          <div style={{ textAlign: 'center' }}>
            <SafetyOutlined style={{ marginRight: 8 }} />
            <Text type="secondary">如忘记密码，请联系系统管理员</Text>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Login; 