/**
 * 合理化建议验证工具
 * 用于验证建议数据的有效性
 */

/**
 * 验证建议对象
 * @param {Object} suggestion - 建议对象
 * @returns {Object} - 包含isValid和errors的验证结果
 */
const validateSuggestion = (suggestion) => {
  const errors = [];

  // 验证标题
  if (!suggestion.title || suggestion.title.trim() === '') {
    errors.push({ field: 'title', message: '标题不能为空' });
  } else if (suggestion.title.length > 100) {
    errors.push({ field: 'title', message: '标题不能超过100个字符' });
  }

  // 验证内容
  if (!suggestion.content || suggestion.content.trim() === '') {
    errors.push({ field: 'content', message: '内容不能为空' });
  }

  // 验证类型
  const validTypes = ['安全管理', '生产优化', '智能化升级', '其它'];
  if (!suggestion.type || !validTypes.includes(suggestion.type)) {
    errors.push({ field: 'type', message: '请选择有效的建议类型' });
  }

  // 验证团队/班组
  if (!suggestion.team || suggestion.team.trim() === '') {
    errors.push({ field: 'team', message: '请选择班组' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateSuggestion
}; 