import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { logger } from '../utils/logger';
import { asyncHandler } from '../utils/controllerUtils';
import { sendSuccess, sendError } from '../utils/responseUtils';
import { CustomRequest } from '../types';
import * as userService from '../services/userService';

/**
 * 登录页面
 */
export const getLogin = (req: Request, res: Response): void => {
  // 如果用户已登录，重定向到管理页面
  if (req.isAuthenticated()) {
    return res.redirect('/admin');
  }
  
  res.render('auth/login', {
    title: '登录',
    error: req.query.error,
  });
};

/**
 * GitHub登录
 */
export const githubAuth = passport.authenticate('github');

/**
 * GitHub登录回调
 */
export const githubCallback = passport.authenticate('github', { 
  failureRedirect: '/auth/login?error=github',
  successReturnToOrRedirect: '/admin'
});

/**
 * 个人资料页面
 */
export const getProfile = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  // 获取最新的用户信息
  const user = await userService.getUserById(req.user._id);
  
  res.render('auth/profile', {
    title: '个人资料',
    user,
  });
});

/**
 * 更新个人资料
 */
export const updateProfile = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  const { displayName, theme, notifications } = req.body;
  
  // 构建更新数据
  const updateData = {
    displayName,
    settings: {
      theme: theme || 'light',
      notifications: notifications === 'on'
    }
  };
  
  // 更新用户资料
  const updatedUser = await userService.updateUserProfile(req.user._id, updateData);
  
  // 更新会话中的用户信息
  req.user = updatedUser;
  
  // 重定向回个人资料页面
  res.redirect('/auth/profile?success=true');
});

/**
 * 登出
 */
export const logout = (req: Request, res: Response, next: NextFunction): void => {
  req.logout((err: Error) => {
    if (err) {
      logger.error(`登出错误: ${err.message}`);
      return next(err);
    }
    
    res.redirect('/');
  });
};

/**
 * API: 获取当前用户信息
 */
export const getCurrentUser = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  if (!req.isAuthenticated()) {
    return sendError(res, '未登录', 401);
  }
  
  const user = await userService.getUserById(req.user._id);
  
  sendSuccess(res, { user });
}); 