import { Request, Response } from 'express';
import { asyncHandler } from '../utils/controllerUtils';
import { sendSuccess, sendError } from '../utils/responseUtils';
import { createPagination } from '../utils/pagination';
import { CustomRequest, ApiResponse, ITopic } from '../types';
import { 
  generateAndPublishPosts, 
  generateContentForTopic, 
  getRecentGenerationHistory 
} from '../services/contentGenerator';
import { triggerSitemapGeneration } from '../services/scheduler';
import { logger } from '../utils/logger';
import * as postRepository from '../repositories/PostRepository';
import * as topicRepository from '../repositories/TopicRepository';
import * as postService from '../services/postService';
import * as topicService from '../services/topicService';
import { getBlogConfig as getBlogConfigUtil } from '../utils/configUtils';

/**
 * 健康检查
 */
export const health = (req: Request, res: Response): void => {
  sendSuccess(res, { timestamp: new Date() }, '系统正常');
};

/**
 * 获取博客文章列表
 */
export const getPosts = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string || 'published';
  
  // 构建查询选项
  const options: any = {
    status,
    page,
    limit
  };
  
  // 添加分类过滤
  if (req.query.category) {
    options.category = req.query.category;
  }
  
  // 添加关键词过滤
  if (req.query.keyword) {
    options.keyword = req.query.keyword;
  }
  
  // 添加搜索
  if (req.query.search) {
    options.search = req.query.search;
  }
  
  // 使用仓库获取分页文章
  const { posts, total } = await postRepository.getPaginatedPosts(options);
  
  // 分页信息
  const pagination = createPagination(page, limit, total);
  
  // 使用响应工具发送成功响应
  sendSuccess(res, {
    posts,
    pagination
  });
});

/**
 * 获取单篇文章
 */
export const getPost = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const post = await postRepository.getPostById(req.params.id, true);
  
  if (!post) {
    return sendError(res, '文章不存在', 404);
  }
  
  sendSuccess(res, { post });
});

/**
 * 获取主题列表
 */
export const getTopics = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  const userId = req.user ? req.user._id : null;
  const topics = await topicRepository.getTopicsWithPostCount(userId, {
    // @ts-ignore - 忽略类型错误
    status: req.query.status as string,
    sortBy: req.query.sortBy as string || 'priority',
    // @ts-ignore - 忽略类型错误
    sortOrder: parseInt(req.query.sortOrder as string) || -1
  });
  
  sendSuccess(res, { topics });
});

/**
 * 创建主题
 */
export const createTopic = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {  
  const topic = await topicService.createTopic(req.body, req.user);
  
  sendSuccess(res, { topic }, '主题创建成功', 201);
});

/**
 * 更新主题
 */
export const updateTopic = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const topic = await topicService.updateTopic(id, req.body);
  
  sendSuccess(res, { topic }, '主题更新成功');
});

/**
 * 删除主题
 */
export const deleteTopic = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  await topicService.deleteTopic(id);
  
  sendSuccess(res, {}, '主题删除成功');
});

/**
 * 发布文章
 */
export const publishPost = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const post = await postService.publishPost(id);
  
  sendSuccess(res, { post }, '文章已发布');
});

/**
 * 取消发布文章
 */
export const unpublishPost = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const post = await postService.unpublishPost(id);
  
  sendSuccess(res, { post }, '文章已取消发布');
});

/**
 * 更新文章
 */
export const updatePost = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const post = await postService.updatePost(id, req.body);
  
  sendSuccess(res, { post }, '文章更新成功');
});

/**
 * 删除文章
 */
export const deletePost = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const post = await postService.deletePost(id);
  
  sendSuccess(res, { post }, '文章已删除');
});

/**
 * 手动生成博客文章
 */
export const generate = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  const { topicId, count } = req.body;
  
  try {
    if (topicId) {
      // 为特定主题生成内容
      const topic = await topicRepository.getTopicById(topicId);
      
      if (!topic) {
        return sendError(res, '主题不存在', 404);
      }
      
      // @ts-ignore - 忽略类型错误
      const post = await generateContentForTopic(topicId, req.user);
      
      sendSuccess(res, {
        message: '内容生成成功',
        post
      });
    } else {
      // 批量生成内容
      const postsCount = count || 1;
      // @ts-ignore - 忽略类型错误
      const posts = await generateAndPublishPosts(postsCount, req.user);
      
      sendSuccess(res, {
        message: `成功生成 ${posts.length} 篇文章`,
        posts
      });
    }
  } catch (error: any) {
    logger.error(`生成内容出错: ${error.message}`);
    sendError(res, `生成内容失败: ${error.message}`);
  }
});

/**
 * 手动刷新站点地图
 */
export const refreshSitemap = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  const sitemapUrl = await triggerSitemapGeneration(req.user);
  
  sendSuccess(res, { sitemapUrl }, '站点地图更新成功');
});

/**
 * 获取博客配置
 */
export const getBlogConfig = asyncHandler(async (req: Request & CustomRequest, res: Response): Promise<void> => {
  const blogConfig = getBlogConfigUtil(req.user);
  
  sendSuccess(res, { config: blogConfig });
}); 