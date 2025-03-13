const Post = require('../models/Post');
const { paginateQuery } = require('../utils/pagination');

/**
 * 构建通用查询条件
 * @param {Object} options - 查询选项
 * @returns {Object} - 查询条件对象
 */
const buildQuery = (options = {}) => {
  const query = {};
  
  // 处理状态过滤
  if (options.status && options.status !== 'all') {
    query.status = options.status;
  }
  
  // 处理用户过滤
  if (options.userId) {
    query.user = options.userId;
  }
  
  // 处理分类过滤
  if (options.category) {
    query.categories = options.category;
  }
  
  // 处理关键词过滤
  if (options.keyword) {
    query.keywords = options.keyword;
  }
  
  // 处理日期过滤
  if (options.publishedAfter) {
    query.publishedAt = { $gte: options.publishedAfter };
  }
  
  if (options.publishedBefore) {
    if (query.publishedAt) {
      query.publishedAt.$lte = options.publishedBefore;
    } else {
      query.publishedAt = { $lte: options.publishedBefore };
    }
  }
  
  // 处理搜索
  if (options.search) {
    // 使用MongoDB的全文搜索功能
    query.$text = { $search: options.search };
  }
  
  return query;
};

/**
 * 获取分页后的文章列表
 * @param {Object} options - 查询选项
 * @param {string} options.status - 文章状态
 * @param {string} options.userId - 用户ID
 * @param {string} options.category - 分类
 * @param {string} options.keyword - 关键词
 * @param {string} options.search - 搜索关键词
 * @param {number} options.page - 页码
 * @param {number} options.limit - 每页数量
 * @param {string} options.sortBy - 排序字段
 * @param {number} options.sortOrder - 排序方向 (1为升序，-1为降序)
 * @returns {Promise<Object>} - 包含文章和分页信息的对象
 */
exports.getPaginatedPosts = async (options = {}) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'publishedAt',
    sortOrder = -1
  } = options;
  
  const query = buildQuery(options);
  
  // 构建排序
  const sort = {};
  
  // 如果是搜索查询，优先按相关性排序
  if (options.search) {
    sort.score = { $meta: "textScore" };
    // 添加第二排序条件
    sort[sortBy] = sortOrder;
  } else {
    // 非搜索查询，按指定字段排序
    sort[sortBy] = sortOrder;
  }
  
  // 创建查询并填充主题信息
  let postsQuery = Post.find(query);
  
  // 如果是搜索查询，添加相关性分数
  if (options.search) {
    postsQuery = postsQuery.select({ score: { $meta: "textScore" } });
  }
  
  // 应用排序
  postsQuery = postsQuery.sort(sort);
  
  // 应用分页
  const posts = await paginateQuery(postsQuery, page, limit);
  
  // 查询总数
  const total = await Post.countDocuments(query);
  
  return {
    posts,
    total
  };
};

/**
 * 统计文章数量
 * @param {Object} options - 查询选项
 * @returns {Promise<number>} - 文章数量
 */
exports.countPosts = async (options = {}) => {
  const query = buildQuery(options);
  return await Post.countDocuments(query);
};

/**
 * 根据ID获取文章
 * @param {string} id - 文章ID
 * @param {boolean} populateTopic - 是否填充主题信息
 * @returns {Promise<Object>} - 文章对象
 */
exports.getPostById = async (id, populateTopic = false) => {
  let query = Post.findById(id);
  
  if (populateTopic) {
    query = query.populate('topic');
  }
  
  return await query;
};

/**
 * 根据slug获取文章
 * @param {string} slug - 文章slug
 * @param {Object} options - 查询选项
 * @returns {Promise<Object>} - 文章对象
 */
exports.getPostBySlug = async (slug, options = {}) => {
  const query = { slug, ...buildQuery(options) };
  return await Post.findOne(query);
};

/**
 * 获取相关文章
 * @param {string} postId - 当前文章ID
 * @param {Array} categories - 分类数组
 * @param {number} limit - 限制数量
 * @returns {Promise<Array>} - 相关文章数组
 */
exports.getRelatedPosts = async (postId, categories, limit = 3) => {
  return await Post.find({
    _id: { $ne: postId },
    status: 'published',
    categories: { $in: categories },
  })
    .sort({ publishedAt: -1 })
    .limit(limit);
}; 