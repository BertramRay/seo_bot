const Post = require('../models/Post');
const { logger } = require('../utils/logger');

/**
 * 更新文章
 * @param {string} id - 文章ID
 * @param {Object} postData - 文章数据
 * @returns {Promise<Object>} - 更新后的文章
 */
exports.updatePost = async (id, postData) => {
  const { title, excerpt, content, keywords, categories, slug, status, metaTitle, metaDescription, save } = postData;
  
  // 构建更新对象
  const updateData = {
    title,
    excerpt,
    content,
    keywords: Array.isArray(keywords) ? keywords : (keywords || []),
    categories: Array.isArray(categories) ? categories : (categories || []),
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
  const updatedPost = await Post.findByIdAndUpdate(id, updateData, { new: true });
  
  if (!updatedPost) {
    throw new Error('文章不存在');
  }
  
  logger.info(`更新文章成功: ${updatedPost.title} (ID: ${id})`);
  
  return updatedPost;
};

/**
 * 发布文章
 * @param {string} id - 文章ID
 * @returns {Promise<Object>} - 发布后的文章
 */
exports.publishPost = async (id) => {
  const post = await Post.findByIdAndUpdate(id, {
    status: 'published',
    publishedAt: new Date(),
  }, { new: true });
  
  if (!post) {
    throw new Error('文章不存在');
  }
  
  logger.info(`文章已发布: ${post.title} (ID: ${id})`);
  
  return post;
};

/**
 * 取消发布文章
 * @param {string} id - 文章ID
 * @returns {Promise<Object>} - 取消发布后的文章
 */
exports.unpublishPost = async (id) => {
  const post = await Post.findByIdAndUpdate(id, {
    status: 'draft',
  }, { new: true });
  
  if (!post) {
    throw new Error('文章不存在');
  }
  
  logger.info(`文章已取消发布: ${post.title} (ID: ${id})`);
  
  return post;
};

/**
 * 删除文章
 * @param {string} id - 文章ID
 * @returns {Promise<Object>} - 删除后的文章
 */
exports.deletePost = async (id) => {
  // 使用软删除 - 将状态设为deleted
  const post = await Post.findByIdAndUpdate(id, {
    status: 'deleted',
  }, { new: true });
  
  if (!post) {
    throw new Error('文章不存在');
  }
  
  logger.info(`文章已删除: ${post.title} (ID: ${id})`);
  
  return post;
}; 