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
    
    // 创建sitemap流
    const sitemapStream = new SitemapStream({ hostname: config.blog.siteUrl });
    
    // 首页链接
    sitemapStream.write({
      url: '/',
      changefreq: 'daily',
      priority: 1.0,
    });
    
    // 博客首页链接
    sitemapStream.write({
      url: config.blog.blogPath,
      changefreq: 'daily',
      priority: 0.9,
    });
    
    // 添加每篇文章链接
    for (const post of posts) {
      sitemapStream.write({
        url: `${config.blog.blogPath}/${post.slug}`,
        lastmod: post.updatedAt ? post.updatedAt.toISOString() : undefined,
        changefreq: 'weekly',
        priority: 0.8,
      });
    }
    
    // 添加其他重要页面链接
    sitemapStream.write({
      url: '/about',
      changefreq: 'monthly',
      priority: 0.5,
    });
    
    sitemapStream.write({
      url: '/contact',
      changefreq: 'monthly',
      priority: 0.5,
    });
    
    // 结束流
    sitemapStream.end();
    
    // 创建可读流
    const sitemapData = await streamToPromise(Readable.from(['']).pipe(sitemapStream));
    
    // 确保目录存在
    const publicDir = resolve(__dirname, '../../public');
    try {
      await fs.mkdir(publicDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    
    // 写入文件
    const sitemapPath = resolve(publicDir, 'sitemap.xml');
    await fs.writeFile(sitemapPath, sitemapData);
    
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