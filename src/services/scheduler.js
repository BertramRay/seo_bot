const { CronJob } = require('cron');
const { generateAndPublishPosts } = require('./contentGenerator');
const { generateSitemap } = require('./sitemapGenerator');
const config = require('../config');
const { logger } = require('../utils/logger');

// 定时任务集合
const jobs = {};

/**
 * 获取内容生成的Cron表达式
 * @returns {String} - Cron表达式
 */
const getContentGenerationCronExpression = () => {
  // 根据配置设置定时频率
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
        await generateAndPublishPosts(config.content.postsPerBatch);
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
const initScheduledTasks = () => {
  try {
    // 获取内容生成的cron表达式
    const cronExpression = getContentGenerationCronExpression();
    
    // 创建内容生成的定时任务
    const contentGenerationJob = new CronJob(
      cronExpression,
      async () => {
        try {
          logger.info('开始执行定时内容生成任务');
          
          // 查找管理员用户
          const User = require('../models/User');
          const adminUser = await User.findOne({ role: 'admin' });
          
          if (!adminUser) {
            logger.error('找不到管理员用户，无法执行自动内容生成');
            return;
          }
          
          // 导入内容生成服务
          const { generateAndPublishPosts } = require('./contentGenerator');
          
          // 生成内容
          const posts = await generateAndPublishPosts(config.content.postsPerBatch, adminUser);
          
          // 生成站点地图
          if (posts.length > 0) {
            await triggerSitemapGeneration();
          }
          
          logger.info(`定时内容生成任务完成，生成了 ${posts.length} 篇文章`);
        } catch (error) {
          logger.error(`定时内容生成任务出错: ${error.message}`);
        }
      },
      null,
      false,
      'Asia/Shanghai'
    );
    
    // 启动定时任务
    contentGenerationJob.start();
    
    logger.info(`内容生成定时任务已启动，Cron表达式: ${cronExpression}`);
    
    return {
      contentGenerationJob,
    };
  } catch (error) {
    logger.error(`初始化定时任务出错: ${error.message}`);
    return {};
  }
};

/**
 * 手动触发站点地图生成任务
 * @returns {Promise<String>} - 生成的站点地图URL
 */
const triggerSitemapGeneration = async () => {
  try {
    logger.info('手动触发站点地图生成任务');
    return await generateSitemap();
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