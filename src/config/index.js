require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/seo_bot',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  blog: {
    title: process.env.BLOG_TITLE || '我的SEO博客',
    description: process.env.BLOG_DESCRIPTION || '自动生成的高质量SEO博客内容',
    siteUrl: process.env.SITE_URL || 'https://yourdomain.com',
    blogPath: process.env.BLOG_PATH || '/blog',
  },
  content: {
    frequency: process.env.CONTENT_GENERATION_FREQUENCY || 'daily',
    postsPerBatch: parseInt(process.env.POSTS_PER_BATCH || '5', 10),
    minWordsPerPost: parseInt(process.env.MIN_WORDS_PER_POST || '800', 10),
    maxWordsPerPost: parseInt(process.env.MAX_WORDS_PER_POST || '1500', 10),
    autoPublish: process.env.CONTENT_AUTO_PUBLISH === 'true' || process.env.CONTENT_AUTO_PUBLISH === true || true,
    customCronExpression: process.env.CUSTOM_CRON_EXPRESSION || '0 3 * * *',
  },
  seo: {
    defaultKeywords: (process.env.DEFAULT_KEYWORDS || '').split(','),
    language: process.env.LANGUAGE || 'zh-CN',
    generateSitemap: process.env.GENERATE_SITEMAP === 'true',
    sitemapFrequency: process.env.SITEMAP_UPDATE_FREQUENCY || 'daily',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
}; 