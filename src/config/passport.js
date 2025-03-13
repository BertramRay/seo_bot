const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');
const config = require('./index');
const { logger } = require('../utils/logger');
const userService = require('../services/userService');
const userRepository = require('../repositories/UserRepository');

module.exports = function() {
  // 配置持久会话的序列化/反序列化
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await userRepository.getUserById(id);
      done(null, user);
    } catch (error) {
      logger.error(`用户反序列化错误: ${error.message}`);
      done(error, null);
    }
  });
  
  // 配置GitHub认证策略
  passport.use(new GitHubStrategy({
    clientID: config.auth.github.clientID,
    clientSecret: config.auth.github.clientSecret,
    callbackURL: config.auth.github.callbackURL,
    scope: ['user:email'],
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // 使用用户服务处理GitHub登录
      const user = await userService.handleGithubLogin(profile);
      return done(null, user);
    } catch (error) {
      logger.error(`GitHub认证错误: ${error.message}`);
      return done(error, null);
    }
  }));
}; 