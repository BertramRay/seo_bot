const { logger } = require('../utils/logger');
const { createPagination } = require('../utils/pagination');
const { parseMarkdown } = require('../utils/markdownUtils');
const { asyncHandler } = require('../utils/controllerUtils');
const { getBlogConfig, getBlogTitle, getBlogDescription, getBlogUrl, getSeoMeta } = require('../utils/configUtils');
const postRepository = require('../repositories/PostRepository');
const topicRepository = require('../repositories/TopicRepository');

/**
 * 获取当前租户信息
 * @param {Object} req - 请求对象
 * @returns {Object} - 租户信息
 */
function getTenantInfo(req) {
  // 如果请求中有租户信息，则使用租户的设置
  if (req.tenant) {
    const tenant = req.tenant;
    const blogSettings = tenant.settings && tenant.settings.blog ? tenant.settings.blog : {};
    
    return {
      userId: tenant._id,
      title: blogSettings.title || '我的SEO博客',
      description: blogSettings.description || '自动生成的高质量SEO博客内容',
      primaryColor: blogSettings.primaryColor || '#3498db',
      secondaryColor: blogSettings.secondaryColor || '#2ecc71',
      logo: blogSettings.logo || null,
      displayName: tenant.displayName || tenant.username
    };
  }
  
  // 否则使用系统默认设置
  const blogConfig = getBlogConfig();
  return {
    userId: null,
    title: blogConfig.title,
    description: blogConfig.description,
    primaryColor: '#3498db',
    secondaryColor: '#2ecc71',
    logo: null,
    displayName: '系统博客'
  };
}

/**
 * 博客文章列表页
 */
exports.getIndex = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  // 获取租户信息
  const tenantInfo = getTenantInfo(req);
  
  // 构建查询选项
  const options = {
    status: 'published',
    page,
    limit
  };
  
  // 如果有租户，则只查询该租户的文章
  if (tenantInfo.userId) {
    options.userId = tenantInfo.userId;
  }
  
  // 使用仓库获取已发布的文章
  const { posts, total } = await postRepository.getPaginatedPosts(options);
  
  // 分页信息
  const pagination = createPagination(page, limit, total);
  
  // 获取SEO元数据
  const seoMeta = getSeoMeta({
    title: tenantInfo.title,
    description: tenantInfo.description
  });
  
  res.render('blog/index', {
    title: tenantInfo.title,
    description: tenantInfo.description,
    posts,
    pagination,
    tenantInfo,
    ...seoMeta
  });
});

/**
 * 所有分类列表页
 */
exports.getCategories = asyncHandler(async (req, res) => {
  // 获取租户信息
  const tenantInfo = getTenantInfo(req);
  
  // 构建查询选项
  const options = {
    status: 'published',
    limit: 1000 // 获取足够多的文章来统计分类
  };
  
  // 如果有租户，则只查询该租户的文章
  if (tenantInfo.userId) {
    options.userId = tenantInfo.userId;
  }
  
  // 获取所有已发布文章的分类
  const posts = await postRepository.getPaginatedPosts(options).then(result => result.posts);
  
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
    title: `所有分类 - ${tenantInfo.title}`,
    categories,
    tenantInfo,
    ...seoMeta
  });
});

/**
 * 关于我们页面
 */
exports.getAbout = asyncHandler(async (req, res) => {
  // 获取租户信息
  const tenantInfo = getTenantInfo(req);
  
  // 获取SEO元数据
  const seoMeta = getSeoMeta({
    title: '关于我们',
    path: '/about'
  });
  
  res.render('blog/about', {
    title: `关于我们 - ${tenantInfo.title}`,
    siteName: tenantInfo.title,
    description: tenantInfo.description,
    tenantInfo,
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
  
  // 获取租户信息
  const tenantInfo = getTenantInfo(req);
  
  // 构建查询选项
  const options = {
    status: 'published',
    category,
    page,
    limit
  };
  
  // 如果有租户，则只查询该租户的文章
  if (tenantInfo.userId) {
    options.userId = tenantInfo.userId;
  }
  
  // 使用仓库获取该分类下的文章
  const { posts, total } = await postRepository.getPaginatedPosts(options);
  
  // 分页信息
  const pagination = createPagination(page, limit, total);
  
  // 获取SEO元数据
  const seoMeta = getSeoMeta({
    title: category,
    description: `查看关于${category}的所有文章 - ${tenantInfo.description}`,
    path: `/category/${category}`
  });
  
  res.render('blog/category', {
    title: `${category} - ${tenantInfo.title}`,
    category,
    posts,
    pagination,
    tenantInfo,
    ...seoMeta
  });
});

/**
 * RSS Feed
 */
exports.getFeed = asyncHandler(async (req, res) => {
  // 获取租户信息
  const tenantInfo = getTenantInfo(req);
  
  // 构建查询选项
  const options = {
    status: 'published',
    limit: 20
  };
  
  // 如果有租户，则只查询该租户的文章
  if (tenantInfo.userId) {
    options.userId = tenantInfo.userId;
  }
  
  const { posts } = await postRepository.getPaginatedPosts(options);
  
  // 设置XML响应头
  res.header('Content-Type', 'application/xml');
  
  res.render('blog/feed', {
    posts,
    site: {
      title: tenantInfo.title,
      description: tenantInfo.description,
      url: req.protocol + '://' + req.get('host'),
      blogPath: '',
    },
    tenantInfo
  });
});

/**
 * 博客文章详情页
 */
exports.getPost = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const isPreview = req.query.preview === 'true';
  
  // 获取租户信息
  const tenantInfo = getTenantInfo(req);
  
  // 查找文章 - 如果是预览模式，则允许查看草稿文章
  const options = {};
  if (!isPreview) {
    options.status = 'published';
  }
  
  // 如果有租户，则只查询该租户的文章
  if (tenantInfo.userId) {
    options.userId = tenantInfo.userId;
  }
  
  const post = await postRepository.getPostBySlug(slug, options);
  
  if (!post) {
    return res.status(404).render('error', {
      title: '文章不存在',
      message: '您访问的文章不存在或已被删除',
      tenantInfo
    });
  }
  
  // 如果是草稿状态但不是预览模式，则返回404
  if (post.status !== 'published' && !isPreview) {
    return res.status(404).render('error', {
      title: '文章未发布',
      message: '此文章尚未发布，无法查看',
      tenantInfo
    });
  }
  
  // 处理Markdown内容
  if (post.content) {
    post.content = parseMarkdown(post.content);
  }
  
  // 获取相关文章（同类别）- 确保只获取同一租户的相关文章
  const relatedOptions = { userId: post.user };
  const relatedPosts = await postRepository.getRelatedPosts(post._id, post.categories, relatedOptions);
  
  // 获取SEO元数据
  const seoMeta = getSeoMeta({
    title: post.title,
    description: post.metaDescription || post.excerpt,
    path: `/${post.slug}`,
    keywords: post.keywords
  });
  
  res.render('blog/post', {
    title: post.title,
    post,
    relatedPosts,
    isPreview,
    tenantInfo,
    ...seoMeta,
    ogImage: post.coverImage || null,
  });
}); 