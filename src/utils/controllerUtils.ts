import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

/**
 * 异步控制器包装函数，用于统一错误处理
 * @param fn - 控制器函数
 * @returns - 包装后的控制器函数
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (error) {
      const err = error as Error;
      logger.error(`控制器错误: ${err.message}`);
      next(err);
    }
  };
};

/**
 * API控制器错误处理包装函数
 * @param fn - API控制器函数
 * @returns - 包装后的API控制器函数
 */
export const apiAsyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (error) {
      const err = error as Error;
      logger.error(`API错误: ${err.message}`);
      res.status(500).json({
        status: 'error',
        message: err.message,
      });
    }
  };
}; 