import React, { useState } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Divider,
  InputNumber,
  Modal,
  message
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import moment from 'moment';
import MilestoneList from './MilestoneList';
import RiskList from './RiskList';
import { IMPLEMENTATION_STATUS, IMPLEMENTATION_STATUS_TRANSITIONS } from '../../../../constants/suggestions';

const { TextArea } = Input;
const { Option } = Select;

const ImplementationForm = ({
  form,
  initialValues,
  onFinish,
  loading = false
}) => {
  const [milestoneModalVisible, setMilestoneModalVisible] = useState(false);
  const [riskModalVisible, setRiskModalVisible] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [editingRisk, setEditingRisk] = useState(null);

  // 获取当前状态的下一步可选状态
  const getNextStatusOptions = (currentStatus) => {
    if (!currentStatus) return [];
    const nextStatuses = IMPLEMENTATION_STATUS_TRANSITIONS[currentStatus] || [];
    return [currentStatus, ...nextStatuses].map(status => ({
      value: status,
      label: IMPLEMENTATION_STATUS[status]
    }));
  };

  // 处理里程碑编辑
  const handleEditMilestone = (milestone) => {
    setEditingMilestone(milestone);
    setMilestoneModalVisible(true);
  };

  // 处理里程碑删除
  const handleDeleteMilestone = (milestone) => {
    const milestones = form.getFieldValue('milestones') || [];
    form.setFieldsValue({
      milestones: milestones.filter(m => m !== milestone)
    });
    message.success('里程碑删除成功');
  };

  // 处理风险编辑
  const handleEditRisk = (risk) => {
    setEditingRisk(risk);
    setRiskModalVisible(true);
  };

  // 处理风险删除
  const handleDeleteRisk = (risk) => {
    const risks = form.getFieldValue('risks') || [];
    form.setFieldsValue({
      risks: risks.filter(r => r !== risk)
    });
    message.success('风险记录删除成功');
  };

  // 处理里程碑保存
  const handleMilestoneSave = (values) => {
    const milestones = form.getFieldValue('milestones') || [];
    if (editingMilestone) {
      const index = milestones.indexOf(editingMilestone);
      if (index > -1) {
        milestones[index] = values;
      }
    } else {
      milestones.push(values);
    }
    form.setFieldsValue({ milestones });
    setMilestoneModalVisible(false);
    setEditingMilestone(null);
    message.success('里程碑保存成功');
  };

  // 处理风险保存
  const handleRiskSave = (values) => {
    const risks = form.getFieldValue('risks') || [];
    if (editingRisk) {
      const index = risks.indexOf(editingRisk);
      if (index > -1) {
        risks[index] = values;
      }
    } else {
      risks.push(values);
    }
    form.setFieldsValue({ risks });
    setRiskModalVisible(false);
    setEditingRisk(null);
    message.success('风险记录保存成功');
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        ...initialValues,
        startDate: initialValues?.startDate ? moment(initialValues.startDate) : null,
        plannedCompletionDate: initialValues?.plannedCompletionDate ? moment(initialValues.plannedCompletionDate) : null,
        actualCompletionDate: initialValues?.actualCompletionDate ? moment(initialValues.actualCompletionDate) : null,
      }}
      onFinish={onFinish}
    >
      <Form.Item
        name="status"
        label="实施状态"
        rules={[{ required: true, message: '请选择实施状态' }]}
      >
        <Select>
          {getNextStatusOptions(initialValues?.status).map(option => (
            <Option key={option.value} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        name="progress"
        label="实施进度"
        rules={[{ required: true, message: '请输入实施进度' }]}
      >
        <InputNumber
          min={0}
          max={100}
          formatter={value => `${value}%`}
          parser={value => value.replace('%', '')}
          style={{ width: '100%' }}
        />
      </Form.Item>

      <Form.Item
        name="responsiblePerson"
        label="责任人"
        rules={[{ required: true, message: '请输入责任人' }]}
      >
        <Input placeholder="请输入负责此建议实施的人员姓名" />
      </Form.Item>

      <Form.Item
        name="startDate"
        label="开始日期"
      >
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item
        name="plannedCompletionDate"
        label="计划完成日期"
      >
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item
        name="actualCompletionDate"
        label="实际完成日期"
      >
        <DatePicker style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item
        name="implementationContent"
        label="实施内容"
      >
        <TextArea rows={4} placeholder="请描述具体的实施内容" />
      </Form.Item>

      <Divider>里程碑</Divider>

      <Form.Item name="milestones">
        <MilestoneList
          milestones={form.getFieldValue('milestones') || []}
          onEdit={handleEditMilestone}
          onDelete={handleDeleteMilestone}
        />
      </Form.Item>

      <Button
        type="dashed"
        onClick={() => {
          setEditingMilestone(null);
          setMilestoneModalVisible(true);
        }}
        style={{ width: '100%' }}
      >
        <PlusOutlined /> 添加里程碑
      </Button>

      <Divider>风险记录</Divider>

      <Form.Item name="risks">
        <RiskList
          risks={form.getFieldValue('risks') || []}
          onEdit={handleEditRisk}
          onDelete={handleDeleteRisk}
        />
      </Form.Item>

      <Button
        type="dashed"
        onClick={() => {
          setEditingRisk(null);
          setRiskModalVisible(true);
        }}
        style={{ width: '100%' }}
      >
        <PlusOutlined /> 添加风险记录
      </Button>

      <Form.Item
        name="notes"
        label="备注"
      >
        <TextArea rows={4} placeholder="请输入备注信息" />
      </Form.Item>

      {/* 里程碑编辑模态框 */}
      <Modal
        title={editingMilestone ? "编辑里程碑" : "添加里程碑"}
        visible={milestoneModalVisible}
        onCancel={() => {
          setMilestoneModalVisible(false);
          setEditingMilestone(null);
        }}
        footer={null}
      >
        <Form
          layout="vertical"
          initialValues={editingMilestone}
          onFinish={handleMilestoneSave}
        >
          <Form.Item
            name="title"
            label="里程碑名称"
            rules={[{ required: true, message: '请输入里程碑名称' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="plannedDate"
            label="计划日期"
            rules={[{ required: true, message: '请选择计划日期' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="actualDate"
            label="实际日期"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select>
              <Option value="NOT_STARTED">未开始</Option>
              <Option value="IN_PROGRESS">进行中</Option>
              <Option value="COMPLETED">已完成</Option>
              <Option value="DELAYED">延期</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setMilestoneModalVisible(false);
                setEditingMilestone(null);
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 风险编辑模态框 */}
      <Modal
        title={editingRisk ? "编辑风险" : "添加风险"}
        visible={riskModalVisible}
        onCancel={() => {
          setRiskModalVisible(false);
          setEditingRisk(null);
        }}
        footer={null}
      >
        <Form
          layout="vertical"
          initialValues={editingRisk}
          onFinish={handleRiskSave}
        >
          <Form.Item
            name="title"
            label="风险标题"
            rules={[{ required: true, message: '请输入风险标题' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="level"
            label="风险等级"
            rules={[{ required: true, message: '请选择风险等级' }]}
          >
            <Select>
              <Option value="LOW">低</Option>
              <Option value="MEDIUM">中</Option>
              <Option value="HIGH">高</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select>
              <Option value="OPEN">未解决</Option>
              <Option value="MITIGATED">已缓解</Option>
              <Option value="CLOSED">已关闭</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="mitigationPlan"
            label="缓解计划"
          >
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setRiskModalVisible(false);
                setEditingRisk(null);
              }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Form>
  );
};

export default ImplementationForm; 