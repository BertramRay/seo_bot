import config from '../config';
import { IUser, Config } from '../types';

interface BlogSettings {
  title?: string;
  description?: string;
  language?: string;
  contactEmail?: string;
  primaryColor?: string;
  secondaryColor?: string;
  logo?: string | null;
  postsPerPage?: number;
  showAuthor?: boolean;
  showDate?: boolean;
  showSocialShare?: boolean;
}

interface BlogConfig {
  title: string;
  description: string;
  siteUrl: string;
  blogPath: string;
  language?: string;
  contactEmail?: string;
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    logo: string | null;
  };
}

interface ContentConfig {
  model?: string;
  frequency: string;
  postsPerBatch: number;
  minWordsPerPost: number;
  maxWordsPerPost: number;
  autoPublish: boolean;
  customCronExpression: string;
  enableFeaturedImages?: boolean;
}

interface SeoConfig {
  defaultKeywords: string[];
  language: string;
  generateSitemap: boolean;
  sitemapFrequency: string;
  metaTitle?: string;
  metaDescription?: string;
  enableCanonical?: boolean;
  robotsTxt?: string;
}

interface ScheduleConfig {
  frequency?: string;
  customCronExpression?: string;
  postsPerBatch?: number;
  enableScheduledGeneration?: boolean;
  generationCronExpression?: string;
  postsPerScheduledRun?: number;
}

interface SeoMetaOptions {
  title?: string;
  description?: string;
  path?: string;
  keywords?: string[] | string;
}

interface SeoMeta {
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  canonicalUrl: string;
}

/**
 * 获取博客相关配置
 * @param user - 用户对象（可选）
 * @returns 博客配置
 */
export const getBlogConfig = (user: IUser | null = null): BlogConfig => {
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
      contactEmail: user.email,
      theme: {
        primaryColor: '#3498db',
        secondaryColor: '#2ecc71',
        logo: null,
      }
    };
  }
  
  // 否则返回系统默认配置
  return {
    ...config.blog,
    language: 'zh-CN',
    contactEmail: '',
    theme: {
      primaryColor: '#3498db',
      secondaryColor: '#2ecc71',
      logo: null,
    }
  };
};

/**
 * 获取博客标题
 * @param user - 用户对象（可选）
 * @returns 博客标题
 */
export const getBlogTitle = (user: IUser | null = null): string => {
  if (user && user.settings && user.settings.blog && user.settings.blog.title) {
    return user.settings.blog.title;
  }
  return config.blog.title;
};

/**
 * 获取博客描述
 * @param user - 用户对象（可选）
 * @returns 博客描述
 */
export const getBlogDescription = (user: IUser | null = null): string => {
  if (user && user.settings && user.settings.blog && user.settings.blog.description) {
    return user.settings.blog.description;
  }
  return config.blog.description;
};

/**
 * 获取博客完整URL
 * @param path - URL路径
 * @param user - 用户对象（可选）
 * @returns 完整URL
 */
export const getBlogUrl = (path: string = '', user: IUser | null = null): string => {
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
 * @param user - 用户对象（可选）
 * @returns 内容生成配置
 */
export const getContentConfig = (user: IUser | null = null): ContentConfig => {
  if (user && user.settings && user.settings.content) {
    const contentSettings = user.settings.content;
    return {
      model: config.openai.model,
      frequency: contentSettings.frequency || config.content.frequency,
      postsPerBatch: contentSettings.postsPerBatch || config.content.postsPerBatch,
      minWordsPerPost: contentSettings.minWordsPerPost || config.content.minWordsPerPost,
      maxWordsPerPost: contentSettings.maxWordsPerPost || config.content.maxWordsPerPost,
      autoPublish: contentSettings.autoPublish || config.content.autoPublish,
      customCronExpression: contentSettings.customCronExpression || config.content.customCronExpression,
      enableFeaturedImages: true,
    };
  }
  return {
    ...config.content,
    model: config.openai.model,
    enableFeaturedImages: true,
  };
};

/**
 * 获取SEO配置
 * @param user - 用户对象（可选）
 * @returns SEO配置
 */
export const getSeoConfig = (user: IUser | null = null): SeoConfig => {
  if (user && user.settings && user.settings.seo) {
    const seoSettings = user.settings.seo;
    return {
      defaultKeywords: seoSettings.defaultKeywords || config.seo.defaultKeywords,
      language: user.settings.blog?.language || config.seo.language,
      generateSitemap: seoSettings.useSitemaps || config.seo.generateSitemap,
      sitemapFrequency: config.seo.sitemapFrequency,
      metaTitle: seoSettings.defaultTitle || '',
      metaDescription: seoSettings.defaultDescription || '',
      enableCanonical: seoSettings.useCanonicalUrls || true,
      robotsTxt: '',
    };
  }
  return {
    ...config.seo,
    metaTitle: '',
    metaDescription: '',
    enableCanonical: true,
    robotsTxt: '',
  };
};

/**
 * 获取自动发布配置
 * @param user - 用户对象（可选）
 * @returns 自动发布配置
 */
export const getScheduleConfig = (user: IUser | null = null): ScheduleConfig => {
  if (user && user.settings && user.settings.content) {
    const contentSettings = user.settings.content;
    return {
      frequency: contentSettings.frequency || config.content.frequency,
      customCronExpression: contentSettings.customCronExpression || config.content.customCronExpression,
      postsPerBatch: contentSettings.postsPerBatch || config.content.postsPerBatch,
      enableScheduledGeneration: contentSettings.autoGenerate || false,
      generationCronExpression: contentSettings.customCronExpression || '0 3 * * *',
      postsPerScheduledRun: contentSettings.postsPerBatch || 1
    };
  }
  return {
    frequency: config.content.frequency,
    customCronExpression: config.content.customCronExpression,
    postsPerBatch: config.content.postsPerBatch,
    enableScheduledGeneration: false,
    generationCronExpression: '0 3 * * *',
    postsPerScheduledRun: 1
  };
};

/**
 * 获取SEO元信息
 * @param options - 选项
 * @param user - 用户对象（可选）
 * @returns SEO元信息
 */
export const getSeoMeta = (options: SeoMetaOptions = {}, user: IUser | null = null): SeoMeta => {
  const blogTitle = getBlogTitle(user);
  const blogDescription = getBlogDescription(user);
  const defaultKeywords = config.seo.defaultKeywords || [];
  
  const title = options.title ? `${options.title} - ${blogTitle}` : blogTitle;
  const description = options.description || blogDescription;
  const canonicalUrl = getBlogUrl(options.path || '', user);
  
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