const express = require('express');
const passport = require('passport');
const router = express.Router();
const { logger } = require('../utils/logger');
const { isAuthenticated } = require('../middlewares/auth');
const authController = require('../controllers/AuthController');

/**
 * 登录页面
 */
router.get('/login', authController.getLogin);

/**
 * GitHub登录
 */
router.get('/github', passport.authenticate('github'));

/**
 * GitHub登录回调
 */
router.get('/github/callback', 
  passport.authenticate('github', { 
    failureRedirect: '/auth/login?error=github',
    successReturnToOrRedirect: '/admin'
  })
);

/**
 * 个人资料页面
 */
router.get('/profile', isAuthenticated, authController.getProfile);

/**
 * 登出
 */
router.get('/logout', authController.logout);

module.exports = router; 