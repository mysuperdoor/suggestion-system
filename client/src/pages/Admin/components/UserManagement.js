import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tag,
  Switch,
  Tooltip,
  Card,
  Row,
  Col,
  Divider
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  KeyOutlined, 
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { userService } from '../../../services/userService';

const { Option } = Select;
const { confirm } = Modal;

const UserManagement = () => {
  const [form] = Form.useForm();
  const [resetForm] = Form.useForm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [resetPasswordVisible, setResetPasswordVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    showTotal: (total) => `共 ${total} 条记录`
  });
  const [filterParams, setFilterParams] = useState({
    role: '',
    team: '',
    status: ''
  });

  // 角色选项 - 使用中文值
  const roleOptions = [
    { label: '部门经理', value: '部门经理' },
    { label: '值班主任', value: '值班主任' },
    { label: '安全科管理人员', value: '安全科管理人员' },
    { label: '运行科管理人员', value: '运行科管理人员' },
    { label: '班组人员', value: '班组人员' }
  ];

  // 班组选项 - 使用中文值
  const teamOptions = [
    { label: '甲班', value: '甲班' },
    { label: '乙班', value: '乙班' },
    { label: '丙班', value: '丙班' },
    { label: '丁班', value: '丁班' },
    { label: '无班组', value: '无班组' }
  ];
  
  // 部门选项 - 使用中文值
  const departmentOptions = [
    { label: '生产调度部', value: '生产调度部' }
  ];

  // 获取用户列表
  const fetchUsers = async (params = {}) => {
    try {
      setLoading(true);
      
      // 构建查询参数
      const queryParams = {
        page: params.page || pagination.current,
        limit: params.pageSize || pagination.pageSize,
        ...filterParams
      };
      
      console.log('请求用户列表参数:', queryParams);
      const result = await userService.getUsers(queryParams);
      console.log('用户服务返回结果:', result);
      
      if (result && result.data) {
        console.log('设置用户数据:', result.data);
        setUsers(result.data);
        
        // 如果有分页信息，更新分页状态
        if (result.pagination) {
          console.log('更新分页信息:', result.pagination);
          setPagination({
            ...pagination,
            current: result.pagination.current || 1,
            pageSize: result.pagination.pageSize || 10,
            total: result.pagination.total || 0
          });
        }
      } else {
        console.warn('获取到的用户数据为空');
        setUsers([]);
        message.warning('获取用户列表为空');
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
      console.error('错误详情:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
      message.error('获取用户列表失败: ' + (error.response?.data?.message || error.message || '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filterParams]);

  // 获取角色对应的标签颜色
  const getRoleTagColor = (role) => {
    const roleMap = {
      '部门经理': 'red',
      '值班主任': 'orange',
      '安全科管理人员': 'green',
      '运行科管理人员': 'blue',
      '班组人员': 'purple'
    };
    return roleMap[role] || 'default';
  };
  
  // 获取角色的中文名称
  const getRoleName = (role) => {
    const roleMap = {
      'DEPARTMENT_MANAGER': '部门经理',
      'SHIFT_SUPERVISOR': '值班主任',
      'SAFETY_ADMIN': '安全科管理人员',
      'OPERATION_ADMIN': '运行科管理人员',
      'TEAM_MEMBER': '班组人员'
    };
    return roleMap[role] || role;
  };
  
  // 获取班组的中文名称
  const getTeamName = (team) => {
    const teamMap = {
      'TEAM_A': '甲班',
      'TEAM_B': '乙班',
      'TEAM_C': '丙班',
      'TEAM_D': '丁班',
      'NONE': '无班组'
    };
    return teamMap[team] || team;
  };
  
  // 获取部门的中文名称
  const getDepartmentName = (department) => {
    const deptMap = {
      'PRODUCTION': '生产调度部'
    };
    return deptMap[department] || department;
  };

  // 获取角色的中文标签
  const getRoleLabel = (value) => {
    const role = roleOptions.find(option => option.value === value);
    return role ? role.label : value;
  };

  // 获取班组的中文标签
  const getTeamLabel = (value) => {
    const team = teamOptions.find(option => option.value === value);
    return team ? team.label : value;
  };

  // 表格列定义
  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
    },
    {
      title: '姓名',
      dataIndex: 'name',
      key: 'name',
      width: 120,
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 150,
      render: (role) => {
        // 判断role是否已经是中文名称
        const chineseRoles = ['部门经理', '值班主任', '安全科管理人员', '运行科管理人员', '班组人员'];
        const roleName = chineseRoles.includes(role) ? role : getRoleName(role);
        return <Tag color={getRoleTagColor(role)}>{roleName}</Tag>;
      },
      filters: roleOptions.map(option => ({ text: option.label, value: option.value }))
    },
    {
      title: '班组',
      dataIndex: 'team',
      key: 'team',
      width: 100,
      render: (team) => {
        // 判断team是否已经是中文名称
        const chineseTeams = ['甲班', '乙班', '丙班', '丁班', '无班组'];
        const teamName = chineseTeams.includes(team) ? team : getTeamName(team);
        return teamName;
      },
      filters: teamOptions.map(option => ({ text: option.label, value: option.value }))
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 100,
      render: (department) => getDepartmentName(department),
      filters: departmentOptions.map(option => ({ text: option.label, value: option.value }))
    },
    {
      title: '状态',
      dataIndex: 'active',
      key: 'active',
      width: 80,
      render: (active) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? '启用' : '禁用'}
        </Tag>
      ),
      filters: [
        { text: '启用', value: 'true' },
        { text: '禁用', value: 'false' }
      ]
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      render: (_, record) => (
        <Space split={<Divider type="vertical" />}>
          <Tooltip title="编辑用户">
            <Button 
              type="primary"
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          </Tooltip>
          
          <Tooltip title="重置密码">
            <Button
              icon={<KeyOutlined />}
              size="small"
              onClick={() => showResetPasswordModal(record)}
            >
              重置密码
            </Button>
          </Tooltip>
          
          <Tooltip title="删除用户">
            <Button 
              danger
              icon={<DeleteOutlined />}
              size="small"
              onClick={() => showDeleteConfirm(record)}
            >
              删除
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 处理表格变化（分页、排序、筛选）
  const handleTableChange = (pagination, filters) => {
    const filterParams = {};
    
    // 处理筛选条件
    if (filters.role && filters.role.length) {
      filterParams.role = filters.role[0];
    }
    
    if (filters.team && filters.team.length) {
      filterParams.team = filters.team[0];
    }
    
    if (filters.department && filters.department.length) {
      filterParams.department = filters.department[0];
    }
    
    if (filters.active && filters.active.length) {
      filterParams.active = filters.active[0];
    }
    
    setFilterParams(filterParams);
    fetchUsers({
      page: pagination.current,
      pageSize: pagination.pageSize
    });
  };

  // 显示添加/编辑用户弹窗
  const showUserModal = (user = null) => {
    setSelectedUser(user);
    form.resetFields();
    
    if (user) {
      // 直接使用用户数据填充表单
      form.setFieldsValue({
        username: user.username,
        name: user.name,
        role: user.role,           // 直接使用值，后端返回的是中文
        team: user.team,           // 直接使用值，后端返回的是中文
        department: user.department,
        active: user.active
      });
    } else {
      // 创建新用户时使用默认值
      form.setFieldsValue({
        active: true,
        department: '生产调度部'
      });
    }
    
    setModalVisible(true);
  };
  
  // 处理编辑用户
  const handleEdit = (user) => {
    showUserModal(user);
  };
  
  // 显示删除确认弹窗
  const showDeleteConfirm = (user) => {
    // 获取当前登录用户信息
    const currentUser = JSON.parse(localStorage.getItem('user'));
    
    // 检查是否尝试删除自己的账号
    if (user._id === currentUser?._id) {
      message.error('不能删除当前登录的账号');
      return;
    }
    
    confirm({
      title: '确定要删除此用户吗？',
      icon: <ExclamationCircleOutlined />,
      content: `用户名: ${user.username}, 姓名: ${user.name}`,
      okText: '确定',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        handleDelete(user._id);
      }
    });
  };

  // 处理删除用户
  const handleDelete = async (id) => {
    try {
      console.log('删除用户，ID:', id);
      const response = await userService.deleteUser(id);
      console.log('删除用户响应:', response);
      message.success('用户删除成功');
      fetchUsers();
    } catch (error) {
      console.error('删除用户错误详情:', error);
      console.error('错误响应:', error.response);
      const errorMsg = error.response?.data?.message || 
                     error.response?.data?.msg || 
                     error.message || 
                     '删除用户失败，请检查网络连接';
      message.error(`删除失败: ${errorMsg}`);
    }
  };
  
  // 显示重置密码弹窗
  const showResetPasswordModal = (user) => {
    setSelectedUser(user);
    resetForm.resetFields();
    setResetPasswordVisible(true);
  };

  // 处理重置密码
  const handleResetPassword = async () => {
    try {
      const values = await resetForm.validateFields();
      console.log('重置密码，用户ID:', selectedUser._id);
      
      try {
        // 确保password和confirmPassword相同
        if (values.password !== values.confirmPassword) {
          message.error('两次输入的密码不一致');
          return;
        }
        
        console.log('发送密码重置请求，密码长度:', values.password.length);
        const response = await userService.resetPassword(selectedUser._id, values.password);
        console.log('重置密码响应:', response);
        message.success(`用户 ${selectedUser.name} 的密码已重置`);
        setResetPasswordVisible(false);
      } catch (error) {
        console.error('重置密码错误详情:', error);
        if (error.response) {
          console.error('错误状态码:', error.response.status);
          console.error('错误响应数据:', error.response.data);
        }
        const errorMsg = error.response?.data?.message || 
                       error.response?.data?.msg || 
                       error.message || 
                       '重置密码失败，请检查网络连接';
        message.error(`重置密码失败: ${errorMsg}`);
      }
    } catch (error) {
      console.error('表单验证错误:', error);
      // 表单验证错误，不做处理
    }
  };

  // 处理保存用户
  const handleSaveUser = async () => {
    try {
      const values = await form.validateFields();
      console.log('保存用户表单数据:', values);
      
      // 直接使用表单值
      const userData = {
        ...values,
        active: typeof values.active === 'boolean' ? values.active : values.active === 'true'
      };
      
      console.log('准备发送到后端的数据:', userData);
      
      if (selectedUser) {
        // 更新用户
        console.log('更新用户，ID:', selectedUser._id, '数据:', userData);
        try {
          const response = await userService.updateUser(selectedUser._id, userData);
          console.log('更新用户响应:', response);
          message.success('用户更新成功');
          setModalVisible(false);
          fetchUsers();
        } catch (error) {
          console.error('更新用户错误详情:', error.response?.data);
          const errorMsg = error.response?.data?.message || 
                         error.message || 
                         '更新用户失败';
          message.error(`更新失败: ${errorMsg}`);
        }
      } else {
        // 创建用户
        console.log('创建新用户，数据:', userData);
        try {
          const response = await userService.createUser(userData);
          console.log('创建用户响应:', response);
          message.success('用户创建成功');
          setModalVisible(false);
          fetchUsers();
        } catch (error) {
          console.error('创建用户错误详情:', error.response?.data);
          const errorMsg = error.response?.data?.message || 
                         error.message || 
                         '创建用户失败';
          message.error(`创建失败: ${errorMsg}`);
        }
      }
    } catch (error) {
      console.error('表单验证错误:', error);
      message.error('表单验证失败，请检查输入');
    }
  };

  return (
    <div>
      <Card 
        title="用户管理"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => showUserModal()}
          >
            添加用户
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={users}
          rowKey="_id"
          pagination={pagination}
          loading={loading}
          onChange={handleTableChange}
          size="middle"
          scroll={{ x: 1100 }}
        />
      </Card>

      {/* 创建/编辑用户弹窗 */}
      <Modal
        title={selectedUser ? '编辑用户' : '添加用户'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={handleSaveUser}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="用户名"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名至少3个字符' }
                ]}
              >
                <Input disabled={!!selectedUser} placeholder="请输入用户名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="name"
                label="姓名"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
          </Row>

          {!selectedUser && (
            <Form.Item
              name="password"
              label="初始密码"
              rules={[
                { required: true, message: '请输入初始密码' },
                { min: 6, message: '密码至少6个字符' }
              ]}
              validateFirst={true}
              hasFeedback
            >
              <Input.Password placeholder="请输入初始密码" />
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="role"
                label="角色"
                rules={[{ required: true, message: '请选择角色' }]}
              >
                <Select placeholder="请选择角色">
                  {roleOptions.map(option => (
                    <Option key={option.value} value={option.value}>{option.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="team"
                label="班组"
                rules={[{ required: true, message: '请选择班组' }]}
              >
                <Select placeholder="请选择班组">
                  {teamOptions.map(option => (
                    <Option key={option.value} value={option.value}>{option.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="department"
                label="部门"
                initialValue="PRODUCTION"
                rules={[{ required: true, message: '请选择部门' }]}
              >
                <Select placeholder="请选择部门" disabled>
                  {departmentOptions.map(option => (
                    <Option key={option.value} value={option.value}>{option.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="active"
                label="状态"
                valuePropName="checked"
              >
                <Switch 
                  checkedChildren={<CheckCircleOutlined />} 
                  unCheckedChildren={<CloseCircleOutlined />} 
                  defaultChecked 
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 重置密码弹窗 */}
      <Modal
        title="重置用户密码"
        open={resetPasswordVisible}
        onCancel={() => setResetPasswordVisible(false)}
        onOk={handleResetPassword}
        destroyOnClose
      >
        {selectedUser && (
          <div style={{ marginBottom: 16 }}>
            用户: {selectedUser.name} ({selectedUser.username})
          </div>
        )}
        <Form
          form={resetForm}
          layout="vertical"
        >
          <Form.Item
            name="password"
            label="新密码"
            rules={[
              { required: true, message: '请输入新密码' },
              { min: 6, message: '密码至少6个字符' }
            ]}
            validateFirst={true}
            hasFeedback
          >
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
          
          <Form.Item
            name="confirmPassword"
            label="确认密码"
            rules={[
              { required: true, message: '请确认密码' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('两次输入的密码不一致'));
                },
              }),
            ]}
            validateFirst={true}
            hasFeedback
          >
            <Input.Password placeholder="请确认密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement; 