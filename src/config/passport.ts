import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import User from '../models/User';
import config from './index';
import { logger } from '../utils/logger';
import * as userService from '../services/userService';
import * as userRepository from '../repositories/UserRepository';
import { IUser } from '../types';

interface GithubProfile {
  id: string;
  username?: string;
  displayName?: string;
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
}

export default function(): void {
  // 配置持久会话的序列化/反序列化
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: string, done) => {
    try {
      // @ts-ignore - 忽略模块声明文件缺失的错误
      const user = await userRepository.getUserById(id);
      done(null, user);
    } catch (error: any) {
      logger.error(`用户反序列化错误: ${error.message}`);
      done(error, null);
    }
  });
  
  // 配置GitHub认证策略
  passport.use(new GitHubStrategy({
    clientID: config.auth.github?.clientID || '',
    clientSecret: config.auth.github?.clientSecret || '',
    callbackURL: config.auth.github?.callbackURL || '',
    scope: ['user:email'],
  }, async (accessToken: string, refreshToken: string, profile: GithubProfile, done: (error: any, user?: any) => void) => {
    try {
      // 使用用户服务处理GitHub登录
      const user = await userService.handleGithubLogin(profile);
      return done(null, user);
    } catch (error: any) {
      logger.error(`GitHub认证错误: ${error.message}`);
      return done(error, null);
    }
  }));
}; 