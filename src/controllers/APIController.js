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
const { createPagination, paginateQuery } = require('../utils/pagination');
const postRepository = require('../repositories/PostRepository');
const { sendSuccess, sendError } = require('../utils/responseUtils');
const { apiAsyncHandler } = require('../utils/controllerUtils');

/**
 * 健康检查
 */
exports.health = (req, res) => {
  sendSuccess(res, { timestamp: new Date() }, '系统正常');
};

/**
 * 获取博客文章列表
 */
exports.getPosts = apiAsyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const status = req.query.status || 'published';
  
  // 构建查询选项
  const options = {
    status,
    page,
    limit
  };
  
  // 添加分类过滤
  if (req.query.category) {
    options.category = req.query.category;
  }
  
  // 添加关键词过滤
  if (req.query.keyword) {
    options.keyword = req.query.keyword;
  }
  
  // 使用仓库获取分页文章
  const { posts, total } = await postRepository.getPaginatedPosts(options);
  
  // 分页信息
  const pagination = createPagination(page, limit, total);
  
  // 使用响应工具发送成功响应
  sendSuccess(res, {
    posts,
    pagination
  });
});

/**
 * 获取单篇文章
 */
exports.getPost = apiAsyncHandler(async (req, res) => {
  const post = await postRepository.getPostById(req.params.id);
  
  if (!post) {
    return sendError(res, '文章不存在', 404);
  }
  
  sendSuccess(res, { post });
});

/**
 * 获取主题列表
 */
exports.getTopics = apiAsyncHandler(async (req, res) => {
  const topics = await Topic.find()
    .sort({ postsGenerated: 1, priority: -1 });
  
  sendSuccess(res, { topics });
});

/**
 * 创建主题
 */
exports.createTopic = async (req, res, next) => {
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
};

/**
 * 手动生成博客文章
 */
exports.generate = async (req, res, next) => {
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
      
      const content = await generateBlogContent(topic, req.user);
      const post = await saveGeneratedArticle(content, req.user);
      await publishArticle(post._id, req.user);
      
      return res.json({
        status: 'success',
        data: { post },
        message: '文章生成并发布成功',
      });
    }
    
    // 生成批量文章
    const posts = await generateAndPublishPosts(count || 1, req.user);
    
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
};

/**
 * 手动刷新站点地图
 */
exports.refreshSitemap = async (req, res, next) => {
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
}; 