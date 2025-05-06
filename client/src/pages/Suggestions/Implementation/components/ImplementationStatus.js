import React from 'react';
import { Select, Tag, message } from 'antd';
import { 
  getStatusDisplayText, 
  getStatusColor,
  getNextStatusOptions,
  validateStatusTransition
} from '../../../../utils/statusUtils';

const ImplementationStatus = ({ 
  status, 
  onStatusChange,
  disabled = false 
}) => {
  // 获取状态显示文本
  const displayText = getStatusDisplayText(status);
  
  // 获取状态颜色
  const color = getStatusColor(status);
  
  // 获取可选状态
  const statusOptions = getNextStatusOptions(status);
  
  // 处理状态变更
  const handleChange = (newStatus) => {
    // 验证状态流转
    if (!validateStatusTransition(status, newStatus)) {
      message.error('无效的状态变更');
      return;
    }
    
    onStatusChange?.(newStatus);
  };

  return (
    <div className="implementation-status">
      {disabled ? (
        <Tag color={color}>{displayText}</Tag>
      ) : (
        <Select
          value={displayText}
          style={{ width: 120 }}
          onChange={handleChange}
          disabled={disabled}
        >
          {statusOptions.map(option => (
            <Select.Option key={option.value} value={option.value}>
              {option.label}
            </Select.Option>
          ))}
        </Select>
      )}
    </div>
  );
};

export default ImplementationStatus; 