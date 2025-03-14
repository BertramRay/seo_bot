import { marked } from 'marked';

// 配置marked选项
marked.setOptions({
  breaks: true, // 启用换行符转换
  gfm: true,    // 启用GitHub风格的Markdown
});

/**
 * 将Markdown文本解析为HTML
 * @param markdownText - Markdown格式的文本
 * @returns - 解析后的HTML
 */
export const parseMarkdown = async (markdownText: string): Promise<string> => {
  if (!markdownText) return '';
  return await marked.parse(markdownText);
};

/**
 * 获取配置好的marked实例
 */
export { marked }; 