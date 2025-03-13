const Topic = require('../models/Topic');
const Post = require('../models/Post');

/**
 * 构建主题查询条件
 * @param {string} userId - 用户ID
 * @param {Object} options - 选项
 * @returns {Object} - 查询条件
 */
const buildTopicQuery = (userId, options = {}) => {
  const query = { user: userId };
  
  // 状态过滤
  if (options.status) {
    query.status = options.status;
  }
  
  // 搜索功能
  if (options.search) {
    const search = options.search;
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { keywords: { $regex: search, $options: 'i' } },
      { categories: { $regex: search, $options: 'i' } }
    ];
  }
  
  return query;
}

/**
 * 获取用户的所有主题
 * @param {string} userId - 用户ID
 * @param {Object} options - 选项
 * @param {string} options.status - 主题状态过滤
 * @param {string} options.search - 搜索关键词
 * @param {string} options.sortBy - 排序字段
 * @param {number} options.sortOrder - 排序方向 (1为升序，-1为降序)
 * @returns {Promise<Array>} - 主题数组
 */
exports.getUserTopics = async (userId, options = {}) => {
  const { status, sortBy = 'priority', sortOrder = -1, search } = options;
  
  // 构建查询
  const query = buildTopicQuery(userId, { status, search });
  
  // 构建排序
  const sort = {};
  sort[sortBy] = sortOrder;
  
  // 如果排序字段是name，添加第二排序字段
  if (sortBy === 'name') {
    sort.priority = -1;
  } else if (sortBy === 'priority') {
    sort.name = 1;
  }
  
  return await Topic.find(query).sort(sort);
};

/**
 * 获取主题详情及文章数量
 * @param {string} userId - 用户ID
 * @param {Object} options - 查询选项
 * @returns {Promise<Array>} - 主题数组，包含文章数量
 */
exports.getTopicsWithPostCount = async (userId, options = {}) => {
  const topics = await exports.getUserTopics(userId, options);
  
  // 为每个主题添加文章数量
  const topicsWithCount = await Promise.all(topics.map(async (topic) => {
    const postCount = await Post.countDocuments({ 
      topic: topic._id, 
      user: userId
    });
    
    // 将文章数量添加到主题对象中
    const topicObj = topic.toObject();
    topicObj.postCount = postCount;
    return topicObj;
  }));
  
  return topicsWithCount;
};

/**
 * 根据ID获取主题
 * @param {string} id - 主题ID
 * @returns {Promise<Object>} - 主题对象
 */
exports.getTopicById = async (id) => {
  return await Topic.findById(id);
};

/**
 * 获取主题相关的文章
 * @param {string} topicId - 主题ID
 * @param {number} limit - 限制数量
 * @returns {Promise<Array>} - 文章数组
 */
exports.getTopicPosts = async (topicId, limit = 5) => {
  return await Post.find({ topic: topicId })
    .sort({ createdAt: -1 })
    .limit(limit);
}; 