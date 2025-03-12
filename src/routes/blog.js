const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const config = require('../config');
const { logger } = require('../utils/logger');

/**
 * 博客文章列表页
 */
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // 获取已发布的文章
    const posts = await Post.find({ status: 'published' })
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // 获取文章总数
    const total = await Post.countDocuments({ status: 'published' });
    
    // 分页信息
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    res.render('blog/index', {
      title: config.blog.title,
      description: config.blog.description,
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      metaTitle: config.blog.title,
      metaDescription: config.blog.description,
      canonicalUrl: `${config.blog.siteUrl}${config.blog.blogPath}`,
    });
  } catch (error) {
    logger.error(`博客列表页加载出错: ${error.message}`);
    next(error);
  }
});

/**
 * 博客文章详情页
 */
router.get('/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;
    
    // 查找文章
    const post = await Post.findOne({ slug, status: 'published' });
    
    if (!post) {
      return res.status(404).render('error', {
        title: '文章不存在',
        message: '您访问的文章不存在或已被删除',
      });
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
      metaTitle: post.metaTitle || post.title,
      metaDescription: post.metaDescription || post.excerpt,
      keywords: post.keywords.join(', '),
      canonicalUrl: `${config.blog.siteUrl}${config.blog.blogPath}/${post.slug}`,
    });
  } catch (error) {
    logger.error(`博客文章页加载出错: ${error.message}`);
    next(error);
  }
});

/**
 * 博客分类页
 */
router.get('/category/:category', async (req, res, next) => {
  try {
    const { category } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // 获取该分类下的文章
    const posts = await Post.find({
      status: 'published',
      categories: category,
    })
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // 获取该分类下的文章总数
    const total = await Post.countDocuments({
      status: 'published',
      categories: category,
    });
    
    // 分页信息
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    res.render('blog/category', {
      title: `${category} - ${config.blog.title}`,
      category,
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      metaTitle: `${category} - ${config.blog.title}`,
      metaDescription: `查看关于${category}的所有文章 - ${config.blog.description}`,
      canonicalUrl: `${config.blog.siteUrl}${config.blog.blogPath}/category/${category}`,
    });
  } catch (error) {
    logger.error(`博客分类页加载出错: ${error.message}`);
    next(error);
  }
});

/**
 * RSS Feed
 */
router.get('/feed.xml', async (req, res, next) => {
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
});

module.exports = router; 