import { Request, Response, NextFunction } from 'express';
import { IUser, CustomRequest } from '../types';
import config from '../config';
import User from '../models/User';
import { logger } from '../utils/logger';

/**
 * 租户解析中间件
 * 根据请求的主机名识别当前租户
 * @param req - 请求对象
 * @param res - 响应对象
 * @param next - 下一个中间件函数
 */
export async function resolveTenant(req: Request & CustomRequest, res: Response, next: NextFunction): Promise<void> {
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
    
    let tenant: IUser | null = null;
    
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
      req.tenant = tenant._id.toString();
      
      // 将租户信息添加到本地变量，供视图使用
      res.locals.tenant = {
        id: tenant._id,
        username: tenant.name,
        displayName: tenant.name,
        settings: tenant.settings
      };
      
      logger.debug(`已识别租户: ${tenant.name} (${hostname})`);
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
    const err = error as Error;
    logger.error(`租户解析失败: ${err.message}`);
    next(err);
  }
} 