// 审核状态
const REVIEW_STATUS = {
  PENDING_FIRST_REVIEW: '等待一级审核',
  PENDING_SECOND_REVIEW: '等待二级审核',
  APPROVED: '已批准',
  REJECTED: '已驳回',
  WITHDRAWN: '已撤回'
};

// 实施状态
const IMPLEMENTATION_STATUS = {
  NOT_STARTED: '未开始',
  CONTACTING: '联系中',
  IN_PROGRESS: '实施中',
  DELAYED: '延期',
  COMPLETED: '已完成',
  CANCELLED: '已取消'
};

// 建议类型
const SUGGESTION_TYPES = {
  SAFETY: '调度安全类',
  ELECTRICAL: '设备电气类',
  MECHANICAL: '设备机械类',
  KEXIN_AUTOMATION: '科信自动化类',
  KEXIN_MONITORING: '科信监控类',
  OTHER: '其它类'
};

// 审核级别
const REVIEW_LEVELS = {
  FIRST_LEVEL: '一级审核',
  SECOND_LEVEL: '二级审核'
};

// 审核结果
const REVIEW_RESULTS = {
  PENDING: '待审核',
  APPROVED: '通过',
  REJECTED: '拒绝'
};

module.exports = {
  REVIEW_STATUS,
  IMPLEMENTATION_STATUS,
  SUGGESTION_TYPES,
  REVIEW_LEVELS,
  REVIEW_RESULTS
}; 