const User = require('../models/User');
const config = require('../config');
const { logger } = require('../utils/logger');

/**
 * 租户解析中间件
 * 根据请求的主机名识别当前租户
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一个中间件函数
 */
async function resolveTenant(req, res, next) {
  try {
    // 跳过管理后台和API路由的租户解析
    if (req.path.startsWith('/admin') || req.path.startsWith('/api') || req.path.startsWith('/auth')) {
      return next();
    }

    // 获取主机名
    const hostname = req.hostname;
    
    // 如果是本地开发环境或默认域名，不进行租户解析
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === config.domain.baseDomain) {
      return next();
    }
    
    let tenant = null;
    
    // 检查是否为子域名
    if (hostname.endsWith(`.${config.domain.baseDomain}`)) {
      const subdomain = hostname.replace(`.${config.domain.baseDomain}`, '');
      tenant = await User.findOne({ 
        subdomain, 
        domainStatus: 'active',
        isActive: true
      });
    } 
    // 检查是否为自定义域名
    else {
      tenant = await User.findOne({ 
        customDomain: hostname, 
        domainStatus: 'active',
        isActive: true
      });
    }
    
    if (tenant) {
      // 将租户信息附加到请求对象
      req.tenant = tenant;
      
      // 将租户信息添加到本地变量，供视图使用
      res.locals.tenant = {
        id: tenant._id,
        username: tenant.username,
        displayName: tenant.displayName,
        settings: tenant.settings
      };
      
      logger.debug(`已识别租户: ${tenant.username} (${hostname})`);
    } else {
      // 未找到租户，记录日志
      logger.debug(`未找到与域名 ${hostname} 匹配的租户`);
      
      // 如果不是默认域名，且找不到租户，返回404
      if (hostname !== config.domain.baseDomain) {
        return res.status(404).render('error', {
          title: '博客未找到',
          message: '您访问的博客不存在或未激活'
        });
      }
    }
    
    next();
  } catch (error) {
    logger.error(`租户解析失败: ${error.message}`);
    next(error);
  }
}

module.exports = { resolveTenant }; 