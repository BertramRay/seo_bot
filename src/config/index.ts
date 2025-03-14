import dotenv from 'dotenv';
import authConfig from './auth';
import { Config } from '../types';

dotenv.config();

// 根据环境确定数据库名称
function getDatabaseName(): string {
  const env = process.env.NODE_ENV || 'development';
  const baseDbName = process.env.DB_NAME || 'seo_bot';
  
  switch (env) {
    case 'production':
      return `${baseDbName}_prod`;
    case 'test':
      return `${baseDbName}_test`;
    case 'staging':
      return `${baseDbName}_staging`;
    default:
      return `${baseDbName}_dev`;
  }
}

// 构建MongoDB URI
function buildMongoUri(): string {
  const baseUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  
  // 检查URI是否已经包含数据库名称
  if (baseUri.includes('?')) {
    // URI包含查询参数
    const [uri, params] = baseUri.split('?');
    if (uri.split('/').length > 3) {
      // URI已经包含数据库名称，直接返回
      return baseUri;
    }
    // URI不包含数据库名称，添加数据库名称
    return `${uri}/${getDatabaseName()}?${params}`;
  } else {
    // URI不包含查询参数
    if (baseUri.split('/').length > 3) {
      // URI已经包含数据库名称，直接返回
      return baseUri;
    }
    // URI不包含数据库名称，添加数据库名称
    return `${baseUri}/${getDatabaseName()}`;
  }
}

const config: Config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    env: process.env.NODE_ENV || 'development',
  },
  database: {
    uri: buildMongoUri(),
    name: getDatabaseName(),
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o',
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
    autoPublish: process.env.CONTENT_AUTO_PUBLISH === 'true' || process.env.CONTENT_AUTO_PUBLISH === '1',
    customCronExpression: process.env.CUSTOM_CRON_EXPRESSION || '0 3 * * *',
  },
  seo: {
    defaultKeywords: (process.env.DEFAULT_KEYWORDS || '').split(',').filter(Boolean),
    language: process.env.LANGUAGE || 'zh-CN',
    generateSitemap: process.env.GENERATE_SITEMAP === 'true',
    sitemapFrequency: process.env.SITEMAP_UPDATE_FREQUENCY || 'daily',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  auth: authConfig,
  // 域名相关配置
  domain: {
    baseDomain: process.env.BASE_DOMAIN || 'bertyblog.link',
    railwayDomain: process.env.RAILWAY_DOMAIN || 'railway.app',
    verificationInterval: parseInt(process.env.DOMAIN_VERIFICATION_INTERVAL || '30', 10), // 分钟
    maxVerificationRetries: parseInt(process.env.MAX_VERIFICATION_RETRIES || '5', 10),
    dnsProvider: process.env.DNS_PROVIDER || 'cloudflare',
  }
};

export default config; 