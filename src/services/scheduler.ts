import { CronJob } from 'cron';
import { generateAndPublishPosts } from './contentGenerator';
import { generateSitemap } from './sitemapGenerator';
import config from '../config';
import { logger } from '../utils/logger';
import { getScheduleConfig } from '../utils/configUtils';
import User from '../models/User';
import { IUser } from '../types';

// 定时任务集合
interface Jobs {
  [key: string]: CronJob;
}

interface UserJob {
  userId: string;
  username: string;
  job: CronJob;
  cronExpression: string;
}

interface ScheduleResult {
  userJobs?: UserJob[];
}

const jobs: Jobs = {};

/**
 * 获取内容生成的Cron表达式
 * @param user - 用户对象（可选）
 * @returns Cron表达式
 */
export const getContentGenerationCronExpression = (user: IUser | null = null): string => {
  // 如果提供了用户，则从用户配置中获取
  if (user) {
    const scheduleConfig = getScheduleConfig(user);
    return scheduleConfig.generationCronExpression || '0 3 * * *';
  }
  
  // 否则根据系统配置设置定时频率
  let cronExpression: string;
  
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
export const setupContentGenerationJob = (): void => {
  // 获取cron表达式
  const cronExpression = getContentGenerationCronExpression();
  
  logger.info(`设置内容生成定时任务，频率: ${config.content.frequency}, cron表达式: ${cronExpression}`);
  
  // 创建定时任务
  jobs.contentGeneration = new CronJob(
    cronExpression,
    async function() {
      try {
        logger.info('开始执行内容生成定时任务');
        // @ts-ignore - 允许null参数
        await generateAndPublishPosts(config.content.postsPerBatch, null);
        logger.info('内容生成定时任务执行完成');
      } catch (error: any) {
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
export const setupSitemapGenerationJob = (): void => {
  if (!config.seo.generateSitemap) {
    logger.info('站点地图生成已禁用');
    return;
  }
  
  // 设置站点地图更新频率
  let cronExpression: string;
  
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
      } catch (error: any) {
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
export const initScheduledTasks = async (): Promise<ScheduleResult> => {
  try {
    // 查找所有启用了定时生成的用户
    const users = await User.find({
      'settings.blog.schedule.enableScheduledGeneration': true,
      isActive: true
    });
    
    logger.info(`找到 ${users.length} 个启用了定时生成的用户`);
    
    // 为每个用户创建定时任务
    const userJobs: UserJob[] = [];
    
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
            // @ts-ignore - 忽略seo属性不存在的错误
            if (posts.length > 0 && user.settings?.blog?.seo?.generateSitemap) {
              await triggerSitemapGeneration(user);
            }
            
            logger.info(`用户 ${user.username} 的定时内容生成任务完成，生成了 ${posts.length} 篇文章`);
          } catch (error: any) {
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
  } catch (error: any) {
    logger.error(`初始化定时任务出错: ${error.message}`);
    return {};
  }
};

/**
 * 手动触发站点地图生成任务
 * @param user - 用户对象（可选）
 * @returns 生成的站点地图URL
 */
export const triggerSitemapGeneration = async (user: IUser | null = null): Promise<string> => {
  try {
    if (user) {
      logger.info(`手动触发用户 ${user.username} 的站点地图生成任务`);
    } else {
      logger.info('手动触发系统站点地图生成任务');
    }
    return await generateSitemap(user);
  } catch (error: any) {
    logger.error(`手动触发站点地图生成任务出错: ${error.message}`);
    throw error;
  }
};

/**
 * 设置所有定时任务
 */
export const setupCronJobs = (): void => {
  logger.info('开始设置定时任务');
  
  setupContentGenerationJob();
  setupSitemapGenerationJob();
  
  logger.info('定时任务设置完成');
};

/**
 * 停止所有定时任务
 */
export const stopAllJobs = (): void => {
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
 * @param count - 要生成的文章数量
 * @returns 生成的文章数组
 */
export const triggerContentGeneration = async (count: number = config.content.postsPerBatch) => {
  try {
    logger.info(`调度器触发内容生成，数量: ${count}`);
    
    // 查找管理员用户
    const adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      logger.warn('未找到管理员用户，使用系统默认配置生成内容');
      // @ts-ignore - 允许null参数
      return await generateAndPublishPosts(count, null);
    }
    
    logger.info(`使用管理员用户 ${adminUser.username} 生成内容`);
    return await generateAndPublishPosts(count, adminUser);
  } catch (error: any) {
    logger.error(`触发内容生成出错: ${error.message}`);
    throw error;
  }
}; 