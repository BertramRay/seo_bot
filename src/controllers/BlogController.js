const { logger } = require('../utils/logger');
const { createPagination } = require('../utils/pagination');
const { parseMarkdown } = require('../utils/markdownUtils');
const { asyncHandler } = require('../utils/controllerUtils');
const { getBlogConfig, getBlogTitle, getBlogDescription, getBlogUrl, getSeoMeta } = require('../utils/configUtils');
const postRepository = require('../repositories/PostRepository');
const topicRepository = require('../repositories/TopicRepository');

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
  
  // 获取配置
  const blogConfig = getBlogConfig();
  const seoMeta = getSeoMeta();
  
  res.render('blog/index', {
    title: blogConfig.title,
    description: blogConfig.description,
    posts,
    pagination,
    ...seoMeta
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
  
  // 获取SEO元数据
  const seoMeta = getSeoMeta({
    title: '所有分类',
    path: '/categories'
  });
  
  res.render('blog/categories', {
    title: `所有分类 - ${getBlogTitle()}`,
    categories,
    ...seoMeta
  });
});

/**
 * 关于我们页面
 */
exports.getAbout = asyncHandler(async (req, res) => {
  // 获取SEO元数据
  const seoMeta = getSeoMeta({
    title: '关于我们',
    path: '/about'
  });
  
  res.render('blog/about', {
    title: `关于我们 - ${getBlogTitle()}`,
    siteName: getBlogTitle(),
    description: getBlogDescription(),
    ...seoMeta
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
  
  // 获取SEO元数据
  const seoMeta = getSeoMeta({
    title: category,
    description: `查看关于${category}的所有文章 - ${getBlogDescription()}`,
    path: `/category/${category}`
  });
  
  res.render('blog/category', {
    title: `${category} - ${getBlogTitle()}`,
    category,
    posts,
    pagination,
    ...seoMeta
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
  
  // 获取博客配置
  const blogConfig = getBlogConfig();
  
  res.render('blog/feed', {
    posts,
    site: {
      title: blogConfig.title,
      description: blogConfig.description,
      url: blogConfig.siteUrl,
      blogPath: blogConfig.blogPath,
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
  
  // 获取SEO元数据
  const canonicalUrl = getBlogUrl(`/${post.slug}`);
  
  res.render('blog/post', {
    title: post.title,
    post,
    relatedPosts,
    isPreview,
    metaTitle: post.metaTitle || post.title,
    metaDescription: post.metaDescription || post.excerpt,
    canonicalUrl,
    ogImage: post.coverImage || null,
  });
}); 