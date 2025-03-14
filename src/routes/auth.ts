import express from 'express';
import passport from 'passport';
import { logger } from '../utils/logger';
import { isAuthenticated } from '../middlewares/auth';
import * as authController from '../controllers/AuthController';

const router = express.Router();

/**
 * 登录页面
 */
router.get('/login', authController.getLogin);

/**
 * GitHub登录
 */
router.get('/github', authController.githubAuth);

/**
 * GitHub登录回调
 */
router.get('/github/callback', authController.githubCallback);

/**
 * 个人资料页面
 */
router.get('/profile', isAuthenticated, authController.getProfile);

/**
 * 更新个人资料
 */
router.post('/profile', isAuthenticated, authController.updateProfile);

/**
 * 登出
 */
router.get('/logout', authController.logout);

/**
 * API: 获取当前用户信息
 */
router.get('/api/me', authController.getCurrentUser);

export default router; 