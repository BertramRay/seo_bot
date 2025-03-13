const fs = require('fs').promises;
const path = require('path');
const config = require('../config');
const { logger } = require('../utils/logger');

/**
 * 更新系统配置
 * @param {String} section - 配置部分
 * @param {Object} data - 配置数据
 * @returns {Promise<Boolean>} - 更新是否成功
 */
const updateConfig = async (section, data) => {
  try {
    // 验证部分是否存在
    if (!config[section]) {
      logger.warn(`更新配置失败：不存在的配置部分 "${section}"`);
      return false;
    }
    
    logger.info(`正在更新配置部分：${section}，数据：${JSON.stringify(data)}`);
    
    // 更新内存中的配置
    Object.keys(data).forEach(key => {
      if (key in config[section]) {
        const oldValue = config[section][key];
        
        // 处理特殊的布尔值表单字段
        if (typeof config[section][key] === 'boolean') {
          config[section][key] = data[key] === 'on' || data[key] === 'true' || data[key] === true;
        } 
        // 处理数组
        else if (Array.isArray(config[section][key])) {
          config[section][key] = Array.isArray(data[key]) ? data[key] : [data[key]];
        }
        // 处理数字
        else if (typeof config[section][key] === 'number') {
          config[section][key] = parseInt(data[key], 10) || config[section][key];
        }
        // 其他类型直接赋值
        else {
          config[section][key] = data[key];
        }
        
        logger.debug(`配置 ${section}.${key} 从 ${oldValue} 更新为 ${config[section][key]}`);
      }
    });
    
    // 将更改持久化到.env文件
    const dotenvPath = path.join(process.cwd(), '.env');
    logger.info(`准备更新.env文件：${dotenvPath}`);
    
    try {
      // 读取现有的.env文件
      let envContent = await fs.readFile(dotenvPath, 'utf8');
      logger.info(`成功读取.env文件，长度：${envContent.length}字符`);
      
      // 根据配置部分更新相应的环境变量
      let updateCount = 0;
      
      switch (section) {
        case 'content':
          if ('autoPublish' in data) {
            const autoPublishValue = data.autoPublish === 'on' || data.autoPublish === true || data.autoPublish === 'true';
            envContent = updateEnvVar(envContent, 'CONTENT_AUTO_PUBLISH', autoPublishValue.toString());
            config.content.autoPublish = autoPublishValue;
            updateCount++;
          }
          if ('frequency' in data) {
            envContent = updateEnvVar(envContent, 'CONTENT_GENERATION_FREQUENCY', data.frequency);
            updateCount++;
          }
          if ('postsPerBatch' in data) {
            envContent = updateEnvVar(envContent, 'POSTS_PER_BATCH', data.postsPerBatch);
            updateCount++;
          }
          if ('minWordsPerPost' in data) {
            envContent = updateEnvVar(envContent, 'MIN_WORDS_PER_POST', data.minWordsPerPost);
            updateCount++;
          }
          if ('maxWordsPerPost' in data) {
            envContent = updateEnvVar(envContent, 'MAX_WORDS_PER_POST', data.maxWordsPerPost);
            updateCount++;
          }
          if ('customCronExpression' in data) {
            envContent = updateEnvVar(envContent, 'CUSTOM_CRON_EXPRESSION', data.customCronExpression);
            updateCount++;
          }
          break;
        
        case 'blog':
          if ('title' in data) {
            envContent = updateEnvVar(envContent, 'BLOG_TITLE', data.title);
            updateCount++;
          }
          if ('description' in data) {
            envContent = updateEnvVar(envContent, 'BLOG_DESCRIPTION', data.description);
            updateCount++;
          }
          if ('siteUrl' in data) {
            envContent = updateEnvVar(envContent, 'SITE_URL', data.siteUrl);
            updateCount++;
          }
          if ('blogPath' in data) {
            envContent = updateEnvVar(envContent, 'BLOG_PATH', data.blogPath);
            updateCount++;
          }
          break;
        
        case 'seo':
          if ('defaultKeywords' in data) {
            const keywords = Array.isArray(data.defaultKeywords) 
              ? data.defaultKeywords.join(',') 
              : data.defaultKeywords;
            envContent = updateEnvVar(envContent, 'DEFAULT_KEYWORDS', keywords);
            updateCount++;
          }
          if ('language' in data) {
            envContent = updateEnvVar(envContent, 'LANGUAGE', data.language);
            updateCount++;
          }
          if ('generateSitemap' in data) {
            const generateSitemap = data.generateSitemap === 'on' || data.generateSitemap === true || data.generateSitemap === 'true';
            envContent = updateEnvVar(envContent, 'GENERATE_SITEMAP', generateSitemap.toString());
            updateCount++;
          }
          if ('sitemapFrequency' in data) {
            envContent = updateEnvVar(envContent, 'SITEMAP_UPDATE_FREQUENCY', data.sitemapFrequency);
            updateCount++;
          }
          break;
        
        case 'server':
          if ('port' in data) {
            envContent = updateEnvVar(envContent, 'PORT', data.port);
            updateCount++;
          }
          if ('env' in data) {
            envContent = updateEnvVar(envContent, 'NODE_ENV', data.env);
            updateCount++;
          }
          break;
        
        case 'logging':
          if ('level' in data) {
            envContent = updateEnvVar(envContent, 'LOG_LEVEL', data.level);
            updateCount++;
          }
          break;
        
        case 'openai':
          if ('apiKey' in data) {
            envContent = updateEnvVar(envContent, 'OPENAI_API_KEY', data.apiKey);
            updateCount++;
          }
          break;
        
        case 'database':
          if ('uri' in data) {
            envContent = updateEnvVar(envContent, 'MONGODB_URI', data.uri);
            updateCount++;
          }
          break;
      }
      
      // 写回.env文件
      await fs.writeFile(dotenvPath, envContent);
      logger.info(`成功写入.env文件，更新了${updateCount}个配置项`);
      return true;
    } catch (fileError) {
      // 如果.env文件不存在，则创建一个
      if (fileError.code === 'ENOENT') {
        logger.warn(`没有找到.env文件，创建新文件：${dotenvPath}`);
        
        const newEnvContent = createEnvFileContent();
        await fs.writeFile(dotenvPath, newEnvContent);
        logger.info(`已创建新的.env文件并保存配置，内容长度：${newEnvContent.length}字符`);
        return true;
      } else {
        // 其他文件操作错误
        logger.error(`访问.env文件时出错: ${fileError.message}`);
        throw fileError;
      }
    }
  } catch (error) {
    logger.error(`更新配置文件时出错: ${error.message}`);
    return false;
  }
};

/**
 * 在.env内容中更新或添加环境变量
 * @param {String} content - .env文件内容
 * @param {String} key - 环境变量名称
 * @param {String} value - 环境变量值
 * @returns {String} - 更新后的内容
 */
function updateEnvVar(content, key, value) {
  const regex = new RegExp(`^${key}=.*`, 'm');
  
  if (regex.test(content)) {
    // 更新现有变量
    return content.replace(regex, `${key}=${value}`);
  } else {
    // 添加新变量
    return content + `\n${key}=${value}`;
  }
}

/**
 * 创建一个包含当前配置的.env文件内容
 * @returns {String} - .env文件内容
 */
function createEnvFileContent() {
  const lines = [
    `PORT=${config.server.port}`,
    `NODE_ENV=${config.server.env}`,
    `MONGODB_URI=${config.database.uri}`,
    `OPENAI_API_KEY=${config.openai.apiKey || ''}`,
    `BLOG_TITLE=${config.blog.title}`,
    `BLOG_DESCRIPTION=${config.blog.description}`,
    `SITE_URL=${config.blog.siteUrl}`,
    `BLOG_PATH=${config.blog.blogPath}`,
    `CONTENT_GENERATION_FREQUENCY=${config.content.frequency}`,
    `CONTENT_AUTO_PUBLISH=${config.content.autoPublish || false}`,
    `POSTS_PER_BATCH=${config.content.postsPerBatch}`,
    `MIN_WORDS_PER_POST=${config.content.minWordsPerPost}`,
    `MAX_WORDS_PER_POST=${config.content.maxWordsPerPost}`,
    `DEFAULT_KEYWORDS=${config.seo.defaultKeywords.join(',')}`,
    `LANGUAGE=${config.seo.language}`,
    `GENERATE_SITEMAP=${config.seo.generateSitemap}`,
    `SITEMAP_UPDATE_FREQUENCY=${config.seo.sitemapFrequency}`,
    `LOG_LEVEL=${config.logging.level}`,
  ];
  
  return lines.join('\n');
}

module.exports = {
  updateConfig,
}; 