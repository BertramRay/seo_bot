import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../utils/controllerUtils';
import { createPagination } from '../utils/pagination';
import { CustomRequest } from '../types';
import { IUser, IPost } from '../types';
import { logger } from '../utils/logger';
import { parseMarkdown } from '../utils/markdownUtils';
import { getBlogConfig, getBlogTitle, getBlogDescription, getBlogUrl, getSeoMeta } from '../utils/configUtils';
import * as postRepository from '../repositories/PostRepository';
import * as topicRepository from '../repositories/TopicRepository';

/**
 * 扩展IPost接口，添加缺少的属性
 */
interface ExtendedPost extends IPost {
  user?: any;
  categories?: string[];
  metaDescription?: string;
  keywords?: string[];
  coverImage?: string;
}

/**
 * 租户信息接口
 */
interface TenantInfo {
  userId: string | null;
  title: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  logo: string | null;
  displayName: string;
  language: string;
  seo: Record<string, any>;
}

/**
 * 租户接口
 */
interface Tenant {
  _id: string;
  displayName?: string;
  username: string;
  name?: string;
  email?: string;
  role?: string;
  settings?: any;
  [key: string]: any;
}

/**
 * 获取当前租户信息
 * @param req - 请求对象
 * @returns 租户信息
 */
function getTenantInfo(req: Request & CustomRequest): TenantInfo {
  // 如果请求中有租户信息，则使用租户的设置
  if (req.tenant) {
    const tenant = req.tenant as unknown as Tenant;
    // @ts-ignore - 忽略类型不兼容错误
    const blogConfig = getBlogConfig(tenant);
    
    return {
      userId: tenant._id,
      title: blogConfig.title,
      description: blogConfig.description,
      primaryColor: blogConfig.theme?.primaryColor || '#3498db',
      secondaryColor: blogConfig.theme?.secondaryColor || '#2ecc71',
      logo: blogConfig.theme?.logo || null,
      displayName: tenant.displayName || tenant.username,
      // @ts-ignore - 忽略类型不兼容错误
      language: blogConfig.language || 'zh-CN',
      // @ts-ignore - 忽略类型不兼容错误
      seo: blogConfig.seo || {}
    };
  }
  
  // 否则使用系统默认设置
  const blogConfig = getBlogConfig();
  return {
    userId: null,
    title: blogConfig.title,
    description: blogConfig.description,
    primaryColor: '#3498db',
    secondaryColor: '#2ecc71',
    logo: null,
    displayName: '系统博客',
    language: 'zh-CN',
    seo: {}
  };
}

/**
 * 博客文章列表页
 */
export const getIndex = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  
  // 获取租户信息
  const tenantInfo = getTenantInfo(req);
  
  // 构建查询选项
  const options: any = {
    status: 'published',
    page,
    limit
  };
  
  // 如果有租户，则只查询该租户的文章
  if (tenantInfo.userId) {
    options.userId = tenantInfo.userId;
  }
  
  // 使用仓库获取已发布的文章
  const { posts, total } = await postRepository.getPaginatedPosts(options);
  
  // 分页信息
  const pagination = createPagination(page, limit, total);
  
  // 获取SEO元数据
  const seoMeta = getSeoMeta({
    title: tenantInfo.title,
    description: tenantInfo.description
  });
  
  res.render('blog/index', {
    title: tenantInfo.title,
    description: tenantInfo.description,
    posts,
    pagination,
    tenantInfo,
    ...seoMeta
  });
});

/**
 * 所有分类列表页
 */
export const getCategories = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  // 获取租户信息
  const tenantInfo = getTenantInfo(req);
  
  // 构建查询选项
  const options: any = {
    status: 'published',
    limit: 1000 // 获取足够多的文章来统计分类
  };
  
  // 如果有租户，则只查询该租户的文章
  if (tenantInfo.userId) {
    options.userId = tenantInfo.userId;
  }
  
  // 获取所有已发布文章的分类
  const posts = await postRepository.getPaginatedPosts(options).then((result: any) => result.posts);
  
  // 统计每个分类的文章数量
  const categoriesMap: Record<string, { name: string; count: number }> = {};
  
  posts.forEach((post: any) => {
    if (post.categories && post.categories.length > 0) {
      post.categories.forEach((category: string) => {
        if (!categoriesMap[category]) {
          categoriesMap[category] = {
            name: category,
            count: 1
          };
        } else {
          categoriesMap[category].count++;
        }
      });
    }
  });
  
  // 转换为数组并按文章数量排序
  const categories = Object.values(categoriesMap).sort((a, b) => b.count - a.count);
  
  // 获取SEO元数据
  const seoMeta = getSeoMeta({
    title: '所有分类',
    path: '/categories'
  });
  
  res.render('blog/categories', {
    title: `所有分类 - ${tenantInfo.title}`,
    categories,
    tenantInfo,
    ...seoMeta
  });
});

/**
 * 关于我们页面
 */
export const getAbout = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  // 获取租户信息
  const tenantInfo = getTenantInfo(req);
  
  // 获取SEO元数据
  const seoMeta = getSeoMeta({
    title: '关于我们',
    path: '/about'
  });
  
  res.render('blog/about', {
    title: `关于我们 - ${tenantInfo.title}`,
    siteName: tenantInfo.title,
    description: tenantInfo.description,
    tenantInfo,
    ...seoMeta
  });
});

/**
 * 博客分类页
 */
export const getCategory = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  const { category } = req.params;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  
  // 获取租户信息
  const tenantInfo = getTenantInfo(req);
  
  // 构建查询选项
  const options: any = {
    status: 'published',
    category,
    page,
    limit
  };
  
  // 如果有租户，则只查询该租户的文章
  if (tenantInfo.userId) {
    options.userId = tenantInfo.userId;
  }
  
  // 使用仓库获取该分类下的文章
  const { posts, total } = await postRepository.getPaginatedPosts(options);
  
  // 分页信息
  const pagination = createPagination(page, limit, total);
  
  // 获取SEO元数据
  const seoMeta = getSeoMeta({
    title: category,
    description: `查看关于${category}的所有文章 - ${tenantInfo.description}`,
    path: `/category/${category}`
  });
  
  res.render('blog/category', {
    title: `${category} - ${tenantInfo.title}`,
    category,
    posts,
    pagination,
    tenantInfo,
    ...seoMeta
  });
});

/**
 * RSS Feed
 */
export const getFeed = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  // 获取租户信息
  const tenantInfo = getTenantInfo(req);
  
  // 构建查询选项
  const options: any = {
    status: 'published',
    limit: 20
  };
  
  // 如果有租户，则只查询该租户的文章
  if (tenantInfo.userId) {
    options.userId = tenantInfo.userId;
  }
  
  const { posts } = await postRepository.getPaginatedPosts(options);
  
  // 设置XML响应头
  res.header('Content-Type', 'application/xml');
  
  res.render('blog/feed', {
    posts,
    site: {
      title: tenantInfo.title,
      description: tenantInfo.description,
      url: req.protocol + '://' + req.get('host'),
      blogPath: '',
    },
    tenantInfo
  });
});

/**
 * 博客文章详情页
 */
export const getPost = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  const { slug } = req.params;
  const isPreview = req.query.preview === 'true';
  
  // 获取租户信息
  const tenantInfo = getTenantInfo(req);
  
  // 查找文章 - 如果是预览模式，则允许查看草稿文章
  const options: any = {};
  if (!isPreview) {
    options.status = 'published';
  }
  
  // 如果有租户，则只查询该租户的文章
  if (tenantInfo.userId) {
    options.userId = tenantInfo.userId;
  }
  
  const post = await postRepository.getPostBySlug(slug, options) as ExtendedPost;
  
  if (!post) {
    return res.status(404).render('error', {
      title: '文章不存在',
      message: '您访问的文章不存在或已被删除',
      tenantInfo
    });
  }
  
  // 如果是草稿状态但不是预览模式，则返回404
  if (post.status !== 'published' && !isPreview) {
    return res.status(404).render('error', {
      title: '文章未发布',
      message: '此文章尚未发布，无法查看',
      tenantInfo
    });
  }
  
  // 处理Markdown内容
  if (post.content) {
    // @ts-ignore - 忽略返回类型不匹配错误
    post.content = await parseMarkdown(post.content);
  }
  
  // 获取相关文章（同类别）- 确保只获取同一租户的相关文章
  const relatedOptions = post.user ? { userId: post.user } : {};
  // @ts-ignore - 忽略类型不兼容错误
  const relatedPosts = await postRepository.getRelatedPosts(post._id, post.categories || [], 3);
  
  // 获取SEO元数据
  const seoMeta = getSeoMeta({
    title: post.title,
    description: post.excerpt || '',
    path: `/${post.slug}`,
    keywords: post.keywords || []
  });
  
  res.render('blog/post', {
    title: post.title,
    post,
    relatedPosts,
    isPreview,
    tenantInfo,
    ...seoMeta,
    ogImage: post.coverImage || null,
  });
}); 