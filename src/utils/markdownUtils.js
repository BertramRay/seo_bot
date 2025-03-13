const marked = require('marked');

// 配置marked选项
marked.setOptions({
  breaks: true, // 启用换行符转换
  gfm: true,    // 启用GitHub风格的Markdown
});

/**
 * 将Markdown文本解析为HTML
 * @param {string} markdownText - Markdown格式的文本
 * @returns {string} - 解析后的HTML
 */
exports.parseMarkdown = (markdownText) => {
  if (!markdownText) return '';
  return marked.parse(markdownText);
};

/**
 * 获取配置好的marked实例
 */
exports.marked = marked; 