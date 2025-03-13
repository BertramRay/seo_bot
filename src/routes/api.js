const express = require('express');
const router = express.Router();
const apiController = require('../controllers/APIController');

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
router.post('/topics', apiController.createTopic);

/**
 * 手动生成博客文章
 */
router.post('/generate', apiController.generate);

/**
 * 手动刷新站点地图
 */
router.post('/refresh-sitemap', apiController.refreshSitemap);

module.exports = router; 