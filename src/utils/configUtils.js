const config = require('../config');

/**
 * 获取博客相关配置
 * @param {Object} user - 用户对象（可选）
 * @returns {Object} 博客配置
 */
exports.getBlogConfig = (user = null) => {
  // 如果提供了用户，则从用户记录中获取配置
  if (user && user.settings && user.settings.blog) {
    const blogSettings = user.settings.blog;
    
    // 构建用户特定的配置
    return {
      title: blogSettings.title || '我的SEO博客',
      description: blogSettings.description || '自动生成的高质量SEO博客内容',
      siteUrl: user.customDomain ? `https://${user.customDomain}` : 
               user.subdomain ? `https://${user.subdomain}.${config.domain.baseDomain}` : 
               config.blog.siteUrl,
      blogPath: '/',
      language: blogSettings.language || 'zh-CN',
      contactEmail: blogSettings.contactEmail || user.email,
      // 内容生成设置
      content: {
        model: blogSettings.content?.model || 'gpt-4o-mini',
        minWordsPerPost: blogSettings.content?.minWordsPerPost || 800,
        maxWordsPerPost: blogSettings.content?.maxWordsPerPost || 1500,
        autoPublish: blogSettings.content?.autoPublish || false,
        enableFeaturedImages: blogSettings.content?.enableFeaturedImages || true,
      },
      // SEO设置
      seo: {
        metaTitle: blogSettings.seo?.metaTitle || '',
        metaDescription: blogSettings.seo?.metaDescription || '',
        generateSitemap: blogSettings.seo?.generateSitemap || true,
        enableCanonical: blogSettings.seo?.enableCanonical || true,
        robotsTxt: blogSettings.seo?.robotsTxt || '',
      },
      // 自动发布设置
      schedule: {
        enableScheduledGeneration: blogSettings.schedule?.enableScheduledGeneration || false,
        generationCronExpression: blogSettings.schedule?.generationCronExpression || '0 3 * * *',
        postsPerScheduledRun: blogSettings.schedule?.postsPerScheduledRun || 1,
      },
      // 主题设置
      theme: {
        primaryColor: blogSettings.primaryColor || '#3498db',
        secondaryColor: blogSettings.secondaryColor || '#2ecc71',
        logo: blogSettings.logo || null,
      }
    };
  }
  
  // 否则返回系统默认配置
  return config.blog;
};

/**
 * 获取博客标题
 * @param {Object} user - 用户对象（可选）
 * @returns {string} 博客标题
 */
exports.getBlogTitle = (user = null) => {
  if (user && user.settings && user.settings.blog && user.settings.blog.title) {
    return user.settings.blog.title;
  }
  return config.blog.title;
};

/**
 * 获取博客描述
 * @param {Object} user - 用户对象（可选）
 * @returns {string} 博客描述
 */
exports.getBlogDescription = (user = null) => {
  if (user && user.settings && user.settings.blog && user.settings.blog.description) {
    return user.settings.blog.description;
  }
  return config.blog.description;
};

/**
 * 获取博客完整URL
 * @param {string} path - URL路径
 * @param {Object} user - 用户对象（可选）
 * @returns {string} 完整URL
 */
exports.getBlogUrl = (path = '', user = null) => {
  if (user) {
    const baseUrl = user.customDomain ? `https://${user.customDomain}` : 
                    user.subdomain ? `https://${user.subdomain}.${config.domain.baseDomain}` : 
                    config.blog.siteUrl;
    return `${baseUrl}${path}`;
  }
  return `${config.blog.siteUrl}${config.blog.blogPath}${path}`;
};

/**
 * 获取内容生成配置
 * @param {Object} user - 用户对象（可选）
 * @returns {Object} 内容生成配置
 */
exports.getContentConfig = (user = null) => {
  if (user && user.settings && user.settings.blog && user.settings.blog.content) {
    const contentSettings = user.settings.blog.content;
    return {
      model: contentSettings.model || 'gpt-4o',
      minWordsPerPost: contentSettings.minWordsPerPost || 800,
      maxWordsPerPost: contentSettings.maxWordsPerPost || 1500,
      autoPublish: contentSettings.autoPublish || false,
      enableFeaturedImages: contentSettings.enableFeaturedImages || true,
    };
  }
  return config.content;
};

/**
 * 获取SEO配置
 * @param {Object} user - 用户对象（可选）
 * @returns {Object} SEO配置
 */
exports.getSeoConfig = (user = null) => {
  if (user && user.settings && user.settings.blog && user.settings.blog.seo) {
    const seoSettings = user.settings.blog.seo;
    return {
      metaTitle: seoSettings.metaTitle || '',
      metaDescription: seoSettings.metaDescription || '',
      generateSitemap: seoSettings.generateSitemap || true,
      enableCanonical: seoSettings.enableCanonical || true,
      robotsTxt: seoSettings.robotsTxt || '',
      language: user.settings.blog.language || 'zh-CN',
    };
  }
  return config.seo;
};

/**
 * 获取自动发布配置
 * @param {Object} user - 用户对象（可选）
 * @returns {Object} 自动发布配置
 */
exports.getScheduleConfig = (user = null) => {
  if (user && user.settings && user.settings.blog && user.settings.blog.schedule) {
    const scheduleSettings = user.settings.blog.schedule;
    return {
      enableScheduledGeneration: scheduleSettings.enableScheduledGeneration || false,
      generationCronExpression: scheduleSettings.generationCronExpression || '0 3 * * *',
      postsPerScheduledRun: scheduleSettings.postsPerScheduledRun || 1,
    };
  }
  return {
    frequency: config.content.frequency,
    customCronExpression: config.content.customCronExpression,
    postsPerBatch: config.content.postsPerBatch,
  };
};

/**
 * 获取SEO元信息
 * @param {Object} options - 选项
 * @param {string} options.title - 页面标题
 * @param {string} options.description - 页面描述
 * @param {string} options.path - URL路径
 * @param {Array|string} options.keywords - 关键词数组或字符串
 * @param {Object} user - 用户对象（可选）
 * @returns {Object} SEO元信息
 */
exports.getSeoMeta = (options = {}, user = null) => {
  const blogTitle = exports.getBlogTitle(user);
  const blogDescription = exports.getBlogDescription(user);
  const defaultKeywords = config.seo.defaultKeywords || [];
  
  const title = options.title ? `${options.title} - ${blogTitle}` : blogTitle;
  const description = options.description || blogDescription;
  const canonicalUrl = exports.getBlogUrl(options.path || '', user);
  
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