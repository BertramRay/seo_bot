const { SitemapStream, streamToPromise } = require('sitemap');
const { createWriteStream } = require('fs');
const { resolve } = require('path');
const { Readable } = require('stream');
const fs = require('fs').promises;
const Post = require('../models/Post');
const config = require('../config');
const { logger } = require('../utils/logger');
const { getBlogConfig } = require('../utils/configUtils');

/**
 * 生成站点地图
 * @param {Object} user - 用户对象（可选）
 * @returns {Promise<String>} - 生成的站点地图URL
 */
const generateSitemap = async (user = null) => {
  try {
    // 获取用户特定的配置
    const blogConfig = getBlogConfig(user);
    
    // 如果是为特定用户生成站点地图
    if (user) {
      logger.info(`开始为用户 ${user.username} 生成站点地图`);
      
      // 获取该用户所有已发布的文章
      const posts = await Post.find({ 
        status: 'published',
        user: user._id
      })
        .select('slug publishedAt updatedAt')
        .sort({ publishedAt: -1 });
      
      logger.info(`找到用户 ${user.username} 的 ${posts.length} 篇已发布文章`);
      
      // 准备链接数据
      const links = [
        // 首页链接
        {
          url: '/',
          changefreq: 'daily',
          priority: 1.0,
        },
        // 文章链接
        ...posts.map(post => ({
          url: `/${post.slug}`,
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
          url: '/categories',
          changefreq: 'weekly',
          priority: 0.7,
        }
      ];
      
      // 创建可读流和站点地图流
      const stream = new Readable();
      stream.readable = true;
      stream._read = () => {}; // 空实现
      
      // 获取用户的域名
      const hostname = user.customDomain ? `https://${user.customDomain}` : 
                      user.subdomain ? `https://${user.subdomain}.${config.domain.baseDomain}` : 
                      blogConfig.siteUrl;
      
      const sitemapStream = new SitemapStream({ hostname });
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
      const userDir = resolve(__dirname, `../../public/users/${user._id}`);
      try {
        await fs.mkdir(userDir, { recursive: true });
      } catch (err) {
        if (err.code !== 'EEXIST') throw err;
      }
      
      // 写入站点地图文件
      const sitemapPath = resolve(userDir, 'sitemap.xml');
      await fs.writeFile(sitemapPath, sitemapData);
      
      // 返回站点地图URL
      const sitemapUrl = `${hostname}/sitemap.xml`;
      logger.info(`用户 ${user.username} 的站点地图生成成功: ${sitemapUrl}`);
      
      return sitemapUrl;
    } else {
      // 为整个系统生成站点地图
      logger.info('开始生成系统站点地图');
      
      // 获取所有已发布的文章
      const posts = await Post.find({ status: 'published' })
        .select('slug publishedAt updatedAt user')
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
      logger.info(`系统站点地图生成成功: ${sitemapUrl}`);
      
      return sitemapUrl;
    }
  } catch (error) {
    logger.error(`站点地图生成出错: ${error.message}`);
    throw new Error(`站点地图生成失败: ${error.message}`);
  }
};

module.exports = {
  generateSitemap,
}; 