const mongoose = require('mongoose');
const slugify = require('slugify');

const postSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },
    content: {
      type: String,
      required: true,
    },
    excerpt: {
      type: String,
      required: true,
    },
    keywords: [{
      type: String,
      trim: true,
    }],
    categories: [{
      type: String,
      trim: true,
    }],
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
    },
    metaTitle: {
      type: String,
      trim: true,
    },
    metaDescription: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived', 'deleted'],
      default: 'draft',
    },
    publishedAt: {
      type: Date,
    },
    featuredImage: {
      type: String,
    },
    generatedBy: {
      type: String,
      default: 'system',
    },
    readingTime: {
      type: Number,
      default: 0,
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    isGenerated: {
      type: Boolean,
      default: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// 创建复合索引，确保每个用户的文章slug唯一
postSchema.index({ slug: 1, user: 1 }, { unique: true });

// 创建slug前的中间件
postSchema.pre('save', function (next) {
  if (!this.slug || this.isModified('title')) {
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
    this.wordCount = this.content.length;
    this.readingTime = Math.ceil(this.wordCount / 200);
  }
  
  // 如果没有设置metaTitle或metaDescription，使用title和excerpt
  if (!this.metaTitle) {
    this.metaTitle = this.title;
  }
  
  if (!this.metaDescription) {
    // 截取前150个字符作为描述
    this.metaDescription = this.excerpt.slice(0, 150);
  }
  
  next();
});

// 创建模型
const Post = mongoose.model('Post', postSchema);

module.exports = Post; 