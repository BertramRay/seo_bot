import Post from '../models/Post';
import { logger } from '../utils/logger';
import { IPost } from '../types';

interface PostData {
  title?: string;
  excerpt?: string;
  content?: string;
  keywords?: string[] | string;
  categories?: string[] | string;
  slug?: string;
  status?: 'draft' | 'published' | 'deleted';
  metaTitle?: string;
  metaDescription?: string;
  save?: 'draft' | 'publish';
  topic?: string;
  publishedAt?: Date;
}

/**
 * 更新文章
 * @param id - 文章ID
 * @param postData - 文章数据
 * @returns 更新后的文章
 */
export const updatePost = async (id: string, postData: PostData): Promise<IPost> => {
  const { title, excerpt, content, keywords, categories, slug, status, metaTitle, metaDescription, save } = postData;
  
  // 构建更新对象
  const updateData: PostData = {
    title,
    excerpt,
    content,
    keywords: Array.isArray(keywords) ? keywords : (keywords || []),
    categories: Array.isArray(categories) ? categories : (categories || []),
    slug,
    metaTitle,
    metaDescription,
  };
  
  // 根据保存选项决定状态
  if (save === 'publish') {
    updateData.status = 'published';
    updateData.publishedAt = new Date();
  } else {
    updateData.status = status || 'draft';
  }
  
  // 更新文章
  const updatedPost = await Post.findByIdAndUpdate(id, updateData, { new: true });
  
  if (!updatedPost) {
    throw new Error('文章不存在');
  }
  
  logger.info(`更新文章成功: ${updatedPost.title} (ID: ${id})`);
  
  return updatedPost as IPost;
};

/**
 * 发布文章
 * @param id - 文章ID
 * @returns 发布后的文章
 */
export const publishPost = async (id: string): Promise<IPost> => {
  const post = await Post.findByIdAndUpdate(id, {
    status: 'published',
    publishedAt: new Date(),
  }, { new: true });
  
  if (!post) {
    throw new Error('文章不存在');
  }
  
  logger.info(`文章已发布: ${post.title} (ID: ${id})`);
  
  return post as IPost;
};

/**
 * 取消发布文章
 * @param id - 文章ID
 * @returns 取消发布后的文章
 */
export const unpublishPost = async (id: string): Promise<IPost> => {
  const post = await Post.findByIdAndUpdate(id, {
    status: 'draft',
  }, { new: true });
  
  if (!post) {
    throw new Error('文章不存在');
  }
  
  logger.info(`文章已取消发布: ${post.title} (ID: ${id})`);
  
  return post as IPost;
};

/**
 * 删除文章
 * @param id - 文章ID
 * @returns 删除后的文章
 */
export const deletePost = async (id: string): Promise<IPost> => {
  // 使用软删除 - 将状态设为deleted
  const post = await Post.findByIdAndUpdate(id, {
    status: 'deleted',
  }, { new: true });
  
  if (!post) {
    throw new Error('文章不存在');
  }
  
  logger.info(`文章已删除: ${post.title} (ID: ${id})`);
  
  return post as IPost;
}; 