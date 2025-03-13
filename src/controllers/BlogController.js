const config = require('../config');
const { logger } = require('../utils/logger');
const { createPagination } = require('../utils/pagination');
const { parseMarkdown } = require('../utils/markdownUtils');
const { asyncHandler } = require('../utils/controllerUtils');
const postRepository = require('../repositories/PostRepository');

/**
 * 博客文章列表页
 */
exports.getIndex = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  // 使用仓库获取已发布的文章
  const { posts, total } = await postRepository.getPaginatedPosts({
    status: 'published',
    page,
    limit
  });
  
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
});

/**
 * 所有分类列表页
 */
exports.getCategories = asyncHandler(async (req, res) => {
  // 获取所有已发布文章的分类
  const posts = await postRepository.getPaginatedPosts({
    status: 'published',
    limit: 1000 // 获取足够多的文章来统计分类
  }).then(result => result.posts);
  
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
});

/**
 * 关于我们页面
 */
exports.getAbout = asyncHandler(async (req, res) => {
  res.render('blog/about', {
    title: `关于我们 - ${config.blog.title}`,
    siteName: config.blog.title,
    description: config.blog.description,
    metaTitle: `关于我们 - ${config.blog.title}`,
    metaDescription: `了解更多关于 ${config.blog.title} 的信息`,
    canonicalUrl: `${config.blog.siteUrl}${config.blog.blogPath}/about`,
  });
});

/**
 * 博客分类页
 */
exports.getCategory = asyncHandler(async (req, res) => {
  const { category } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  // 使用仓库获取该分类下的文章
  const { posts, total } = await postRepository.getPaginatedPosts({
    status: 'published',
    category,
    page,
    limit
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
});

/**
 * RSS Feed
 */
exports.getFeed = asyncHandler(async (req, res) => {
  const { posts } = await postRepository.getPaginatedPosts({
    status: 'published',
    limit: 20
  });
  
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
});

/**
 * 博客文章详情页
 */
exports.getPost = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const isPreview = req.query.preview === 'true';
  
  // 查找文章 - 如果是预览模式，则允许查看草稿文章
  const options = {};
  if (!isPreview) {
    options.status = 'published';
  }
  
  const post = await postRepository.getPostBySlug(slug, options);
  
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
    post.content = parseMarkdown(post.content);
  }
  
  // 获取相关文章（同类别）
  const relatedPosts = await postRepository.getRelatedPosts(post._id, post.categories);
  
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
}); 