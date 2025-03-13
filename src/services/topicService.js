const Topic = require('../models/Topic');
const Post = require('../models/Post');
const { logger } = require('../utils/logger');

/**
 * 处理主题创建
 * @param {Object} topicData - 主题数据
 * @param {Object} user - 用户对象
 * @returns {Promise<Object>} - 创建的主题
 */
exports.createTopic = async (topicData, user) => {
  const { name, description, keywords, categories, status, priority, promptTemplate } = topicData;
  
  // 检查名称是否存在
  if (!name || name.trim() === '') {
    throw new Error('主题名称不能为空');
  }
  
  // 处理关键词和分类，将逗号分隔的字符串转为数组
  const keywordsArray = keywords && keywords.trim() !== '' 
    ? (Array.isArray(keywords) ? keywords : keywords.split(',').map(k => k.trim()).filter(k => k !== ''))
    : [];
    
  const categoriesArray = categories && categories.trim() !== ''
    ? (Array.isArray(categories) ? categories : categories.split(',').map(c => c.trim()).filter(c => c !== ''))
    : [];
  
  // 创建新主题
  return await Topic.create({
    name,
    description: description || '',
    keywords: keywordsArray,
    categories: categoriesArray,
    status: status || 'active',
    priority: Number(priority) || 0,
    promptTemplate: promptTemplate || '',
    user: user._id
  });
};

/**
 * 更新主题
 * @param {string} id - 主题ID
 * @param {Object} topicData - 主题数据
 * @returns {Promise<Object>} - 更新后的主题
 */
exports.updateTopic = async (id, topicData) => {
  const { name, description, keywords, categories, status, priority, promptTemplate } = topicData;
  
  // 检查名称是否存在
  if (!name || name.trim() === '') {
    throw new Error('主题名称不能为空');
  }
  
  // 处理关键词和分类，将逗号分隔的字符串转为数组
  const keywordsArray = keywords && keywords.trim() !== '' 
    ? (Array.isArray(keywords) ? keywords : keywords.split(',').map(k => k.trim()).filter(k => k !== ''))
    : [];
    
  const categoriesArray = categories && categories.trim() !== ''
    ? (Array.isArray(categories) ? categories : categories.split(',').map(c => c.trim()).filter(c => c !== ''))
    : [];
  
  // 更新主题
  const updatedTopic = await Topic.findByIdAndUpdate(
    id,
    {
      name,
      description,
      keywords: keywordsArray,
      categories: categoriesArray,
      status: status || 'active',
      priority: Number(priority) || 0,
      promptTemplate: promptTemplate || ''
    },
    { new: true }
  );
  
  if (!updatedTopic) {
    throw new Error('主题不存在');
  }
  
  return updatedTopic;
};

/**
 * 删除主题
 * @param {string} id - 主题ID
 * @returns {Promise<void>}
 */
exports.deleteTopic = async (id) => {
  // 查找主题
  const topic = await Topic.findById(id);
  
  if (!topic) {
    throw new Error('主题不存在');
  }
  
  // 删除主题
  await Topic.findByIdAndDelete(id);
  
  // 更新相关文章，将主题设为null
  await Post.updateMany(
    { topic: id },
    { $set: { topic: null } }
  );
  
  logger.info(`已删除主题: ${topic.name} (ID: ${id})`);
}; 