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
      enum: ['draft', 'published', 'archived'],
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
  },
  { timestamps: true }
);

// 创建slug前的中间件
postSchema.pre('save', function (next) {
  if (!this.slug || this.isModified('title')) {
    // 为中文标题生成拼音slug
    this.slug = slugify(this.title, {
      lower: true,
      strict: true,
      locale: 'zh-CN',
    });
    
    // 添加随机字符串确保唯一性
    const randomString = Math.random().toString(36).substring(2, 8);
    this.slug = `${this.slug}-${randomString}`;
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