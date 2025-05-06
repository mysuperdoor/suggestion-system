import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography, Space, Alert } from 'antd';
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Title, Text } = Typography;

const ChangePassword = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const onFinish = async (values) => {
    try {
      setLoading(true);
      setError('');
      setSuccess(false);
      
      await api.put('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword
      });
      
      message.success('密码修改成功！');
      setSuccess(true);
      form.resetFields();
    } catch (error) {
      console.error('修改密码失败:', error);
      setError(
        error.response?.data?.msg || 
        error.response?.data?.message || 
        '密码修改失败，请稍后重试'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>修改密码</Title>
      <Text type="secondary">为了您的账户安全，建议定期修改密码</Text>
      
      <Card style={{ maxWidth: 500, margin: '24px 0' }}>
        {error && (
          <Alert
            message="修改失败"
            description={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            closable
            onClose={() => setError('')}
          />
        )}
        
        {success && (
          <Alert
            message="修改成功"
            description="您的密码已经成功修改，下次登录请使用新密码"
            type="success"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}
        
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <Form.Item
            name="currentPassword"
            label="当前密码"
            rules={[{ required: true, message: '请输入当前密码' }]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="请输入当前密码" 
            />
          </Form.Item>
          
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码长度不能少于6个字符' }
            ]}
            hasFeedback
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="请输入新密码" 
            />
          </Form.Item>
          
          <Form.Item
            name="confirmPassword"
            label="确认新密码"
            dependencies={['newPassword']}
            hasFeedback
            rules={[
              { required: true, message: '请确认新密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="请再次输入新密码" 
            />
          </Form.Item>
          
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              icon={<CheckCircleOutlined />}
            >
              确认修改
            </Button>
          </Form.Item>
        </Form>
        
        <Space direction="vertical" style={{ marginTop: 16 }}>
          <Text type="secondary">密码安全建议：</Text>
          <ul>
            <li>密码长度至少6个字符</li>
            <li>建议使用字母、数字和特殊字符的组合</li>
            <li>不要使用容易被猜到的信息（如生日）</li>
            <li>不要与其他系统使用相同的密码</li>
          </ul>
        </Space>
      </Card>
    </div>
  );
};

export default ChangePassword; 