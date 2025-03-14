import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import mongoose from 'mongoose';
import session from 'express-session';
import passport from 'passport';
import flash from 'connect-flash';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import { CustomRequest } from './types';
import config from './config';
import adminRoutes from './routes/admin';
import authRoutes from './routes/auth';
import apiRoutes from './routes/api';
import blogRoutes from './routes/blog';
import searchRoutes from './routes/search';
import User from './models/User';
import Topic from './models/Topic';
import Post from './models/Post';
import * as scheduler from './services/scheduler';

// 创建Express应用
const app: Express = express();

// 确保必要的目录存在
const ensureDirectoryExists = (directory: string): void => {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
};

// 确保日志目录存在
ensureDirectoryExists(path.join(__dirname, '../logs'));

// 设置视图引擎
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 中间件
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 会话配置
app.use(session(config.auth.session));

// 初始化Passport
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// 全局变量
app.use((req: Request & CustomRequest, res: Response, next: NextFunction) => {
  res.locals.user = req.user || null;
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

// 路由
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);
app.use('/search', searchRoutes);
app.use('/', blogRoutes);

// 404处理
app.use((req: Request, res: Response) => {
  res.status(404).render('404', {
    title: '页面未找到',
    user: req.user
  });
});

// 错误处理
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: '服务器错误',
    message: err.message,
    error: config.server.env === 'development' ? err : {},
    user: req.user
  });
});

// 连接到MongoDB
mongoose.connect(config.database.uri)
  .then(() => {
    console.log('MongoDB连接成功');
    
    // 创建管理员用户（如果不存在）
    User.findOne({ role: 'admin' })
      .then((adminUser: any) => {
        if (!adminUser && process.env.ADMIN_EMAIL) {
          const newAdmin = new User({
            email: process.env.ADMIN_EMAIL,
            name: process.env.ADMIN_NAME || 'Admin',
            role: 'admin'
          });
          return newAdmin.save();
        }
        return adminUser;
      })
      .then(() => {
        // 如果没有博客文章，则创建一些主题
        Post.countDocuments()
          .then((count: number) => {
            if (count === 0) {
              // 没有文章，创建一些默认主题
              console.log('没有文章，创建默认主题');
              const defaultTopics = [
                { name: '科技', description: '最新科技新闻和趋势' },
                { name: '健康', description: '健康生活方式和医疗建议' },
                { name: '旅游', description: '旅游目的地和旅行技巧' },
                { name: '美食', description: '食谱和餐厅推荐' },
                { name: '教育', description: '学习资源和教育趋势' }
              ];
              
              return Topic.insertMany(defaultTopics);
            }
          })
          .catch((err: Error) => console.error('初始化主题时出错:', err));
      })
      .catch((err: Error) => console.error('初始化管理员用户时出错:', err));
    
    // 启动定时任务
    scheduler.initScheduledTasks()
      .then(() => {
        // 启动服务器
        const PORT = config.server.port;
        app.listen(PORT, () => {
          console.log(`服务器运行在端口 ${PORT}`);
        });
      })
      .catch(err => {
        console.error('初始化定时任务出错:', err);
      });
  })
  .catch((err: Error) => {
    console.error('MongoDB连接错误:', err);
    process.exit(1);
  });

export default app; 