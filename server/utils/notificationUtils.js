const User = require('../models/User');
const emailService = require('./emailService');
const { SUGGESTION_TYPES } = require('../models/Suggestion');
const { ROLES } = require('../models/User');

/**
 * 根据建议类型和审核阶段发送通知给相关审核人员
 * @param {Object} suggestion 建议对象
 * @param {String} reviewStage 审核阶段 'first' 或 'second'
 */
exports.notifyReviewers = async (suggestion, reviewStage) => {
  try {
    const { title, type, department, _id } = suggestion;
    
    // 确定目标角色和通知内容
    let targetRole, emailSubject, emailContent;
    
    if (reviewStage === 'first') {
      // 一审通知 - 安全部门处理安全类建议，运行部门处理其他类型
      if (type === SUGGESTION_TYPES.SAFETY.key) {
        targetRole = ROLES.SAFETY_ADMIN;
        emailSubject = '【安全部门】有新的安全建议需要审核';
      } else {
        targetRole = ROLES.OPERATION_ADMIN;
        emailSubject = '【运行部门】有新的建议需要审核';
      }
      emailContent = `
        有一条新的建议需要您进行一审：
        
        标题：${title}
        类型：${type === SUGGESTION_TYPES.SAFETY.key ? '安全管理' : '其他类型'}
        提交部门：${department}
        
        请登录系统查看详情并进行审核。
        建议ID：${_id}
      `;
    } else if (reviewStage === 'second') {
      // 二审通知 - 同样根据类型确定接收部门
      if (type === SUGGESTION_TYPES.SAFETY.key) {
        targetRole = ROLES.SAFETY_ADMIN;
        emailSubject = '【安全部门】有新的安全建议需要二审';
      } else {
        targetRole = ROLES.OPERATION_ADMIN;
        emailSubject = '【运行部门】有新的建议需要二审';
      }
      emailContent = `
        有一条建议已通过一审，需要您进行二审：
        
        标题：${title}
        类型：${type === SUGGESTION_TYPES.SAFETY.key ? '安全管理' : '其他类型'}
        提交部门：${department}
        
        请登录系统查看详情并进行审核。
        建议ID：${_id}
      `;
    }
    
    // 发送邮件通知
    if (targetRole && emailSubject && emailContent) {
      await emailService.notifyByRole(targetRole, emailSubject, emailContent);
    }
  } catch (error) {
    console.error('发送审核通知邮件失败:', error);
  }
}; 