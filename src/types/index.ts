import { Document } from 'mongoose';
import { Session } from 'express-session';

// 扩展Session类型
declare module 'express-session' {
  interface Session {
    returnTo?: string;
  }
}

// 自定义请求接口
export interface CustomRequest {
  user?: any;
  flash?: any;
  tenant?: string;
}

// API响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string | Error;
}

// 分页结果接口
export interface PaginationResult<T = any> {
  data: T[];
  page: number;
  limit: number;
  totalPages: number;
  total: number;
}

// 用户接口
export interface IUser extends Document {
  email: string;
  name: string;
  username: string;
  displayName?: string;
  role: 'admin' | 'user';
  githubId?: string;
  avatar?: string;
  profilePicture?: string;
  isActive?: boolean;
  subdomain?: string;
  customDomain?: string;
  domainStatus?: 'pending' | 'active' | 'failed' | 'inactive';
  domainVerifiedAt?: Date;
  sslStatus?: 'pending' | 'active' | 'failed' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  _id: string;
  settings: {
    blog?: {
      title?: string;
      description?: string;
      language?: string;
      postsPerPage?: number;
      showAuthor?: boolean;
      showDate?: boolean;
      showSocialShare?: boolean;
      schedule?: {
        postsPerScheduledRun?: number;
      };
      seo?: {
        generateSitemap?: boolean;
      };
    };
    seo?: {
      defaultTitle?: string;
      defaultDescription?: string;
      defaultKeywords?: string[];
      useSitemaps?: boolean;
      useRobotsTxt?: boolean;
      useStructuredData?: boolean;
      useCanonicalUrls?: boolean;
    };
    content?: {
      autoGenerate?: boolean;
      frequency?: string;
      postsPerBatch?: number;
      minWordsPerPost?: number;
      maxWordsPerPost?: number;
      autoPublish?: boolean;
      customCronExpression?: string;
    };
    domain?: {
      customDomain?: string;
      useCustomDomain?: boolean;
      verificationStatus?: 'pending' | 'verified' | 'failed';
      lastVerified?: Date;
    };
  };
}

// 文章接口
export interface IPost extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  author: string | IUser;
  topics: string[] | ITopic[];
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
    focusKeyword?: string;
    canonicalUrl?: string;
    structuredData?: any;
  };
  readingTime?: number;
  viewCount?: number;
}

// 主题接口
export interface ITopic extends Document {
  name: string;
  slug: string;
  description?: string;
  parent?: string | ITopic;
  createdAt: Date;
  updatedAt: Date;
  keywords?: string[];
  categories?: string[];
  status?: 'active' | 'inactive' | 'archived';
  priority?: number;
  promptTemplate?: string;
  postsGenerated?: number;
  user?: string | IUser;
  _id: string;
  seo: {
    title?: string;
    description?: string;
    keywords?: string[];
    focusKeyword?: string;
  };
  postCount?: number;
}

// 生成历史接口
export interface IGenerationHistory extends Document {
  date: Date;
  requestedCount: number;
  successCount: number;
  status: 'processing' | 'completed' | 'failed';
  error?: string;
  topics: string[] | ITopic[];
  posts: string[] | IPost[];
  user: string | IUser;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// 配置接口
export interface Config {
  server: {
    port: number;
    env: string;
  };
  database: {
    uri: string;
    name: string;
  };
  openai: {
    apiKey?: string;
    model: string;
  };
  blog: {
    title: string;
    description: string;
    siteUrl: string;
    blogPath: string;
  };
  content: {
    frequency: string;
    postsPerBatch: number;
    minWordsPerPost: number;
    maxWordsPerPost: number;
    autoPublish: boolean;
    customCronExpression: string;
  };
  seo: {
    defaultKeywords: string[];
    language: string;
    generateSitemap: boolean;
    sitemapFrequency: string;
  };
  logging: {
    level: string;
  };
  auth: {
    github?: {
      clientID?: string;
      clientSecret?: string;
      callbackURL: string;
    };
    session: {
      secret: string;
      resave: boolean;
      saveUninitialized: boolean;
      cookie: {
        secure: boolean;
        maxAge: number;
      }
    }
  };
  domain: {
    baseDomain: string;
    railwayDomain: string;
    verificationInterval: number;
    maxVerificationRetries: number;
    dnsProvider: string;
  };
} 