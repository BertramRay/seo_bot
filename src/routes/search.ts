import express from 'express';
import * as searchController from '../controllers/SearchController';

const router = express.Router();

/**
 * 博客内容搜索页面
 */
router.get('/', searchController.searchPage);

/**
 * API搜索接口
 */
router.get('/api', searchController.search);

/**
 * 搜索主题接口
 */
router.get('/topics', searchController.searchTopics);

export default router; 