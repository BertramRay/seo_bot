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
const { createPagination, paginateQuery } = require('../utils/pagination');
const { asyncHandler } = require('../utils/controllerUtils');
const { getBlogConfig } = require('../utils/configUtils');
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
exports.getDashboard = asyncHandler(async (req, res) => {
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
  
  // 获取博客配置
  const blogConfig = getBlogConfig();
  
  // 获取主题统计
  const topics = await topicRepository.getTopicsWithPostCount(userId);
  const totalTopics = topics.length;
  const activeTopics = topics.filter(topic => topic.status === 'active').length;
  
  // 获取CRON表达式
  const cronExpression = getContentGenerationCronExpression();
  
  // 解释CRON表达式
  const cronExplanation = explainCronExpression(cronExpression);
  
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
    blogTitle: blogConfig.title,
    siteUrl: blogConfig.siteUrl
  });
});

/**
 * 解释CRON表达式的含义
 * @param {string} cronExpression - CRON表达式
 * @returns {string} - 人类可读的解释
 */
function explainCronExpression(cronExpression) {
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
  } catch (error) {
    logger.error(`解析CRON表达式出错: ${error.message}`);
    return `CRON表达式: ${cronExpression}`;
  }
}

/**
 * 文章管理页面
 */
exports.getPosts = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const status = req.query.status || 'all';
  const search = req.query.search || '';
  
  // 构建查询选项
  const options = {
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
exports.getTopics = asyncHandler(async (req, res) => {
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
exports.getNewTopic = (req, res) => {
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
exports.getEditTopic = asyncHandler(async (req, res) => {
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
exports.getGeneratePage = asyncHandler(async (req, res) => {
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
  
  // 获取博客配置
  const blogConfig = getBlogConfig();
  
  res.render('admin/generate', {
    title: '管理后台 - 内容生成',
    topics,
    history,
    blogConfig,
    selectedTopic
  });
});

/**
 * 手动触发内容生成
 */
exports.postGenerate = asyncHandler(async (req, res) => {
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
      parseInt(count) || 1, 
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
exports.getSeoTools = asyncHandler(async (req, res) => {
  // 获取博客配置
  const blogConfig = getBlogConfig();
  
  // 获取站点地图状态
  const fs = require('fs').promises;
  const path = require('path');
  
  let sitemapInfo = {
    exists: false,
    lastModified: null,
    size: 0,
    url: null
  };
  
  try {
    const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
    const stats = await fs.stat(sitemapPath);
    
    sitemapInfo = {
      exists: true,
      lastModified: stats.mtime,
      size: Math.round(stats.size / 1024), // 转换为KB
      url: `${blogConfig.siteUrl}/sitemap.xml`
    };
  } catch (error) {
    // 文件不存在，使用默认值
    logger.info('站点地图文件不存在');
  }
  
  res.render('admin/seoTools', {
    title: '管理后台 - SEO工具',
    sitemapInfo,
    blogConfig
  });
});

/**
 * 刷新站点地图
 */
exports.postRefreshSitemap = asyncHandler(async (req, res) => {
  const sitemapUrl = await triggerSitemapGeneration();
  
  res.render('admin/sitemapResult', {
    title: '管理后台 - 站点地图更新结果',
    sitemapUrl,
  });
});

/**
 * 系统设置页面
 */
exports.getSettings = asyncHandler(async (req, res) => {
  // 获取博客配置
  const blogConfig = getBlogConfig();
  
  res.render('admin/settings', {
    title: '管理后台 - 系统设置',
    config: blogConfig,
  });
});

/**
 * 更新系统设置
 */
exports.postUpdateSettings = asyncHandler(async (req, res) => {
  const { section } = req.body;
  
  // 更新配置文件
  logger.info(`更新系统设置，部分: ${section}`);
  
  // 使用配置管理器保存设置
  const { updateConfig } = require('../services/configManager');
  const success = await updateConfig(section, req.body[section] || req.body);
  
  if (success) {
    req.flash = { type: 'success', message: '设置已保存' };
  } else {
    req.flash = { type: 'error', message: '保存设置失败' };
  }
  
  res.redirect('/admin/settings');
});

/**
 * 文章编辑页面
 */
exports.getEditPost = asyncHandler(async (req, res) => {
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
exports.postCreateTopic = asyncHandler(async (req, res) => {
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
    keywords: keywords ? keywords.split(',').map(k => k.trim()).filter(k => k !== '') : [],
    categories: categories ? categories.split(',').map(c => c.trim()).filter(c => c !== '') : [],
    status: status || 'active',
    priority: Number(priority) || 0,
    promptTemplate: promptTemplate || ''
  };
  
  try {
    // 使用主题服务创建主题
    const newTopic = await topicService.createTopic(topicData, req.user);
    
    req.flash('success', '主题创建成功');
    res.redirect(`/admin/topics/${newTopic._id}`);
  } catch (err) {
    logger.error('创建主题出错:', err);
    req.flash('error', `创建主题失败: ${err.message}`);
    res.redirect('/admin/topics/new');
  }
});

/**
 * 更新主题
 */
exports.postUpdateTopic = asyncHandler(async (req, res) => {
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
    keywords: keywords ? keywords.split(',').map(k => k.trim()).filter(k => k !== '') : [],
    categories: categories ? categories.split(',').map(c => c.trim()).filter(c => c !== '') : [],
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
  } catch (err) {
    logger.error('更新主题出错:', err);
    req.flash('error', '更新主题时出错');
    res.redirect(`/admin/topics/edit/${req.params.id}`);
  }
});

/**
 * 删除主题
 */
exports.postDeleteTopic = asyncHandler(async (req, res) => {
  try {
    // 使用主题服务删除主题
    await topicService.deleteTopic(req.params.id);
    
    req.flash('success', '主题已删除');
    res.redirect('/admin/topics');
  } catch (err) {
    logger.error('删除主题出错:', err);
    req.flash('error', `删除主题失败: ${err.message}`);
    res.redirect('/admin/topics');
  }
});

/**
 * 发布文章
 */
exports.postPublishPost = asyncHandler(async (req, res) => {
  await postService.publishPost(req.params.id);
  
  req.flash('success', '文章已发布');
  res.redirect('/admin/posts');
});

/**
 * 取消发布文章
 */
exports.postUnpublishPost = asyncHandler(async (req, res) => {
  await postService.unpublishPost(req.params.id);
  
  req.flash('success', '文章已取消发布');
  res.redirect('/admin/posts');
});

/**
 * 删除文章
 */
exports.postDeletePost = asyncHandler(async (req, res) => {
  await postService.deletePost(req.params.id);
  
  req.flash('success', '文章已删除');
  res.redirect('/admin/posts');
});

/**
 * 更新文章
 */
exports.postUpdatePost = asyncHandler(async (req, res) => {
  const { title, content, excerpt, keywords, categories, metaTitle, metaDescription, status, save, topic } = req.body;
  
  // 创建更新数据对象
  const updateData = {
    title,
    content,
    excerpt: excerpt || content.substring(0, 200),
    keywords: keywords ? keywords.split(',').map(k => k.trim()).filter(k => k !== '') : [],
    categories: categories ? categories.split(',').map(c => c.trim()).filter(c => c !== '') : [],
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
exports.getTopicDetail = asyncHandler(async (req, res) => {
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
exports.getPostDetail = asyncHandler(async (req, res) => {
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
exports.getGenerationResults = asyncHandler(async (req, res) => {
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
exports.getGenerateSitemap = async (req, res, next) => {
  try {
    const sitemapUrl = await triggerSitemapGeneration();
    
    res.render('admin/sitemapResult', {
      title: '管理后台 - 站点地图生成结果',
      sitemapUrl,
    });
  } catch (error) {
    logger.error(`生成站点地图出错: ${error.message}`);
    next(error);
  }
}; 