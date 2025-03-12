const { SitemapStream, streamToPromise } = require('sitemap');
const { createWriteStream } = require('fs');
const { resolve } = require('path');
const { Readable } = require('stream');
const fs = require('fs').promises;
const Post = require('../models/Post');
const config = require('../config');
const { logger } = require('../utils/logger');

/**
 * 生成站点地图
 * @returns {Promise<String>} - 生成的站点地图URL
 */
const generateSitemap = async () => {
  try {
    logger.info('开始生成站点地图');
    
    // 获取所有已发布的文章
    const posts = await Post.find({ status: 'published' })
      .select('slug publishedAt updatedAt')
      .sort({ publishedAt: -1 });
    
    logger.info(`找到 ${posts.length} 篇已发布文章`);
    
    // 准备链接数据
    const links = [
      // 首页链接
      {
        url: '/',
        changefreq: 'daily',
        priority: 1.0,
      },
      // 博客首页链接
      {
        url: config.blog.blogPath,
        changefreq: 'daily',
        priority: 0.9,
      },
      // 文章链接
      ...posts.map(post => ({
        url: `${config.blog.blogPath}/${post.slug}`,
        lastmod: post.updatedAt ? post.updatedAt.toISOString() : undefined,
        changefreq: 'weekly',
        priority: 0.8,
      })),
      // 其他重要页面链接
      {
        url: '/about',
        changefreq: 'monthly',
        priority: 0.5,
      },
      {
        url: '/contact',
        changefreq: 'monthly',
        priority: 0.5,
      }
    ];
    
    // 创建可读流和站点地图流
    const stream = new Readable();
    stream.readable = true;
    stream._read = () => {}; // 空实现
    
    const sitemapStream = new SitemapStream({ hostname: config.blog.siteUrl });
    const pipeline = stream.pipe(sitemapStream);
    
    // 分别写入每个链接到站点地图中
    links.forEach(link => {
      stream.push(JSON.stringify(link));
    });
    
    // 结束读取流
    stream.push(null);
    
    // 获取站点地图XML
    const sitemapData = await streamToPromise(pipeline);
    
    // 确保目录存在
    const publicDir = resolve(__dirname, '../../public');
    try {
      await fs.mkdir(publicDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    // 写入站点地图文件
    const sitemapPath = resolve(publicDir, 'sitemap.xml');
    await fs.writeFile(sitemapPath, sitemapData);
    
    // 返回站点地图URL
    const sitemapUrl = `${config.blog.siteUrl}/sitemap.xml`;
    logger.info(`站点地图生成成功: ${sitemapUrl}`);
    
    return sitemapUrl;
  } catch (error) {
    logger.error(`站点地图生成出错: ${error.message}`);
    throw new Error(`站点地图生成失败: ${error.message}`);
  }
};

module.exports = {
  generateSitemap,
}; 