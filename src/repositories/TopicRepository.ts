import Topic from '../models/Topic';
import Post from '../models/Post';
import { ITopic, IPost } from '../types';

interface TopicQueryOptions {
  status?: 'active' | 'inactive' | 'archived';
  search?: string;
  sortBy?: string;
  sortOrder?: 1 | -1;
}

/**
 * 构建主题查询条件
 * @param userId - 用户ID
 * @param options - 选项
 * @returns 查询条件
 */
const buildTopicQuery = (userId: string, options: Partial<TopicQueryOptions> = {}): Record<string, any> => {
  const query: Record<string, any> = { user: userId };
  
  // 状态过滤
  if (options.status) {
    query.status = options.status;
  }
  
  // 搜索功能
  if (options.search) {
    // 使用MongoDB的全文搜索功能
    query.$text = { $search: options.search };
  }
  
  return query;
};

/**
 * 获取用户的所有主题
 * @param userId - 用户ID
 * @param options - 选项
 * @returns 主题数组
 */
export const getUserTopics = async (
  userId: string, 
  options: TopicQueryOptions = {}
): Promise<ITopic[]> => {
  const { status, sortBy = 'priority', sortOrder = -1, search } = options;
  
  // 构建查询
  const query = buildTopicQuery(userId, { status, search });
  
  // 构建排序
  const sort: Record<string, any> = {};
  
  // 如果是搜索查询，优先按相关性排序
  if (search) {
    sort.score = { $meta: "textScore" };
    // 添加第二排序字段
    sort[sortBy] = sortOrder;
  } else {
    // 非搜索查询，按指定字段排序
    sort[sortBy] = sortOrder;
    
    // 如果排序字段是name，添加第二排序字段
    if (sortBy === 'name') {
      sort.priority = -1;
    } else if (sortBy === 'priority') {
      sort.name = 1;
    }
  }
  
  // 创建查询
  let topicsQuery = Topic.find(query);
  
  // 如果是搜索查询，添加相关性分数
  if (search) {
    topicsQuery = topicsQuery.select({ score: { $meta: "textScore" } });
  }
  
  // 应用排序并执行查询
  return await topicsQuery.sort(sort);
};

/**
 * 获取主题详情及文章数量
 * @param userId - 用户ID
 * @param options - 查询选项
 * @returns 主题数组，包含文章数量
 */
export const getTopicsWithPostCount = async (
  userId: string, 
  options: TopicQueryOptions = {}
): Promise<(ITopic & { postCount: number })[]> => {
  const topics = await getUserTopics(userId, options);
  
  // 为每个主题添加文章数量
  const topicsWithCount = await Promise.all(topics.map(async (topic) => {
    const postCount = await Post.countDocuments({ 
      topic: topic._id, 
      user: userId
    });
    
    // 将文章数量添加到主题对象中
    const topicObj = topic.toObject();
    topicObj.postCount = postCount;
    return topicObj as ITopic & { postCount: number };
  }));
  
  return topicsWithCount;
};

/**
 * 根据ID获取主题
 * @param id - 主题ID
 * @returns 主题对象
 */
export const getTopicById = async (id: string): Promise<ITopic | null> => {
  return await Topic.findById(id);
};

/**
 * 获取主题相关的文章
 * @param topicId - 主题ID
 * @param limit - 限制数量
 * @returns 文章数组
 */
export const getTopicPosts = async (topicId: string, limit: number = 5): Promise<IPost[]> => {
  return await Post.find({ topic: topicId })
    .sort({ createdAt: -1 })
    .limit(limit);
}; 