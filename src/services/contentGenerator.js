const { OpenAI } = require('openai');
const config = require('../config');
const Post = require('../models/Post');
const Topic = require('../models/Topic');
const { logger } = require('../utils/logger');

// 初始化OpenAI客户端
const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

/**
 * 生成博客内容
 * @param {Object} topic - 主题对象
 * @returns {Promise<Object>} - 生成的博客文章
 */
const generateBlogContent = async (topic) => {
  try {
    logger.info(`开始为主题 "${topic.name}" 生成内容`);
    
    // 创建提示词
    const prompt = topic.promptTemplate || createDefaultPrompt(topic);
    
    // 调用OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "你是一位专业的SEO内容创作者，你的任务是创建高质量、信息丰富且对搜索引擎友好的博客文章。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });
    
    // 解析响应
    const content = response.choices[0].message.content;
    
    // 解析生成的内容
    const parsed = parseGeneratedContent(content);
    
    // 更新主题统计信息
    await Topic.findByIdAndUpdate(topic._id, {
      $inc: { postsGenerated: 1 },
      lastGenerated: new Date(),
    });
    
    logger.info(`成功为主题 "${topic.name}" 生成内容`);
    
    return parsed;
  } catch (error) {
    logger.error(`内容生成错误: ${error.message}`);
    throw new Error(`内容生成失败: ${error.message}`);
  }
};

/**
 * 创建默认提示词
 * @param {Object} topic - 主题对象
 * @returns {String} - 生成的提示词
 */
const createDefaultPrompt = (topic) => {
  return `
请为以下主题创建一篇详细的SEO优化博客文章:

主题: ${topic.name}
描述: ${topic.description || ''}
关键词: ${topic.keywords.join(', ')}
类别: ${topic.categories.join(', ')}

要求:
1. 写一个吸引人的标题，长度应在50-60个字符之间，包含主要关键词
2. 创建一个引人入胜的引言，长度在100-150个字符之间
3. 将内容分为多个部分，每部分都有明确的小标题
4. 总内容应该在1000-1500字之间
5. 确保内容是信息丰富的，有用的，并且原创的
6. 自然地包含关键词，避免关键词堆砌
7. 使用通俗易懂的语言，适合目标读者
8. 如果适用，包含列表、表格或其他结构化内容
9. 结尾要有一个简短的总结和号召性用语

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
 * @returns {Promise<Object>} - 保存的文章
 */
const saveGeneratedArticle = async (articleData) => {
  try {
    const post = new Post({
      ...articleData,
      status: 'draft',
      isGenerated: true,
      generatedBy: 'openai',
    });
    
    await post.save();
    logger.info(`成功保存文章: ${post.title}`);
    
    return post;
  } catch (error) {
    logger.error(`保存文章时出错: ${error.message}`);
    throw new Error(`保存文章失败: ${error.message}`);
  }
};

/**
 * 发布文章
 * @param {String} postId - 文章ID
 * @returns {Promise<Object>} - 更新后的文章
 */
const publishArticle = async (postId) => {
  try {
    const post = await Post.findByIdAndUpdate(
      postId,
      {
        status: 'published',
        publishedAt: new Date(),
      },
      { new: true }
    );
    
    logger.info(`成功发布文章: ${post.title}`);
    
    return post;
  } catch (error) {
    logger.error(`发布文章时出错: ${error.message}`);
    throw new Error(`发布文章失败: ${error.message}`);
  }
};

/**
 * 自动生成并发布博客文章
 * @param {Number} count - 要生成的文章数量
 * @returns {Promise<Array>} - 生成的文章数组
 */
const generateAndPublishPosts = async (count = config.content.postsPerBatch) => {
  try {
    logger.info(`开始批量生成 ${count} 篇文章`);
    
    // 获取活跃主题
    const topics = await Topic.find({ status: 'active' })
      .sort({ postsGenerated: 1, priority: -1 })
      .limit(count);
    
    if (topics.length === 0) {
      logger.warn('没有找到活跃的主题，无法生成内容');
      return [];
    }
    
    const generatedPosts = [];
    
    // 为每个主题生成内容
    for (const topic of topics) {
      try {
        // 生成内容
        const content = await generateBlogContent(topic);
        
        // 保存文章
        const post = await saveGeneratedArticle(content);
        
        // 发布文章
        await publishArticle(post._id);
        
        generatedPosts.push(post);
        
        // 添加随机延迟，避免API限制
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
      } catch (topicError) {
        logger.error(`处理主题 "${topic.name}" 时出错: ${topicError.message}`);
        continue;
      }
    }
    
    logger.info(`成功生成并发布了 ${generatedPosts.length} 篇文章`);
    
    return generatedPosts;
  } catch (error) {
    logger.error(`批量生成文章时出错: ${error.message}`);
    throw new Error(`批量生成失败: ${error.message}`);
  }
};

module.exports = {
  generateBlogContent,
  saveGeneratedArticle,
  publishArticle,
  generateAndPublishPosts,
}; 