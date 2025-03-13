const config = require('../config');

/**
 * 获取博客相关配置
 * @returns {Object} 博客配置
 */
exports.getBlogConfig = () => {
  return config.blog;
};

/**
 * 获取博客标题
 * @returns {string} 博客标题
 */
exports.getBlogTitle = () => {
  return config.blog.title;
};

/**
 * 获取博客描述
 * @returns {string} 博客描述
 */
exports.getBlogDescription = () => {
  return config.blog.description;
};

/**
 * 获取博客完整URL
 * @param {string} path - URL路径
 * @returns {string} 完整URL
 */
exports.getBlogUrl = (path = '') => {
  return `${config.blog.siteUrl}${config.blog.blogPath}${path}`;
};

/**
 * 获取SEO元信息
 * @param {Object} options - 选项
 * @param {string} options.title - 页面标题
 * @param {string} options.description - 页面描述
 * @param {string} options.path - URL路径
 * @param {Array|string} options.keywords - 关键词数组或字符串
 * @returns {Object} SEO元信息
 */
exports.getSeoMeta = (options = {}) => {
  const blogTitle = config.blog.title;
  const blogDescription = config.blog.description;
  const defaultKeywords = config.blog.keywords || [];
  
  const title = options.title ? `${options.title} - ${blogTitle}` : blogTitle;
  const description = options.description || blogDescription;
  const canonicalUrl = exports.getBlogUrl(options.path || '');
  
  // 处理关键词
  let keywords = '';
  if (options.keywords) {
    // 如果提供了关键词，使用提供的关键词
    keywords = Array.isArray(options.keywords) 
      ? options.keywords.join(', ') 
      : options.keywords;
  } else if (defaultKeywords.length > 0) {
    // 否则使用默认关键词
    keywords = Array.isArray(defaultKeywords) 
      ? defaultKeywords.join(', ') 
      : defaultKeywords;
  }
  
  return {
    metaTitle: title,
    metaDescription: description,
    keywords,
    canonicalUrl,
  };
}; 