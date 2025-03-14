import { Response } from 'express';

/**
 * 发送成功响应
 * @param res - Express响应对象
 * @param data - 响应数据
 * @param message - 成功消息
 * @param statusCode - HTTP状态码
 */
export const sendSuccess = (
  res: Response, 
  data: Record<string, any> = {}, 
  message: string = '操作成功', 
  statusCode: number = 200
): void => {
  res.status(statusCode).json({
    status: 'success',
    data,
    message
  });
};

/**
 * 发送错误响应
 * @param res - Express响应对象
 * @param message - 错误消息
 * @param statusCode - HTTP状态码
 * @param errors - 详细错误信息
 */
export const sendError = (
  res: Response, 
  message: string = '操作失败', 
  statusCode: number = 500, 
  errors: Record<string, any> | null = null
): void => {
  const response: {
    status: string;
    message: string;
    errors?: Record<string, any>;
  } = {
    status: 'error',
    message
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  res.status(statusCode).json(response);
}; 