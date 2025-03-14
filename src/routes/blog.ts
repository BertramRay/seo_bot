import express from 'express';
import * as blogController from '../controllers/BlogController';

const router = express.Router();

/**
 * 博客文章列表页
 */
router.get('/', blogController.getIndex);

/**
 * 所有分类列表页
 */
router.get('/categories', blogController.getCategories);

/**
 * 关于我们页面
 */
router.get('/about', blogController.getAbout);

/**
 * 博客分类页
 */
router.get('/category/:category', blogController.getCategory);

/**
 * RSS Feed
 */
router.get('/feed.xml', blogController.getFeed);

/**
 * 博客文章详情页 - 必须放在最后，因为它会捕获所有/:slug路由
 */
router.get('/:slug', blogController.getPost);

export default router; 