const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');
const config = require('./index');
const { logger } = require('../utils/logger');

module.exports = function() {
  // 配置持久会话的序列化/反序列化
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
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
      // 查找或创建用户
      let user = await User.findOne({ githubId: profile.id });
      
      if (user) {
        // 更新现有用户信息
        user.lastLogin = new Date();
        if (profile.emails && profile.emails.length > 0) {
          user.email = profile.emails[0].value;
        }
        if (profile.photos && profile.photos.length > 0) {
          user.profilePicture = profile.photos[0].value;
        }
        user.displayName = profile.displayName || profile.username;
        
        await user.save();
        logger.info(`用户 ${user.username} 通过GitHub登录`);
        return done(null, user);
      }
      
      // 创建新用户
      const email = profile.emails && profile.emails.length > 0 
        ? profile.emails[0].value 
        : `${profile.username}@github.com`;
      
      // 检查邮箱是否已被使用
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        // 如果邮箱已被使用，但没有GitHub绑定，则绑定GitHub
        existingUser.githubId = profile.id;
        existingUser.lastLogin = new Date();
        if (profile.photos && profile.photos.length > 0) {
          existingUser.profilePicture = profile.photos[0].value;
        }
        existingUser.displayName = profile.displayName || profile.username;
        
        await existingUser.save();
        logger.info(`用户 ${existingUser.username} 已绑定GitHub账号并登录`);
        return done(null, existingUser);
      }
      
      // 创建全新用户
      const newUser = new User({
        username: profile.username,
        email: email,
        githubId: profile.id,
        displayName: profile.displayName || profile.username,
        profilePicture: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null,
        lastLogin: new Date(),
      });
      
      await newUser.save();
      logger.info(`新用户 ${newUser.username} 通过GitHub注册并登录`);
      return done(null, newUser);
    } catch (error) {
      logger.error(`GitHub认证错误: ${error.message}`);
      return done(error, null);
    }
  }));
}; 