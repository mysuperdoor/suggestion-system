import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Upload,
  Button,
  Card,
  message,
  Space,
  Alert
} from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { suggestionService } from '../../services/suggestionService';
import { authService } from '../../services/authService';

const { TextArea } = Input;
const { Option } = Select;

const NewSuggestion = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [suggestionTypes, setSuggestionTypes] = useState([]);
  const [initializing, setInitializing] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [isRestrictedUser, setIsRestrictedUser] = useState(false);
  const navigate = useNavigate();

  // 检查用户权限
  useEffect(() => {
    const checkUserPermission = async () => {
      try {
        const user = await authService.getCurrentUser();
        setCurrentUser(user);
        
        // 检查是否是运行科或安全科管理人员
        if (user && (user.role === '运行科管理人员' || user.role === '安全科管理人员')) {
          console.log('当前用户没有提交建议权限:', user.role);
          setIsRestrictedUser(true);
          message.error('运行科和安全科管理人员暂时无法提交建议');
          
          // 延迟一秒后重定向，让用户有时间看到消息
          setTimeout(() => {
            navigate('/suggestions/list');
          }, 1500);
        }
      } catch (error) {
        console.error('检查用户权限失败:', error);
      }
    };
    
    checkUserPermission();
  }, [navigate]);

  // 获取初始数据
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setInitializing(true);
        const response = await suggestionService.getCreateData();
        console.log('获取创建建议数据:', response);
        
        if (response && response.types) {
          setSuggestionTypes(response.types);
        } else {
          // 如果API还没准备好，使用默认数据
          setSuggestionTypes([
            { label: '安全管理', value: 'SAFETY' },
            { label: '生产优化', value: 'PRODUCTION' },
            { label: '智能化升级', value: 'AUTOMATION' },
            { label: '其它', value: 'OTHER' }
          ]);
        }
      } catch (error) {
        console.error('获取初始数据失败:', error);
        message.error('加载表单数据失败，使用默认配置');
        // 使用默认数据
        setSuggestionTypes([
          { label: '安全管理', value: 'SAFETY' },
          { label: '生产优化', value: 'PRODUCTION' },
          { label: '智能化升级', value: 'AUTOMATION' },
          { label: '其它', value: 'OTHER' }
        ]);
      } finally {
        setInitializing(false);
      }
    };

    fetchInitialData();
  }, []);

  // 处理文件上传
  const handleFileChange = ({ fileList }) => {
    setFileList(fileList);
  };

  // 处理表单提交
  const handleSubmit = async (values) => {
    // 再次检查用户权限
    if (isRestrictedUser) {
      message.error('您没有提交建议的权限');
      return;
    }
    
    try {
      setLoading(true);
      console.log('提交的表单值:', values);
      
      // 创建FormData对象
      const formData = new FormData();
      
      // 添加文件
      fileList.forEach((file, index) => {
        if (file.originFileObj) {
          console.log(`添加文件 ${index}:`, file.name);
          formData.append('files', file.originFileObj);
        }
      });

      // 添加其他表单数据
      Object.keys(values).forEach(key => {
        console.log(`添加字段 ${key}:`, values[key]);
        formData.append(key, values[key]);
      });

      // 打印FormData内容（仅用于调试）
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + (pair[1] instanceof File ? pair[1].name : pair[1]));
      }

      // 提交建议
      const response = await suggestionService.submitSuggestion(formData);
      
      console.log('提交成功，响应:', response);
      message.success('建议提交成功！');
      navigate('/suggestions/list');
    } catch (error) {
      console.error('提交建议失败:', error);
      message.error(`提交失败: ${error.response?.data?.message || error.message || '请重试'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="提交合理化建议" loading={initializing}>
      {isRestrictedUser && (
        <Alert
          message="权限受限"
          description="运行科和安全科管理人员暂时无法提交建议。"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        disabled={initializing || isRestrictedUser}
      >
        <Form.Item
          name="title"
          label="建议标题"
          rules={[{ required: true, message: '请输入建议标题' }]}
        >
          <Input placeholder="请输入建议标题" maxLength={100} />
        </Form.Item>

        <Form.Item
          name="type"
          label="建议类型"
          rules={[{ required: true, message: '请选择建议类型' }]}
        >
          <Select placeholder="请选择建议类型">
            {suggestionTypes.map(type => (
              <Option key={type.value} value={type.value}>
                {type.label}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="content"
          label="建议内容"
          rules={[{ required: true, message: '请输入建议内容' }]}
        >
          <TextArea
            placeholder="请详细描述您的建议..."
            rows={6}
            maxLength={2000}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="expectedBenefit"
          label="预期效益"
          rules={[{ required: true, message: '请描述预期效益' }]}
        >
          <TextArea
            placeholder="请描述实施该建议可能带来的效益..."
            rows={4}
            maxLength={1000}
            showCount
          />
        </Form.Item>

        <Form.Item
          label="附件"
          extra="支持 jpg、png、pdf 格式文件，单个文件不超过10MB"
        >
          <Upload
            fileList={fileList}
            onChange={handleFileChange}
            beforeUpload={() => false}
            maxCount={5}
          >
            <Button icon={<UploadOutlined />} disabled={isRestrictedUser}>选择文件</Button>
          </Upload>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading} disabled={isRestrictedUser}>
              提交建议
            </Button>
            <Button onClick={() => navigate('/suggestions/list')}>
              取消
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default NewSuggestion; 