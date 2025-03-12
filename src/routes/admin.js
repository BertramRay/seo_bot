const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Topic = require('../models/Topic');
const { triggerContentGeneration, triggerSitemapGeneration } = require('../services/scheduler');
const { logger } = require('../utils/logger');
const config = require('../config');

/**
 * 管理后台首页
 */
router.get('/', async (req, res, next) => {
  try {
    // 获取统计信息
    const totalPosts = await Post.countDocuments();
    const publishedPosts = await Post.countDocuments({ status: 'published' });
    const draftPosts = await Post.countDocuments({ status: 'draft' });
    const totalTopics = await Topic.countDocuments();
    
    // 计算活跃主题数量
    const activeTopics = await Topic.countDocuments({ status: 'active' });
    
    // 计算本月发布的文章数量
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const postsThisMonth = await Post.countDocuments({
      status: 'published',
      publishedAt: { $gte: firstDayOfMonth }
    });
    
    // 计算下次生成时间
    const nextGeneration = '每天凌晨3点'; // 暂时硬编码，后续可以根据cron表达式计算
    
    // 最近生成的文章
    const recentPosts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('topic');
    
    // 格式化最近文章信息
    const formattedRecentPosts = recentPosts.map(post => ({
      _id: post._id,
      title: post.title,
      url: `/blog/${post.slug || post._id}`,
      publishDate: post.publishedAt ? new Date(post.publishedAt).toLocaleString('zh-CN') : '未发布',
      status: post.status
    }));
    
    res.render('admin/dashboard', {
      title: '管理后台 - 仪表盘',
      stats: {
        totalPosts,
        publishedPosts,
        draftPosts,
        totalTopics,
        activeTopics,
        postsThisMonth,
        nextGeneration
      },
      recentPosts: formattedRecentPosts,
    });
  } catch (error) {
    logger.error(`管理后台首页加载出错: ${error.message}`);
    next(error);
  }
});

/**
 * 文章管理页面
 */
router.get('/posts', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status || 'all';
    const search = req.query.search || '';
    
    // 构建查询条件
    const query = {};
    if (status !== 'all') {
      query.status = status;
    }
    
    // 添加搜索功能
    if (search) {
      // 使用正则表达式进行模糊匹配
      query.$or = [
        { title: { $regex: search, $options: 'i' } },        // 匹配标题
        { content: { $regex: search, $options: 'i' } },      // 匹配内容
        { keywords: { $regex: search, $options: 'i' } }      // 匹配关键词
      ];
      
      logger.info(`执行文章搜索，关键词: "${search}"`);
    }
    
    // 获取文章
    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('topic');
    
    // 获取总数
    const total = await Post.countDocuments(query);
    
    // 分页信息
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    res.render('admin/posts', {
      title: '管理后台 - 文章管理',
      posts,
      currentStatus: status,
      search: search,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    logger.error(`文章管理页面加载出错: ${error.message}`);
    next(error);
  }
});

/**
 * 主题管理页面
 */
router.get('/topics', async (req, res, next) => {
  try {
    const topics = await Topic.find()
      .sort({ priority: -1, name: 1 });
    
    res.render('admin/topics', {
      title: '管理后台 - 主题管理',
      topics,
    });
  } catch (error) {
    logger.error(`主题管理页面加载出错: ${error.message}`);
    next(error);
  }
});

/**
 * 新建主题页面
 */
router.get('/topics/new', (req, res) => {
  res.render('admin/topicForm', {
    title: '管理后台 - 新建主题',
    topic: {},
    isNew: true,
  });
});

/**
 * 编辑主题页面
 */
router.get('/topics/edit/:id', async (req, res, next) => {
  try {
    const topic = await Topic.findById(req.params.id);
    
    if (!topic) {
      return res.status(404).render('error', {
        title: '主题不存在',
        message: '您要编辑的主题不存在',
      });
    }
    
    res.render('admin/topicForm', {
      title: `管理后台 - 编辑主题: ${topic.name}`,
      topic,
      isNew: false,
    });
  } catch (error) {
    logger.error(`编辑主题页面加载出错: ${error.message}`);
    next(error);
  }
});

/**
 * 内容生成页面
 */
router.get('/generate', async (req, res, next) => {
  try {
    // 获取活跃主题
    const topics = await Topic.find({ status: 'active' })
      .sort({ postsGenerated: 1, priority: -1 });
    
    // 获取最近的生成历史记录
    const { getRecentGenerationHistory } = require('../services/contentGenerator');
    const history = await getRecentGenerationHistory(5);
    
    res.render('admin/generate', {
      title: '管理后台 - 内容生成',
      topics,
      history,
      config,
    });
  } catch (error) {
    logger.error(`内容生成页面加载出错: ${error.message}`);
    next(error);
  }
});

/**
 * 手动触发内容生成
 */
router.post('/generate', async (req, res, next) => {
  try {
    const { count, topicId } = req.body;
    let result;
    
    if (topicId) {
      // 生成指定主题的内容
      const topic = await Topic.findById(topicId);
      
      if (!topic) {
        return res.status(404).render('error', {
          title: '主题不存在',
          message: '您选择的主题不存在',
        });
      }
      
      // 导入内容生成服务
      const { generateBlogContent, saveGeneratedArticle } = require('../services/contentGenerator');
      
      // 为指定主题生成内容
      logger.info(`开始为指定主题 "${topic.name}" 生成内容`);
      
      // 创建生成历史记录
      const GenerationHistory = require('../models/GenerationHistory');
      const history = new GenerationHistory({
        requestedCount: 1,
        successCount: 0,
        status: 'processing',
        topics: [topic._id]
      });
      await history.save();
      
      try {
        // 生成内容
        const content = await generateBlogContent(topic);
        
        // 添加关联到主题
        content.topic = topic._id;
        content.categories = topic.categories;
        
        // 保存文章
        const post = await saveGeneratedArticle({
          ...content,
          topic: topic._id,
        });
        
        // 更新历史记录
        history.successCount = 1;
        history.status = 'completed';
        history.posts = [post._id];
        await history.save();
        
        // 返回结果
        result = [post];
      } catch (error) {
        // 更新历史记录
        history.status = 'failed';
        history.error = error.message;
        await history.save();
        
        throw error;
      }
    } else {
      // 批量生成内容
      result = await triggerContentGeneration(parseInt(count) || 1);
    }
    
    res.render('admin/generateResult', {
      title: '管理后台 - 内容生成结果',
      result,
    });
  } catch (error) {
    logger.error(`手动触发内容生成出错: ${error.message}`);
    next(error);
  }
});

/**
 * SEO工具页面
 */
router.get('/seo-tools', async (req, res, next) => {
  try {
    res.render('admin/seoTools', {
      title: '管理后台 - SEO工具',
    });
  } catch (error) {
    logger.error(`SEO工具页面加载出错: ${error.message}`);
    next(error);
  }
});

/**
 * 刷新站点地图
 */
router.post('/refresh-sitemap', async (req, res, next) => {
  try {
    const sitemapUrl = await triggerSitemapGeneration();
    
    res.render('admin/sitemapResult', {
      title: '管理后台 - 站点地图更新结果',
      sitemapUrl,
    });
  } catch (error) {
    logger.error(`刷新站点地图出错: ${error.message}`);
    next(error);
  }
});

/**
 * 系统设置页面
 */
router.get('/settings', async (req, res, next) => {
  try {
    // 获取当前配置
    res.render('admin/settings', {
      title: '管理后台 - 系统设置',
      config: config,
    });
  } catch (error) {
    logger.error(`系统设置页面加载出错: ${error.message}`);
    next(error);
  }
});

/**
 * 更新系统设置
 */
router.post('/settings/update', async (req, res, next) => {
  try {
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
  } catch (error) {
    logger.error(`更新系统设置出错: ${error.message}`);
    next(error);
  }
});

/**
 * 生成站点地图
 */
router.get('/sitemap/generate', async (req, res, next) => {
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
});

/**
 * 文章编辑页面
 */
router.get('/posts/edit/:id', async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).render('error', {
        title: '文章不存在',
        message: '您要编辑的文章不存在',
      });
    }
    
    res.render('admin/postForm', {
      title: `管理后台 - 编辑文章: ${post.title}`,
      post,
    });
  } catch (error) {
    logger.error(`编辑文章页面加载出错: ${error.message}`);
    next(error);
  }
});

/**
 * 创建/更新主题
 */
router.post('/topics/create', async (req, res, next) => {
  try {
    const topic = new Topic({
      name: req.body.name,
      description: req.body.description,
      keywords: req.body.keywords,
      categories: req.body.categories,
      priority: req.body.priority,
      status: req.body.status,
      promptTemplate: req.body.promptTemplate,
    });
    
    await topic.save();
    
    res.redirect('/admin/topics');
  } catch (error) {
    logger.error(`创建主题出错: ${error.message}`);
    next(error);
  }
});

/**
 * 更新主题
 */
router.post('/topics/update/:id', async (req, res, next) => {
  try {
    await Topic.findByIdAndUpdate(req.params.id, {
      name: req.body.name,
      description: req.body.description,
      keywords: req.body.keywords,
      categories: req.body.categories,
      priority: req.body.priority,
      status: req.body.status,
      promptTemplate: req.body.promptTemplate,
    });
    
    res.redirect('/admin/topics');
  } catch (error) {
    logger.error(`更新主题出错: ${error.message}`);
    next(error);
  }
});

/**
 * 删除主题
 */
router.post('/topics/delete/:id', async (req, res, next) => {
  try {
    await Topic.findByIdAndDelete(req.params.id);
    
    res.redirect('/admin/topics');
  } catch (error) {
    logger.error(`删除主题出错: ${error.message}`);
    next(error);
  }
});

/**
 * 发布文章
 */
router.post('/posts/publish/:id', async (req, res, next) => {
  try {
    await Post.findByIdAndUpdate(req.params.id, {
      status: 'published',
      publishedAt: new Date(),
    });
    
    res.redirect('/admin/posts');
  } catch (error) {
    logger.error(`发布文章出错: ${error.message}`);
    next(error);
  }
});

/**
 * 取消发布文章
 */
router.post('/posts/unpublish/:id', async (req, res, next) => {
  try {
    await Post.findByIdAndUpdate(req.params.id, {
      status: 'draft',
    });
    
    res.redirect('/admin/posts');
  } catch (error) {
    logger.error(`取消发布文章出错: ${error.message}`);
    next(error);
  }
});

/**
 * 删除文章
 */
router.post('/posts/delete/:id', async (req, res, next) => {
  try {
    await Post.findByIdAndUpdate(req.params.id, {
      status: 'deleted',
    });
    
    res.redirect('/admin/posts');
  } catch (error) {
    logger.error(`删除文章出错: ${error.message}`);
    next(error);
  }
});

/**
 * 启动定时任务
 */
router.post('/scheduler/start', async (req, res) => {
  try {
    setupCronJobs();
    
    res.json({ success: true });
  } catch (error) {
    logger.error(`启动定时任务出错: ${error.message}`);
    res.json({ success: false, message: error.message });
  }
});

/**
 * 停止定时任务
 */
router.post('/scheduler/stop', async (req, res) => {
  try {
    stopAllJobs();
    
    res.json({ success: true });
  } catch (error) {
    logger.error(`停止定时任务出错: ${error.message}`);
    res.json({ success: false, message: error.message });
  }
});

/**
 * 更新文章
 */
router.post('/posts/update/:id', async (req, res, next) => {
  try {
    const { title, excerpt, content, keywords, categories, slug, status, metaTitle, metaDescription, save } = req.body;
    
    // 构建更新对象
    const updateData = {
      title,
      excerpt,
      content,
      keywords: keywords || [],
      categories: categories || [],
      slug,
      metaTitle,
      metaDescription,
    };
    
    // 根据保存选项决定状态
    if (save === 'publish') {
      updateData.status = 'published';
      updateData.publishedAt = new Date();
    } else {
      updateData.status = status || 'draft';
    }
    
    // 更新文章
    await Post.findByIdAndUpdate(req.params.id, updateData);
    
    res.redirect('/admin/posts');
  } catch (error) {
    logger.error(`更新文章出错: ${error.message}`);
    next(error);
  }
});

module.exports = router; 