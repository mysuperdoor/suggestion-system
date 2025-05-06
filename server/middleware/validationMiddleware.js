const { check, validationResult } = require('express-validator');
const { SUGGESTION_TYPES } = require('../../client/src/constants/suggestions');

const validateSuggestion = [
  check('title')
    .trim()
    .not()
    .isEmpty()
    .withMessage('标题不能为空')
    .isLength({ max: 100 })
    .withMessage('标题不能超过100个字符'),
  
  check('type')
    .trim()
    .not()
    .isEmpty()
    .withMessage('建议类型不能为空')
    .isIn(Object.keys(SUGGESTION_TYPES))
    .withMessage('无效的建议类型'),
  
  check('content')
    .trim()
    .not()
    .isEmpty()
    .withMessage('内容不能为空')
    .isLength({ min: 20 })
    .withMessage('内容不能少于20个字符'),
  
  check('expectedBenefit')
    .trim()
    .not()
    .isEmpty()
    .withMessage('预期效果不能为空'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: '验证失败',
        errors: errors.array() 
      });
    }
    next();
  }
];

module.exports = {
  validateSuggestion
}; 