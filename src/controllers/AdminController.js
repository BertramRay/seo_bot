const Post = require('../models/Post');
const Topic = require('../models/Topic');
const parser = require('cron-parser');
const marked = require('marked');
const { logger } = require('../utils/logger');
const config = require('../config');
const { 
  triggerContentGeneration, 
  triggerSitemapGeneration, 
  getContentGenerationCronExpression 
} = require('../services/scheduler');
const { createPagination, paginateQuery } = require('../utils/pagination');
const { asyncHandler } = require('../utils/controllerUtils');
const { getBlogConfig } = require('../utils/configUtils');
const { parseMarkdown } = require('../utils/markdownUtils');

const postRepository = require('../repositories/PostRepository');
const topicRepository = require('../repositories/TopicRepository');
const postService = require('../services/postService');
const topicService = require('../services/topicService');

// 配置marked选项
marked.setOptions({
  breaks: true, // 启用换行符转换
  gfm: true,    // 启用GitHub风格的Markdown
});

/**
 * 管理后台首页
 */
exports.getDashboard = asyncHandler(async (req, res) => {
  // 获取当前用户的统计信息
  const userId = req.user._id;
  
  // 使用仓库获取统计数据
  const options = { userId };
  
  const { posts: recentPosts } = await postRepository.getPaginatedPosts({
    ...options,
    limit: 5,
    sortBy: 'createdAt'
  });
  
  // 统计数据
  const totalPosts = await postRepository.countPosts(options);
  const publishedPosts = await postRepository.countPosts({ ...options, status: 'published' });
  const draftPosts = await postRepository.countPosts({ ...options, status: 'draft' });
  
  // 获取博客配置
  const blogConfig = getBlogConfig();
  
  // 获取主题统计
  const topics = await topicRepository.getTopicsWithPostCount(userId);
  const totalTopics = topics.length;
  
  // 解析定时任务下次运行时间
  let nextRun = '暂未设置';
  try {
    const interval = parser.parseExpression(getContentGenerationCronExpression());
    nextRun = interval.next().toDate();
  } catch (error) {
    logger.error(`解析CRON表达式出错: ${error.message}`);
  }
  
  res.render('admin/dashboard', {
    title: '管理后台 - 仪表盘',
    totalPosts,
    publishedPosts,
    draftPosts,
    totalTopics,
    recentPosts,
    topics: topics.slice(0, 5),
    nextRun,
    blogTitle: blogConfig.title,
    siteUrl: blogConfig.siteUrl
  });
});

/**
 * 文章管理页面
 */
exports.getPosts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status || 'all';
    const search = req.query.search || '';
    
    // 构建查询条件
    const query = { user: req.user._id };
    if (status !== 'all') {
      query.status = status;
    }
    
    // 添加搜索功能
    if (search) {
      // 使用正则表达式进行模糊匹配
      query.$or = [
        { title: { $regex: search, $options: 'i' } },        // 匹配标题
        { content: { $regex: search, $options: 'i' } },      // 匹配内容
        { keywords: { $regex: search, $options: 'i' } }      // 匹配关键词
      ];
      
      logger.info(`执行文章搜索，关键词: "${search}"`);
    }
    
    // 获取文章
    const postsQuery = Post.find(query)
      .sort({ createdAt: -1 })
      .populate('topic');
    
    const posts = await paginateQuery(postsQuery, page, limit);
    
    // 获取总数
    const total = await Post.countDocuments(query);
    
    // 分页信息
    const pagination = createPagination(page, limit, total);
    
    res.render('admin/posts', {
      title: '管理后台 - 文章管理',
      posts,
      currentStatus: status,
      search: search,
      pagination,
    });
  } catch (error) {
    logger.error(`文章管理页面加载出错: ${error.message}`);
    next(error);
  }
};

/**
 * 主题管理页面
 */
exports.getTopics = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let topics = await Topic.find({ user: userId })
      .sort({ priority: -1, name: 1 });
    
    // 为每个主题获取文章数量
    const topicsWithCount = await Promise.all(topics.map(async (topic) => {
      const postCount = await Post.countDocuments({ 
        topic: topic._id, 
        user: userId
      });
      
      // 将文章数量添加到主题对象中
      const topicObj = topic.toObject();
      topicObj.postCount = postCount;
      return topicObj;
    }));
    
    res.render('admin/topics', {
      title: '管理后台 - 主题管理',
      topics: topicsWithCount,
    });
  } catch (error) {
    logger.error(`主题管理页面加载出错: ${error.message}`);
    next(error);
  }
};

/**
 * 新建主题页面
 */
exports.getNewTopic = (req, res) => {
  res.render('admin/topicEdit', {
    title: '创建新主题',
    topic: null,
    user: req.user,
    isNewTopic: true,
    messages: req.flash()
  });
};

/**
 * 编辑主题页面
 */
exports.getEditTopic = async (req, res, next) => {
  try {
    const topic = await Topic.findById(req.params.id);
    
    if (!topic) {
      req.flash('error', '主题不存在');
      return res.redirect('/admin/topics');
    }
    
    res.render('admin/topicEdit', {
      title: `管理后台 - 编辑主题: ${topic.name}`,
      topic,
      isNewTopic: false,
      user: req.user,
      messages: req.flash()
    });
  } catch (error) {
    logger.error(`编辑主题页面加载出错: ${error.message}`);
    req.flash('error', '加载主题编辑页面时出错');
    res.redirect('/admin/topics');
  }
};

/**
 * 内容生成页面
 */
exports.getGeneratePage = async (req, res, next) => {
  try {
    // 获取活跃主题
    const topics = await Topic.find({ user: req.user._id, status: 'active' })
      .sort({ postsGenerated: 1, priority: -1 });
    
    // 获取最近的生成历史记录
    const { getRecentGenerationHistory } = require('../services/contentGenerator');
    const history = await getRecentGenerationHistory(5, req.user);
    
    // 处理从URL查询参数中获取的主题ID
    let selectedTopic = null;
    if (req.query.topic) {
      selectedTopic = req.query.topic;
    }
    
    res.render('admin/generate', {
      title: '管理后台 - 内容生成',
      topics,
      history,
      config,
      selectedTopic
    });
  } catch (error) {
    logger.error(`内容生成页面加载出错: ${error.message}`);
    next(error);
  }
};

/**
 * 手动触发内容生成
 */
exports.postGenerate = async (req, res, next) => {
  try {
    const { count, topic: topicId, publishImmediately } = req.body;
    let result;
    const startTime = Date.now();
    
    if (topicId) {
      // 使用内容生成服务的单主题生成功能
      const { generateContentForTopic } = require('../services/contentGenerator');
      
      try {
        logger.info(`开始为主题 ID=${topicId} 生成内容`);
        // 为指定主题生成内容
        const post = await generateContentForTopic(topicId, req.user, publishImmediately === 'true');
        result = [post];
      } catch (error) {
        logger.error(`为指定主题生成内容出错: ${error.message}`);
        throw error;
      }
    } else {
      // 批量生成内容
      const { generateAndPublishPosts } = require('../services/contentGenerator');
      result = await generateAndPublishPosts(parseInt(count) || 1, req.user, publishImmediately === 'true');
    }
    
    const generationTime = Math.round((Date.now() - startTime) / 1000); // 计算生成时间（秒）
    
    res.render('admin/generateResult', {
      title: '管理后台 - 内容生成结果',
      result,
      generationTime
    });
  } catch (error) {
    logger.error(`手动触发内容生成出错: ${error.message}`);
    next(error);
  }
};

/**
 * SEO工具页面
 */
exports.getSeoTools = async (req, res, next) => {
  try {
    res.render('admin/seoTools', {
      title: '管理后台 - SEO工具',
    });
  } catch (error) {
    logger.error(`SEO工具页面加载出错: ${error.message}`);
    next(error);
  }
};

/**
 * 刷新站点地图
 */
exports.postRefreshSitemap = async (req, res, next) => {
  try {
    const sitemapUrl = await triggerSitemapGeneration();
    
    res.render('admin/sitemapResult', {
      title: '管理后台 - 站点地图更新结果',
      sitemapUrl,
    });
  } catch (error) {
    logger.error(`刷新站点地图出错: ${error.message}`);
    next(error);
  }
};

/**
 * 系统设置页面
 */
exports.getSettings = async (req, res, next) => {
  try {
    // 获取当前配置
    res.render('admin/settings', {
      title: '管理后台 - 系统设置',
      config: config,
    });
  } catch (error) {
    logger.error(`系统设置页面加载出错: ${error.message}`);
    next(error);
  }
};

/**
 * 更新系统设置
 */
exports.postUpdateSettings = async (req, res, next) => {
  try {
    const { section } = req.body;
    
    // 更新配置文件
    logger.info(`更新系统设置，部分: ${section}`);
    
    // 使用配置管理器保存设置
    const { updateConfig } = require('../services/configManager');
    const success = await updateConfig(section, req.body[section] || req.body);
    
    if (success) {
      req.flash = { type: 'success', message: '设置已保存' };
    } else {
      req.flash = { type: 'error', message: '保存设置失败' };
    }
    
    res.redirect('/admin/settings');
  } catch (error) {
    logger.error(`更新系统设置出错: ${error.message}`);
    next(error);
  }
};

/**
 * 文章编辑页面
 */
exports.getEditPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).render('error', {
        title: '文章不存在',
        message: '您要编辑的文章不存在',
      });
    }
    
    res.render('admin/postForm', {
      title: `管理后台 - 编辑文章: ${post.title}`,
      post,
    });
  } catch (error) {
    logger.error(`编辑文章页面加载出错: ${error.message}`);
    next(error);
  }
};

/**
 * 创建主题
 */
exports.postCreateTopic = async (req, res, next) => {
  try {
    const { name, description, keywords, categories, status, priority, promptTemplate } = req.body;
    
    // 检查名称是否存在
    if (!name || name.trim() === '') {
      req.flash('error', '主题名称不能为空');
      return res.redirect('/admin/topics/new');
    }
    
    // 处理关键词和分类，将逗号分隔的字符串转为数组
    const keywordsArray = keywords && keywords.trim() !== '' 
      ? keywords.split(',').map(k => k.trim()).filter(k => k !== '')
      : [];
      
    const categoriesArray = categories && categories.trim() !== ''
      ? categories.split(',').map(c => c.trim()).filter(c => c !== '')
      : [];
    
    // 创建新主题
    const newTopic = await Topic.create({
      name,
      description: description || '',
      keywords: keywordsArray,
      categories: categoriesArray,
      status: status || 'active',
      priority: Number(priority) || 0,
      promptTemplate: promptTemplate || '',
      user: req.user._id
    });
    
    req.flash('success', '主题创建成功');
    res.redirect(`/admin/topics/${newTopic._id}`);
  } catch (err) {
    console.error('创建主题出错:', err);
    req.flash('error', `创建主题失败: ${err.message}`);
    res.redirect('/admin/topics/new');
  }
};

/**
 * 更新主题
 */
exports.postUpdateTopic = async (req, res) => {
  try {
    const { name, description, keywords, categories, status, priority, promptTemplate } = req.body;
    
    // 检查名称是否存在
    if (!name || name.trim() === '') {
      req.flash('error', '主题名称不能为空');
      return res.redirect(`/admin/topics/edit/${req.params.id}`);
    }
    
    // 处理关键词和分类，将逗号分隔的字符串转为数组
    const keywordsArray = keywords && keywords.trim() !== '' 
      ? keywords.split(',').map(k => k.trim()).filter(k => k !== '')
      : [];
      
    const categoriesArray = categories && categories.trim() !== ''
      ? categories.split(',').map(c => c.trim()).filter(c => c !== '')
      : [];
    
    // 更新主题
    const updatedTopic = await Topic.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        keywords: keywordsArray,
        categories: categoriesArray,
        status: status || 'active',
        priority: Number(priority) || 0,
        promptTemplate: promptTemplate || ''
      },
      { new: true }
    );
    
    if (!updatedTopic) {
      req.flash('error', '更新主题失败，主题不存在');
      return res.redirect('/admin/topics');
    }
    
    req.flash('success', '主题更新成功');
    res.redirect(`/admin/topics/${req.params.id}`);
  } catch (err) {
    console.error('更新主题出错:', err);
    req.flash('error', '更新主题时出错');
    res.redirect(`/admin/topics/edit/${req.params.id}`);
  }
};

/**
 * 删除主题
 */
exports.postDeleteTopic = async (req, res, next) => {
  try {
    const topic = await Topic.findById(req.params.id);
    if (!topic) {
      req.flash('error', '主题不存在');
      return res.redirect('/admin/topics');
    }
    
    // 删除主题
    await Topic.findByIdAndDelete(req.params.id);
    
    // 更新相关文章，将主题设为null
    await Post.updateMany(
      { topic: req.params.id },
      { $set: { topic: null } }
    );
    
    req.flash('success', '主题已成功删除');
    res.redirect('/admin/topics');
  } catch (error) {
    logger.error(`删除主题出错: ${error.message}`);
    next(error);
  }
};

/**
 * 发布文章
 */
exports.postPublishPost = async (req, res, next) => {
  try {
    await Post.findByIdAndUpdate(req.params.id, {
      status: 'published',
      publishedAt: new Date(),
    });
    
    res.redirect('/admin/posts');
  } catch (error) {
    logger.error(`发布文章出错: ${error.message}`);
    next(error);
  }
};

/**
 * 取消发布文章
 */
exports.postUnpublishPost = async (req, res, next) => {
  try {
    await Post.findByIdAndUpdate(req.params.id, {
      status: 'draft',
    });
    
    res.redirect('/admin/posts');
  } catch (error) {
    logger.error(`取消发布文章出错: ${error.message}`);
    next(error);
  }
};

/**
 * 删除文章
 */
exports.postDeletePost = async (req, res, next) => {
  try {
    await Post.findByIdAndUpdate(req.params.id, {
      status: 'deleted',
    });
    
    res.redirect('/admin/posts');
  } catch (error) {
    logger.error(`删除文章出错: ${error.message}`);
    next(error);
  }
};

/**
 * 更新文章
 */
exports.postUpdatePost = async (req, res, next) => {
  try {
    const { title, excerpt, content, keywords, categories, slug, status, metaTitle, metaDescription, save } = req.body;
    
    // 构建更新对象
    const updateData = {
      title,
      excerpt,
      content,
      keywords: keywords || [],
      categories: categories || [],
      slug,
      metaTitle,
      metaDescription,
    };
    
    // 根据保存选项决定状态
    if (save === 'publish') {
      updateData.status = 'published';
      updateData.publishedAt = new Date();
    } else {
      updateData.status = status || 'draft';
    }
    
    // 更新文章
    await Post.findByIdAndUpdate(req.params.id, updateData);
    
    res.redirect('/admin/posts');
  } catch (error) {
    logger.error(`更新文章出错: ${error.message}`);
    next(error);
  }
};

/**
 * 获取主题详情
 */
exports.getTopicDetail = async (req, res, next) => {
  try {
    const topic = await Topic.findById(req.params.id);
    if (!topic) {
      req.flash('error', '主题不存在');
      return res.redirect('/admin/topics');
    }
    
    // 获取相关的文章数量
    const postCount = await Post.countDocuments({ topic: topic._id });
    
    // 获取最近的5篇文章
    const recentPosts = await Post.find({ topic: topic._id })
      .sort({ createdAt: -1 })
      .limit(5);
    
    res.render('admin/topicDetail', {
      title: `${topic.name} - 主题详情`,
      topic,
      postCount,
      recentPosts,
      user: req.user,
      messages: req.flash()
    });
  } catch (err) {
    console.error('加载主题详情页面出错:', err);
    req.flash('error', '加载主题详情时出错');
    res.redirect('/admin/topics');
  }
};

/**
 * 文章详情页面
 */
exports.getPostDetail = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).populate('topic');
    
    if (!post) {
      req.flash('error', '文章不存在');
      return res.redirect('/admin/posts');
    }
    
    // 处理Markdown内容
    if (post.content) {
      post.content = marked.parse(post.content);
    }
    
    res.render('admin/postDetail', {
      title: `${post.title} - 文章详情`,
      post,
      messages: req.flash()
    });
  } catch (error) {
    logger.error(`文章详情页面加载出错: ${error.message}`);
    req.flash('error', '加载文章详情时出错');
    res.redirect('/admin/posts');
  }
};

/**
 * 查看生成结果页面
 */
exports.getGenerationResults = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // 获取生成历史记录
    const GenerationHistory = require('../models/GenerationHistory');
    const history = await GenerationHistory.findById(id)
      .populate('topics')
      .populate('posts');
    
    if (!history) {
      req.flash('error', '生成记录不存在');
      return res.redirect('/admin/generate');
    }
    
    res.render('admin/generationResult', {
      title: '生成结果详情',
      history
    });
  } catch (error) {
    logger.error(`查看生成结果页面出错: ${error.message}`);
    req.flash('error', '加载生成结果页面时出错');
    res.redirect('/admin/generate');
  }
};

/**
 * 生成站点地图
 */
exports.getGenerateSitemap = async (req, res, next) => {
  try {
    const sitemapUrl = await triggerSitemapGeneration();
    
    res.render('admin/sitemapResult', {
      title: '管理后台 - 站点地图生成结果',
      sitemapUrl,
    });
  } catch (error) {
    logger.error(`生成站点地图出错: ${error.message}`);
    next(error);
  }
}; 