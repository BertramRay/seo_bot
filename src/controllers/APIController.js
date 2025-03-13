const { 
  generateBlogContent, 
  saveGeneratedArticle, 
  publishArticle,
  generateAndPublishPosts
} = require('../services/contentGenerator');
const { triggerSitemapGeneration } = require('../services/scheduler');
const { logger } = require('../utils/logger');
const { createPagination } = require('../utils/pagination');
const postRepository = require('../repositories/PostRepository');
const topicRepository = require('../repositories/TopicRepository');
const postService = require('../services/postService');
const topicService = require('../services/topicService');
const { sendSuccess, sendError } = require('../utils/responseUtils');
const { apiAsyncHandler } = require('../utils/controllerUtils');
const { getBlogConfig } = require('../utils/configUtils');

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
  
  // 添加搜索
  if (req.query.search) {
    options.search = req.query.search;
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
  const post = await postRepository.getPostById(req.params.id, true);
  
  if (!post) {
    return sendError(res, '文章不存在', 404);
  }
  
  sendSuccess(res, { post });
});

/**
 * 获取主题列表
 */
exports.getTopics = apiAsyncHandler(async (req, res) => {
  const userId = req.user ? req.user._id : null;
  const topics = await topicRepository.getTopicsWithPostCount(userId, {
    status: req.query.status,
    sortBy: req.query.sortBy || 'priority'
  });
  
  sendSuccess(res, { topics });
});

/**
 * 创建主题
 */
exports.createTopic = apiAsyncHandler(async (req, res) => {  
  const topic = await topicService.createTopic(req.body, req.user);
  
  sendSuccess(res, { topic }, '主题创建成功', 201);
});

/**
 * 更新主题
 */
exports.updateTopic = apiAsyncHandler(async (req, res) => {
  const { id } = req.params;
  const topic = await topicService.updateTopic(id, req.body);
  
  sendSuccess(res, { topic }, '主题更新成功');
});

/**
 * 删除主题
 */
exports.deleteTopic = apiAsyncHandler(async (req, res) => {
  const { id } = req.params;
  await topicService.deleteTopic(id);
  
  sendSuccess(res, {}, '主题删除成功');
});

/**
 * 发布文章
 */
exports.publishPost = apiAsyncHandler(async (req, res) => {
  const { id } = req.params;
  const post = await postService.publishPost(id);
  
  sendSuccess(res, { post }, '文章已发布');
});

/**
 * 取消发布文章
 */
exports.unpublishPost = apiAsyncHandler(async (req, res) => {
  const { id } = req.params;
  const post = await postService.unpublishPost(id);
  
  sendSuccess(res, { post }, '文章已取消发布');
});

/**
 * 更新文章
 */
exports.updatePost = apiAsyncHandler(async (req, res) => {
  const { id } = req.params;
  const post = await postService.updatePost(id, req.body);
  
  sendSuccess(res, { post }, '文章更新成功');
});

/**
 * 删除文章
 */
exports.deletePost = apiAsyncHandler(async (req, res) => {
  const { id } = req.params;
  const post = await postService.deletePost(id);
  
  sendSuccess(res, { post }, '文章已删除');
});

/**
 * 手动生成博客文章
 */
exports.generate = apiAsyncHandler(async (req, res) => {
  const { topicId, count } = req.body;
  
  // 如果指定了主题，生成该主题的内容
  if (topicId) {
    const topic = await topicRepository.getTopicById(topicId);
    
    if (!topic) {
      return sendError(res, '主题不存在', 404);
    }
    
    const content = await generateBlogContent(topic, req.user);
    const post = await saveGeneratedArticle(content, req.user);
    await publishArticle(post._id, req.user);
    
    return sendSuccess(res, { post }, '文章生成并发布成功');
  }
  
  // 生成批量文章
  const posts = await generateAndPublishPosts(count || 1, req.user);
  
  sendSuccess(res, { 
    count: posts.length,
    posts,
  }, `成功生成并发布了 ${posts.length} 篇文章`);
});

/**
 * 手动刷新站点地图
 */
exports.refreshSitemap = apiAsyncHandler(async (req, res) => {
  const sitemapUrl = await triggerSitemapGeneration(req.user);
  
  sendSuccess(res, { sitemapUrl }, '站点地图更新成功');
});

/**
 * 获取博客配置
 */
exports.getBlogConfig = apiAsyncHandler(async (req, res) => {
  const blogConfig = getBlogConfig(req.user);
  
  sendSuccess(res, { config: blogConfig });
}); 