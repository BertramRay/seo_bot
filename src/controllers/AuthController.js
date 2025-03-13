const passport = require('passport');
const { logger } = require('../utils/logger');
const { asyncHandler } = require('../utils/controllerUtils');
const userService = require('../services/userService');
const { sendSuccess, sendError } = require('../utils/responseUtils');

/**
 * 登录页面
 */
exports.getLogin = (req, res) => {
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
exports.githubAuth = passport.authenticate('github');

/**
 * GitHub登录回调
 */
exports.githubCallback = passport.authenticate('github', { 
  failureRedirect: '/auth/login?error=github',
  successReturnToOrRedirect: '/admin'
});

/**
 * 个人资料页面
 */
exports.getProfile = asyncHandler(async (req, res) => {
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
exports.updateProfile = asyncHandler(async (req, res) => {
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
exports.logout = (req, res, next) => {
  req.logout((err) => {
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
exports.getCurrentUser = asyncHandler(async (req, res) => {
  if (!req.isAuthenticated()) {
    return sendError(res, '未登录', 401);
  }
  
  const user = await userService.getUserById(req.user._id);
  
  sendSuccess(res, { user });
}); 