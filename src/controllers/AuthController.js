const passport = require('passport');
const { logger } = require('../utils/logger');

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
exports.getProfile = (req, res) => {
  res.render('auth/profile', {
    title: '个人资料',
    user: req.user,
  });
};

/**
 * 登出
 */
exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      logger.error(`登出错误: ${err.message}`);
      return next(err);
    }
    req.session.destroy();
    res.redirect('/');
  });
}; 