const { OpenAI } = require('openai');
const config = require('../config');
const Post = require('../models/Post');
const Topic = require('../models/Topic');
const GenerationHistory = require('../models/GenerationHistory');
const { logger } = require('../utils/logger');
const slugify = require('slugify');

// 初始化OpenAI客户端
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

// 使用配置中的模型名称
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

/**
 * 生成博客内容
 * @param {Object} topic - 主题对象
 * @param {Object} user - 用户对象
 * @returns {Promise<Object>} - 生成的内容
 */
const generateBlogContent = async (topic, user) => {
  try {
    logger.info(`开始为用户 ${user.username} 的主题 "${topic.name}" 生成博客内容`);
    
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
文章应该包含${config.content.minWordsPerPost}-${config.content.maxWordsPerPost}字，并且对搜索引擎友好。
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
    const content = response.choices[0].message.content;
    
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
      content,
      metaDescription,
      wordCount: countWords(content),
    };
  } catch (error) {
    logger.error(`生成博客内容时出错: ${error.message}`);
    throw new Error(`生成博客内容失败: ${error.message}`);
  }
};

/**
 * 创建默认提示词
 * @param {Object} topic - 主题对象
 * @param {Array} previousPosts - 之前生成的文章
 * @returns {String} - 生成的提示词
 */
const createDefaultPrompt = (topic, previousPosts = []) => {
  // 获取系统配置的文章字数限制
  const minWords = config.content.minWordsPerPost || 800;
  const maxWords = config.content.maxWordsPerPost || 1500;
  
  // 格式化之前的文章信息
  let previousPostsInfo = '';
  if (previousPosts.length > 0) {
    previousPostsInfo = `
同主题下之前已发布的文章（你需要避免内容重复或过于相似）:
${previousPosts.map((post, index) => `${index + 1}. 标题: "${post.title}"
   摘要: "${post.excerpt}"`).join('\n')}

请确保你的新文章与上述文章有显著区别，探索该主题的不同方面或角度。
`;
  }
  
  return `
请为以下主题创建一篇详细的SEO优化博客文章:

主题: ${topic.name}
描述: ${topic.description || ''}
关键词: ${topic.keywords.join(', ')}
类别: ${topic.categories.join(', ')}
${previousPostsInfo}

写作要求:
1. 撰写一个吸引人的标题，长度应在50-60个字符之间，自然包含主要关键词，避免生硬的关键词堆砌
2. 创建一个引人入胜的引言，长度在100-150个字符之间，用自然的语气引导读者
3. 文章内容应该结构清晰，分为多个部分，每部分都有明确的小标题
4. 总内容应该在${minWords}-${maxWords}字之间，但重点是质量而非数量
5. 文章应该体现你作为专家的观点和见解，加入个人语气和行业经验
6. 自然地包含关键词，但应以读者体验为优先，完全避免关键词堆砌
7. 使用日常交流的语言，包括一些口语化表达和过渡性词汇
8. 根据需要添加实际案例、数据、列表或其他结构化内容
9. 结尾要有一个简短的总结和自然的号召性用语，避免生硬的营销语言

内容风格:
- 写作风格应该亲切自然，就像在与读者对话
- 适当使用反问句、感叹句等增加文章的互动性
- 可以加入一些轻微的幽默元素或生活化的比喻
- 在表达专业观点时应该自信但不强硬
- 表达方式应该像经验丰富的博主或专栏作家

输出格式:
{
  "title": "博客文章标题",
  "excerpt": "引言/摘要",
  "keywords": ["关键词1", "关键词2", "..."],
  "metaTitle": "SEO元标题",
  "metaDescription": "SEO元描述",
  "content": "完整的博客文章内容，包括HTML标记",
  "categories": ["分类1", "分类2"]
}
`;
};

/**
 * 解析生成的内容
 * @param {String} content - 生成的内容
 * @returns {Object} - 解析后的内容对象
 */
const parseGeneratedContent = (content) => {
  try {
    // 查找JSON部分
    const jsonMatch = content.match(/({[\s\S]*})/);
    
    if (jsonMatch && jsonMatch[0]) {
      // 解析JSON
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }
    
    // 如果没有找到JSON格式，尝试手动解析
    const title = content.match(/标题[：:]\s*(.*)/i)?.[1] || "生成的博客文章";
    const excerpt = content.match(/摘要[：:]\s*([\s\S]*?)(?=内容[：:]|$)/i)?.[1] || "";
    const mainContent = content.match(/内容[：:]\s*([\s\S]*?)(?=关键词[：:]|$)/i)?.[1] || content;
    
    return {
      title,
      excerpt: excerpt.trim(),
      content: mainContent.trim(),
      keywords: [],
      metaTitle: title,
      metaDescription: excerpt.trim().substring(0, 160),
      categories: [],
    };
  } catch (error) {
    logger.error(`解析生成内容时出错: ${error.message}`);
    
    // 返回基本对象
    return {
      title: "生成的博客文章",
      excerpt: "这是一篇自动生成的文章",
      content: content,
      keywords: [],
      metaTitle: "生成的博客文章",
      metaDescription: "这是一篇自动生成的文章",
      categories: [],
    };
  }
};

/**
 * 保存生成的文章
 * @param {Object} articleData - 文章数据
 * @param {Object} user - 用户对象
 * @returns {Promise<Object>} - 保存的文章
 */
const saveGeneratedArticle = async (articleData, user) => {
  try {
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
  } catch (error) {
    logger.error(`保存文章时出错: ${error.message}`);
    throw new Error(`保存文章失败: ${error.message}`);
  }
};

/**
 * 发布文章
 * @param {String} postId - 文章ID
 * @param {Object} user - 用户对象
 * @returns {Promise<Object>} - 更新后的文章
 */
const publishArticle = async (postId, user) => {
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
  } catch (error) {
    logger.error(`发布文章时出错: ${error.message}`);
    throw new Error(`发布文章失败: ${error.message}`);
  }
};

/**
 * 自动生成并发布博客文章 - 支持并发执行
 * @param {Number} count - 要生成的文章数量
 * @param {Object} user - 用户对象
 * @returns {Promise<Array>} - 生成的文章数组
 */
const generateAndPublishPosts = async (count = config.content.postsPerBatch, user) => {
  try {
    logger.info(`开始为用户 ${user.username} 批量生成 ${count} 篇文章`);
    
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
    
    if (count >= topics.length) {
      // 如果要生成的文章数量大于等于主题数量，则使用所有主题
      topicsToUse = topics;
    } else {
      // 如果要生成的文章数量少于主题数量，则选择优先级最高的主题
      topicsToUse = topics.slice(0, count);
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
        content.categories = topic.categories;
        
        // 保存文章
        const post = await saveGeneratedArticle({
          ...content,
          topic: topic._id,
        }, user);
        
        // 更新返回结果
        const populatedPost = await Post.findById(post._id).populate('topic');
        
        // 返回结果
        return { success: true, post: populatedPost };
      } catch (topicError) {
        logger.error(`处理用户 ${user.username} 的主题 "${topic.name}" 时出错: ${topicError.message}`);
        return { success: false, error: topicError.message, topic };
      }
    });
    
    // 等待所有生成任务完成
    const results = await Promise.all(generationPromises);
    
    // 收集成功的文章
    const generatedPosts = results
      .filter(result => result.success)
      .map(result => result.post);
    
    // 更新历史记录
    history.successCount = generatedPosts.length;
    history.status = 'completed';
    history.posts = generatedPosts.map(post => post._id);
    await history.save();
    
    logger.info(`成功为用户 ${user.username} 生成了 ${generatedPosts.length} 篇文章`);
    
    return generatedPosts;
  } catch (error) {
    logger.error(`批量生成文章时出错: ${error.message}`);
    
    // 更新历史记录
    const historyRecord = await GenerationHistory.findOne({ 
      status: 'processing',
      user: user._id
    }).sort({ createdAt: -1 });
    
    if (historyRecord) {
      historyRecord.status = 'failed';
      historyRecord.error = error.message;
      await historyRecord.save();
    }
    
    throw new Error(`批量生成失败: ${error.message}`);
  }
};

/**
 * 获取最近的生成历史
 * @param {Number} limit - 返回历史记录的数量
 * @param {Object} user - 用户对象
 * @returns {Promise<Array>} - 生成历史记录
 */
const getRecentGenerationHistory = async (limit = 5, user) => {
  try {
    return await GenerationHistory.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('topics')
      .populate('posts');
  } catch (error) {
    logger.error(`获取生成历史记录时出错: ${error.message}`);
    return [];
  }
};

/**
 * 为单个主题生成内容
 * @param {String} topicId - 主题ID
 * @param {Object} user - 用户对象
 * @returns {Promise<Object>} - 生成的文章
 */
const generateContentForTopic = async (topicId, user) => {
  try {
    // 查找主题
    const topic = await Topic.findOne({ 
      _id: topicId,
      user: user._id
    });
    
    if (!topic) {
      throw new Error('主题不存在或无权限访问');
    }
    
    logger.info(`开始为用户 ${user.username} 的主题 "${topic.name}" 生成内容`);
    
    // 生成内容
    const content = await generateBlogContent(topic, user);
    
    // 添加关联到主题
    content.topic = topic._id;
    content.categories = topic.categories;
    
    // 保存文章
    const post = await saveGeneratedArticle({
      ...content,
      topic: topic._id,
    }, user);
    
    // 更新主题的生成计数
    topic.postsGenerated = (topic.postsGenerated || 0) + 1;
    await topic.save();
    
    // 创建历史记录
    const history = new GenerationHistory({
      requestedCount: 1,
      successCount: 1,
      status: 'completed',
      topics: [topic._id],
      posts: [post._id],
      user: user._id
    });
    await history.save();
    
    logger.info(`成功为用户 ${user.username} 的主题 "${topic.name}" 生成内容`);
    
    // 返回结果
    return await Post.findById(post._id).populate('topic');
  } catch (error) {
    logger.error(`为主题生成内容时出错: ${error.message}`);
    throw new Error(`为主题生成内容失败: ${error.message}`);
  }
};

/**
 * 构建提示词
 * @param {Object} topic - 主题对象
 * @param {Array} recentTitles - 最近的文章标题
 * @param {Array} recentContents - 最近的文章内容
 * @returns {String} - 构建的提示词
 */
const buildPrompt = async (topic, recentTitles = [], recentContents = []) => {
  // 基础提示
  let prompt = `请为主题"${topic.name}"创建一篇原创博客文章。\n\n`;
  
  // 添加主题描述
  if (topic.description) {
    prompt += `主题描述: ${topic.description}\n\n`;
  }
  
  // 添加关键词
  if (topic.keywords && topic.keywords.length > 0) {
    prompt += `请在文章中自然地包含以下关键词: ${topic.keywords.join(', ')}\n\n`;
  }
  
  // 添加分类
  if (topic.categories && topic.categories.length > 0) {
    prompt += `文章分类: ${topic.categories.join(', ')}\n\n`;
  }
  
  // 添加最近的文章标题，避免重复
  if (recentTitles && recentTitles.length > 0) {
    prompt += `请避免创建与以下标题相似的内容:\n${recentTitles.join('\n')}\n\n`;
  }
  
  // 添加最近的文章内容摘要，避免重复
  if (recentContents && recentContents.length > 0) {
    prompt += `请避免与以下内容重复:\n${recentContents.join('\n---\n')}\n\n`;
  }
  
  // 添加格式要求
  prompt += `请按以下格式创建文章:
1. 以Markdown格式的一级标题(#)开始，作为文章标题
2. 添加一个简短的引言段落
3. 使用二级标题(##)组织文章的主要部分
4. 在适当的地方使用三级标题(###)
5. 在文章末尾添加一个总结或结论部分
6. 文章应该包含${config.content.minWordsPerPost}-${config.content.maxWordsPerPost}字

请确保内容是原创的、信息丰富的，并且对读者有价值。`;
  
  return prompt;
};

/**
 * 计算文本中的单词数
 * @param {String} text - 要计算的文本
 * @returns {Number} - 单词数
 */
const countWords = (text) => {
  // 对于中文，我们按字符计数
  const chineseCharCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  
  // 对于英文，我们按空格分隔计数
  const englishWordCount = text.replace(/[\u4e00-\u9fa5]/g, '').split(/\s+/).filter(Boolean).length;
  
  // 中文字符按1:1计算，英文单词也按1:1计算
  return chineseCharCount + englishWordCount;
};

module.exports = {
  generateBlogContent,
  saveGeneratedArticle,
  publishArticle,
  generateAndPublishPosts,
  getRecentGenerationHistory,
  generateContentForTopic,
}; 