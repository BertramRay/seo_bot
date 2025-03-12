const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const morgan = require('morgan');
const config = require('./config');
const blogRoutes = require('./routes/blog');
const adminRoutes = require('./routes/admin');
const apiRoutes = require('./routes/api');
const { setupCronJobs } = require('./services/scheduler');
const { logger } = require('./utils/logger');
const { seedTopics } = require('./utils/seedTopics');

// 创建必要的目录
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 初始化Express应用
const app = express();

// 中间件设置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

// 设置视图引擎
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 路由设置
app.use(config.blog.blogPath, blogRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);

// 默认路由
app.get('/', (req, res) => {
  res.redirect(config.blog.blogPath);
});

// 404处理
app.use((req, res) => {
  res.status(404).render('error', {
    title: '页面未找到',
    message: '您访问的页面不存在',
  });
});

// 错误处理
app.use((err, req, res, next) => {
  logger.error(`错误: ${err.message}`);
  res.status(err.status || 500).render('error', {
    title: '发生错误',
    message: config.server.env === 'development' ? err.message : '服务器内部错误',
  });
});

// 连接数据库
mongoose
  .connect(config.database.uri)
  .then(async () => {
    logger.info('成功连接到MongoDB数据库');
    
    // 创建示例主题
    await seedTopics();
    
    // 检查是否已有博客文章，如果没有则生成一批
    const Post = require('./models/Post');
    const { triggerContentGeneration } = require('./services/scheduler');
    
    const postCount = await Post.countDocuments();
    if (postCount === 0) {
      logger.info('未发现任何博客文章，开始自动生成初始文章...');
      try {
        await triggerContentGeneration(config.content.postsPerBatch);
        logger.info('初始博客文章生成成功');
      } catch (error) {
        logger.error(`初始博客文章生成失败: ${error.message}`);
      }
    }
    
    // 启动服务器
    app.listen(config.server.port, () => {
      logger.info(`服务器运行在 http://localhost:${config.server.port}`);
      logger.info(`博客访问路径: http://localhost:${config.server.port}${config.blog.blogPath}`);
      logger.info(`管理后台路径: http://localhost:${config.server.port}/admin`);
      
      // 设置定时任务
      setupCronJobs();
    });
  })
  .catch((err) => {
    logger.error(`数据库连接失败: ${err.message}`);
  }); 