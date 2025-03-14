import { OpenAI } from 'openai';
import config from '../config';
import Post from '../models/Post';
import Topic from '../models/Topic';
import GenerationHistory from '../models/GenerationHistory';
import { logger } from '../utils/logger';
import slugify from 'slugify';
import { getContentConfig } from '../utils/configUtils';
import { IUser, ITopic, IPost } from '../types';

// 初始化OpenAI客户端
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

interface GeneratedContent {
  title: string;
  slug: string;
  content: string;
  metaDescription: string;
  wordCount: number;
  excerpt?: string;
  topic?: string;
  keywords?: string[];
  categories?: string[];
}

/**
 * 生成博客内容
 * @param topic - 主题对象
 * @param user - 用户对象
 * @returns 生成的内容
 */
export const generateBlogContent = async (topic: ITopic, user: IUser): Promise<GeneratedContent> => {
  try {
    logger.info(`开始为用户 ${user.username} 的主题 "${topic.name}" 生成博客内容`);
    
    // 获取用户特定的内容生成配置
    const contentConfig = getContentConfig(user);
    
    // 使用用户配置的模型或默认模型
    const MODEL = contentConfig.model || process.env.OPENAI_MODEL || 'gpt-4o';
    
    // 获取主题的最近文章，用于避免重复
    const recentPosts = await Post.find({
      topic: topic._id,
      user: user._id
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title content');
    
    // 提取最近的标题和内容
    const recentTitles = recentPosts.map(post => post.title);
    const recentContents = recentPosts.map(post => post.content.substring(0, 200)); // 只取前200个字符
    
    // 构建提示
    const prompt = await buildPrompt(topic, recentTitles, recentContents);
    
    // 调用OpenAI API
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `你是一个专业的博客内容创作者，专注于创建高质量的SEO友好内容。
你需要为主题"${topic.name}"创建一篇原创博客文章。
文章应该包含${contentConfig.minWordsPerPost}-${contentConfig.maxWordsPerPost}字，并且对搜索引擎友好。
请确保内容是原创的，信息丰富的，并且对读者有价值。
请使用Markdown格式。`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
    });
    
    // 解析响应
    const content = response.choices[0].message.content || '';
    
    // 使用正则表达式提取标题
    const titleMatch = content.match(/^#\s+(.+)$/m);
    let title = titleMatch ? titleMatch[1].trim() : `${topic.name} - 新文章`;
    
    // 如果标题太长，截断它
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }
    
    // 生成slug
    const slug = slugify(title, {
      lower: true,
      strict: true
    });
    
    // 提取元描述（使用内容的前150个字符）
    let metaDescription = '';
    const contentWithoutTitle = content.replace(/^#\s+.+$/m, '').trim();
    const firstParagraph = contentWithoutTitle.split('\n\n')[0];
    metaDescription = firstParagraph.replace(/[#*_]/g, '').trim();
    
    if (metaDescription.length > 160) {
      metaDescription = metaDescription.substring(0, 157) + '...';
    }
    
    // 返回生成的内容
    return {
      title,
      slug,
      content: content || '',
      metaDescription,
      wordCount: countWords(content || ''),
    };
  } catch (error: any) {
    logger.error(`生成博客内容时出错: ${error.message}`);
    throw new Error(`生成博客内容失败: ${error.message}`);
  }
};

/**
 * 保存生成的文章
 * @param articleData - 文章数据
 * @param user - 用户对象
 * @returns 保存的文章
 */
export const saveGeneratedArticle = async (articleData: GeneratedContent, user: IUser): Promise<IPost> => {
  try {
    // 确保有摘录字段
    if (!articleData.excerpt) {
      // 如果没有摘录，则从内容中提取前150个字符作为摘录
      const cleanContent = articleData.content.replace(/#{1,6}\s.*\n/g, '').replace(/\*\*/g, '').replace(/\n+/g, ' ').trim();
      articleData.excerpt = cleanContent.substring(0, 150) + '...';
    }
    
    const post = new Post({
      ...articleData,
      status: config.content.autoPublish ? 'published' : 'draft',
      publishedAt: config.content.autoPublish ? new Date() : null,
      isGenerated: true,
      generatedBy: 'openai',
      user: user._id
    });
    
    await post.save();
    logger.info(`成功为用户 ${user.username} 保存文章: ${post.title}`);
    
    return post;
  } catch (error: any) {
    logger.error(`保存文章时出错: ${error.message}`);
    throw new Error(`保存文章失败: ${error.message}`);
  }
};

/**
 * 发布文章
 * @param postId - 文章ID
 * @param user - 用户对象
 * @returns 更新后的文章
 */
export const publishArticle = async (postId: string, user: IUser): Promise<IPost> => {
  try {
    // 确保文章属于当前用户
    const post = await Post.findOne({
      _id: postId,
      user: user._id
    });
    
    if (!post) {
      throw new Error('文章不存在或无权限发布');
    }
    
    post.status = 'published';
    post.publishedAt = new Date();
    await post.save();
    
    logger.info(`用户 ${user.username} 成功发布文章: ${post.title}`);
    
    return post;
  } catch (error: any) {
    logger.error(`发布文章时出错: ${error.message}`);
    throw new Error(`发布文章失败: ${error.message}`);
  }
};

/**
 * 自动生成并发布博客文章 - 支持并发执行
 * @param count - 要生成的文章数量
 * @param user - 用户对象
 * @param publishImmediately - 是否立即发布
 * @returns 生成的文章数组
 */
export const generateAndPublishPosts = async (
  count: number | undefined, 
  user: IUser | null, 
  publishImmediately: boolean | null = null
): Promise<IPost[]> => {
  try {
    // 如果没有提供用户，使用默认配置
    if (!user) {
      logger.info(`使用系统默认配置生成内容，数量: ${count || config.content.postsPerBatch}`);
      return [];
    }
    
    // 获取用户特定的内容生成配置
    const contentConfig = getContentConfig(user);
    
    // 如果未指定是否立即发布，则使用用户配置
    if (publishImmediately === null) {
      publishImmediately = contentConfig.autoPublish;
    }
    
    // 如果未指定生成数量，则使用用户配置或默认值
    if (!count) {
      count = user.settings?.blog?.schedule?.postsPerScheduledRun || config.content.postsPerBatch || 1;
    }
    
    logger.info(`开始为用户 ${user.username} 批量生成 ${count} 篇文章 (立即发布: ${publishImmediately})`);
    
    // 创建历史记录
    const history = new GenerationHistory({
      requestedCount: count,
      successCount: 0,
      status: 'processing',
      user: user._id
    });
    await history.save();
    
    // 获取活跃主题 - 按照生成数量和优先级排序
    const topics = await Topic.find({ 
      status: 'active',
      user: user._id
    })
      .sort({ postsGenerated: 1, priority: -1 });
    
    if (topics.length === 0) {
      logger.warn(`没有找到用户 ${user.username} 的活跃主题，无法生成内容`);
      
      // 更新历史记录
      history.status = 'failed';
      history.error = '没有找到活跃的主题';
      await history.save();
      
      return [];
    }
    
    // 确定要使用的主题
    let topicsToUse = [];
    
    if (count && count >= topics.length) {
      // 如果要生成的文章数量大于等于主题数量，则使用所有主题
      topicsToUse = topics;
    } else {
      // 如果要生成的文章数量少于主题数量，则选择优先级最高的主题
      topicsToUse = topics.slice(0, count || 1);
    }
    
    logger.info(`为用户 ${user.username} 找到 ${topics.length} 个活跃主题，将为 ${topicsToUse.length} 个主题生成内容`);
    
    // 保存使用的主题ID
    history.topics = topicsToUse.map(topic => topic._id);
    await history.save();
    
    // 并发生成内容
    const generationPromises = topicsToUse.map(async (topic) => {
      try {
        logger.info(`开始为用户 ${user.username} 的主题 "${topic.name}" 生成内容`);
        
        // 生成内容
        const content = await generateBlogContent(topic, user);
        
        // 添加关联到主题
        content.topic = topic._id;
        
        // 添加主题的关键词和分类
        // @ts-ignore - 忽略keywords属性不存在的错误
        content.keywords = topic.keywords;
        // @ts-ignore - 忽略categories属性不存在的错误
        content.categories = topic.categories;
        
        // 保存文章
        const post = await saveGeneratedArticle(content, user);
        
        // 如果需要立即发布
        if (publishImmediately) {
          await publishArticle(post._id, user);
        }
        
        // 更新主题的生成计数
        // @ts-ignore - 忽略postsGenerated属性不存在的错误
        topic.postsGenerated = (topic.postsGenerated || 0) + 1;
        await topic.save();
        
        return post;
      } catch (error: any) {
        logger.error(`为主题 "${topic.name}" 生成内容时出错: ${error.message}`);
        return null;
      }
    });
    
    // 等待所有生成完成
    const generatedPosts = await Promise.all(generationPromises);
    
    // 过滤掉失败的生成
    const successfulPosts = generatedPosts.filter(post => post !== null) as IPost[];
    
    // 更新历史记录
    history.successCount = successfulPosts.length;
    history.status = 'completed';
    // @ts-ignore - 忽略completedAt属性不存在的错误
    history.completedAt = new Date();
    await history.save();
    
    logger.info(`为用户 ${user.username} 成功生成 ${successfulPosts.length}/${count} 篇文章`);
    
    return successfulPosts;
  } catch (error: any) {
    logger.error(`批量生成内容时出错: ${error.message}`);
    throw new Error(`批量生成内容失败: ${error.message}`);
  }
};

/**
 * 获取最近的生成历史
 * @param limit - 限制数量
 * @param user - 用户对象
 * @returns 生成历史记录
 */
export const getRecentGenerationHistory = async (limit = 5, user: IUser) => {
  return await GenerationHistory.find({ user: user._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('topics');
};

/**
 * 为特定主题生成内容
 * @param topicId - 主题ID
 * @param user - 用户对象
 * @param publishImmediately - 是否立即发布
 * @returns 生成的文章
 */
export const generateContentForTopic = async (
  topicId: string, 
  user: IUser, 
  publishImmediately: boolean | null = null
): Promise<IPost> => {
  try {
    // 获取用户特定的内容生成配置
    const contentConfig = getContentConfig(user);
    
    // 如果未指定是否立即发布，则使用用户配置
    if (publishImmediately === null) {
      publishImmediately = contentConfig.autoPublish;
    }
    
    // 查找主题
    const topic = await Topic.findOne({ 
      _id: topicId,
      user: user._id
    });
    
    if (!topic) {
      throw new Error('主题不存在或无权限访问');
    }
    
    logger.info(`开始为用户 ${user.username} 的主题 "${topic.name}" 生成内容`);
    
    // 创建历史记录
    const history = new GenerationHistory({
      requestedCount: 1,
      successCount: 0,
      status: 'processing',
      topics: [topic._id],
      user: user._id
    });
    await history.save();
    
    try {
      // 生成内容
      const content = await generateBlogContent(topic, user);
      
      // 添加关联到主题
      content.topic = topic._id;
      
      // 添加主题的关键词和分类
      // @ts-ignore - 忽略keywords属性不存在的错误
      content.keywords = topic.keywords;
      // @ts-ignore - 忽略categories属性不存在的错误
      content.categories = topic.categories;
      
      // 保存文章
      const post = await saveGeneratedArticle(content, user);
      
      // 如果需要立即发布
      if (publishImmediately) {
        await publishArticle(post._id, user);
      }
      
      // 更新主题的生成计数
      // @ts-ignore - 忽略postsGenerated属性不存在的错误
      topic.postsGenerated = (topic.postsGenerated || 0) + 1;
      await topic.save();
      
      // 更新历史记录
      history.successCount = 1;
      history.status = 'completed';
      // @ts-ignore - 忽略completedAt属性不存在的错误
      history.completedAt = new Date();
      await history.save();
      
      logger.info(`为用户 ${user.username} 的主题 "${topic.name}" 成功生成文章: ${post.title}`);
      
      return post;
    } catch (error: any) {
      // 更新历史记录
      history.status = 'failed';
      history.error = error.message;
      await history.save();
      
      throw error;
    }
  } catch (error: any) {
    logger.error(`为主题生成内容时出错: ${error.message}`);
    throw new Error(`为主题生成内容失败: ${error.message}`);
  }
};

/**
 * 构建提示
 * @param topic - 主题对象
 * @param recentTitles - 最近的标题
 * @param recentContents - 最近的内容
 * @returns 构建的提示
 */
export const buildPrompt = async (
  topic: ITopic, 
  recentTitles: string[] = [], 
  recentContents: string[] = []
): Promise<string> => {
  let prompt = `请为主题"${topic.name}"创建一篇原创博客文章。`;
  
  if (topic.description) {
    prompt += `\n\n主题描述: ${topic.description}`;
  }
  
  // @ts-ignore - 忽略keywords属性不存在的错误
  if (topic.keywords && topic.keywords.length > 0) {
    // @ts-ignore
    prompt += `\n\n关键词: ${topic.keywords.join(', ')}`;
  }
  
  // @ts-ignore - 忽略categories属性不存在的错误
  if (topic.categories && topic.categories.length > 0) {
    // @ts-ignore
    prompt += `\n\n分类: ${topic.categories.join(', ')}`;
  }
  
  // 如果有自定义提示模板，则使用它
  // @ts-ignore - 忽略promptTemplate属性不存在的错误
  if (topic.promptTemplate) {
    // @ts-ignore
    prompt = topic.promptTemplate
      .replace('{{topic}}', topic.name)
      .replace('{{description}}', topic.description || '')
      // @ts-ignore
      .replace('{{keywords}}', topic.keywords ? topic.keywords.join(', ') : '')
      // @ts-ignore
      .replace('{{categories}}', topic.categories ? topic.categories.join(', ') : '');
  }
  
  // 添加最近的标题，以避免重复
  if (recentTitles.length > 0) {
    prompt += `\n\n请避免创建与以下标题相似的内容:\n${recentTitles.join('\n')}`;
  }
  
  return prompt;
};

/**
 * 计算文本中的单词数
 * @param text - 文本
 * @returns 单词数
 */
export const countWords = (text: string): number => {
  // 移除Markdown标记
  const cleanText = text.replace(/[#*_`]/g, '');
  
  // 按空格分割并过滤空字符串
  const words = cleanText.split(/\s+/).filter(word => word.length > 0);
  
  return words.length;
}; 