import express from 'express';
import * as apiController from '../controllers/APIController';
import { isAuthenticated } from '../middlewares/auth';

const router = express.Router();

/**
 * 健康检查
 */
router.get('/health', apiController.health);

/**
 * 获取博客文章列表
 */
router.get('/posts', apiController.getPosts);

/**
 * 获取单篇文章
 */
router.get('/posts/:id', apiController.getPost);

/**
 * 获取主题列表
 */
router.get('/topics', apiController.getTopics);

/**
 * 创建主题
 */
router.post('/topics', isAuthenticated, apiController.createTopic);

/**
 * 更新主题
 */
router.put('/topics/:id', isAuthenticated, apiController.updateTopic);

/**
 * 删除主题
 */
router.delete('/topics/:id', isAuthenticated, apiController.deleteTopic);

/**
 * 发布文章
 */
router.post('/posts/:id/publish', isAuthenticated, apiController.publishPost);

/**
 * 取消发布文章
 */
router.post('/posts/:id/unpublish', isAuthenticated, apiController.unpublishPost);

/**
 * 更新文章
 */
router.put('/posts/:id', isAuthenticated, apiController.updatePost);

/**
 * 删除文章
 */
router.delete('/posts/:id', isAuthenticated, apiController.deletePost);

/**
 * 手动生成博客文章
 */
router.post('/generate', isAuthenticated, apiController.generate);

/**
 * 手动刷新站点地图
 */
router.post('/refresh-sitemap', isAuthenticated, apiController.refreshSitemap);

/**
 * 获取博客配置
 */
router.get('/config', apiController.getBlogConfig);

export default router; 