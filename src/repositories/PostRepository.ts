import Post from '../models/Post';
import { paginateQuery } from '../utils/pagination';
import { IPost } from '../types';

interface PostQueryOptions {
  status?: 'draft' | 'published' | 'archived' | 'all';
  userId?: string;
  category?: string;
  keyword?: string;
  publishedAfter?: Date;
  publishedBefore?: Date;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 1 | -1;
}

interface PaginatedPostsResult {
  posts: IPost[];
  total: number;
}

/**
 * 构建通用查询条件
 * @param options - 查询选项
 * @returns 查询条件对象
 */
const buildQuery = (options: Partial<PostQueryOptions> = {}): Record<string, any> => {
  const query: Record<string, any> = {};
  
  // 处理状态过滤
  if (options.status && options.status !== 'all') {
    query.status = options.status;
  }
  
  // 处理用户过滤
  if (options.userId) {
    query.user = options.userId;
  }
  
  // 处理分类过滤
  if (options.category) {
    query.categories = options.category;
  }
  
  // 处理关键词过滤
  if (options.keyword) {
    query.keywords = options.keyword;
  }
  
  // 处理日期过滤
  if (options.publishedAfter) {
    query.publishedAt = { $gte: options.publishedAfter };
  }
  
  if (options.publishedBefore) {
    if (query.publishedAt) {
      query.publishedAt.$lte = options.publishedBefore;
    } else {
      query.publishedAt = { $lte: options.publishedBefore };
    }
  }
  
  // 处理搜索
  if (options.search) {
    // 使用MongoDB的全文搜索功能
    query.$text = { $search: options.search };
  }
  
  return query;
};

/**
 * 获取分页后的文章列表
 * @param options - 查询选项
 * @returns 包含文章和分页信息的对象
 */
export const getPaginatedPosts = async (options: PostQueryOptions = {}): Promise<PaginatedPostsResult> => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'publishedAt',
    sortOrder = -1
  } = options;
  
  const query = buildQuery(options);
  
  // 构建排序
  const sort: Record<string, any> = {};
  
  // 如果是搜索查询，优先按相关性排序
  if (options.search) {
    sort.score = { $meta: "textScore" };
    // 添加第二排序条件
    sort[sortBy] = sortOrder;
  } else {
    // 非搜索查询，按指定字段排序
    sort[sortBy] = sortOrder;
  }
  
  // 创建查询并填充主题信息
  let postsQuery = Post.find(query);
  
  // 如果是搜索查询，添加相关性分数
  if (options.search) {
    postsQuery = postsQuery.select({ score: { $meta: "textScore" } });
  }
  
  // 应用排序
  postsQuery = postsQuery.sort(sort);
  
  // 应用分页
  const posts = await paginateQuery(postsQuery, page, limit);
  
  // 查询总数
  const total = await Post.countDocuments(query);
  
  return {
    posts,
    total
  };
};

/**
 * 统计文章数量
 * @param options - 查询选项
 * @returns 文章数量
 */
export const countPosts = async (options: Partial<PostQueryOptions> = {}): Promise<number> => {
  const query = buildQuery(options);
  return await Post.countDocuments(query);
};

/**
 * 根据ID获取文章
 * @param id - 文章ID
 * @param populateTopic - 是否填充主题信息
 * @returns 文章对象
 */
export const getPostById = async (id: string, populateTopic: boolean = false): Promise<IPost | null> => {
  let query = Post.findById(id);
  
  if (populateTopic) {
    // @ts-ignore - 忽略populate方法的类型不兼容错误
    query = query.populate('topic');
  }
  
  return await query;
};

/**
 * 根据slug获取文章
 * @param slug - 文章slug
 * @param options - 查询选项
 * @returns 文章对象
 */
export const getPostBySlug = async (slug: string, options: Partial<PostQueryOptions> = {}): Promise<IPost | null> => {
  const queryParams = { slug, ...buildQuery(options) };
  // @ts-ignore - 忽略类型不兼容的错误
  return await Post.findOne(queryParams);
};

/**
 * 获取相关文章
 * @param postId - 当前文章ID
 * @param categories - 分类数组
 * @param limit - 限制数量
 * @returns 相关文章数组
 */
export const getRelatedPosts = async (postId: string, categories: string[], limit: number = 3): Promise<IPost[]> => {
  return await Post.find({
    _id: { $ne: postId },
    status: 'published',
    categories: { $in: categories },
  })
    .sort({ publishedAt: -1 })
    .limit(limit);
}; 