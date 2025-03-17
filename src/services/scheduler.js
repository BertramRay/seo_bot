const { CronJob } = require('cron');
const { generateAndPublishPosts } = require('./contentGenerator');
const { generateSitemap } = require('./sitemapGenerator');
const config = require('../config');
const { logger } = require('../utils/logger');
const { getScheduleConfig } = require('../utils/configUtils');

// 定时任务集合
const jobs = {};

/**
 * 获取内容生成的Cron表达式
 * @param {Object} user - 用户对象（可选）
 * @returns {String} - Cron表达式
 */
const getContentGenerationCronExpression = (user = null) => {
  // 如果提供了用户，则从用户配置中获取
  if (user) {
    const scheduleConfig = getScheduleConfig(user);
    return scheduleConfig.generationCronExpression || '0 3 * * *';
  }
  
  // 否则根据系统配置设置定时频率
  let cronExpression;
  
  switch (config.content.frequency) {
    case 'hourly':
      cronExpression = '0 * * * *'; // 每小时执行一次
      break;
    case 'daily':
      cronExpression = '0 3 * * *'; // 每天凌晨3点执行
      break;
    case 'weekly':
      cronExpression = '0 3 * * 1'; // 每周一凌晨3点执行
      break;
    case 'custom':
      cronExpression = config.content.customCronExpression || '0 3 * * *';
      break;
    default:
      cronExpression = '0 3 * * *'; // 默认每天凌晨3点
  }
  
  return cronExpression;
};

/**
 * 设置内容生成定时任务
 */
const setupContentGenerationJob = () => {
  // 获取cron表达式
  const cronExpression = getContentGenerationCronExpression();
  
  logger.info(`设置内容生成定时任务，频率: ${config.content.frequency}, cron表达式: ${cronExpression}`);
  
  // 创建定时任务
  jobs.contentGeneration = new CronJob(
    cronExpression,
    async function() {
      try {
        logger.info('开始执行内容生成定时任务');
        // 查找合适的用户
        const User = require('../models/User');
        let user = null;
        
        // 1. 首先检查配置中是否指定了用户ID
        if (config.content.userId) {
          user = await User.findOne({ _id: config.content.userId, isActive: true });
          if (user) {
            logger.info(`使用配置中指定的用户 ${user.username} 执行内容生成`);
          }
        }
        
        // 2. 如果没有找到指定用户，尝试查找任何活跃用户
        if (!user) {
          user = await User.findOne({ isActive: true });
          if (user) {
            logger.info(`使用活跃用户 ${user.username} 执行内容生成`);
          }
        }
        
        // 3. 如果还是没找到用户，则使用管理员用户
        if (!user) {
          user = await User.findOne({ role: 'admin' });
          if (user) {
            logger.info(`使用管理员用户 ${user.username} 执行内容生成`);
          }
        }
        
        if (!user) {
          logger.error('找不到合适的用户，无法执行内容生成定时任务');
          return;
        }
        
        await generateAndPublishPosts(config.content.postsPerBatch, user);
        logger.info('内容生成定时任务执行完成');
      } catch (error) {
        logger.error(`内容生成定时任务执行出错: ${error.message}`);
      }
    },
    null, // onComplete
    true, // start
    'Asia/Shanghai' // 时区
  );
};

/**
 * 设置站点地图生成定时任务
 */
const setupSitemapGenerationJob = () => {
  if (!config.seo.generateSitemap) {
    logger.info('站点地图生成已禁用');
    return;
  }
  
  // 设置站点地图更新频率
  let cronExpression;
  
  switch (config.seo.sitemapFrequency) {
    case 'hourly':
      cronExpression = '30 * * * *'; // 每小时30分执行
      break;
    case 'daily':
      cronExpression = '30 4 * * *'; // 每天凌晨4:30执行
      break;
    case 'weekly':
      cronExpression = '30 4 * * 1'; // 每周一凌晨4:30执行
      break;
    default:
      cronExpression = '30 4 * * *'; // 默认每天凌晨4:30
  }
  
  logger.info(`设置站点地图生成定时任务，频率: ${config.seo.sitemapFrequency}, cron表达式: ${cronExpression}`);
  
  // 创建定时任务
  jobs.sitemapGeneration = new CronJob(
    cronExpression,
    async function() {
      try {
        logger.info('开始执行站点地图生成定时任务');
        await generateSitemap();
        logger.info('站点地图生成定时任务执行完成');
      } catch (error) {
        logger.error(`站点地图生成定时任务执行出错: ${error.message}`);
      }
    },
    null, // onComplete
    true, // start
    'Asia/Shanghai' // 时区
  );
};

/**
 * 初始化定时任务
 */
const initScheduledTasks = async () => {
  try {
    // 查找所有启用了定时生成的用户
    const User = require('../models/User');
    const users = await User.find({
      'settings.blog.schedule.enableScheduledGeneration': true,
      isActive: true
    });
    
    logger.info(`找到 ${users.length} 个启用了定时生成的用户`);
    
    // 为每个用户创建定时任务
    const userJobs = [];
    
    for (const user of users) {
      // 获取用户的定时配置
      const scheduleConfig = getScheduleConfig(user);
      
      if (!scheduleConfig.enableScheduledGeneration) {
        continue;
      }
      
      // 获取用户的cron表达式
      const cronExpression = scheduleConfig.generationCronExpression || '0 3 * * *';
      
      // 创建用户的内容生成定时任务
      const job = new CronJob(
        cronExpression,
        async () => {
          try {
            logger.info(`开始执行用户 ${user.username} 的定时内容生成任务`);
            
            // 生成内容
            const postsCount = scheduleConfig.postsPerScheduledRun || 1;
            const posts = await generateAndPublishPosts(postsCount, user);
            
            // 生成站点地图
            if (posts.length > 0 && user.settings?.blog?.seo?.generateSitemap) {
              await triggerSitemapGeneration(user);
            }
            
            logger.info(`用户 ${user.username} 的定时内容生成任务完成，生成了 ${posts.length} 篇文章`);
          } catch (error) {
            logger.error(`用户 ${user.username} 的定时内容生成任务出错: ${error.message}`);
          }
        },
        null,
        true,
        'Asia/Shanghai'
      );
      
      userJobs.push({
        userId: user._id,
        username: user.username,
        job,
        cronExpression
      });
      
      logger.info(`为用户 ${user.username} 创建了内容生成定时任务，Cron表达式: ${cronExpression}`);
    }
    
    // 返回所有创建的定时任务
    return {
      userJobs
    };
  } catch (error) {
    logger.error(`初始化定时任务出错: ${error.message}`);
    return {};
  }
};

/**
 * 手动触发站点地图生成任务
 * @param {Object} user - 用户对象（可选）
 * @returns {Promise<String>} - 生成的站点地图URL
 */
const triggerSitemapGeneration = async (user = null) => {
  try {
    if (user) {
      logger.info(`手动触发用户 ${user.username} 的站点地图生成任务`);
    } else {
      logger.info('手动触发系统站点地图生成任务');
    }
    return await generateSitemap(user);
  } catch (error) {
    logger.error(`手动触发站点地图生成任务出错: ${error.message}`);
    throw error;
  }
};

/**
 * 设置所有定时任务
 */
const setupCronJobs = () => {
  logger.info('开始设置定时任务');
  
  setupContentGenerationJob();
  setupSitemapGenerationJob();
  
  logger.info('定时任务设置完成');
};

/**
 * 停止所有定时任务
 */
const stopAllJobs = () => {
  logger.info('停止所有定时任务');
  
  Object.values(jobs).forEach(job => {
    if (job && job.running) {
      job.stop();
    }
  });
  
  logger.info('所有定时任务已停止');
};

/**
 * 触发内容生成
 * @param {Number} count - 要生成的文章数量
 * @returns {Promise<Array>} - 生成的文章数组
 */
const triggerContentGeneration = async (count = config.content.postsPerBatch) => {
  try {
    logger.info(`调度器触发内容生成，数量: ${count}`);
    
    // 查找管理员用户
    const User = require('../models/User');
    const adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      logger.error('找不到管理员用户，无法执行自动内容生成');
      return [];
    }
    
    // 导入内容生成服务
    const { generateAndPublishPosts } = require('./contentGenerator');
    
    // 生成内容
    const posts = await generateAndPublishPosts(count, adminUser);
    
    // 生成站点地图
    if (posts.length > 0) {
      await triggerSitemapGeneration();
    }
    
    return posts;
  } catch (error) {
    logger.error(`内容生成失败: ${error.message}`);
    return [];
  }
};

module.exports = {
  setupCronJobs,
  stopAllJobs,
  triggerContentGeneration,
  triggerSitemapGeneration,
  getContentGenerationCronExpression,
};