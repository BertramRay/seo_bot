/**
 * 发送成功响应
 * @param {Object} res - Express响应对象
 * @param {Object} data - 响应数据
 * @param {string} message - 成功消息
 * @param {number} statusCode - HTTP状态码
 */
exports.sendSuccess = (res, data = {}, message = '操作成功', statusCode = 200) => {
  res.status(statusCode).json({
    status: 'success',
    data,
    message
  });
};

/**
 * 发送错误响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {number} statusCode - HTTP状态码
 * @param {Object} errors - 详细错误信息
 */
exports.sendError = (res, message = '操作失败', statusCode = 500, errors = null) => {
  const response = {
    status: 'error',
    message
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  res.status(statusCode).json(response);
}; 