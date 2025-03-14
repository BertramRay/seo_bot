import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../utils/controllerUtils';
import { createPagination, paginateQuery } from '../utils/pagination';
import { CustomRequest } from '../types';

// 使用require导入尚未转换为TypeScript的模块
const Post = require('../models/Post');
const Topic = require('../models/Topic');
const parser = require('cron-parser');
const marked = require('marked');
const { logger } = require('../utils/logger');
const config = require('../config');
const { 
  triggerContentGeneration, 
  triggerSitemapGeneration, 
  getContentGenerationCronExpression 
} = require('../services/scheduler');
const { parseMarkdown } = require('../utils/markdownUtils');

const postRepository = require('../repositories/PostRepository');
const topicRepository = require('../repositories/TopicRepository');
const postService = require('../services/postService');
const topicService = require('../services/topicService');

// 配置marked选项
marked.setOptions({
  breaks: true, // 启用换行符转换
  gfm: true,    // 启用GitHub风格的Markdown
});

/**
 * 管理后台首页
 */
export const getDashboard = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  // 获取当前用户的统计信息
  const userId = req.user._id;
  
  // 使用仓库获取统计数据
  const options = { userId };
  
  // 获取最近文章
  const { posts: recentPosts } = await postRepository.getPaginatedPosts({
    userId,
    limit: 5,
    sortBy: 'createdAt',
    sortOrder: -1
  });
  
  // 统计数据
  const totalPosts = await postRepository.countPosts({ userId });
  const publishedPosts = await postRepository.countPosts({ userId, status: 'published' });
  const draftPosts = await postRepository.countPosts({ userId, status: 'draft' });
  
  // 计算本月发布的文章数量
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const postsThisMonth = await postRepository.countPosts({
    userId,
    status: 'published',
    publishedAfter: firstDayOfMonth
  });
  
  // 获取主题统计
  const topics = await topicRepository.getTopicsWithPostCount(userId);
  const totalTopics = topics.length;
  const activeTopics = topics.filter((topic: any) => topic.status === 'active').length;
  
  // 获取CRON表达式
  const cronExpression = getContentGenerationCronExpression();
  
  // 解释CRON表达式
  const cronExplanation = explainCronExpression(cronExpression);
  
  // 获取用户的博客标题和网站URL
  const blogTitle = req.user.settings?.blog?.title || 'SEO博客';
  const siteUrl = req.user.customDomain ? `https://${req.user.customDomain}` : 
                 req.user.subdomain ? `https://${req.user.subdomain}.${config.domain.baseDomain}` : 
                 config.blog.siteUrl;
  
  res.render('admin/dashboard', {
    title: '管理后台 - 仪表盘',
    totalPosts,
    publishedPosts,
    draftPosts,
    totalTopics,
    activeTopics,
    postsThisMonth,
    recentPosts,
    topics: topics.slice(0, 5),
    cronExpression,
    cronExplanation,
    blogTitle,
    siteUrl
  });
});

/**
 * 解释CRON表达式的含义
 * @param cronExpression - CRON表达式
 * @returns 人类可读的解释
 */
function explainCronExpression(cronExpression: string | null): string {
  if (!cronExpression) {
    return '未设置定时任务';
  }
  
  try {
    // 解析CRON表达式的各个部分
    const parts = cronExpression.split(' ');
    if (parts.length !== 5 && parts.length !== 6) {
      return `无效的CRON表达式: ${cronExpression}`;
    }
    
    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
    
    // 构建人类可读的解释
    let explanation = '';
    
    // 解释月份
    if (month !== '*') {
      explanation += `每年${month}月`;
    }
    
    // 解释日期
    if (dayOfMonth === '*') {
      // 解释星期
      if (dayOfWeek === '*') {
        explanation += '每天';
      } else {
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        if (dayOfWeek.includes(',')) {
          const days = dayOfWeek.split(',').map(d => weekdays[parseInt(d)]);
          explanation += `每${days.join('、')}`;
        } else {
          explanation += `每${weekdays[parseInt(dayOfWeek)]}`;
        }
      }
    } else {
      explanation += `每月${dayOfMonth}日`;
    }
    
    // 解释小时
    if (hour === '*') {
      explanation += '每小时';
    } else if (hour.includes('/')) {
      const interval = hour.split('/')[1];
      explanation += `每${interval}小时`;
    } else {
      explanation += `${hour}点`;
    }
    
    // 解释分钟
    if (minute === '*') {
      explanation += '每分钟';
    } else if (minute.includes('/')) {
      const interval = minute.split('/')[1];
      explanation += `每${interval}分钟`;
    } else {
      explanation += `${minute}分`;
    }
    
    explanation += '执行定时任务';
    return explanation;
  } catch (error: any) {
    logger.error(`解析CRON表达式出错: ${error.message}`);
    return `CRON表达式: ${cronExpression}`;
  }
}

/**
 * 文章管理页面
 */
export const getPosts = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const status = req.query.status as string || 'all';
  const search = req.query.search as string || '';
  
  // 构建查询选项
  const options: any = {
    userId: req.user._id,
    status: status !== 'all' ? status : undefined,
    search: search || undefined,
    page,
    limit,
    sortBy: 'createdAt',
    sortOrder: -1
  };
  
  // 使用仓库获取分页文章
  const { posts, total } = await postRepository.getPaginatedPosts(options);
  
  // 创建分页
  const pagination = createPagination(page, limit, total);
  
  res.render('admin/posts', {
    title: '管理后台 - 文章管理',
    posts,
    currentStatus: status,
    search,
    pagination,
    statusCounts: {
      all: await postRepository.countPosts({ userId: req.user._id }),
      published: await postRepository.countPosts({ userId: req.user._id, status: 'published' }),
      draft: await postRepository.countPosts({ userId: req.user._id, status: 'draft' }),
      archived: await postRepository.countPosts({ userId: req.user._id, status: 'archived' })
    }
  });
});

/**
 * 主题管理页面
 */
export const getTopics = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  const userId = req.user._id;
  
  // 使用仓库获取主题及文章数量
  const topics = await topicRepository.getTopicsWithPostCount(userId, {
    sortBy: 'priority'
  });
  
  res.render('admin/topics', {
    title: '管理后台 - 主题管理',
    topics,
  });
});

/**
 * 新建主题页面
 */
export const getNewTopic = (req: Request & CustomRequest, res: Response): void => {
  res.render('admin/topicEdit', {
    title: '创建新主题',
    topic: null,
    user: req.user,
    isNewTopic: true,
    messages: req.flash()
  });
};

/**
 * 编辑主题页面
 */
export const getEditTopic = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  const topic = await topicRepository.getTopicById(req.params.id);
  
  if (!topic) {
    req.flash('error', '主题不存在');
    return res.redirect('/admin/topics');
  }
  
  res.render('admin/topicEdit', {
    title: `管理后台 - 编辑主题: ${topic.name}`,
    topic,
    isNewTopic: false,
    user: req.user,
    messages: req.flash()
  });
});

/**
 * 内容生成页面
 */
export const getGeneratePage = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  // 获取活跃主题
  const topics = await topicRepository.getUserTopics(req.user._id, {
    status: 'active',
    sortBy: 'postsGenerated',
    sortOrder: 1
  });
  
  // 获取最近的生成历史记录
  const { getRecentGenerationHistory } = require('../services/contentGenerator');
  const history = await getRecentGenerationHistory(5, req.user);
  
  // 处理从URL查询参数中获取的主题ID
  let selectedTopic = null;
  if (req.query.topic) {
    selectedTopic = req.query.topic;
  }
  
  res.render('admin/generate', {
    title: '管理后台 - 内容生成',
    topics,
    history,
    selectedTopic
  });
});

/**
 * 手动触发内容生成
 */
export const postGenerate = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  const { count, topic: topicId, publishImmediately } = req.body;
  let result;
  const startTime = Date.now();
  
  // 导入内容生成服务
  const { 
    generateContentForTopic, 
    generateAndPublishPosts 
  } = require('../services/contentGenerator');
  
  if (topicId) {
    // 为指定主题生成内容
    logger.info(`开始为主题 ID=${topicId} 生成内容`);
    const post = await generateContentForTopic(
      topicId, 
      req.user, 
      publishImmediately === 'true'
    );
    result = [post];
  } else {
    // 批量生成内容
    result = await generateAndPublishPosts(
      parseInt(count as string) || 1, 
      req.user, 
      publishImmediately === 'true'
    );
  }
  
  const generationTime = Math.round((Date.now() - startTime) / 1000); // 计算生成时间（秒）
  
  res.render('admin/generateResult', {
    title: '管理后台 - 内容生成结果',
    result,
    generationTime
  });
});

/**
 * SEO工具页面
 */
export const getSeoTools = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  // 获取站点地图状态
  const fs = require('fs').promises;
  const path = require('path');
  
  let sitemapInfo: {
    exists: boolean;
    lastModified: Date | null;
    size: number;
    url: string | null;
  } = {
    exists: false,
    lastModified: null,
    size: 0,
    url: null
  };
  
  try {
    // 检查用户特定的站点地图
    const userDir = path.join(process.cwd(), 'public', 'users', req.user._id.toString());
    const sitemapPath = path.join(userDir, 'sitemap.xml');
    
    try {
      const stats = await fs.stat(sitemapPath);
      
      // 获取用户的域名
      const hostname = req.user.customDomain ? `https://${req.user.customDomain}` : 
                      req.user.subdomain ? `https://${req.user.subdomain}.${config.domain.baseDomain}` : 
                      config.blog.siteUrl;
      
      sitemapInfo = {
        exists: true,
        lastModified: stats.mtime,
        size: Math.round(stats.size / 1024), // 转换为KB
        url: `${hostname}/sitemap.xml`
      };
    } catch (error) {
      // 用户特定的站点地图不存在，检查系统站点地图
      const systemSitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
      const stats = await fs.stat(systemSitemapPath);
      
      sitemapInfo = {
        exists: true,
        lastModified: stats.mtime,
        size: Math.round(stats.size / 1024), // 转换为KB
        url: `${config.blog.siteUrl}/sitemap.xml`
      };
    }
  } catch (error) {
    // 文件不存在，使用默认值
    logger.info('站点地图文件不存在');
  }
  
  res.render('admin/seoTools', {
    title: '管理后台 - SEO工具',
    sitemapInfo
  });
});

/**
 * 刷新站点地图
 */
export const postRefreshSitemap = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  const sitemapUrl = await triggerSitemapGeneration(req.user);
  
  res.render('admin/sitemapResult', {
    title: '管理后台 - 站点地图更新结果',
    sitemapUrl,
  });
});

/**
 * 文章编辑页面
 */
export const getEditPost = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  const post = await postRepository.getPostById(req.params.id, true);
  
  if (!post) {
    return res.status(404).render('error', {
      title: '文章不存在',
      message: '您要编辑的文章不存在',
    });
  }
  
  // 获取所有主题，用于选择
  const topics = await topicRepository.getUserTopics(req.user._id, {
    status: 'active'
  });
  
  res.render('admin/postEdit', {
    title: `管理后台 - 编辑文章: ${post.title}`,
    post,
    topics,
    isNewPost: false,
    messages: req.flash()
  });
});

/**
 * 创建主题
 */
export const postCreateTopic = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  const { name, description, keywords, categories, status, priority, promptTemplate } = req.body;
  
  // 检查名称是否存在
  if (!name || name.trim() === '') {
    req.flash('error', '主题名称不能为空');
    return res.redirect('/admin/topics/new');
  }
  
  // 创建主题数据对象
  const topicData = {
    name,
    description: description || '',
    keywords: keywords ? keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k !== '') : [],
    categories: categories ? categories.split(',').map((c: string) => c.trim()).filter((c: string) => c !== '') : [],
    status: status || 'active',
    priority: Number(priority) || 0,
    promptTemplate: promptTemplate || ''
  };
  
  try {
    // 使用主题服务创建主题
    const newTopic = await topicService.createTopic(topicData, req.user);
    
    req.flash('success', '主题创建成功');
    res.redirect(`/admin/topics/${newTopic._id}`);
  } catch (err: any) {
    logger.error('创建主题出错:', err);
    req.flash('error', `创建主题失败: ${err.message}`);
    res.redirect('/admin/topics/new');
  }
});

/**
 * 更新主题
 */
export const postUpdateTopic = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  const { name, description, keywords, categories, status, priority, promptTemplate } = req.body;
  
  // 检查名称是否存在
  if (!name || name.trim() === '') {
    req.flash('error', '主题名称不能为空');
    return res.redirect(`/admin/topics/edit/${req.params.id}`);
  }
  
  // 创建主题数据对象
  const topicData = {
    name,
    description: description || '',
    keywords: keywords ? keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k !== '') : [],
    categories: categories ? categories.split(',').map((c: string) => c.trim()).filter((c: string) => c !== '') : [],
    status: status || 'active',
    priority: Number(priority) || 0,
    promptTemplate: promptTemplate || ''
  };
  
  try {
    // 使用主题服务更新主题
    const updatedTopic = await topicService.updateTopic(req.params.id, topicData);
    
    if (!updatedTopic) {
      req.flash('error', '更新主题失败，主题不存在');
      return res.redirect('/admin/topics');
    }
    
    req.flash('success', '主题更新成功');
    res.redirect(`/admin/topics/${req.params.id}`);
  } catch (err: any) {
    logger.error('更新主题出错:', err);
    req.flash('error', '更新主题时出错');
    res.redirect(`/admin/topics/edit/${req.params.id}`);
  }
});

/**
 * 删除主题
 */
export const postDeleteTopic = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  try {
    // 使用主题服务删除主题
    await topicService.deleteTopic(req.params.id);
    
    req.flash('success', '主题已删除');
    res.redirect('/admin/topics');
  } catch (err: any) {
    logger.error('删除主题出错:', err);
    req.flash('error', `删除主题失败: ${err.message}`);
    res.redirect('/admin/topics');
  }
});

/**
 * 发布文章
 */
export const postPublishPost = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await postService.publishPost(req.params.id);
  
  req.flash('success', '文章已发布');
  res.redirect('/admin/posts');
});

/**
 * 取消发布文章
 */
export const postUnpublishPost = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await postService.unpublishPost(req.params.id);
  
  req.flash('success', '文章已取消发布');
  res.redirect('/admin/posts');
});

/**
 * 删除文章
 */
export const postDeletePost = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await postService.deletePost(req.params.id);
  
  req.flash('success', '文章已删除');
  res.redirect('/admin/posts');
});

/**
 * 更新文章
 */
export const postUpdatePost = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { title, content, excerpt, keywords, categories, metaTitle, metaDescription, status, save, topic } = req.body;
  
  // 创建更新数据对象
  const updateData: any = {
    title,
    content,
    excerpt: excerpt || content.substring(0, 200),
    keywords: keywords ? keywords.split(',').map((k: string) => k.trim()).filter((k: string) => k !== '') : [],
    categories: categories ? categories.split(',').map((c: string) => c.trim()).filter((c: string) => c !== '') : [],
    metaTitle: metaTitle || title,
    metaDescription: metaDescription || excerpt || content.substring(0, 160),
    topic: topic || null
  };
  
  // 根据保存选项决定状态
  if (save === 'publish') {
    updateData.status = 'published';
  } else {
    updateData.status = status || 'draft';
  }
  
  // 使用文章服务更新文章
  await postService.updatePost(req.params.id, updateData);
  
  req.flash('success', '文章已更新');
  res.redirect('/admin/posts');
});

/**
 * 获取主题详情
 */
export const getTopicDetail = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  const topic = await topicRepository.getTopicById(req.params.id);
  
  if (!topic) {
    req.flash('error', '主题不存在');
    return res.redirect('/admin/topics');
  }
  
  // 获取相关的文章
  const postCount = await postRepository.countPosts({ 
    topic: topic._id,
    userId: req.user._id
  });
  
  // 获取最近的5篇文章
  const recentPosts = await topicRepository.getTopicPosts(topic._id, 5);
  
  res.render('admin/topicDetail', {
    title: `${topic.name} - 主题详情`,
    topic,
    postCount,
    recentPosts,
    user: req.user,
    messages: req.flash()
  });
});

/**
 * 文章详情页面
 */
export const getPostDetail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const post = await postRepository.getPostById(req.params.id, true);
  
  if (!post) {
    req.flash('error', '文章不存在');
    return res.redirect('/admin/posts');
  }
  
  // 处理Markdown内容
  if (post.content) {
    post.content = parseMarkdown(post.content);
  }
  
  res.render('admin/postDetail', {
    title: `${post.title} - 文章详情`,
    post,
    messages: req.flash()
  });
});

/**
 * 查看生成结果页面
 */
export const getGenerationResults = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  
  // 获取生成历史记录
  const { getGenerationHistoryById } = require('../services/contentGenerator');
  const history = await getGenerationHistoryById(id);
  
  if (!history) {
    req.flash('error', '生成记录不存在');
    return res.redirect('/admin/generate');
  }
  
  res.render('admin/generationResult', {
    title: '生成结果详情',
    history
  });
});

/**
 * 生成站点地图
 */
export const getGenerateSitemap = async (req: Request & CustomRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sitemapUrl = await triggerSitemapGeneration(req.user);
    
    res.render('admin/sitemapResult', {
      title: '管理后台 - 站点地图生成结果',
      sitemapUrl,
    });
  } catch (error: any) {
    logger.error(`生成站点地图出错: ${error.message}`);
    next(error);
  }
};

/**
 * 获取域名设置页面
 */
export const getDomainSettings = async (req: Request & CustomRequest, res: Response): Promise<void> => {
  try {
    const DomainVerifier = require('../services/domainVerifier');
    const config = require('../config');
    
    // 获取当前用户
    const user = req.user;
    
    // 获取子域名和自定义域名的状态
    const subdomainStatus = user.subdomain ? {
      domain: `${user.subdomain}.${config.domain.baseDomain}`,
      status: user.domainStatus,
      verifiedAt: user.domainVerifiedAt,
      sslStatus: user.sslStatus
    } : null;
    
    const customDomainStatus = user.customDomain ? {
      domain: user.customDomain,
      status: user.domainStatus,
      verifiedAt: user.domainVerifiedAt,
      sslStatus: user.sslStatus
    } : null;
    
    // 生成DNS配置指南
    let dnsGuide = null;
    if (user.customDomain) {
      dnsGuide = DomainVerifier.generateDnsGuide(user.customDomain, true);
    } else if (user.subdomain) {
      dnsGuide = DomainVerifier.generateDnsGuide(user.subdomain, false);
    }
    
    // 渲染域名设置页面
    res.render('admin/domain-settings', {
      title: '域名设置',
      user,
      subdomainStatus,
      customDomainStatus,
      dnsGuide,
      baseDomain: config.domain.baseDomain,
      railwayDomain: config.domain.railwayDomain,
      messages: req.flash()
    });
  } catch (error: any) {
    req.flash('error', `获取域名设置失败: ${error.message}`);
    res.redirect('/admin');
  }
};

/**
 * 更新子域名
 */
export const postUpdateSubdomain = async (req: Request & CustomRequest, res: Response): Promise<void> => {
  try {
    const { subdomain } = req.body;
    const DomainVerifier = require('../services/domainVerifier');
    const User = require('../models/User');
    
    // 验证子域名格式
    const subdomainRegex = /^[a-z0-9](?:[a-z0-9\-]{1,61}[a-z0-9])?$/;
    if (!subdomainRegex.test(subdomain)) {
      req.flash('error', '子域名格式不正确，只能包含小写字母、数字和连字符，不能以连字符开头或结尾');
      return res.redirect('/admin/domain-settings');
    }
    
    // 检查子域名是否已被使用
    const existingUser = await User.findOne({ subdomain });
    if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
      req.flash('error', '该子域名已被使用，请选择其他子域名');
      return res.redirect('/admin/domain-settings');
    }
    
    // 安排子域名验证
    await DomainVerifier.scheduleVerification(req.user._id, subdomain, false);
    
    req.flash('success', '子域名设置已更新，正在验证中');
    res.redirect('/admin/domain-settings');
  } catch (error: any) {
    req.flash('error', `更新子域名失败: ${error.message}`);
    res.redirect('/admin/domain-settings');
  }
};

/**
 * 更新自定义域名
 */
export const postUpdateCustomDomain = async (req: Request & CustomRequest, res: Response): Promise<void> => {
  try {
    const { customDomain } = req.body;
    const DomainVerifier = require('../services/domainVerifier');
    const User = require('../models/User');
    
    // 验证域名格式
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;
    if (!domainRegex.test(customDomain)) {
      req.flash('error', '域名格式不正确');
      return res.redirect('/admin/domain-settings');
    }
    
    // 检查域名是否已被使用
    const existingUser = await User.findOne({ customDomain });
    if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
      req.flash('error', '该域名已被使用，请选择其他域名');
      return res.redirect('/admin/domain-settings');
    }
    
    // 安排自定义域名验证
    await DomainVerifier.scheduleVerification(req.user._id, customDomain, true);
    
    req.flash('success', '自定义域名设置已更新，请按照DNS配置指南进行设置，然后点击验证按钮');
    res.redirect('/admin/domain-settings');
  } catch (error: any) {
    req.flash('error', `更新自定义域名失败: ${error.message}`);
    res.redirect('/admin/domain-settings');
  }
};

/**
 * 验证域名
 */
export const postVerifyDomain = async (req: Request & CustomRequest, res: Response): Promise<void> => {
  try {
    const { type } = req.body;
    const DomainVerifier = require('../services/domainVerifier');
    
    // 验证域名
    const isCustomDomain = type === 'custom';
    const success = await DomainVerifier.verifyDomain(req.user._id, isCustomDomain);
    
    if (success) {
      req.flash('success', '域名验证成功');
    } else {
      req.flash('error', '域名验证失败，请检查DNS配置');
    }
    
    res.redirect('/admin/domain-settings');
  } catch (error: any) {
    req.flash('error', `域名验证失败: ${error.message}`);
    res.redirect('/admin/domain-settings');
  }
};

/**
 * 更新博客设置
 */
export const postUpdateBlogSettings = async (req: Request & CustomRequest, res: Response): Promise<void> => {
  try {
    const { 
      blogTitle, 
      blogDescription, 
      primaryColor, 
      secondaryColor,
      language,
      contactEmail,
      // 内容生成设置
      model,
      minWordsPerPost,
      maxWordsPerPost,
      autoPublish,
      enableFeaturedImages,
      // SEO设置
      metaTitle,
      metaDescription,
      generateSitemap,
      enableCanonical,
      robotsTxt,
      // 自动发布设置
      enableScheduledGeneration,
      generationCronExpression,
      postsPerScheduledRun
    } = req.body;
    
    const User = require('../models/User');
    
    // 更新用户的博客设置
    const user = await User.findById(req.user._id);
    
    // 确保settings.blog对象存在
    if (!user.settings) {
      user.settings = {};
    }
    if (!user.settings.blog) {
      user.settings.blog = {};
    }
    
    // 基本设置
    user.settings.blog.title = blogTitle;
    user.settings.blog.description = blogDescription;
    user.settings.blog.primaryColor = primaryColor;
    user.settings.blog.secondaryColor = secondaryColor;
    user.settings.blog.language = language;
    user.settings.blog.contactEmail = contactEmail;
    
    // 内容生成设置
    if (!user.settings.blog.content) {
      user.settings.blog.content = {};
    }
    user.settings.blog.content.model = model;
    user.settings.blog.content.minWordsPerPost = parseInt(minWordsPerPost, 10);
    user.settings.blog.content.maxWordsPerPost = parseInt(maxWordsPerPost, 10);
    user.settings.blog.content.autoPublish = autoPublish === 'on' || autoPublish === 'true';
    user.settings.blog.content.enableFeaturedImages = enableFeaturedImages === 'on' || enableFeaturedImages === 'true';
    
    // SEO设置
    if (!user.settings.blog.seo) {
      user.settings.blog.seo = {};
    }
    user.settings.blog.seo.metaTitle = metaTitle;
    user.settings.blog.seo.metaDescription = metaDescription;
    user.settings.blog.seo.generateSitemap = generateSitemap === 'on' || generateSitemap === 'true';
    user.settings.blog.seo.enableCanonical = enableCanonical === 'on' || enableCanonical === 'true';
    user.settings.blog.seo.robotsTxt = robotsTxt;
    
    // 自动发布设置
    if (!user.settings.blog.schedule) {
      user.settings.blog.schedule = {};
    }
    user.settings.blog.schedule.enableScheduledGeneration = enableScheduledGeneration === 'on' || enableScheduledGeneration === 'true';
    user.settings.blog.schedule.generationCronExpression = generationCronExpression;
    user.settings.blog.schedule.postsPerScheduledRun = parseInt(postsPerScheduledRun, 10);
    
    await user.save();
    
    req.flash('success', '博客设置已更新');
    res.redirect('/admin/domain-settings');
  } catch (error: any) {
    req.flash('error', `更新博客设置失败: ${error.message}`);
    res.redirect('/admin/domain-settings');
  }
}; 