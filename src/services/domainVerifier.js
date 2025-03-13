const dns = require('dns').promises;
const { logger } = require('../utils/logger');
const config = require('../config');
const User = require('../models/User');

/**
 * 域名验证服务
 */
class DomainVerifier {
  /**
   * 安排域名验证
   * @param {string} userId - 用户ID
   * @param {string} domain - 要验证的域名
   * @param {boolean} isCustomDomain - 是否为自定义域名
   * @returns {Promise<void>}
   */
  static async scheduleVerification(userId, domain, isCustomDomain = false) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 更新域名状态为待验证
      if (isCustomDomain) {
        user.customDomain = domain;
      } else {
        user.subdomain = domain;
      }
      user.domainStatus = 'pending';
      user.sslStatus = 'inactive';
      user.domainVerifiedAt = null;
      await user.save();

      // 立即进行一次验证
      await this.verifyDomain(userId, isCustomDomain);

      // 返回更新后的用户
      return user;
    } catch (error) {
      logger.error(`安排域名验证失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 验证域名
   * @param {string} userId - 用户ID
   * @param {boolean} isCustomDomain - 是否为自定义域名
   * @returns {Promise<boolean>} - 验证是否成功
   */
  static async verifyDomain(userId, isCustomDomain = false) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      const domain = isCustomDomain ? user.customDomain : user.subdomain;
      if (!domain) {
        throw new Error('域名未设置');
      }

      let success = false;
      let error = null;

      // 本地测试模式 - 如果是本地环境，自动验证成功
      if (config.server.env === 'development' && (config.domain.baseDomain === 'localhost' || config.domain.dnsProvider === 'local')) {
        logger.info(`本地测试模式：自动验证域名 ${domain}`);
        success = true;
      } else if (isCustomDomain) {
        // 验证自定义域名
        try {
          // 检查CNAME记录是否正确指向我们的域名
          const expectedTarget = config.domain.railwayDomain;
          const records = await dns.resolveCname(domain);
          
          if (records && records.length > 0) {
            // 检查是否有任何记录指向我们的域名
            success = records.some(record => 
              record.includes(expectedTarget)
            );
            
            if (!success) {
              error = `CNAME记录不正确，期望指向${expectedTarget}，实际为${records.join(', ')}`;
            }
          } else {
            error = '未找到CNAME记录';
          }
        } catch (dnsError) {
          error = `DNS查询失败: ${dnsError.message}`;
        }
      } else {
        // 子域名验证 - 由于子域名是我们自己控制的，所以只需检查格式
        const subdomainRegex = /^[a-z0-9](?:[a-z0-9\-]{1,61}[a-z0-9])?$/;
        if (subdomainRegex.test(domain)) {
          success = true;
        } else {
          error = '子域名格式不正确';
        }
      }

      // 更新用户域名状态
      user.domainStatus = success ? 'active' : 'failed';
      if (success) {
        user.domainVerifiedAt = new Date();
        user.sslStatus = 'pending'; // 域名验证成功后，SSL状态设为待处理
        
        // 本地测试模式 - 自动设置SSL为活跃
        if (config.server.env === 'development' && (config.domain.baseDomain === 'localhost' || config.domain.dnsProvider === 'local')) {
          user.sslStatus = 'active';
          logger.info(`本地测试模式：自动设置SSL状态为活跃`);
        }
      }
      
      // 保存验证结果
      await user.save();

      // 记录验证结果
      if (success) {
        logger.info(`域名验证成功: ${domain} (用户ID: ${userId})`);
      } else {
        logger.warn(`域名验证失败: ${domain} (用户ID: ${userId}), 错误: ${error}`);
      }

      return success;
    } catch (error) {
      logger.error(`域名验证过程出错: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取域名验证状态
   * @param {string} userId - 用户ID
   * @param {boolean} isCustomDomain - 是否为自定义域名
   * @returns {Promise<Object>} - 验证状态对象
   */
  static async getDomainStatus(userId, isCustomDomain = false) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      const domain = isCustomDomain ? user.customDomain : user.subdomain;
      
      return {
        domain,
        status: user.domainStatus,
        verifiedAt: user.domainVerifiedAt,
        sslStatus: user.sslStatus
      };
    } catch (error) {
      logger.error(`获取域名状态失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 生成DNS配置指南
   * @param {string} domain - 域名
   * @param {boolean} isCustomDomain - 是否为自定义域名
   * @returns {Object} - DNS配置指南
   */
  static generateDnsGuide(domain, isCustomDomain = false) {
    // 本地测试模式
    if (config.server.env === 'development' && (config.domain.baseDomain === 'localhost' || config.domain.dnsProvider === 'local')) {
      if (isCustomDomain) {
        return {
          recordType: 'hosts文件',
          host: domain,
          value: '127.0.0.1',
          ttl: 'N/A',
          instructions: [
            '本地测试模式：',
            '1. 编辑您的hosts文件',
            `2. 添加 "127.0.0.1 ${domain}"`,
            '3. 保存文件',
            '4. 返回本页面点击"验证"按钮'
          ]
        };
      } else {
        return {
          message: '本地测试模式：子域名无需额外配置，系统将自动处理。',
          fullDomain: `${domain}.${config.domain.baseDomain}`
        };
      }
    }
    
    // 正常模式
    if (isCustomDomain) {
      return {
        recordType: 'CNAME',
        host: domain,
        value: config.domain.railwayDomain,
        ttl: '3600',
        instructions: [
          '登录您的域名提供商控制面板',
          `为 ${domain} 添加一条CNAME记录`,
          `将记录值设置为 ${config.domain.railwayDomain}`,
          '保存更改并等待DNS传播（可能需要几分钟到几小时）',
          '返回本页面点击"验证"按钮检查配置'
        ]
      };
    } else {
      return {
        message: '子域名无需额外DNS配置，系统将自动处理。',
        fullDomain: `${domain}.${config.domain.baseDomain}`
      };
    }
  }
}

module.exports = DomainVerifier; 