const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Topic = require('../models/Topic');
const { triggerContentGeneration, triggerSitemapGeneration } = require('../services/scheduler');
const { logger } = require('../utils/logger');

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
    
    // 最近生成的文章
    const recentPosts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.render('admin/dashboard', {
      title: '管理后台 - 仪表盘',
      stats: {
        totalPosts,
        publishedPosts,
        draftPosts,
        totalTopics,
      },
      recentPosts,
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
    
    // 构建查询条件
    const query = {};
    if (status !== 'all') {
      query.status = status;
    }
    
    // 获取文章
    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
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
    
    res.render('admin/generate', {
      title: '管理后台 - 内容生成',
      topics,
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
      
      // 这里需要实现单个主题的内容生成逻辑
      // 暂时先用triggerContentGeneration代替
      result = await triggerContentGeneration(1);
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

module.exports = router; 