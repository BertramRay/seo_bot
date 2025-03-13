/**
 * 检查用户是否已登录
 * @param {*} req - 请求对象
 * @param {*} res - 响应对象
 * @param {*} next - 下一个中间件
 */
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  // 记住用户想去的URL，登录后重定向回来
  req.session.returnTo = req.originalUrl;
  res.redirect('/auth/login');
};

/**
 * 检查用户是否是管理员
 * @param {*} req - 请求对象
 * @param {*} res - 响应对象
 * @param {*} next - 下一个中间件
 */
const isAdmin = (req, res, next) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  
  res.status(403).render('error', {
    title: '无权访问',
    message: '您没有访问该页面的权限',
  });
};

/**
 * 将用户信息添加到响应本地变量
 * @param {*} req - 请求对象
 * @param {*} res - 响应对象
 * @param {*} next - 下一个中间件
 */
const addUserToLocals = (req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
};

module.exports = {
  isAuthenticated,
  isAdmin,
  addUserToLocals,
}; 