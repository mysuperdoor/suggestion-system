// 审核状态
export const REVIEW_STATUS = {
  PENDING_FIRST_REVIEW: '等待一级审核',
  PENDING_SECOND_REVIEW: '等待二级审核',
  APPROVED: '已批准',
  REJECTED: '已驳回',
  WITHDRAWN: '已撤回'
};

// 审核状态颜色映射
export const REVIEW_STATUS_COLORS = {
  PENDING_FIRST_REVIEW: 'gold',     // 金色 - 等待一级审核
  PENDING_SECOND_REVIEW: 'orange',  // 橙色 - 等待二级审核
  APPROVED: 'green',               // 绿色 - 已批准
  REJECTED: 'red',                 // 红色 - 已驳回
  WITHDRAWN: 'volcano'             // 火山色 - 已撤回
};

// 审核状态流转规则
export const REVIEW_STATUS_TRANSITIONS = {
  PENDING_FIRST_REVIEW: ['APPROVED', 'REJECTED', 'WITHDRAWN'],
  PENDING_SECOND_REVIEW: ['APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: ['PENDING_FIRST_REVIEW'],
  WITHDRAWN: ['PENDING_FIRST_REVIEW']
};

// 实施状态
export const IMPLEMENTATION_STATUS = {
  NOT_STARTED: '未开始',
  CONTACTING: '联系中',
  IN_PROGRESS: '实施中',
  DELAYED: '延期',
  COMPLETED: '已完成',
  CANCELLED: '已取消'
};

// 实施状态流转规则
export const IMPLEMENTATION_STATUS_TRANSITIONS = {
  NOT_STARTED: ['CONTACTING', 'CANCELLED'],
  CONTACTING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'DELAYED', 'CANCELLED'],
  DELAYED: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: ['CONTACTING']
};

// 实施状态颜色
export const IMPLEMENTATION_STATUS_COLORS = {
  NOT_STARTED: 'default',   // 灰色
  CONTACTING: 'processing', // 蓝色
  IN_PROGRESS: 'warning',   // 黄色
  DELAYED: 'orange',        // 橙色
  COMPLETED: 'success',     // 绿色
  CANCELLED: 'red'         // 红色
};

// 保留原有的状态定义以确保兼容性
export const SUGGESTION_STATUS = {
  PENDING_FIRST_REVIEW: '等待一级审核',
  PENDING_SECOND_REVIEW: '等待二级审核',
  APPROVED: '已批准',
  REJECTED: '已驳回',
  NOT_STARTED: '未开始',
  NOT_IMPLEMENTED: '已批准待实施',
  IMPLEMENTING: '实施中',
  DELAYED: '实施延期',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
  WITHDRAWN: '已撤回'
};

// 建议类型
export const SUGGESTION_TYPES = {
  SAFETY: '调度安全类',
  ELECTRICAL: '设备电气类',
  MECHANICAL: '设备机械类',
  KEXIN_AUTOMATION: '科信自动化类',
  KEXIN_MONITORING: '科信监控类',
  OTHER: '其它类'
};

// 审核级别
export const REVIEW_LEVELS = {
  FIRST_LEVEL: '一级审核',
  SECOND_LEVEL: '二级审核'
};

// 审核结果
export const REVIEW_RESULTS = {
  PENDING: '待审核',
  APPROVED: '通过',
  REJECTED: '拒绝'
};

// 建议状态颜色映射 (保留以兼容现有代码)
export const STATUS_COLORS = {
  PENDING_FIRST_REVIEW: 'gold',        // 金色 - 等待一级审核
  PENDING_SECOND_REVIEW: 'orange',     // 橙色 - 等待二级审核
  APPROVED: 'green',                   // 绿色 - 已批准
  REJECTED: 'red',                     // 红色 - 已驳回
  NOT_STARTED: 'default',              // 默认灰色 - 未开始
  NOT_IMPLEMENTED: 'cyan',             // 青色 - a已批准待实施
  IMPLEMENTING: 'blue',                // 蓝色 - 实施中
  DELAYED: 'purple',                   // 紫色 - 实施延期
  COMPLETED: 'green',                  // 绿色 - 已完成
  CANCELLED: 'magenta',                // 洋红色 - 已取消
  WITHDRAWN: 'volcano'                 // 火山色 - 已撤回
};

// 建议类型颜色映射
export const TYPE_COLORS = {
  SAFETY: 'volcano',                   // 火山色 - 调度安全类
  ELECTRICAL: 'geekblue',              // 极客蓝 - 设备电气类
  MECHANICAL: 'orange',                // 活力橙 - 设备机械类
  KEXIN_AUTOMATION: 'cyan',            // 科技青 - 科信自动化类
  KEXIN_MONITORING: 'red',             // 警戒红 - 科信监控类
  OTHER: 'purple'                      // 紫色 - 其它类
}; 