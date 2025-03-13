const { logger } = require('./logger');

/**
 * 异步控制器包装函数，用于统一错误处理
 * @param {Function} fn - 控制器函数
 * @returns {Function} - 包装后的控制器函数
 */
exports.asyncHandler = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      logger.error(`控制器错误: ${error.message}`);
      next(error);
    }
  };
};

/**
 * API控制器错误处理包装函数
 * @param {Function} fn - API控制器函数
 * @returns {Function} - 包装后的API控制器函数
 */
exports.apiAsyncHandler = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      logger.error(`API错误: ${error.message}`);
      res.status(500).json({
        status: 'error',
        message: error.message,
      });
    }
  };
}; 