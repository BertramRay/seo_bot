import express from 'express';
import { isAuthenticated } from '../middlewares/auth';
import * as adminController from '../controllers/AdminController';

const router = express.Router();

// 应用认证中间件到所有管理路由
router.use(isAuthenticated);

/**
 * 管理后台首页
 */
router.get('/', adminController.getDashboard);

/**
 * 文章管理页面
 */
router.get('/posts', adminController.getPosts);

/**
 * 主题管理页面
 */
router.get('/topics', adminController.getTopics);

/**
 * 新建主题页面
 */
router.get('/topics/new', adminController.getNewTopic);

/**
 * 编辑主题页面
 */
router.get('/topics/edit/:id', adminController.getEditTopic);

/**
 * 内容生成页面
 */
router.get('/generate', adminController.getGeneratePage);

/**
 * 手动触发内容生成
 */
router.post('/generate', adminController.postGenerate);

/**
 * SEO工具页面
 */
router.get('/seo-tools', adminController.getSeoTools);

/**
 * 刷新站点地图
 */
router.post('/refresh-sitemap', adminController.postRefreshSitemap);

/**
 * 文章编辑页面
 */
router.get('/posts/edit/:id', adminController.getEditPost);

/**
 * 创建主题
 */
router.post('/topics/create', adminController.postCreateTopic);

/**
 * 更新主题
 */
router.post('/topics/update/:id', adminController.postUpdateTopic);

/**
 * 删除主题
 */
router.post('/topics/:id/delete', adminController.postDeleteTopic);

/**
 * 发布文章
 */
router.post('/posts/publish/:id', adminController.postPublishPost);

/**
 * 取消发布文章
 */
router.post('/posts/unpublish/:id', adminController.postUnpublishPost);

/**
 * 删除文章
 */
router.post('/posts/delete/:id', adminController.postDeletePost);

/**
 * 更新文章
 */
router.post('/posts/update/:id', adminController.postUpdatePost);

/**
 * 查看主题详情
 */
router.get('/topics/:id', adminController.getTopicDetail);

/**
 * 文章编辑页面 - 兼容旧路由
 */
router.get('/posts/:id/edit', (req, res) => {
  res.redirect(`/admin/posts/edit/${req.params.id}`);
});

/**
 * 文章详情页面
 */
router.get('/posts/:id', adminController.getPostDetail);

/**
 * 查看生成结果页面
 */
router.get('/generation-results/:id', adminController.getGenerationResults);

/**
 * 生成站点地图
 */
router.get('/sitemap/generate', adminController.getGenerateSitemap);

/**
 * 域名设置页面
 */
router.get('/domain-settings', adminController.getDomainSettings);

/**
 * 更新子域名
 */
router.post('/domain-settings/update-subdomain', adminController.postUpdateSubdomain);

/**
 * 更新自定义域名
 */
router.post('/domain-settings/update-custom-domain', adminController.postUpdateCustomDomain);

/**
 * 验证域名
 */
router.post('/domain-settings/verify-domain', adminController.postVerifyDomain);

/**
 * 更新博客设置
 */
router.post('/domain-settings/update-blog-settings', adminController.postUpdateBlogSettings);

export default router; 