/**
 * 统一响应处理工具
 */

// 成功响应
const success = (res, message = '操作成功', data = null, statusCode = 200) => {
  const response = {
    success: true,
    message
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

// 错误响应
const error = (res, message = '操作失败', statusCode = 400, errors = null) => {
  const response = {
    success: false,
    message
  };

  if (errors !== null) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

// 分页响应
const paginated = (res, data, pagination, message = '获取数据成功') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination
  });
};

// 校验错误响应
const validationError = (res, errors) => {
  return res.status(400).json({
    success: false,
    message: '输入验证失败',
    errors: errors.array().map(err => ({
      field: err.param,
      message: err.msg
    }))
  });
};

// 未找到响应
const notFound = (res, message = '资源未找到') => {
  return res.status(404).json({
    success: false,
    message
  });
};

// 权限不足响应
const forbidden = (res, message = '权限不足') => {
  return res.status(403).json({
    success: false,
    message
  });
};

// 服务器错误响应
const serverError = (res, error) => {
  console.error('服务器错误:', error);
  
  return res.status(500).json({
    success: false,
    message: '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' ? { error: error.message } : {})
  });
};

module.exports = {
  success,
  error,
  paginated,
  validationError,
  notFound,
  forbidden,
  serverError
}; 