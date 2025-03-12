const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Topic = require('../models/Topic');
const { 
  generateBlogContent, 
  saveGeneratedArticle, 
  publishArticle,
  generateAndPublishPosts
} = require('../services/contentGenerator');
const { triggerSitemapGeneration } = require('../services/scheduler');
const { logger } = require('../utils/logger');

/**
 * 健康检查
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

/**
 * 获取博客文章列表
 */
router.get('/posts', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status || 'published';
    
    // 构建查询条件
    const query = {};
    if (status !== 'all') {
      query.status = status;
    }
    
    if (req.query.category) {
      query.categories = req.query.category;
    }
    
    if (req.query.keyword) {
      query.keywords = req.query.keyword;
    }
    
    // 获取文章
    const posts = await Post.find(query)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // 获取总数
    const total = await Post.countDocuments(query);
    
    // 分页信息
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      status: 'success',
      data: {
        posts,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        }
      }
    });
  } catch (error) {
    logger.error(`API获取文章列表出错: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * 获取单篇文章
 */
router.get('/posts/:id', async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({
        status: 'error',
        message: '文章不存在',
      });
    }
    
    res.json({
      status: 'success',
      data: { post }
    });
  } catch (error) {
    logger.error(`API获取单篇文章出错: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * 获取主题列表
 */
router.get('/topics', async (req, res, next) => {
  try {
    const topics = await Topic.find()
      .sort({ postsGenerated: 1, priority: -1 });
    
    res.json({
      status: 'success',
      data: { topics }
    });
  } catch (error) {
    logger.error(`API获取主题列表出错: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * 创建主题
 */
router.post('/topics', async (req, res, next) => {
  try {
    const {
      name,
      description,
      keywords,
      categories,
      promptTemplate,
      priority,
    } = req.body;
    
    // 验证必填字段
    if (!name) {
      return res.status(400).json({
        status: 'error',
        message: '主题名称不能为空',
      });
    }
    
    // 创建主题
    const topic = new Topic({
      name,
      description,
      keywords: keywords || [],
      categories: categories || [],
      promptTemplate,
      priority: priority || 0,
      status: 'active',
    });
    
    await topic.save();
    
    res.status(201).json({
      status: 'success',
      data: { topic },
      message: '主题创建成功',
    });
  } catch (error) {
    logger.error(`API创建主题出错: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * 手动生成博客文章
 */
router.post('/generate', async (req, res, next) => {
  try {
    const { topicId, count } = req.body;
    
    // 如果指定了主题，生成该主题的内容
    if (topicId) {
      const topic = await Topic.findById(topicId);
      
      if (!topic) {
        return res.status(404).json({
          status: 'error',
          message: '主题不存在',
        });
      }
      
      const content = await generateBlogContent(topic);
      const post = await saveGeneratedArticle(content);
      await publishArticle(post._id);
      
      return res.json({
        status: 'success',
        data: { post },
        message: '文章生成并发布成功',
      });
    }
    
    // 生成批量文章
    const posts = await generateAndPublishPosts(count || 1);
    
    res.json({
      status: 'success',
      data: { 
        count: posts.length,
        posts,
      },
      message: `成功生成并发布了 ${posts.length} 篇文章`,
    });
  } catch (error) {
    logger.error(`API生成文章出错: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * 手动刷新站点地图
 */
router.post('/refresh-sitemap', async (req, res, next) => {
  try {
    const sitemapUrl = await triggerSitemapGeneration();
    
    res.json({
      status: 'success',
      data: { sitemapUrl },
      message: '站点地图更新成功',
    });
  } catch (error) {
    logger.error(`API刷新站点地图出错: ${error.message}`);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

module.exports = router; 