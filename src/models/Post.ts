import mongoose, { Schema, Document } from 'mongoose';
import { IPost } from '../types';
import slugify from 'slugify';

const postSchema = new Schema<IPost>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      index: true
    },
    content: {
      type: String,
      required: true,
    },
    excerpt: {
      type: String,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    topics: [{
      type: Schema.Types.ObjectId,
      ref: 'Topic',
      index: true
    }],
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true
    },
    publishedAt: {
      type: Date,
      index: true
    },
    seo: {
      title: {
        type: String
      },
      description: {
        type: String
      },
      keywords: [{
        type: String,
        trim: true
      }],
      focusKeyword: {
        type: String
      },
      canonicalUrl: {
        type: String
      },
      structuredData: {
        type: Schema.Types.Mixed
      }
    },
    readingTime: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    }
  },
  { 
    timestamps: true
  }
);

// 创建索引
postSchema.index({ author: 1, status: 1 });
postSchema.index({ publishedAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ topics: 1, status: 1 });

// 添加全文搜索索引
postSchema.index(
  { 
    title: 'text',
    content: 'text',
    excerpt: 'text',
    'seo.keywords': 'text'
  },
  {
    weights: {
      title: 10,
      'seo.keywords': 5,
      excerpt: 3,
      content: 1
    }
  }
);

// 创建slug前的中间件
postSchema.pre('save', function(this: IPost, next) {
  if (!this.slug || (this.isModified && this.isModified('title'))) {
    // 为标题生成更易读的slug
    let baseSlug = '';
    
    // 根据是否有中文内容选择处理方式
    if (/[\u4e00-\u9fa5]/.test(this.title)) {
      // 中文标题：使用拼音转换，限制长度
      baseSlug = slugify(this.title, {
        lower: true,
        strict: true,
        locale: 'zh-CN',
      }).substring(0, 30);
    } else {
      // 非中文标题：直接转换，保留更多单词
      baseSlug = slugify(this.title, {
        lower: true,
        strict: true,
        replacement: '-',
        remove: /[*+~.()'"!:@]/g,
      }).substring(0, 40);
    }
    
    // 处理空slug（如果只包含特殊字符）
    if (!baseSlug || baseSlug.length < 3) {
      baseSlug = 'post';
    }
    
    // 添加更短且易读的唯一标识符（例如时间戳的一部分 + 3位随机字符）
    const timestamp = new Date().getTime().toString().slice(-6);
    const randomChar = Math.random().toString(36).substring(2, 5);
    this.slug = `${baseSlug}-${timestamp}${randomChar}`;
  }
  
  // 计算阅读时间（假设每分钟阅读200个字）
  if (this.content) {
    const wordCount = this.content.length;
    this.readingTime = Math.ceil(wordCount / 200);
  }
  
  // 如果没有设置SEO标题或描述，使用title和excerpt
  if (this.seo) {
    if (!this.seo.title) {
      this.seo.title = this.title;
    }
    
    if (!this.seo.description && this.excerpt) {
      // 截取前150个字符作为描述
      this.seo.description = this.excerpt.slice(0, 150);
    }
  }
  
  next();
});

// 创建模型
const Post = mongoose.model<IPost>('Post', postSchema);

export default Post; 