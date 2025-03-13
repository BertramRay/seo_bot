const Post = require('../models/Post');
const config = require('../config');
const { logger } = require('../utils/logger');
const marked = require('marked');
const { createPagination, paginateQuery } = require('../utils/pagination');

// 配置marked选项
marked.setOptions({
  breaks: true, // 启用换行符转换
  gfm: true,    // 启用GitHub风格的Markdown
});

/**
 * 博客文章列表页
 */
exports.getIndex = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    // 获取已发布的文章
    const query = Post.find({ status: 'published' }).sort({ publishedAt: -1 });
    const posts = await paginateQuery(query, page, limit);
    
    // 获取文章总数
    const total = await Post.countDocuments({ status: 'published' });
    
    // 分页信息
    const pagination = createPagination(page, limit, total);
    
    res.render('blog/index', {
      title: config.blog.title,
      description: config.blog.description,
      posts,
      pagination,
      metaTitle: config.blog.title,
      metaDescription: config.blog.description,
      canonicalUrl: `${config.blog.siteUrl}${config.blog.blogPath}`,
    });
  } catch (error) {
    logger.error(`博客列表页加载出错: ${error.message}`);
    next(error);
  }
};

/**
 * 所有分类列表页
 */
exports.getCategories = async (req, res, next) => {
  try {
    // 获取所有已发布文章的分类
    const posts = await Post.find({ status: 'published' });
    
    // 统计每个分类的文章数量
    const categoriesMap = {};
    
    posts.forEach(post => {
      if (post.categories && post.categories.length > 0) {
        post.categories.forEach(category => {
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
    
    res.render('blog/categories', {
      title: `所有分类 - ${config.blog.title}`,
      categories,
      metaTitle: `所有分类 - ${config.blog.title}`,
      metaDescription: `浏览 ${config.blog.title} 的所有文章分类`,
      canonicalUrl: `${config.blog.siteUrl}${config.blog.blogPath}/categories`,
    });
  } catch (error) {
    logger.error(`博客分类列表页加载出错: ${error.message}`);
    next(error);
  }
};

/**
 * 关于我们页面
 */
exports.getAbout = async (req, res, next) => {
  try {
    res.render('blog/about', {
      title: `关于我们 - ${config.blog.title}`,
      siteName: config.blog.title,
      description: config.blog.description,
      metaTitle: `关于我们 - ${config.blog.title}`,
      metaDescription: `了解更多关于 ${config.blog.title} 的信息`,
      canonicalUrl: `${config.blog.siteUrl}${config.blog.blogPath}/about`,
    });
  } catch (error) {
    logger.error(`博客关于页面加载出错: ${error.message}`);
    next(error);
  }
};

/**
 * 博客分类页
 */
exports.getCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    // 获取该分类下的文章
    const query = Post.find({
      status: 'published',
      categories: category,
    }).sort({ publishedAt: -1 });
    
    const posts = await paginateQuery(query, page, limit);
    
    // 获取该分类下的文章总数
    const total = await Post.countDocuments({
      status: 'published',
      categories: category,
    });
    
    // 分页信息
    const pagination = createPagination(page, limit, total);
    
    res.render('blog/category', {
      title: `${category} - ${config.blog.title}`,
      category,
      posts,
      pagination,
      metaTitle: `${category} - ${config.blog.title}`,
      metaDescription: `查看关于${category}的所有文章 - ${config.blog.description}`,
      canonicalUrl: `${config.blog.siteUrl}${config.blog.blogPath}/category/${category}`,
    });
  } catch (error) {
    logger.error(`博客分类页加载出错: ${error.message}`);
    next(error);
  }
};

/**
 * RSS Feed
 */
exports.getFeed = async (req, res, next) => {
  try {
    const posts = await Post.find({ status: 'published' })
      .sort({ publishedAt: -1 })
      .limit(20);
    
    // 设置XML响应头
    res.header('Content-Type', 'application/xml');
    
    res.render('blog/feed', {
      posts,
      site: {
        title: config.blog.title,
        description: config.blog.description,
        url: config.blog.siteUrl,
        blogPath: config.blog.blogPath,
      },
    });
  } catch (error) {
    logger.error(`RSS Feed生成出错: ${error.message}`);
    next(error);
  }
};

/**
 * 博客文章详情页
 */
exports.getPost = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const isPreview = req.query.preview === 'true';
    
    // 查找文章 - 如果是预览模式，则允许查看草稿文章
    const query = { slug };
    if (!isPreview) {
      query.status = 'published';
    }
    
    const post = await Post.findOne(query);
    
    if (!post) {
      return res.status(404).render('error', {
        title: '文章不存在',
        message: '您访问的文章不存在或已被删除',
      });
    }
    
    // 如果是草稿状态但不是预览模式，则返回404
    if (post.status !== 'published' && !isPreview) {
      return res.status(404).render('error', {
        title: '文章未发布',
        message: '此文章尚未发布，无法查看',
      });
    }
    
    // 处理Markdown内容
    if (post.content) {
      post.content = marked.parse(post.content);
    }
    
    // 获取相关文章（同类别）
    const relatedPosts = await Post.find({
      _id: { $ne: post._id },
      status: 'published',
      categories: { $in: post.categories },
    })
      .sort({ publishedAt: -1 })
      .limit(3);
    
    res.render('blog/post', {
      title: post.title,
      post,
      relatedPosts,
      isPreview,
      metaTitle: post.metaTitle || post.title,
      metaDescription: post.metaDescription || post.excerpt,
      canonicalUrl: `${config.blog.siteUrl}${config.blog.blogPath}/${post.slug}`,
      ogImage: post.coverImage || null,
    });
  } catch (error) {
    logger.error(`博客文章详情页加载出错: ${error.message}`);
    next(error);
  }
}; 