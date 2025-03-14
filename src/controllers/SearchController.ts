import { Request, Response } from 'express';
import { asyncHandler } from '../utils/controllerUtils';
import { sendSuccess, sendError } from '../utils/responseUtils';
import { createPagination } from '../utils/pagination';
import { CustomRequest } from '../types';
import { getSeoMeta } from '../utils/configUtils';
import * as postRepository from '../repositories/PostRepository';
import * as topicRepository from '../repositories/TopicRepository';

/**
 * 博客内容搜索页面
 */
export const searchPage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const q = req.query.q as string | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  
  // 如果没有提供搜索关键词，显示空结果页面
  if (!q) {
    const seoMeta = getSeoMeta({
      title: '搜索',
      description: '在博客中搜索内容',
      path: '/search'
    });
    
    return res.render('blog/search', {
      title: '搜索',
      posts: [],
      query: '',
      pagination: createPagination(1, limit, 0),
      ...seoMeta
    });
  }
  
  // 使用仓库搜索文章
  const { posts, total } = await postRepository.getPaginatedPosts({
    status: 'published',
    // @ts-ignore - 忽略类型不兼容错误
    search: q,
    page,
    limit
  });
  
  // 创建分页
  const pagination = createPagination(page, limit, total);
  
  // 获取SEO元数据
  const seoMeta = getSeoMeta({
    title: `搜索: ${q}`,
    description: `搜索 "${q}" 的结果`,
    path: `/search?q=${encodeURIComponent(q)}`
  });
  
  res.render('blog/search', {
    title: `搜索: ${q}`,
    posts,
    query: q,
    pagination,
    ...seoMeta
  });
});

/**
 * API搜索接口
 */
export const search = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const q = req.query.q as string | undefined;
  
  if (!q) {
    return sendError(res, '请提供搜索关键词', 400);
  }
  
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  
  // 使用仓库搜索文章
  const { posts, total } = await postRepository.getPaginatedPosts({
    status: 'published',
    // @ts-ignore - 忽略类型不兼容错误
    search: q,
    page,
    limit
  });
  
  // 创建分页
  const pagination = createPagination(page, limit, total);
  
  // 返回搜索结果
  sendSuccess(res, {
    query: q,
    posts,
    pagination
  });
});

/**
 * 搜索主题接口
 */
export const searchTopics = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  const q = req.query.q as string | undefined;
  const userId = req.user ? req.user._id : null;
  
  if (!q) {
    return sendError(res, '请提供搜索关键词', 400);
  }
  
  // 使用仓库搜索主题
  const topics = await topicRepository.getUserTopics(userId, {
    status: 'active',
    // @ts-ignore - 忽略类型不兼容错误
    search: q
  });
  
  // 返回搜索结果
  sendSuccess(res, {
    query: q,
    topics
  });
}); 