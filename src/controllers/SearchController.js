const { asyncHandler } = require('../utils/controllerUtils');
const { apiAsyncHandler } = require('../utils/controllerUtils');
const { sendSuccess, sendError } = require('../utils/responseUtils');
const { getSeoMeta } = require('../utils/configUtils');
const { createPagination } = require('../utils/pagination');
const postRepository = require('../repositories/PostRepository');
const topicRepository = require('../repositories/TopicRepository');

/**
 * 博客内容搜索页面
 */
exports.searchPage = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  // 如果没有提供搜索关键词，显示空结果页面
  if (!q) {
    const seoMeta = getSeoMeta({
      title: '搜索',
      description: '在博客中搜索内容',
      path: '/search'
    });
    
    return res.render('blog/search', {
      title: '搜索',
      posts: [],
      query: '',
      pagination: createPagination(1, limit, 0),
      ...seoMeta
    });
  }
  
  // 使用仓库搜索文章
  const { posts, total } = await postRepository.getPaginatedPosts({
    status: 'published',
    search: q,
    page,
    limit
  });
  
  // 创建分页
  const pagination = createPagination(page, limit, total);
  
  // 获取SEO元数据
  const seoMeta = getSeoMeta({
    title: `搜索: ${q}`,
    description: `搜索 "${q}" 的结果`,
    path: `/search?q=${encodeURIComponent(q)}`
  });
  
  res.render('blog/search', {
    title: `搜索: ${q}`,
    posts,
    query: q,
    pagination,
    ...seoMeta
  });
});

/**
 * API搜索接口
 */
exports.search = apiAsyncHandler(async (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    return sendError(res, '请提供搜索关键词', 400);
  }
  
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  // 使用仓库搜索文章
  const { posts, total } = await postRepository.getPaginatedPosts({
    status: 'published',
    search: q,
    page,
    limit
  });
  
  // 创建分页
  const pagination = createPagination(page, limit, total);
  
  // 返回搜索结果
  sendSuccess(res, {
    query: q,
    posts,
    pagination
  });
});

/**
 * 搜索主题接口
 */
exports.searchTopics = apiAsyncHandler(async (req, res) => {
  const { q } = req.query;
  const userId = req.user ? req.user._id : null;
  
  if (!q) {
    return sendError(res, '请提供搜索关键词', 400);
  }
  
  // 使用仓库搜索主题
  const topics = await topicRepository.getUserTopics(userId, {
    status: 'active',
    search: q
  });
  
  // 返回搜索结果
  sendSuccess(res, {
    query: q,
    topics
  });
}); 