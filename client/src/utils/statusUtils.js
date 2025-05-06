import {
  SUGGESTION_STATUS,
  REVIEW_STATUS,
  IMPLEMENTATION_STATUS,
  REVIEW_STATUS_COLORS,
  IMPLEMENTATION_STATUS_COLORS,
  IMPLEMENTATION_STATUS_TRANSITIONS
} from '../constants/suggestions';

/**
 * 映射旧状态到新的审核状态和实施状态
 * @param {string} oldStatus 旧状态值
 * @returns {Object} 包含reviewStatus和implementationStatus的对象
 */
export const mapOldStatusToNew = (oldStatus) => {
  const result = {
    reviewStatus: null,
    implementationStatus: null
  };

  if (!oldStatus) return result;

  // 审核相关状态
  if (oldStatus === 'PENDING_FIRST_REVIEW' || oldStatus === '等待一级审核') {
    result.reviewStatus = 'PENDING_FIRST_REVIEW';
  } else if (oldStatus === 'PENDING_SECOND_REVIEW' || oldStatus === '等待二级审核') {
    result.reviewStatus = 'PENDING_SECOND_REVIEW';
  } else if (oldStatus === 'REJECTED' || oldStatus === '已驳回') {
    result.reviewStatus = 'REJECTED';
  } else if (oldStatus === 'WITHDRAWN' || oldStatus === '已撤回') {
    result.reviewStatus = 'WITHDRAWN';
  }

  // 实施相关状态
  if (oldStatus === 'NOT_STARTED' || oldStatus === '未开始') {
    result.implementationStatus = 'NOT_STARTED';
  } else if (oldStatus === 'NOT_IMPLEMENTED' || oldStatus === 'APPROVED_FOR_IMPLEMENTATION' || 
             oldStatus === '已批准待实施' || oldStatus === '已批准实施') {
    result.reviewStatus = 'APPROVED'; // 已经通过审核
    result.implementationStatus = 'PENDING_IMPLEMENTATION';
  } else if (oldStatus === 'IMPLEMENTING' || oldStatus === 'IN_PROGRESS' || oldStatus === '实施中') {
    result.reviewStatus = 'APPROVED'; // 已经通过审核
    result.implementationStatus = 'IN_PROGRESS';
  } else if (oldStatus === 'DELAYED' || oldStatus === '实施延期') {
    result.reviewStatus = 'APPROVED'; // 已经通过审核
    result.implementationStatus = 'DELAYED';
  } else if (oldStatus === 'COMPLETED' || oldStatus === '已完成') {
    result.reviewStatus = 'APPROVED'; // 已经通过审核
    result.implementationStatus = 'COMPLETED';
  } else if (oldStatus === 'CANCELLED' || oldStatus === '已取消') {
    result.implementationStatus = 'CANCELLED';
  }

  return result;
};

/**
 * 获取状态的显示文本
 * @param {string} status 状态编码或文本
 * @param {string} type 状态类型，'review'或'implementation'
 * @returns {string} 状态的中文显示文本
 */
export const getStatusDisplayText = (status, type = 'implementation') => {
  if (!status) return '未知状态';
  
  // 如果已经是中文状态，直接返回
  if (typeof status === 'string' && /[\u4e00-\u9fa5]/.test(status)) {
    return status;
  }
  
  // 根据类型选择状态映射
  const statusMap = type === 'review' ? REVIEW_STATUS : IMPLEMENTATION_STATUS;
  
  return statusMap[status] || status;
};

/**
 * 获取状态显示的颜色
 * @param {string} status 状态编码或文本
 * @param {string} type 状态类型，'review'或'implementation'
 * @returns {string} 状态显示颜色
 */
export const getStatusColor = (status, type = 'implementation') => {
  if (!status) return 'default';

  let statusMap, colorMap;
  let statusCode = status;

  // 如果已经是中文状态，尝试转换回英文代码
  if (typeof status === 'string' && /[\u4e00-\u9fa5]/.test(status)) {
    const mapToSearch = type === 'review' ? REVIEW_STATUS : IMPLEMENTATION_STATUS;
    const foundCode = Object.entries(mapToSearch)
      .find(([_, value]) => value === status)?.[0];
    if (foundCode) {
      statusCode = foundCode;
    }
  }

  // 根据类型选择映射表
  if (type === 'review') {
    statusMap = REVIEW_STATUS;
    colorMap = REVIEW_STATUS_COLORS;
  } else { // 默认为 implementation
    statusMap = IMPLEMENTATION_STATUS;
    colorMap = IMPLEMENTATION_STATUS_COLORS;
  }

  // 返回对应的颜色，如果找不到则返回 'default'
  return colorMap[statusCode] || 'default';
};

/* 移除不再需要的 getNextStatusOptions 函数 */
// /**
//  * 获取下一个可能的状态选项
//  * @param {string} currentStatus 当前状态
//  * @param {string} type 状态类型，'review'或'implementation'
//  * @returns {Array} 可选的下一状态列表，包含label和value
//  */
// export const getNextStatusOptions = (currentStatus, type = 'implementation') => {
//   // 处理空状态，返回初始状态
//   if (!currentStatus) {
//     return [
//       { value: '未开始', label: '未开始' },
//       { value: '联系中', label: '联系中' }
//     ];
//   }
  
//   // 如果是直接的中文状态，使用预定义的转换提示
//   const statusTransitionTips = {
//     '未开始': ['联系中'],
//     '联系中': ['实施中'],
//     '实施中': ['已完成'],
//     // '已完成': ['已评估'], // 移除评估
//     // '已评估': []
//   };
  
//   // 直接根据中文状态获取下一步状态
//   if (typeof currentStatus === 'string' && /[\u4e00-\u9fa5]/.test(currentStatus)) {
//     const nextStates = statusTransitionTips[currentStatus] || [];
//     // 当前状态也加入选项
//     return [
//       { value: currentStatus, label: currentStatus },
//       ...nextStates.map(state => ({ value: state, label: state }))
//     ];
//   }
  
//   // 如果是英文代码，先转换为中文，再获取下一步
//   const statusText = getStatusDisplayText(currentStatus, 'implementation');
//   const nextStates = statusTransitionTips[statusText] || [];
  
//   return [
//     { value: statusText, label: statusText },
//     ...nextStates.map(state => ({ value: state, label: state }))
//   ];
// };

/* 移除不再需要的 validateStatusTransition 函数 */
// /**
//  * 验证状态流转是否有效
//  * @param {string} fromStatus 当前状态
//  * @param {string} toStatus 目标状态
//  * @param {string} type 状态类型，'review'或'implementation'
//  * @returns {boolean} 状态流转是否有效
//  */
// export const validateStatusTransition = (fromStatus, toStatus, type = 'implementation') => {
//   // 如果状态相同，始终有效
//   if (fromStatus === toStatus) return true;
  
//   // 预定义的状态流转规则 (移除评估)
//   const statusTransitionTips = {
//     '未开始': ['联系中'],
//     '联系中': ['实施中'],
//     '实施中': ['已完成'],
//     '已完成': [],
//     // '已评估': []
//   };
  
//   // 获取当前状态的中文表示
//   const fromStatusText = typeof fromStatus === 'string' && /[\u4e00-\u9fa5]/.test(fromStatus)
//     ? fromStatus
//     : getStatusDisplayText(fromStatus, 'implementation');
    
//   // 获取目标状态的中文表示
//   const toStatusText = typeof toStatus === 'string' && /[\u4e00-\u9fa5]/.test(toStatus)
//     ? toStatus
//     : getStatusDisplayText(toStatus, 'implementation');
  
//   // 获取允许的下一步状态
//   const allowedNextStates = statusTransitionTips[fromStatusText] || [];
  
//   return allowedNextStates.includes(toStatusText);
// }; 